import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { UPLOAD_DIR, findUpload } from "@/lib/uploads";

/* Streams an uploaded video with HTTP Range support (needed for seeking and for Safari). */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const rec = await findUpload(id);
  if (!rec) return new Response("Not found", { status: 404 });
  const path = join(UPLOAD_DIR, rec.file);
  let size: number;
  try {
    size = (await stat(path)).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }
  let start = 0;
  let end = size - 1;
  let status = 200;
  const range = request.headers.get("range");
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!m || (m[1] === "" && m[2] === "")) return new Response("Bad range", { status: 416 });
    if (m[1] === "") start = Math.max(0, size - Number(m[2]));
    else {
      start = Number(m[1]);
      if (m[2] !== "") end = Math.min(Number(m[2]), size - 1);
    }
    if (start > end || start >= size) return new Response("Bad range", { status: 416, headers: { "content-range": `bytes */${size}` } });
    status = 206;
  }
  const body = Readable.toWeb(createReadStream(path, { start, end })) as unknown as BodyInit;
  return new Response(body, {
    status,
    headers: {
      "content-type": rec.mime,
      "accept-ranges": "bytes",
      "content-length": String(end - start + 1),
      ...(status === 206 ? { "content-range": `bytes ${start}-${end}/${size}` } : {}),
      "cache-control": "public, max-age=3600",
    },
  });
}
