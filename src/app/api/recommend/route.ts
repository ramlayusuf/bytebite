import { NextResponse } from "next/server";
import { callCareemTool } from "@/lib/careem-mcp";
import { understandIntent } from "@/lib/intent";

/* The MCP payload mirrors a broad production schema and is narrowed at the response boundary. */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = Record<string, any>;

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    if (typeof prompt !== "string" || !prompt.trim()) return NextResponse.json({ error: "Tell us what you feel like eating." }, { status: 400 });
    const intent = await understandIntent(prompt);
    const data = await callCareemTool("food_dynamic_search", { query: intent.query, latitude: 25.0866, longitude: 55.1474, sort: "recommended" });
    const recommendations = (data.restaurants ?? []).flatMap((restaurant: Raw) => (restaurant.items?.length ? restaurant.items : [{ name: `${restaurant.name} favourites`, id: `${restaurant.id}01`, description: restaurant.cuisines?.map((c: Raw) => c.name).join(" · "), price: { total: restaurant.price?.average ?? 45 }, image_url: restaurant.image_url }]).map((item: Raw) => {
      const price = Number(item.price?.total ?? item.price?.original ?? restaurant.price?.average ?? 0), minutes = Number(restaurant.delivery?.average ?? 30);
      const budgetFit = price <= intent.budget, timeFit = minutes <= intent.maxMinutes;
      const score = Math.min(Math.round(80 + (budgetFit ? 8 : 0) + (timeFit ? 6 : 0) + Number(restaurant._score ?? 0) * 5), 99);
      return { id: String(item.id), merchantId: restaurant.id, name: item.name, restaurant: restaurant.name, description: item.description ?? "A strong match for your craving.", image: item.image_url ?? restaurant.image_url, price, minutes, rating: restaurant.rating?.average ?? 4.5, deliveryFee: restaurant.delivery?.discounted_fee ?? restaurant.delivery?.fee ?? 0, score, reasons: [budgetFit ? `Within AED ${intent.budget}` : `AED ${price - intent.budget} over budget`, timeFit ? `Arrives within ${intent.maxMinutes} min` : `${minutes} min delivery`, intent.priorities[0] ?? "Strong taste match"] };
    })).sort((a: Raw, b: Raw) => b.score - a.score).slice(0, 3);
    return NextResponse.json({ intent, recommendations, tools: ["food_dynamic_search"] });
  } catch (error) { console.error(error); return NextResponse.json({ error: error instanceof Error ? error.message : "Could not reach Careem MCP" }, { status: 500 }); }
}
