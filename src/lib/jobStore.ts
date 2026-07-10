import crypto from "crypto";

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

const JOB_TTL_MS = 60 * 60 * 1000; // 1h — plenty for "upload -> pay -> download" in one sitting

/**
 * In-memory store, good enough for this waiting-period build: one warm
 * Vercel instance keeps it, but a cold start or a second concurrent
 * instance won't see it. Fine for early manual testing; swap for Vercel
 * KV/R2 when doing the real Cloudflare+R2 step so jobs survive across
 * instances.
 */
const globalStore = globalThis as unknown as {
  __petphotorevive_jobs?: Map<string, Job>;
  __petphotorevive_hashIndex?: Map<string, string>;
};

const jobs = globalStore.__petphotorevive_jobs ?? new Map<string, Job>();
const hashIndex = globalStore.__petphotorevive_hashIndex ?? new Map<string, string>();
globalStore.__petphotorevive_jobs = jobs;
globalStore.__petphotorevive_hashIndex = hashIndex;

function sweep() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > JOB_TTL_MS) {
      jobs.delete(id);
      if (hashIndex.get(job.contentHash) === id) hashIndex.delete(job.contentHash);
    }
  }
}

export function hashContent(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function findJobByHash(hash: string): Job | undefined {
  sweep();
  const id = hashIndex.get(hash);
  return id ? jobs.get(id) : undefined;
}

export function createJob(input: {
  contentHash: string;
  engine: string;
  cleanBuffer: Buffer;
  previewBuffer: Buffer;
}): Job {
  sweep();
  const job: Job = {
    id: crypto.randomUUID(),
    contentHash: input.contentHash,
    engine: input.engine,
    cleanBuffer: input.cleanBuffer,
    previewBuffer: input.previewBuffer,
    paid: false,
    downloaded: false,
    createdAt: Date.now(),
  };
  jobs.set(job.id, job);
  hashIndex.set(input.contentHash, job.id);
  return job;
}

export function getJob(id: string): Job | undefined {
  sweep();
  return jobs.get(id);
}

export function markPaid(id: string): void {
  const job = jobs.get(id);
  if (job) job.paid = true;
}

export function markDownloaded(id: string): void {
  const job = jobs.get(id);
  if (job) job.downloaded = true;
}

const DOWNLOAD_TOKEN_TTL_MS = 15 * 60 * 1000; // one-time, short-lived per red line E

/** Mints a fresh one-time download link, invalidating any previous one for this job. */
export function issueDownloadToken(id: string): { token: string; exp: number } | undefined {
  const job = jobs.get(id);
  if (!job || !job.paid) return undefined;
  const token = crypto.randomBytes(24).toString("hex");
  const exp = Date.now() + DOWNLOAD_TOKEN_TTL_MS;
  job.downloadToken = { token, exp, used: false };
  return { token, exp };
}

/** Verifies + immediately consumes the token so it can't be replayed. */
export function consumeDownloadToken(id: string, token: string): Job | undefined {
  const job = jobs.get(id);
  if (!job || !job.paid || !job.downloadToken) return undefined;
  const t = job.downloadToken;
  if (t.used || t.token !== token || Date.now() > t.exp) return undefined;
  t.used = true;
  job.downloaded = true;
  return job;
}
