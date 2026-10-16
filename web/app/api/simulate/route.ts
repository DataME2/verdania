import { type NextRequest } from "next/server";
import { runSimulation } from "@/lib/sim";
import { clientIp, rateLimiter } from "@/lib/rate-limit";
import { parseSimRequest } from "@/lib/sim-request";

const allowed = rateLimiter(40, 60_000);

export async function POST(request: NextRequest) {
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
    const outcome = await runSimulation(parsed);
    return outcome.ok ? Response.json(outcome.data) : Response.json({ error: outcome.error }, { status: outcome.status });
  } catch {
    return Response.json({ error: "The simulation engine is unavailable right now." }, { status: 502 });
  }
}
