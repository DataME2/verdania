import "server-only";
import { unstable_cache } from "next/cache";
import type { SimRequest } from "./sim-request";
import type { SimResult } from "./sim-types";

export type SimOutcome = { ok: true; data: SimResult } | { ok: false; status: 422; error: string };

/** One engine run, always computed. Used where the answer must be fresh: saving and reproducing. */
export async function simulateFresh(request: SimRequest): Promise<SimOutcome> {
  const res = await fetch(`${process.env.SIM_URL}/v1/simulate`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-sim-key": process.env.SIM_API_KEY ?? "" },
    body: JSON.stringify({ ...request, mode: "interactive" }),
    signal: AbortSignal.timeout(25_000), // first call after an idle period includes the engine's cold start
    cache: "no-store",
  });
  if (res.status === 422) {
    const detail = await res.json().catch(() => ({}));
    return { ok: false, status: 422, error: String(detail.detail ?? "invalid request") };
  }
  if (!res.ok) throw new Error(`engine responded ${res.status}`);
  return { ok: true, data: await res.json() };
}

/**
 * The same run, cached for interactive use. The engine is deterministic for a given input and model
 * version, so identical requests (including ones it rejects with 422) are served from cache.
 * Outages throw and are not cached.
 */
export const runSimulation = unstable_cache(simulateFresh, ["simulation-v2"], { revalidate: 86_400 });

/** A cached run, or null when the engine is unreachable or rejects it: pages then say so, never guess. */
export async function runOrNull(request: SimRequest): Promise<SimResult | null> {
  const out = await runSimulation(request).catch(() => null);
  return out?.ok ? out.data : null;
}
