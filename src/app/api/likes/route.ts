import { NextResponse } from "next/server";
import { likeCounts, setLike } from "@/lib/likes";

const ID = /^[A-Za-z0-9_-]{1,64}$/;

export async function GET(request: Request) {
  void request.url; // reads request data, so this always runs at request time
  return NextResponse.json({ counts: await likeCounts() });
}

export async function POST(request: Request) {
  try {
    const { dishId, clientId, liked } = await request.json();
    if (typeof dishId !== "string" || typeof clientId !== "string" || !ID.test(dishId) || !ID.test(clientId))
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    return NextResponse.json({ count: await setLike(dishId, clientId, liked === true) });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
