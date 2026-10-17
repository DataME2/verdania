import "server-only";
import { type NextRequest } from "next/server";
import { clientIp, rateLimiter } from "@/lib/rate-limit";
import type { EngineOutcome } from "@/lib/sim";
import { parseSimRequest, type SimRequest } from "@/lib/sim-request";

/** A browser-facing engine endpoint: per-IP limit, size and shape checks, then the (cached) engine call. */
export function engineRoute<T>(run: (request: SimRequest) => Promise<EngineOutcome<T>>, perMinute: number) {
  const allowed = rateLimiter(perMinute, 60_000);
  return async function POST(request: NextRequest) {
    if (!allowed(clientIp(request.headers))) {
      return Response.json({ error: "Too many requests. Wait a minute and try again." }, { status: 429 });
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
      return outcome.ok ? Response.json(outcome.data) : Response.json({ error: outcome.error }, { status: outcome.status });
    } catch {
      return Response.json({ error: "The simulation engine is unavailable right now." }, { status: 502 });
    }
  };
}
