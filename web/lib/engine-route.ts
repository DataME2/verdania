import "server-only";
import { type NextRequest } from "next/server";
import { getT } from "@/lib/i18n-server";
import { clientIp, rateLimiter } from "@/lib/rate-limit";
import type { EngineOutcome } from "@/lib/sim";
import { parseSimRequest, type SimRequest } from "@/lib/sim-request";

/**
 * A browser-facing engine endpoint: per-IP limit, size and shape checks, then the (cached) engine call. The
 * cache holds the engine's own output; `localize` puts it in the visitor's language on the way out.
 */
export function engineRoute<T>(run: (request: SimRequest) => Promise<EngineOutcome<T>>, perMinute: number, localize: (data: T) => Promise<T>) {
  const allowed = rateLimiter(perMinute, 60_000);
  return async function POST(request: NextRequest) {
    const t = await getT();
    if (!allowed(clientIp(request.headers))) {
      return Response.json({ error: t.lab.busy }, { status: 429 });
    }
    const text = await request.text();
    if (text.length > 4096) return Response.json({ error: "request too large" }, { status: 413 });

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return Response.json({ error: "invalid JSON" }, { status: 400 });
    }
    const parsed = parseSimRequest(body);
    if ("error" in parsed) return Response.json(parsed, { status: 400 });

    try {
      const outcome = await run(parsed);
      return outcome.ok ? Response.json(await localize(outcome.data)) : Response.json({ error: outcome.error }, { status: outcome.status });
    } catch {
      return Response.json({ error: t.lab.unavailable }, { status: 502 });
    }
  };
}
