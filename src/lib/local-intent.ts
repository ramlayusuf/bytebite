/* Keyword-based understanding of a food request. Used when no AI model is configured:
   by /api/recommend's fallback and by Ask Crave's basic mode. */
export type Intent = { query: string; budget: number; maxMinutes: number; priorities: string[]; source: "bedrock" | "local" };

export function parseBudget(text: string): number | null {
  const m = text.match(/(?:aed|dh|dhs|under|below|budget|max|less than|up to)\s*(\d{2,3})|(\d{2,3})\s*(?:aed|dh|dhs)\b/i);
  const value = m ? Number(m[1] ?? m[2]) : NaN;
  return Number.isFinite(value) ? value : null;
}

export function parseMinutes(text: string): number | null {
  const m = text.match(/(\d{2})\s*(?:min|minute)/i);
  return m ? Number(m[1]) : null;
}

/* the food words the Careem sandbox actually has dish data for */
export function foodKeyword(lower: string): string | null {
  if (/pizza|chees/.test(lower)) return "pizza";
  if (/syrniki|breakfast/.test(lower)) return "breakfast";
  if (/chicken/.test(lower)) return "chicken";
  if (/sushi|japanese/.test(lower)) return "sushi";
  if (/bowl|healthy|salad/.test(lower)) return "bowl";
  if (/shawarma|arabic/.test(lower)) return "shawarma";
  return null;
}

export function localIntent(prompt: string): Intent {
  const lower = prompt.toLowerCase();
  return {
    query: foodKeyword(lower) ?? "chicken",
    budget: parseBudget(prompt) ?? 45,
    maxMinutes: parseMinutes(prompt) ?? 30,
    priorities: [lower.includes("protein") ? "high protein" : "taste match", "budget fit", "fast delivery"],
    source: "local",
  };
}
