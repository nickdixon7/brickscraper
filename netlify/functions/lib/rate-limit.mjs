const lastRun = new Map();
export function rateLimit(key, minimumIntervalMs = 60_000) {
  const now = Date.now();
  const previous = lastRun.get(key) || 0;
  if (now - previous < minimumIntervalMs) return { allowed: false, retryAfterMs: minimumIntervalMs - (now - previous) };
  lastRun.set(key, now);
  return { allowed: true, retryAfterMs: 0 };
}
export const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
