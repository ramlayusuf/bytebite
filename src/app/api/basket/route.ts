import { NextResponse } from "next/server";
import { callCareemTool } from "@/lib/careem-mcp";

export async function POST(request: Request) {
  try {
    const { merchantId, itemId } = await request.json();
    await callCareemTool("cart_add_item", { merchant_id: Number(merchantId), catalog_item_id: String(itemId), count: 1, latitude: 25.0866, longitude: 55.1474, domain: "food" });
    return NextResponse.json({ ok: true, tool: "cart_add_item" });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Basket update failed" }, { status: 500 }); }
}
