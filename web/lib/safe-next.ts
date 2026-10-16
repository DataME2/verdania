/** Short-lived cookie carrying the post-sign-in destination from the sign-in action to /auth/callback. */
export const NEXT_COOKIE = "verdania_next";

/**
 * Where to send someone after sign-in. Only same-site relative paths are allowed, so a crafted
 * `?next=` link can never bounce a freshly signed-in visitor to another site.
 */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || next.length > 512) return fallback;
  if (!next.startsWith("/")) return fallback; // absolute URLs, javascript:, relative paths
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback; // protocol-relative
  if (/[\u0000-\u001f\\]/.test(next)) return fallback; // control chars, backslashes browsers normalise to "/"
  try {
    const parsed = new URL(next, "http://same-site.invalid");
    if (parsed.origin !== "http://same-site.invalid") return fallback;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return fallback;
  }
}
