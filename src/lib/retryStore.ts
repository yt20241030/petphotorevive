import { createHash } from "crypto";
import { getBlobToken } from "./blobToken";

/**
 * Free-retry ledger — "Not quite right? Retry for free."
 *
 * The retry promise (copied from Pet Canvas): after we spend a free try or a
 * credit on a photo, the customer can regenerate that SAME pet — same style or
 * a different one — a few more times at no extra cost, until it looks exactly
 * like them.
 *
 * Abuse guard: retries are keyed by anonId + the image's content hash, NOT by
 * style. So "retry" only ever re-renders the photo already paid for; uploading
 * a *different* pet is a fresh charge. This blocks the "same session, unlimited
 * free portraits of different animals" hole.
 *
 * Model: every CHARGED generation grants FREE_RETRIES more free generations on
 * that photo. Counting cyclically means the batch naturally refreshes if the
 * user later spends another free try / credit on the same photo:
 *   gen 0 → charged, then gens 1,2,3 free, gen 4 → charged, 5,6,7 free, …
 *
 * Same Blob-backed + in-memory-fallback story as userStore/jobStore.
 */

// Founder's call: 2 free retries per portrait. Tunable without a code change.
export const FREE_RETRIES = Number(process.env.FREE_RETRIES_PER_PORTRAIT ?? 2);

/** Stable content hash of an uploaded photo (same bytes → same key). */
export function hashPhoto(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

interface PhotoRetryRecord {
  /** Total generations run for this (anonId, photo) pair. */
  generations: number;
  createdAt: number;
}

const isBlobBacked = () => Boolean(getBlobToken());

const globalStore = globalThis as unknown as {
  __petphotorevive_retries?: Map<string, PhotoRetryRecord>;
};
const memRetries = globalStore.__petphotorevive_retries ?? new Map<string, PhotoRetryRecord>();
globalStore.__petphotorevive_retries = memRetries;

function keyFor(anonId: string, photoHash: string): string {
  return `${anonId.toLowerCase()}-${photoHash}`;
}

function pathFor(anonId: string, photoHash: string): string {
  return `retries/${keyFor(anonId, photoHash)}.json`;
}

async function blobRead(anonId: string, photoHash: string): Promise<PhotoRetryRecord | undefined> {
  try {
    const { get } = await import("@vercel/blob");
    const res = await get(pathFor(anonId, photoHash), {
      access: "private",
      useCache: false,
      token: getBlobToken(),
    });
    if (!res?.stream) return undefined;
    return (await new Response(res.stream).json()) as PhotoRetryRecord;
  } catch {
    return undefined;
  }
}

async function blobWrite(anonId: string, photoHash: string, rec: PhotoRetryRecord): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(pathFor(anonId, photoHash), JSON.stringify(rec), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    token: getBlobToken(),
  });
}

async function read(anonId: string, photoHash: string): Promise<PhotoRetryRecord | undefined> {
  if (isBlobBacked()) return blobRead(anonId, photoHash);
  return memRetries.get(keyFor(anonId, photoHash));
}

async function write(anonId: string, photoHash: string, rec: PhotoRetryRecord): Promise<void> {
  if (isBlobBacked()) {
    await blobWrite(anonId, photoHash, rec);
    return;
  }
  memRetries.set(keyFor(anonId, photoHash), rec);
}

/** How many generations have already run for this photo (0 = never generated). */
export async function getPhotoGenerations(anonId: string, photoHash: string): Promise<number> {
  const rec = await read(anonId, photoHash);
  return rec?.generations ?? 0;
}

/** Records one more generation for this photo; returns the new total. */
export async function recordPhotoGeneration(anonId: string, photoHash: string): Promise<number> {
  const rec = (await read(anonId, photoHash)) ?? { generations: 0, createdAt: Date.now() };
  rec.generations += 1;
  await write(anonId, photoHash, rec);
  return rec.generations;
}

/**
 * Given the generation count BEFORE this run, decide whether this run is a free
 * retry and how many free retries remain afterwards.
 *
 * `priorGenerations` is the value from getPhotoGenerations() taken before the
 * generation. Position 0 in each cycle is charged; positions 1..FREE_RETRIES
 * are free retries.
 */
export function retryState(priorGenerations: number): {
  isFreeRetry: boolean;
  /** Free retries left on this photo AFTER the current generation completes. */
  retriesLeftAfter: number;
} {
  const cycle = FREE_RETRIES + 1;
  const posInCycle = priorGenerations % cycle;
  return {
    isFreeRetry: posInCycle !== 0,
    retriesLeftAfter: FREE_RETRIES - posInCycle,
  };
}
