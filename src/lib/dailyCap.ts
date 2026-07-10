const DAILY_RESTORE_LIMIT = Number(process.env.DAILY_RESTORE_LIMIT ?? 500);

/**
 * Site-wide daily cap on paid Replicate restorations — a second, global
 * layer on top of the per-IP free-preview limit in rateLimit.ts (both stay).
 * Counter is keyed by UTC date, so "midnight reset" is just the key rolling
 * over — no cleanup job needed. Persisted in Vercel Blob when connected
 * (same switch as jobStore), in-process memory otherwise.
 *
 * Blob read-then-write isn't atomic, so two simultaneous requests at the
 * boundary could each see 499 and both proceed — worst case the cap
 * overshoots by a handful of calls, which is acceptable for a spend guard.
 */
const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

const globalStore = globalThis as unknown as {
  __petphotorevive_dailyCap?: { date: string; count: number };
};

function blobPath(date: string): string {
  return `counters/restore-${date}.json`;
}

async function readBlobCount(date: string): Promise<number> {
  const { list } = await import("@vercel/blob");
  try {
    // head() only accepts full blob URLs — resolve the pathname via
    // list({prefix}) instead, and bust the CDN cache with a unique query
    // (this counter is overwritten in place on every increment).
    const pathname = blobPath(date);
    const { blobs } = await list({ prefix: pathname, limit: 1 });
    const hit = blobs.find((b) => b.pathname === pathname);
    if (!hit) return 0;
    const crypto = await import("crypto");
    const res = await fetch(`${hit.url}?nc=${crypto.randomUUID()}`, { cache: "no-store" });
    if (!res.ok) return 0;
    const data = (await res.json()) as { count?: number };
    return data.count ?? 0;
  } catch {
    return 0;
  }
}

async function writeBlobCount(date: string, count: number): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(blobPath(date), JSON.stringify({ count }), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

/** Call BEFORE invoking Replicate — true means the day's budget still has room. */
export async function hasDailyCapacity(): Promise<boolean> {
  const date = todayUtc();
  if (useBlob) {
    return (await readBlobCount(date)) < DAILY_RESTORE_LIMIT;
  }
  const mem = globalStore.__petphotorevive_dailyCap;
  const count = mem && mem.date === date ? mem.count : 0;
  return count < DAILY_RESTORE_LIMIT;
}

/** Call AFTER a successful Replicate restoration to consume one unit. */
export async function recordRestoreCall(): Promise<void> {
  const date = todayUtc();
  if (useBlob) {
    const count = await readBlobCount(date);
    await writeBlobCount(date, count + 1);
    return;
  }
  const mem = globalStore.__petphotorevive_dailyCap;
  if (mem && mem.date === date) {
    mem.count += 1;
  } else {
    globalStore.__petphotorevive_dailyCap = { date, count: 1 };
  }
}
