import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { callCareemTool } from "@/lib/careem-mcp";

/* Careem MCP responses are narrowed at the route boundary. */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = Record<string, any>;
type PendingAdd = {
  merchantId: number;
  itemId: string;
  latitude: number;
  longitude: number;
  name: string;
  restaurant: string;
  price: number;
  groups: Raw[];
  expires: number;
};
type PendingGroup = {
  merchantId: number;
  latitude: number;
  longitude: number;
  restaurant: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
    groups: Raw[];
  }>;
  expires: number;
};
const pendingAdds = new Map<string, PendingAdd>();
const pendingGroups = new Map<string, PendingGroup>();

function publicGroups(groups: Raw[]) {
  return groups.map((group: Raw) => ({
    name: group.name,
    min: group.min,
    max: group.max,
    options: (group.options ?? [])
      .filter((option: Raw) => option.is_active !== false)
      .map((option: Raw) => ({
        id: option.catalog_option_id,
        name: option.name,
        price: Number(option.price?.total ?? option.price?.original ?? option.price ?? 0),
      })),
  }));
}

export async function POST(request: Request) {
  try {
    const token = (await cookies()).get("careem_access_token")?.value;
    if (!token)
      return NextResponse.json(
        { error: "Connect Careem before changing a real basket." },
        { status: 401 },
      );
    const body = await request.json();

    if (body.action === "prepare") {
      const latitude = Number(body.latitude),
        longitude = Number(body.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude))
        return NextResponse.json(
          { error: "A valid delivery location is required." },
          { status: 400 },
        );
      const search = await callCareemTool(
        "food_dish_search",
        {
          query: String(body.dishName),
          latitude,
          longitude,
          items_limit: 10,
          limit: 20,
        },
        token,
      );
      if (search.error) throw new Error(search.error);
      const restaurants: Raw[] = search.restaurants ?? [];
      const wanted = String(body.restaurantName ?? "").toLowerCase();
      const restaurant =
        restaurants.find(
          (item) =>
            item.name?.toLowerCase().includes(wanted) ||
            wanted.includes(item.name?.toLowerCase()),
        ) ?? restaurants[0];
      if (!restaurant)
        return NextResponse.json(
          { error: "That dish is not currently available near you on Careem." },
          { status: 404 },
        );
      const items: Raw[] = restaurant.items ?? [];
      const dishName = String(body.dishName).toLowerCase();
      const item =
        items.find(
          (value) =>
            value.name?.toLowerCase().includes(dishName) ||
            dishName.includes(value.name?.toLowerCase()),
        ) ?? items[0];
      if (!item)
        return NextResponse.json(
          {
            error: `No orderable ${body.dishName} was found at ${restaurant.name}.`,
          },
          { status: 404 },
        );
      const optionData = await callCareemTool(
        "food_get_item_options",
        {
          restaurant_id: Number(restaurant.id),
          item_id: Number(item.id),
          latitude,
          longitude,
          domain: "food",
        },
        token,
      );
      if (optionData.error) throw new Error(optionData.error);
      const groups = (optionData.option_groups ?? []).filter(
        (group: Raw) => group.required || Number(group.min ?? 0) > 0,
      );
      const confirmationId = crypto.randomUUID();
      const pending: PendingAdd = {
        merchantId: Number(restaurant.id),
        itemId: String(item.id),
        latitude,
        longitude,
        name: item.name,
        restaurant: restaurant.name,
        price: Number(item.price?.total ?? item.price?.original ?? 0),
        groups,
        expires: Date.now() + 5 * 60_000,
      };
      pendingAdds.set(confirmationId, pending);
      return NextResponse.json({
        confirmationId,
        item: {
          name: pending.name,
          restaurant: pending.restaurant,
          price: pending.price,
        },
        requiredOptions: publicGroups(groups),
      });
    }

    if (body.action === "prepare-group") {
      const latitude = Number(body.latitude),
        longitude = Number(body.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude))
        return NextResponse.json(
          { error: "A valid delivery location is required." },
          { status: 400 },
        );

      const merchants = await callCareemTool(
        "food_merchant_search",
        {
          query: String(body.restaurantName || "burgers"),
          latitude,
          longitude,
          limit: 10,
          domain: "food",
        },
        token,
      );
      if (merchants.error) throw new Error(merchants.error);
      const merchantList: Raw[] =
        merchants.restaurants ?? merchants.merchants ?? merchants.items ?? [];
      const merchant = merchantList[0];
      if (!merchant)
        return NextResponse.json(
          { error: "No orderable restaurant was found near the host." },
          { status: 404 },
        );

      const itemSearch = await callCareemTool(
        "food_search_restaurant_items",
        {
          restaurant_id: Number(merchant.id),
          query: String(body.query || "burger"),
          latitude,
          longitude,
          limit: 30,
          domain: "food",
        },
        token,
      );
      if (itemSearch.error) throw new Error(itemSearch.error);
      const candidates: Raw[] =
        itemSearch.items ?? itemSearch.dishes ?? itemSearch.results ?? [];
      const selected = candidates
        .filter(
          (item) =>
            item.active !== false && item.is_active !== false && item.id && item.name,
        )
        .slice(0, 3);
      if (selected.length < 3)
        return NextResponse.json(
          {
            error: `${merchant.name} does not currently have three matching orderable dishes.`,
          },
          { status: 404 },
        );

      const items = await Promise.all(
        selected.map(async (item) => {
          const optionData = await callCareemTool(
            "food_get_item_options",
            {
              restaurant_id: Number(merchant.id),
              item_id: Number(item.id),
              latitude,
              longitude,
              domain: "food",
            },
            token,
          );
          if (optionData.error) throw new Error(optionData.error);
          return {
            id: String(item.id),
            name: String(item.name),
            price: Number(item.price?.total ?? item.price?.original ?? 0),
            imageUrl: item.image_url ?? item.imageUrl,
            groups: (optionData.option_groups ?? []).filter(
              (group: Raw) => group.required || Number(group.min ?? 0) > 0,
            ),
          };
        }),
      );
      const confirmationId = crypto.randomUUID();
      pendingGroups.set(confirmationId, {
        merchantId: Number(merchant.id),
        latitude,
        longitude,
        restaurant: String(merchant.name),
        items,
        expires: Date.now() + 10 * 60_000,
      });
      return NextResponse.json({
        confirmationId,
        restaurant: merchant.name,
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          imageUrl: item.imageUrl,
          requiredOptions: publicGroups(item.groups),
        })),
      });
    }

    if (body.action === "commit") {
      const pending = pendingAdds.get(String(body.confirmationId));
      pendingAdds.delete(String(body.confirmationId));
      if (!pending || pending.expires < Date.now())
        return NextResponse.json(
          { error: "This basket confirmation expired. Please try again." },
          { status: 409 },
        );
      const selected: string[] = Array.isArray(body.options)
        ? body.options.map(String)
        : [];
      for (const group of pending.groups) {
        const allowed = new Set(
          (group.options ?? []).map((option: Raw) =>
            String(option.catalog_option_id),
          ),
        );
        const count = selected.filter((id) => allowed.has(id)).length;
        if (count < Number(group.min ?? 1) || count > Number(group.max ?? 1))
          return NextResponse.json(
            { error: `Choose ${group.name} before adding this dish.` },
            { status: 400 },
          );
      }
      const result = await callCareemTool(
        "cart_add_item",
        {
          merchant_id: pending.merchantId,
          catalog_item_id: pending.itemId,
          count: 1,
          latitude: pending.latitude,
          longitude: pending.longitude,
          domain: "food",
          options: selected.map((id) => ({ catalog_option_id: id, count: 1 })),
        },
        token,
      );
      if (result.error) throw new Error(result.error);
      return NextResponse.json({
        ok: true,
        basket: result.basket,
        merchant: result.merchant,
        item: { name: pending.name, restaurant: pending.restaurant },
      });
    }

    if (body.action === "commit-group") {
      const key = String(body.confirmationId);
      const pending = pendingGroups.get(key);
      pendingGroups.delete(key);
      if (!pending || pending.expires < Date.now())
        return NextResponse.json(
          { error: "This group basket confirmation expired. Prepare it again." },
          { status: 409 },
        );
      const selections: Record<string, string[]> = body.selections ?? {};
      const items = pending.items.map((item) => {
        const selected = Array.isArray(selections[item.id])
          ? selections[item.id].map(String)
          : [];
        for (const group of item.groups) {
          const allowed = new Set(
            (group.options ?? []).map((option: Raw) =>
              String(option.catalog_option_id),
            ),
          );
          const count = selected.filter((id) => allowed.has(id)).length;
          if (count < Number(group.min ?? 1) || count > Number(group.max ?? 1))
            throw new Error(`Choose ${group.name} for ${item.name}.`);
        }
        return {
          catalog_item_id: item.id,
          count: 1,
          options: selected.map((id) => ({ catalog_option_id: id, count: 1 })),
        };
      });
      const result = await callCareemTool(
        "cart_add_items",
        {
          merchant_id: pending.merchantId,
          items,
          latitude: pending.latitude,
          longitude: pending.longitude,
          domain: "food",
        },
        token,
      );
      if (result.error) throw new Error(result.error);
      const failed = (result.results ?? []).filter(
        (entry: Raw) => entry.success === false,
      );
      return NextResponse.json({
        ok: failed.length === 0,
        partial: failed.length > 0,
        failures: failed,
        basket: result.basket,
        restaurant: pending.restaurant,
      });
    }

    return NextResponse.json(
      { error: "Unknown basket action." },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Basket update failed",
      },
      { status: 500 },
    );
  }
}
