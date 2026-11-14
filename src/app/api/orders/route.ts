import { NextResponse } from "next/server";
import { recordOrder } from "@/lib/credits";

const ID = /^[A-Za-z0-9_-]{1,64}$/;

/* The app reports an order here; uploaders of the videos it came from earn credits. */
export async function POST(request: Request) {
  try {
    const { uploadIds, clientId } = await request.json();
    if (!Array.isArray(uploadIds) || typeof clientId !== "string" || !ID.test(clientId))
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    const ids = uploadIds.filter((i): i is string => typeof i === "string" && ID.test(i)).slice(0, 20);
    return NextResponse.json({ credited: await recordOrder(ids, clientId) });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
