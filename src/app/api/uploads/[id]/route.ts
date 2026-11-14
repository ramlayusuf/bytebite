import { NextResponse } from "next/server";
import { removeUpload } from "@/lib/uploads";

/* Delete needs the secret token handed back when the video was uploaded (kept in that browser). */
export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const token = request.headers.get("x-delete-token") ?? "";
  const ok = await removeUpload(id, token);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Not allowed" }, { status: 403 });
}
