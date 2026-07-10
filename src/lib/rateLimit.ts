const FREE_LIMIT_PER_DAY = Number(process.env.FREE_PREVIEWS_PER_DAY ?? 5);

const globalStore = globalThis as unknown as {
  __petphotorevive_rate?: Map<string, { date: string; count: number }>;
};
const hits = globalStore.__petphotorevive_rate ?? new Map<string, { date: string; count: number }>();
globalStore.__petphotorevive_rate = hits;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Same in-memory-per-instance caveat as jobStore — good enough to blunt casual abuse pre-launch. */
export function checkAndConsumeFreeUpload(ip: string): { allowed: boolean; remaining: number } {
  const day = today();
  const entry = hits.get(ip);
  if (!entry || entry.date !== day) {
    hits.set(ip, { date: day, count: 1 });
    return { allowed: true, remaining: FREE_LIMIT_PER_DAY - 1 };
  }
  if (entry.count >= FREE_LIMIT_PER_DAY) {
    return { allowed: false, remaining: 0 };
  }
  entry.count += 1;
  return { allowed: true, remaining: FREE_LIMIT_PER_DAY - entry.count };
}
