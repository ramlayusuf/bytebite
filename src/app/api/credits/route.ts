import { NextResponse } from "next/server";
import { creditSummary } from "@/lib/credits";

const ID = /^[A-Za-z0-9_-]{1,64}$/;

/* POST (not GET) because the body carries the secret upload tokens that prove ownership. */
export async function POST(request: Request) {
  try {
    const { tokens, clientId } = await request.json();
    if (typeof clientId !== "string" || !ID.test(clientId) || typeof tokens !== "object" || tokens === null)
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    const clean: Record<string, string> = {};
    for (const [id, token] of Object.entries(tokens as Record<string, unknown>).slice(0, 200))
      if (ID.test(id) && typeof token === "string" && token.length <= 80) clean[id] = token;
    return NextResponse.json(await creditSummary(clean, clientId));
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
