import "server-only";

const endpoint = process.env.CAREEM_MCP_URL ?? "http://127.0.0.1:8787/mcp";
let rpcId = 1;

function unpack(text: string) {
  if (!text.trim()) return {};
  if (text.trim().startsWith("{")) return JSON.parse(text);
  const data = text.split(/\r?\n/).find(line => line.startsWith("data: "))?.slice(6);
  if (!data) throw new Error("Careem MCP returned an unreadable response");
  return JSON.parse(data);
}

async function post(body: unknown, session?: string) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...(session ? { "mcp-session-id": session } : {}) },
    body: JSON.stringify(body), cache: "no-store",
  });
  if (!response.ok) throw new Error(`Careem MCP request failed (${response.status})`);
  return { payload: unpack(await response.text()), session: response.headers.get("mcp-session-id") ?? session };
}

export async function callCareemTool(name: string, args: Record<string, unknown>) {
  const initialized = await post({ jsonrpc: "2.0", id: rpcId++, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "careem-choice", version: "1.0.0" } } });
  if (!initialized.session) throw new Error("Careem MCP did not create a session");
  await post({ jsonrpc: "2.0", method: "notifications/initialized" }, initialized.session);
  const called = await post({ jsonrpc: "2.0", id: rpcId++, method: "tools/call", params: { name, arguments: args } }, initialized.session);
  if (called.payload.error) throw new Error(called.payload.error.message);
  const result = called.payload.result;
  if (result?.isError) throw new Error(result.content?.[0]?.text ?? "Careem MCP tool failed");
  return result?.structuredContent ?? JSON.parse(result?.content?.[0]?.text ?? "null");
}
