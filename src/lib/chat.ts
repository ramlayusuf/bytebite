import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ContentBlock,
  type Message,
  type Tool,
} from "@aws-sdk/client-bedrock-runtime";
import { dishes } from "@/data/dishes";
import { callCareemTool, listCareemTools } from "./careem-mcp";
import { foodKeyword, localIntent, parseBudget, parseMinutes } from "./local-intent";
import { readIndex } from "./uploads";

/* Ask Crave: a chatbot that answers from the app's own dishes plus live Careem menus (MCP).
   Read-only on purpose — adding to the bag stays a button the person presses.

   Answer engines, in order:
     1. Claude (official Anthropic SDK)  — needs ANTHROPIC_API_KEY (or an `ant auth login` profile)
     2. Amazon Bedrock                   — needs AWS credentials
     3. basic mode                       — no model: keyword understanding over the feed + Careem search */

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type ChatResult = { reply: string; toolsUsed: string[]; mode: "claude" | "bedrock" | "basic"; dishIds: string[] };

const CAREEM_TOOLS = ["food_dynamic_search", "food_merchant_search", "food_get_restaurant_menu"];
const FEED_TOOL = "crave_feed_dishes";
const LOCATION = { latitude: 25.0866, longitude: 55.1474 }; // Dubai Marina
const MAX_STEPS = 6;

const SYSTEM = `You are Crave, the food assistant inside a food-discovery app built on Careem Food. The person is in Dubai Marina and prices are in AED.
You have two sources of truth. ${FEED_TOOL} lists the dishes currently featured in the app's video feed (each backed by a real TikTok video). The Careem tools search live Careem menus: dish and restaurant search, and full restaurant menus.
Use the tools to look things up — never invent restaurants, dishes, prices, delivery times or opening hours. If the tools return nothing useful, say so plainly.
Answer the question that was asked. For a recommendation, give at most 3 options with dish, restaurant and price (and delivery time when you have it). For a specific question (a menu, a price, which is cheaper) give just that. Prefer dishes from the feed when they fit, since the person can watch them.
Be brief and friendly. Plain text only: no markdown headings, tables or bold. Mention that they can tap "Add to bag" on a dish in the feed.`;

/* ---- the app's own catalogue (feed dishes + uploaded videos) ---- */

type CatalogDish = {
  id: string;
  name: string;
  restaurant: string;
  cuisine: string;
  price: number;
  match: number;
  description: string;
  ingredients: string[];
};

async function catalog(): Promise<CatalogDish[]> {
  const uploads = await readIndex().catch(() => []);
  return [
    ...uploads.map((u) => ({
      id: `up-${u.id}`,
      name: u.dish,
      restaurant: u.restaurant,
      cuisine: u.cuisine,
      price: u.price,
      match: 85,
      description: u.description,
      ingredients: u.ingredients,
    })),
    ...dishes.filter((d) => d.priceKnown !== false).map((d) => ({
      id: d.id,
      name: d.name,
      restaurant: d.restaurant,
      cuisine: d.cuisine,
      price: d.price,
      match: d.match,
      description: d.description,
      ingredients: d.ingredients ?? [],
    })),
  ];
}

/* which feed dishes does a reply talk about? lets the app show tap-to-watch buttons */
const mentioned = (reply: string, items: CatalogDish[]) => {
  const text = reply.toLowerCase();
  return items.filter((d) => text.includes(d.name.toLowerCase()) || text.includes(d.restaurant.toLowerCase().split(",")[0])).map((d) => d.id);
};

/* ---- shared tool plumbing ---- */

type Raw = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function stripLocation(schema: Record<string, unknown>) {
  const next = structuredClone(schema) as Raw;
  if (next.properties) {
    delete next.properties.latitude;
    delete next.properties.longitude;
  }
  if (Array.isArray(next.required)) next.required = next.required.filter((k: string) => k !== "latitude" && k !== "longitude");
  return next;
}

type ToolDef = { name: string; description: string; schema: Raw };

async function toolDefs(): Promise<ToolDef[]> {
  const careem = (await listCareemTools())
    .filter((t) => CAREEM_TOOLS.includes(t.name))
    .map((t) => ({
      name: t.name,
      description: `${(t.description ?? "").slice(0, 600)} (The person's location is filled in automatically.)`,
      schema: stripLocation(t.inputSchema),
    }));
  return [
    {
      name: FEED_TOOL,
      description:
        "List the dishes featured in the Crave app's video feed, each with restaurant, price in AED, cuisine, description and ingredients. Optionally filter by a maximum price.",
      schema: { type: "object", properties: { max_price: { type: "number", description: "Only dishes at or below this price in AED" } }, additionalProperties: false },
    },
    ...careem,
  ];
}

/* keep tool results small enough to be cheap and readable for the model */
function compact(name: string, data: Raw | null): string {
  if (!data) return "No data.";
  if (name === "food_get_restaurant_menu") return JSON.stringify(data).slice(0, 9000);
  const restaurants = (data.restaurants ?? []).slice(0, 5).map((r: Raw) => ({
    id: r.id,
    name: r.name,
    cuisines: r.cuisines?.map((c: Raw) => c.name),
    rating: r.rating?.average,
    deliveryMinutes: r.delivery?.average,
    deliveryFee: r.delivery?.discounted_fee ?? r.delivery?.fee,
    averagePrice: r.price?.average,
    items: (r.items ?? r.dishes ?? []).slice(0, 5).map((i: Raw) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      price: i.price?.total ?? i.price?.original,
    })),
  }));
  return JSON.stringify({ restaurants });
}

async function runTool(name: string, input: Raw): Promise<string> {
  if (name === FEED_TOOL) {
    const max = Number(input.max_price);
    const items = (await catalog()).filter((d) => !Number.isFinite(max) || d.price <= max);
    return JSON.stringify({
      dishes: items.map((d) => ({ id: d.id, name: d.name, restaurant: d.restaurant, cuisine: d.cuisine, price: d.price, description: d.description, ingredients: d.ingredients })),
    });
  }
  if (!CAREEM_TOOLS.includes(name)) throw new Error(`Tool ${name} is not available`);
  return compact(name, await callCareemTool(name, { ...input, ...LOCATION }));
}

/* ---- 1. Claude, through the official SDK ---- */

const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";
const hasClaudeKey = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

async function claudeAnswer(history: ChatMessage[]): Promise<ChatResult> {
  const client = new Anthropic(); // resolves ANTHROPIC_API_KEY (or an `ant auth login` profile)
  const tools: Anthropic.Beta.BetaTool[] = (await toolDefs()).map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.schema as Anthropic.Beta.BetaTool["input_schema"],
  }));
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
  const toolsUsed: string[] = [];
  const items = await catalog();

  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await client.beta.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 8000,
      system: SYSTEM,
      tools,
      messages,
      output_config: { effort: "low" }, // quick conversational answers; raise for deeper reasoning
      // if a safety classifier ever declines, the API re-runs the request on a fallback model
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    // pass the whole content back (thinking blocks included) so the loop stays valid
    messages.push({ role: "assistant", content: response.content as unknown as Anthropic.Beta.BetaContentBlockParam[] });

    if (response.stop_reason === "tool_use") {
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        toolsUsed.push(block.name);
        try {
          results.push({ type: "tool_result", tool_use_id: block.id, content: await runTool(block.name, (block.input ?? {}) as Raw) });
        } catch (error) {
          results.push({
            type: "tool_result",
            tool_use_id: block.id,
            is_error: true,
            content: error instanceof Error ? error.message : "Tool failed",
          });
        }
      }
      messages.push({ role: "user", content: results });
      continue;
    }
    if (response.stop_reason === "refusal")
      return { reply: "Sorry, I can't help with that one. Ask me about food and I'm all yours.", toolsUsed, mode: "claude", dishIds: [] };

    const reply = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim();
    return { reply: reply || "Sorry, I couldn't put an answer together.", toolsUsed, mode: "claude", dishIds: mentioned(reply, items) };
  }
  return { reply: "That took too many steps. Could you ask it a little more simply?", toolsUsed, mode: "claude", dishIds: [] };
}

/* ---- 2. Amazon Bedrock Converse with tool use ---- */

const hasAwsCredentials = () => !!(process.env.AWS_PROFILE || process.env.AWS_ACCESS_KEY_ID);

async function bedrockAnswer(history: ChatMessage[]): Promise<ChatResult> {
  const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION ?? "us-east-1" });
  const modelId = process.env.BEDROCK_MODEL_ID ?? "amazon.nova-lite-v1:0";
  const tools: Tool[] = (await toolDefs()).map((t) => ({
    toolSpec: { name: t.name, description: t.description, inputSchema: { json: t.schema as never } },
  }));
  const messages: Message[] = history.map((m) => ({ role: m.role, content: [{ text: m.content }] }));
  const toolsUsed: string[] = [];
  const items = await catalog();

  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await client.send(
      new ConverseCommand({
        modelId,
        system: [{ text: SYSTEM }],
        messages,
        toolConfig: { tools },
        inferenceConfig: { maxTokens: 700, temperature: 0.2 },
      }),
    );
    const message = response.output?.message;
    if (!message) break;
    messages.push(message);

    if (response.stopReason === "tool_use") {
      const results: ContentBlock[] = [];
      for (const block of message.content ?? []) {
        if (!block.toolUse) continue;
        const { toolUseId, name = "", input } = block.toolUse;
        toolsUsed.push(name);
        try {
          results.push({ toolResult: { toolUseId, content: [{ text: await runTool(name, (input ?? {}) as Raw) }] } });
        } catch (error) {
          results.push({ toolResult: { toolUseId, status: "error", content: [{ text: error instanceof Error ? error.message : "Tool failed" }] } });
        }
      }
      messages.push({ role: "user", content: results });
      continue;
    }
    const reply = (message.content ?? []).map((b) => b.text).filter(Boolean).join("\n").trim();
    return { reply: reply || "Sorry, I couldn't put an answer together.", toolsUsed, mode: "bedrock", dishIds: mentioned(reply, items) };
  }
  return { reply: "That took too many steps. Could you ask it a little more simply?", toolsUsed, mode: "bedrock", dishIds: [] };
}

/* ---- 3. basic mode: no model, so understand the request with keywords ---- */

const STOP = new Set(["what", "whats", "good", "for", "the", "and", "with", "something", "want", "give", "show", "can", "get", "any", "have", "need", "some", "i'm", "ive", "under", "over", "min", "mins", "minutes", "aed", "please", "food", "eat", "dinner", "lunch", "like", "that", "this", "you", "your", "from", "near", "best", "recommend", "suggest", "me", "a", "an", "to", "in", "of", "is", "are", "it"]);

async function basicAnswer(question: string): Promise<ChatResult> {
  const lower = question.toLowerCase();
  const items = await catalog();
  const budget = parseBudget(question);
  const minutes = parseMinutes(question);

  const cravingTest = /chees/.test(lower)
    ? (d: CatalogDish) => /chees|mozzarella|parmesan/i.test(`${d.description} ${d.ingredients.join(" ")} ${d.name}`)
    : /sweet|dessert/.test(lower)
      ? (d: CatalogDish) => d.cuisine === "Dessert"
      : /health|light|fresh/.test(lower)
        ? (d: CatalogDish) => ["Japanese", "Arabic", "Asian"].includes(d.cuisine)
        : null;
  const words = lower.split(/[^a-z']+/).filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w));
  const haystack = (d: CatalogDish) => `${d.name} ${d.restaurant} ${d.cuisine} ${d.description} ${d.ingredients.join(" ")}`.toLowerCase();
  const wordMatches = items.filter((d) => words.some((w) => haystack(d).includes(w)));

  let pool = cravingTest ? items.filter(cravingTest) : wordMatches.length ? wordMatches : items;
  let note = "";
  if (budget !== null) {
    const within = pool.filter((d) => d.price <= budget);
    if (within.length) pool = within;
    else note = ` (nothing is under AED ${budget}, so these are the closest)`;
  }
  const picks = [...pool].sort((a, b) => (budget !== null && !note ? b.match - a.match : a.price - b.price)).slice(0, 3);

  const parts: string[] = [];
  parts.push(
    `From the feed${budget !== null ? `, up to AED ${budget}` : ""}${note}:\n` +
      picks.map((d) => `• ${d.name} — ${d.restaurant}, AED ${d.price}`).join("\n") +
      `\nTap one below to watch it.`,
  );

  const toolsUsed: string[] = [FEED_TOOL];
  const keyword = foodKeyword(lower);
  if (keyword) {
    try {
      const data = await callCareemTool("food_dynamic_search", { query: keyword, ...LOCATION, sort: "recommended" });
      toolsUsed.push("food_dynamic_search");
      const intent = localIntent(question);
      const live = ((data?.restaurants ?? []) as Raw[])
        .flatMap((r) =>
          (r.items?.length ? r.items : []).map((i: Raw) => ({
            name: i.name as string,
            restaurant: r.name as string,
            price: Number(i.price?.total ?? i.price?.original ?? 0),
            minutes: Number(r.delivery?.average ?? 30),
          })),
        )
        .filter((o) => o.price <= (budget ?? intent.budget) && o.minutes <= (minutes ?? 999))
        .slice(0, 2);
      if (live.length)
        parts.push(`Also on Careem right now:\n${live.map((o) => `• ${o.name} — ${o.restaurant}, AED ${o.price}, ${o.minutes} min`).join("\n")}`);
    } catch {
      /* the feed answer above is still useful when Careem search is unavailable */
    }
  }
  return { reply: parts.join("\n\n"), toolsUsed, mode: "basic", dishIds: picks.map((d) => d.id) };
}

/* ---- entry point ---- */

let claudeDownUntil = 0;

export async function answer(history: ChatMessage[]): Promise<ChatResult> {
  if (hasClaudeKey() && Date.now() > claudeDownUntil) {
    try {
      return await claudeAnswer(history);
    } catch (error) {
      console.error("Ask Crave: Claude path failed:", error);
      if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) claudeDownUntil = Date.now() + 60_000;
    }
  }
  if (hasAwsCredentials()) {
    try {
      return await bedrockAnswer(history);
    } catch (error) {
      console.error("Ask Crave: Bedrock path failed:", error);
    }
  }
  const last = [...history].reverse().find((m) => m.role === "user");
  return basicAnswer(last?.content ?? "");
}
