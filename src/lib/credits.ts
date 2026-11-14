import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { UPLOAD_DIR, readIndex } from "./uploads";

/* Creator credits: every order that includes a dish from an uploaded video earns that video's
   uploader credits; enough credits buy a free delivery. Local/dev store only — a real version would
   verify orders with Careem's order system, authenticate creators and guard against fraud. */
export const CREDITS_PER_ORDER = 10;
export const FREE_DELIVERY_COST = 50;

const FILE = join(UPLOAD_DIR, "credits.json");
type Ledger = { orders: Record<string, number>; redeemed: Record<string, number> };

let queue: Promise<unknown> = Promise.resolve();
const serial = <T,>(task: () => Promise<T>): Promise<T> => {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
};

async function read(): Promise<Ledger> {
  try {
    const l = JSON.parse(await readFile(FILE, "utf8")) as Partial<Ledger>;
    return { orders: l.orders ?? {}, redeemed: l.redeemed ?? {} };
  } catch {
    return { orders: {}, redeemed: {} };
  }
}
async function write(ledger: Ledger) {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const tmp = `${FILE}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(ledger));
  await rename(tmp, FILE);
}

type Index = Awaited<ReturnType<typeof readIndex>>;

function compute(ledger: Ledger, index: Index, tokens: Record<string, string>, clientId: string) {
  const mine = index.filter((r) => tokens[r.id] && tokens[r.id] === r.deleteToken);
  const uploads = mine.map((r) => {
    const orders = ledger.orders[r.id] ?? 0;
    return { id: r.id, dish: r.dish, restaurant: r.restaurant, orders, credits: orders * CREDITS_PER_ORDER };
  });
  const earned = uploads.reduce((s, u) => s + u.credits, 0);
  const spent = ledger.redeemed[clientId] ?? 0;
  const balance = Math.max(0, earned - spent);
  return {
    earned,
    spent,
    balance,
    vouchers: Math.floor(balance / FREE_DELIVERY_COST),
    uploads,
    perOrder: CREDITS_PER_ORDER,
    perVoucher: FREE_DELIVERY_COST,
  };
}

/* a customer placed an order containing dishes from these uploads */
export function recordOrder(uploadIds: string[], clientId: string): Promise<number> {
  return serial(async () => {
    const index = await readIndex();
    const valid = [...new Set(uploadIds)].filter((id) => index.some((r) => r.id === id && r.ownerClient !== clientId));
    if (!valid.length) return 0;
    const ledger = await read();
    for (const id of valid) ledger.orders[id] = (ledger.orders[id] ?? 0) + 1;
    await write(ledger);
    return valid.length;
  });
}

export async function creditSummary(tokens: Record<string, string>, clientId: string) {
  return compute(await read(), await readIndex(), tokens, clientId);
}

/* spend credits on one free delivery */
export function redeemFreeDelivery(tokens: Record<string, string>, clientId: string) {
  return serial(async () => {
    const ledger = await read();
    const index = await readIndex();
    const before = compute(ledger, index, tokens, clientId);
    if (before.vouchers < 1) return { ok: false, summary: before };
    ledger.redeemed[clientId] = (ledger.redeemed[clientId] ?? 0) + FREE_DELIVERY_COST;
    await write(ledger);
    return { ok: true, summary: compute(ledger, index, tokens, clientId) };
  });
}
