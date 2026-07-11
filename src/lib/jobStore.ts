import crypto from "crypto";
import { getBlobToken } from "./blobToken";

export interface Job {
  id: string;
  contentHash: string;
  engine: string;
  cleanBuffer: Buffer;
  previewBuffer: Buffer;
  paid: boolean;
  downloaded: boolean;
  createdAt: number;
  downloadToken?: { token: string; exp: number; used: boolean };
}

type JobMeta = Omit<Job, "cleanBuffer" | "previewBuffer">;

const JOB_TTL_MS = 60 * 60 * 1000; // 1h — plenty for "upload -> pay -> download" in one sitting
const DOWNLOAD_TOKEN_TTL_MS = 15 * 60 * 1000; // one-time, short-lived per red line E

export function hashContent(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Vercel deploys each API route as its own isolated serverless function —
 * they do NOT share process memory, even warm. A plain in-memory Map only
 * works for local `next dev`. In production (a Blob store connected in the
 * Vercel dashboard, token env var under its default or prefixed name) jobs
 * are persisted to Vercel Blob instead so upload -> pay -> download works
 * across separate function invocations. No app code outside this file
 * needs to know which backend is active. Evaluated per call, not at module
 * load, so env changes apply without a rebuild.
 */
const isBlobBacked = () => Boolean(getBlobToken());

// ---------------------------------------------------------------------
// In-memory backend (local dev fallback)
// ---------------------------------------------------------------------
const globalStore = globalThis as unknown as {
  __petphotorevive_jobs?: Map<string, Job>;
  __petphotorevive_hashIndex?: Map<string, string>;
};
const memJobs = globalStore.__petphotorevive_jobs ?? new Map<string, Job>();
const memHashIndex = globalStore.__petphotorevive_hashIndex ?? new Map<string, string>();
globalStore.__petphotorevive_jobs = memJobs;
globalStore.__petphotorevive_hashIndex = memHashIndex;

function memSweep() {
  const now = Date.now();
  for (const [id, job] of memJobs) {
    if (now - job.createdAt > JOB_TTL_MS) {
      memJobs.delete(id);
      if (memHashIndex.get(job.contentHash) === id) memHashIndex.delete(job.contentHash);
    }
  }
}

// ---------------------------------------------------------------------
// Vercel Blob backend (production)
// ---------------------------------------------------------------------
async function blobPaths(id: string) {
  return {
    meta: `jobs/${id}/meta.json`,
    clean: `jobs/${id}/clean.jpg`,
    preview: `jobs/${id}/preview.jpg`,
  };
}

async function blobPutJson(pathname: string, data: unknown) {
  const { put } = await import("@vercel/blob");
  await put(pathname, JSON.stringify(data), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    token: getBlobToken(),
  });
}

async function blobPutBuffer(pathname: string, buf: Buffer, contentType: string) {
  const { put } = await import("@vercel/blob");
  await put(pathname, buf, {
    access: "public",
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
    token: getBlobToken(),
  });
}

/**
 * head() only accepts a full blob URL, not a pathname (calling it with a
 * pathname throws, which read as "job not found" in production). Resolve
 * pathname -> URL via list({prefix}) and require an exact pathname match.
 */
async function blobUrlFor(pathname: string): Promise<string | undefined> {
  const { list } = await import("@vercel/blob");
  const { blobs } = await list({ prefix: pathname, limit: 1, token: getBlobToken() });
  const hit = blobs.find((b) => b.pathname === pathname);
  return hit?.url;
}

/**
 * Unique query param busts the Blob CDN cache — meta.json is overwritten
 * in place (markPaid, token issue/consume), and a cached stale read there
 * would mean "paid" flips back to "unpaid" or a consumed token looks fresh.
 */
function bust(url: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}nc=${crypto.randomUUID()}`;
}

async function blobFetchJson<T>(pathname: string): Promise<T | undefined> {
  try {
    const url = await blobUrlFor(pathname);
    if (!url) return undefined;
    const res = await fetch(bust(url), { cache: "no-store" });
    if (!res.ok) return undefined;
    return (await res.json()) as T;
  } catch {
    return undefined;
  }
}

async function blobFetchBuffer(pathname: string): Promise<Buffer | undefined> {
  try {
    const url = await blobUrlFor(pathname);
    if (!url) return undefined;
    const res = await fetch(bust(url), { cache: "no-store" });
    if (!res.ok) return undefined;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------
// Public API — same surface regardless of backend
// ---------------------------------------------------------------------

export async function findJobByHash(hash: string): Promise<JobMeta | undefined> {
  if (isBlobBacked()) {
    const id = await blobFetchJson<{ jobId: string }>(`hashes/${hash}.json`);
    if (!id) return undefined;
    return getJob(id.jobId);
  }
  memSweep();
  const id = memHashIndex.get(hash);
  const job = id ? memJobs.get(id) : undefined;
  return job;
}

export async function getPreviewBuffer(id: string): Promise<Buffer | undefined> {
  if (isBlobBacked()) {
    const p = await blobPaths(id);
    return blobFetchBuffer(p.preview);
  }
  memSweep();
  return memJobs.get(id)?.previewBuffer;
}

export async function createJob(input: {
  contentHash: string;
  engine: string;
  cleanBuffer: Buffer;
  previewBuffer: Buffer;
}): Promise<JobMeta> {
  const id = crypto.randomUUID();
  const meta: JobMeta = {
    id,
    contentHash: input.contentHash,
    engine: input.engine,
    paid: false,
    downloaded: false,
    createdAt: Date.now(),
  };

  if (isBlobBacked()) {
    const p = await blobPaths(id);
    await Promise.all([
      blobPutBuffer(p.clean, input.cleanBuffer, "image/jpeg"),
      blobPutBuffer(p.preview, input.previewBuffer, "image/jpeg"),
      blobPutJson(p.meta, meta),
      blobPutJson(`hashes/${input.contentHash}.json`, { jobId: id }),
    ]);
    return meta;
  }

  memSweep();
  const job: Job = { ...meta, cleanBuffer: input.cleanBuffer, previewBuffer: input.previewBuffer };
  memJobs.set(id, job);
  memHashIndex.set(input.contentHash, id);
  return meta;
}

export async function getJob(id: string): Promise<JobMeta | undefined> {
  if (isBlobBacked()) {
    const p = await blobPaths(id);
    return blobFetchJson<JobMeta>(p.meta);
  }
  memSweep();
  return memJobs.get(id);
}

export async function markPaid(id: string): Promise<void> {
  if (isBlobBacked()) {
    const p = await blobPaths(id);
    const meta = await blobFetchJson<JobMeta>(p.meta);
    if (!meta) return;
    meta.paid = true;
    await blobPutJson(p.meta, meta);
    return;
  }
  const job = memJobs.get(id);
  if (job) job.paid = true;
}

export async function issueDownloadToken(id: string): Promise<{ token: string; exp: number } | undefined> {
  const token = crypto.randomBytes(24).toString("hex");
  const exp = Date.now() + DOWNLOAD_TOKEN_TTL_MS;

  if (isBlobBacked()) {
    const p = await blobPaths(id);
    const meta = await blobFetchJson<JobMeta>(p.meta);
    if (!meta || !meta.paid) return undefined;
    meta.downloadToken = { token, exp, used: false };
    await blobPutJson(p.meta, meta);
    return { token, exp };
  }

  const job = memJobs.get(id);
  if (!job || !job.paid) return undefined;
  job.downloadToken = { token, exp, used: false };
  return { token, exp };
}

/** Verifies + immediately consumes the token so it can't be replayed; returns the clean image bytes. */
export async function consumeDownloadToken(id: string, token: string): Promise<Buffer | undefined> {
  if (isBlobBacked()) {
    const p = await blobPaths(id);
    const meta = await blobFetchJson<JobMeta>(p.meta);
    if (!meta || !meta.paid || !meta.downloadToken) return undefined;
    const t = meta.downloadToken;
    if (t.used || t.token !== token || Date.now() > t.exp) return undefined;
    t.used = true;
    meta.downloaded = true;
    await blobPutJson(p.meta, meta);
    return blobFetchBuffer(p.clean);
  }

  const job = memJobs.get(id);
  if (!job || !job.paid || !job.downloadToken) return undefined;
  const t = job.downloadToken;
  if (t.used || t.token !== token || Date.now() > t.exp) return undefined;
  t.used = true;
  job.downloaded = true;
  return job.cleanBuffer;
}
