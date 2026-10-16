import { type NextRequest } from "next/server";
import { runSimulation } from "@/lib/sim";
import { parseSimRequest } from "@/lib/sim-request";

// ponytail: per-instance, in-memory limiter; use the host's edge rate limiting once deployed on several instances.
const WINDOW_MS = 60_000;
const LIMIT = 40;
const hits = new Map<string, number[]>();

function allowed(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10_000) hits.clear(); // bound memory
  return recent.length <= LIMIT;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!allowed(ip)) {
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
    const outcome = await runSimulation(parsed);
    return outcome.ok ? Response.json(outcome.data) : Response.json({ error: outcome.error }, { status: outcome.status });
  } catch {
    return Response.json({ error: "The simulation engine is unavailable right now." }, { status: 502 });
  }
}
