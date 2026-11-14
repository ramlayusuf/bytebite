import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { UPLOAD_DIR, findUpload } from "@/lib/uploads";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const rec = await findUpload(id);
  if (!rec?.poster) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(join(UPLOAD_DIR, rec.poster));
    return new Response(data, { headers: { "content-type": rec.posterMime ?? "image/jpeg", "cache-control": "public, max-age=3600" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
