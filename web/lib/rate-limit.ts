// ponytail: per-instance, in-memory limiter; use the host's edge rate limiting once deployed on several instances.
export function rateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (key: string) => {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 10_000) hits.clear(); // bound memory
    return recent.length <= limit;
  };
}

export const clientIp = (headers: Headers) => headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
