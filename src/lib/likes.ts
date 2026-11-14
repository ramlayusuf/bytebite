import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { UPLOAD_DIR } from "./uploads";

/* Real like counts: how many different people (browsers) have loved each dish in this app.
   TikTok's own like numbers aren't available through its embed player. Local/dev store only. */
const FILE = join(UPLOAD_DIR, "likes.json");
type Likes = Record<string, string[]>;

let queue: Promise<unknown> = Promise.resolve();
const serial = <T,>(task: () => Promise<T>): Promise<T> => {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
};

async function read(): Promise<Likes> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as Likes;
  } catch {
    return {};
  }
}

export async function likeCounts(): Promise<Record<string, number>> {
  const likes = await read();
  return Object.fromEntries(Object.entries(likes).map(([id, people]) => [id, people.length]));
}

export function setLike(dishId: string, clientId: string, liked: boolean): Promise<number> {
  return serial(async () => {
    const likes = await read();
    const people = new Set(likes[dishId] ?? []);
    if (liked) {
      if (people.size < 100_000) people.add(clientId);
    } else people.delete(clientId);
    likes[dishId] = [...people];
    await mkdir(UPLOAD_DIR, { recursive: true });
    const tmp = `${FILE}.${randomUUID()}.tmp`;
    await writeFile(tmp, JSON.stringify(likes));
    await rename(tmp, FILE);
    return people.size;
  });
}
