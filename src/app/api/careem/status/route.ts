import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { listCareemTools } from "@/lib/careem-mcp";

export async function GET() {
  const token = (await cookies()).get("careem_access_token")?.value;
  if (!token) return NextResponse.json({ connected: false }, { status: 401 });
  try {
    const tools = await listCareemTools(token);
    return NextResponse.json({ connected: true, tools: tools.length });
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        error:
          error instanceof Error ? error.message : "Careem connection failed",
      },
      { status: 401 },
    );
  }
}
