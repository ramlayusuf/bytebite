import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

/* A tiny file-backed store for videos that restaurants and customers upload. Local/dev only:
   production would want object storage, authentication and moderation. */
export const UPLOAD_DIR = join(process.cwd(), ".uploads");
const INDEX = join(UPLOAD_DIR, "index.json");

export const CUISINES = ["Burgers", "Arabic", "Japanese", "Italian", "Asian", "Indian", "Dessert", "Other"] as const;
export const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
export const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_POSTER_BYTES = 2 * 1024 * 1024;

export type UploadRecord = {
  id: string;
  file: string;
  mime: string;
  poster?: string;
  posterMime?: string;
  uploaderType: "restaurant" | "customer";
  restaurant: string;
  dish: string;
  price: number;
  cuisine: (typeof CUISINES)[number];
  description: string;
  ingredients: string[];
  /* every dish shown in the video (the first is also `dish` / `price`) */
  items?: { name: string; price: number }[];
  uploaderName?: string;
  createdAt: number;
  deleteToken: string;
};

let queue: Promise<unknown> = Promise.resolve();
const serial = <T,>(task: () => Promise<T>): Promise<T> => {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
};

export async function readIndex(): Promise<UploadRecord[]> {
  try {
    return JSON.parse(await readFile(INDEX, "utf8")) as UploadRecord[];
  } catch {
    return [];
  }
}
async function writeIndex(list: UploadRecord[]) {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const tmp = `${INDEX}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(list, null, 2));
  await rename(tmp, INDEX);
}

export async function findUpload(id: string) {
  return (await readIndex()).find((r) => r.id === id);
}

export async function saveUpload(
  meta: Omit<UploadRecord, "id" | "file" | "poster" | "posterMime" | "createdAt" | "deleteToken" | "mime">,
  video: File,
  poster: File | null,
) {
  const id = randomUUID();
  const file = `${id}.${VIDEO_TYPES[video.type]}`;
  const posterFile = poster ? `${id}.${IMAGE_TYPES[poster.type]}` : undefined;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(join(UPLOAD_DIR, file), Buffer.from(await video.arrayBuffer()));
  if (poster && posterFile) await writeFile(join(UPLOAD_DIR, posterFile), Buffer.from(await poster.arrayBuffer()));
  const record: UploadRecord = {
    ...meta,
    id,
    file,
    mime: video.type,
    poster: posterFile,
    posterMime: poster?.type,
    createdAt: Date.now(),
    deleteToken: randomUUID(),
  };
  await serial(async () => writeIndex([record, ...(await readIndex())]));
  return record;
}

export async function removeUpload(id: string, token: string) {
  return serial(async () => {
    const list = await readIndex();
    const rec = list.find((r) => r.id === id);
    if (!rec || rec.deleteToken !== token) return false;
    await rm(join(UPLOAD_DIR, rec.file), { force: true });
    if (rec.poster) await rm(join(UPLOAD_DIR, rec.poster), { force: true });
    await writeIndex(list.filter((r) => r.id !== id));
    return true;
  });
}

/* what the browser is allowed to see (never the delete token) */
export const publicView = (r: UploadRecord) => ({
  id: r.id,
  hasPoster: !!r.poster,
  uploaderType: r.uploaderType,
  restaurant: r.restaurant,
  dish: r.dish,
  price: r.price,
  cuisine: r.cuisine,
  description: r.description,
  ingredients: r.ingredients,
  items: r.items,
  uploaderName: r.uploaderName,
  createdAt: r.createdAt,
});
