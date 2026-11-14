import "server-only";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { localIntent, type Intent } from "./local-intent";

export type { Intent } from "./local-intent";

export async function understandIntent(prompt: string): Promise<Intent> {
  if (!process.env.AWS_PROFILE && !process.env.AWS_ACCESS_KEY_ID) return localIntent(prompt);
  try {
    const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION ?? "us-east-1" });
    const response = await client.send(new ConverseCommand({ modelId: process.env.BEDROCK_MODEL_ID ?? "amazon.nova-lite-v1:0", system: [{ text: "Extract a food search intent. Return JSON only with query (one of chicken, pizza, sushi, breakfast, bowl, shawarma), budget number, maxMinutes number, and priorities string array." }], messages: [{ role: "user", content: [{ text: prompt }] }], inferenceConfig: { maxTokens: 180, temperature: 0 } }));
    const text = response.output?.message?.content?.find(part => "text" in part)?.text ?? "";
    const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
    return { query: parsed.query, budget: Number(parsed.budget) || 45, maxMinutes: Number(parsed.maxMinutes) || 30, priorities: parsed.priorities ?? ["best match"], source: "bedrock" };
  } catch (error) { console.error("Bedrock intent fallback:", error); return localIntent(prompt); }
}
