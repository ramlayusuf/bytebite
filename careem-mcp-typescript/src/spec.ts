import { randomInt, randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type Json = any;
export interface Scenario { name: string; match?: Json; template: string; isError: boolean }
export interface ToolSpec { file: string; tool: Json; scenarios: Scenario[] }

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = join(dir, e.name);
    return e.isDirectory() ? filesUnder(p) : e.name.endsWith(".md") && e.name !== "README.md" ? [p] : [];
  });
}

function sections(body: string): Array<{ title: string; text: string }> {
  const lines = body.split(/\r?\n/); const out: Array<{title:string;text:string}> = [];
  let fenced = false, current: { title: string; lines: string[] } | undefined;
  for (const line of lines) {
    if (/^```/.test(line)) fenced = !fenced;
    if (!fenced && line.startsWith("## ")) {
      if (current) out.push({ title: current.title, text: current.lines.join("\n") });
      current = { title: line.slice(3).trim(), lines: [] };
    } else if (current) current.lines.push(line);
  }
  if (current) out.push({ title: current.title, text: current.lines.join("\n") });
  return out;
}

function blocks(text: string, kind: string): string[] {
  const r = new RegExp("^```json[ \\t]+" + kind + "[ \\t]*\\r?\\n([\\s\\S]*?)^```[ \\t]*$", "gmi");
  return [...text.matchAll(r)].map(m => m[1]);
}

export function parseTool(file: string): ToolSpec {
  const raw = readFileSync(file, "utf8");
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!fm) throw new Error(`${file}: missing frontmatter`);
  const front: Record<string,string> = {};
  for (const line of fm[1].split(/\r?\n/)) {
    const m = line.match(/^([^:]+):\s*(.*?)\s*(?:#.*)?$/); if (m) front[m[1].trim()] = m[2].replace(/^['"]|['"]$/g, "");
  }
  if (!front.tool) throw new Error(`${file}: missing frontmatter tool`);
  let tool: Json | undefined; const scenarios: Scenario[] = [];
  for (const sec of sections(raw.slice(fm[0].length))) {
    if (sec.title === "Definition") {
      const b = blocks(sec.text, "tool"); if (b.length !== 1) throw new Error(`${file}: expected one Definition`);
      try { tool = JSON.parse(b[0]); } catch (e) { throw new Error(`${file}: invalid Definition: ${e}`); }
    } else if (sec.title.startsWith("Scenario: ")) {
      const name = sec.title.slice(10).trim(), match = blocks(sec.text, "match");
      const response = blocks(sec.text, "response"), error = blocks(sec.text, "error");
      if (match.length > 1 || response.length + error.length !== 1) throw new Error(`${file} scenario ${name}: invalid blocks`);
      let parsedMatch: Json | undefined;
      try { if (match[0]) parsedMatch = JSON.parse(match[0]); } catch (e) { throw new Error(`${file} scenario ${name}: invalid match: ${e}`); }
      scenarios.push({ name, match: parsedMatch, template: (response[0] ?? error[0]), isError: error.length === 1 });
    }
  }
  if (!tool || tool.name !== front.tool) throw new Error(`${file}: definition name does not match ${front.tool}`);
  if (!scenarios.length || !scenarios.some(s => s.match === undefined)) throw new Error(`${file}: missing scenarios or default`);
  for (const s of scenarios) { try { render(s.template, {}); } catch (e) { throw new Error(`${file} scenario ${s.name}: ${e}`); } }
  return { file, tool, scenarios };
}

export function loadSpecs(toolsDir: string): Map<string, ToolSpec> {
  const result = new Map<string, ToolSpec>();
  for (const file of filesUnder(toolsDir)) { const s = parseTool(file); if (result.has(s.tool.name)) throw new Error(`duplicate tool ${s.tool.name}`); result.set(s.tool.name, s); }
  return result;
}

export function matches(want: Json, got: Json, present = true): boolean {
  if (!present) return false;
  if (want === null || typeof want === "number" || typeof want === "boolean") return Object.is(want, got);
  if (Array.isArray(want)) return Array.isArray(got) && want.every(w => got.some(g => matches(w, g)));
  if (typeof want === "object") return got !== null && typeof got === "object" && !Array.isArray(got) && Object.keys(want).every(k => matches(want[k], got[k], Object.hasOwn(got, k)));
  if (got === null || got === undefined) return false;
  const text = typeof got === "string" ? got : JSON.stringify(got), lower = text.toLowerCase();
  if (want === "*") return true;
  if (want.startsWith("~")) return lower.includes(want.slice(1).toLowerCase());
  return lower === (want.startsWith("=") ? want.slice(1) : want).toLowerCase();
}

export function selectScenario(spec: ToolSpec, args: Json, forced?: string): Scenario {
  if (forced) { const s = spec.scenarios.find(x => x.name.toLowerCase() === forced.toLowerCase()); if (s) return s; }
  return spec.scenarios.find(s => s.match !== undefined && matches(s.match, args)) ?? spec.scenarios.find(s => s.match === undefined)!;
}

function durationMs(input: string): number {
  if (!input) return 0; let total = 0, used = ""; const r = /(\d+)(ms|s|m|h)/g; let m;
  while ((m = r.exec(input))) { used += m[0]; total += +m[1] * ({ms:1,s:1000,m:60000,h:3600000}[m[2]]!); }
  if (used !== input) throw new Error(`invalid duration ${input}`); return total;
}

function ordinal(n: number) { const v=n%100; return n + (v>=11&&v<=13?"th":n%10===1?"st":n%10===2?"nd":n%10===3?"rd":"th"); }
function timeExpr(expr: string): string | number | undefined {
  const m = expr.match(/^(now|unixms|unix)([+-])?([^@|]+)?(?:@([^|]+))?(?:\|(date|weekday|hhmm|daylabel))?$/); if (!m) return undefined;
  let t = Date.now() + (m[2] === "-" ? -1 : 1) * durationMs(m[3] ?? ""); if (m[4]) { const round = durationMs(m[4]); t = Math.floor(t / round) * round; }
  if (m[1] === "unix") return Math.floor(t/1000); if (m[1] === "unixms") return t;
  if (!m[5]) return new Date(t).toISOString().replace(/\.\d{3}Z$/, "Z");
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone:"Asia/Dubai", year:"numeric", month:"2-digit", day:"2-digit", weekday:"long", hour:"2-digit", minute:"2-digit", hourCycle:"h23" }).formatToParts(new Date(t)).map(p=>[p.type,p.value]));
  if (m[5] === "date") return `${parts.year}-${parts.month}-${parts.day}`; if (m[5] === "weekday") return parts.weekday; if (m[5] === "hhmm") return `${parts.hour}:${parts.minute}`;
  return `${parts.weekday.slice(0,3)}, ${ordinal(+parts.day)} ${new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Dubai",month:"short"}).format(new Date(t))}`;
}

function value(expr: string, args: Json): Json {
  if (expr.startsWith("args.")) return expr.slice(5).split(".").reduce((v,k) => v == null || !Object.hasOwn(Object(v),k) ? null : v[k], args);
  if (expr === "uuid") return randomUUID(); const r = expr.match(/^rand:(\d+)-(\d+)$/); if (r) return randomInt(+r[1], +r[2] + 1);
  const t = timeExpr(expr); if (t !== undefined) return t; throw new Error(`unknown placeholder {{${expr}}}`);
}

export function render(template: string, args: Json): Json {
  let quoted = false, escaped = false, out = "", cursor = 0; const re = /{{\s*([^{}]+?)\s*}}/g; let m;
  while ((m = re.exec(template))) {
    for (const c of template.slice(cursor, m.index)) { if (c === '"' && !escaped) quoted=!quoted; escaped = c === "\\" && !escaped; if (c !== "\\") escaped=false; }
    out += template.slice(cursor,m.index); const v=value(m[1].trim(),args); const encoded=JSON.stringify(v);
    out += quoted ? (typeof v==="string"?encoded.slice(1,-1):encoded.replace(/\\/g,"\\\\").replace(/"/g,'\\"')) : encoded; cursor=re.lastIndex;
  }
  return JSON.parse(out + template.slice(cursor));
}
