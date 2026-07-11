import { getBlobToken } from "./blobToken";

export interface UserRecord {
  freeUsed: number;
  credits: number;
  createdAt: number;
}

export const FREE_TRIES = Number(process.env.FREE_TRIES ?? 3);

const ANON_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidAnonId(id: unknown): id is string {
  return typeof id === "string" && ANON_ID_RE.test(id);
}

/**
 * Anonymous, account-less users: the browser mints a UUID once and sends it
 * with every call; the server keeps the authoritative free-quota/credit
 * balance in Blob. Same in-memory fallback story as jobStore for local dev.
 */
const isBlobBacked = () => Boolean(getBlobToken());

const globalStore = globalThis as unknown as {
  __petphotorevive_users?: Map<string, UserRecord>;
};
const memUsers = globalStore.__petphotorevive_users ?? new Map<string, UserRecord>();
globalStore.__petphotorevive_users = memUsers;

function pathFor(anonId: string): string {
  return `users/${anonId.toLowerCase()}.json`;
}

async function blobRead(anonId: string): Promise<UserRecord | undefined> {
  try {
    const { get } = await import("@vercel/blob");
    const res = await get(pathFor(anonId), { access: "private", useCache: false, token: getBlobToken() });
    if (!res?.stream) return undefined;
    return (await new Response(res.stream).json()) as UserRecord;
  } catch {
    return undefined;
  }
}

async function blobWrite(anonId: string, rec: UserRecord): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(pathFor(anonId), JSON.stringify(rec), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    token: getBlobToken(),
  });
}

export async function getUser(anonId: string): Promise<UserRecord> {
  const fresh: UserRecord = { freeUsed: 0, credits: 0, createdAt: Date.now() };
  if (isBlobBacked()) return (await blobRead(anonId)) ?? fresh;
  return memUsers.get(anonId) ?? fresh;
}

async function saveUser(anonId: string, rec: UserRecord): Promise<void> {
  if (isBlobBacked()) {
    await blobWrite(anonId, rec);
    return;
  }
  memUsers.set(anonId, rec);
}

/** Consumes one free try if available. Returns updated record or null when exhausted. */
export async function consumeFreeTry(anonId: string): Promise<UserRecord | null> {
  const rec = await getUser(anonId);
  if (rec.freeUsed >= FREE_TRIES) return null;
  rec.freeUsed += 1;
  await saveUser(anonId, rec);
  return rec;
}

/** Spends credits (e.g. 1 per HD portrait). Returns updated record or null if insufficient. */
export async function spendCredits(anonId: string, amount: number): Promise<UserRecord | null> {
  const rec = await getUser(anonId);
  if (rec.credits < amount) return null;
  rec.credits -= amount;
  await saveUser(anonId, rec);
  return rec;
}

/** Adds purchased credits (called from checkout/webhook only). */
export async function addCredits(anonId: string, amount: number): Promise<UserRecord> {
  const rec = await getUser(anonId);
  rec.credits += amount;
  await saveUser(anonId, rec);
  return rec;
}
