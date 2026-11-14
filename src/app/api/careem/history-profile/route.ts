import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { callCareemTool } from "@/lib/careem-mcp";
import type { Cuisine } from "@/types/dish";

/* Production activity payloads are normalized at this route boundary. */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = Record<string, any>;

const cuisineRules: Array<[Cuisine, RegExp]> = [
  ["Burgers", /burger|slider|beef patty/i],
  ["Arabic", /shawarma|hummus|falafel|kebab|kabob|manakish|saj|levant|leban/i],
  ["Japanese", /sushi|salmon|tuna|ramen|maki|nigiri|wagyu|teriyaki/i],
  ["Italian", /pizza|pasta|spaghetti|tagliatelle|risotto|mozzarella|parmesan/i],
  ["Indian", /biryani|curry|masala|tikka|syrniki|dosa|paneer/i],
  ["Dessert", /kunafa|knafeh|cake|sweet|chocolate|ice cream|dessert/i],
  ["Asian", /bao|noodle|dumpling|thai|korean|chinese/i],
];

function inferCuisine(text: string) {
  return cuisineRules.find(([, pattern]) => pattern.test(text))?.[0];
}

export async function GET() {
  try {
    const token = (await cookies()).get("careem_access_token")?.value;
    if (!token)
      return NextResponse.json(
        { error: "Connect Careem to personalize from order history." },
        { status: 401 },
      );

    const activities: Raw[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 3; page += 1) {
      const result = await callCareemTool(
        "get_activities",
        {
          activity_status: "past",
          activity_type: "food",
          ...(cursor ? { next_cursor: cursor } : {}),
        },
        token,
      );
      if (result.error) throw new Error(result.error);
      activities.push(...(result.past_activities ?? []));
      cursor = result.paging?.next_cursor || undefined;
      if (!cursor) break;
    }

    const spendByCuisine: Partial<Record<Cuisine, number[]>> = {};
    const cuisineAffinity: Partial<Record<Cuisine, number>> = {};
    const restaurantAffinity: Record<string, number> = {};
    const priceSamples: number[] = [];

    for (const activity of activities) {
      const data = activity.data ?? {};
      const restaurant = String(
        data.merchant_name ?? activity.presentation_data?.title ?? "",
      ).trim();
      if (restaurant)
        restaurantAffinity[restaurant.toLowerCase()] = Math.min(
          12,
          (restaurantAffinity[restaurant.toLowerCase()] ?? 0) + 3,
        );

      const orderTotal = Number(
        activity.pricing?.total_price ?? data.total_price ?? 0,
      );
      if (Number.isFinite(orderTotal) && orderTotal > 0)
        priceSamples.push(orderTotal);

      for (const item of data.items ?? []) {
        const cuisine = inferCuisine(`${restaurant} ${item.name ?? ""}`);
        if (!cuisine) continue;
        const amount = Number(item.amount ?? 0);
        const quantity = Math.max(1, Number(item.quantity ?? 1));
        const unitSpend = amount / quantity;
        if (Number.isFinite(unitSpend) && unitSpend > 0)
          spendByCuisine[cuisine] = [
            ...(spendByCuisine[cuisine] ?? []),
            unitSpend,
          ].slice(-12);
        cuisineAffinity[cuisine] = Math.min(
          12,
          (cuisineAffinity[cuisine] ?? 0) + 2,
        );
      }
    }

    return NextResponse.json({
      profile: {
        cuisineAffinity,
        restaurantAffinity,
        spendByCuisine,
        priceSamples: priceSamples.slice(-20),
        careemHistoryVersion: activities
          .map((activity) => activity.reference_id)
          .filter(Boolean)
          .join("|"),
      },
      ordersAnalyzed: activities.length,
      source: "careem_get_activities",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not read Careem order history",
      },
      { status: 500 },
    );
  }
}
