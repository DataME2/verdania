import "server-only";
import { cacheLife } from "next/cache";
import type { SimRequest } from "./sim-request";
import type { SimResult } from "./sim-types";

export type SimOutcome = { ok: true; data: SimResult } | { ok: false; status: 422; error: string };

/**
 * One engine run. The engine is deterministic for a given input and model version, so identical
 * requests, including ones it rejects (422), are served from cache. Outages throw and are not cached.
 * ponytail: per-instance memory cache; move to `use cache: remote` (or the simulation_runs table)
 * when several instances serve traffic.
 */
export async function runSimulation(request: SimRequest): Promise<SimOutcome> {
  "use cache";
  cacheLife("days");
  const res = await fetch(`${process.env.SIM_URL}/v1/simulate`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-sim-key": process.env.SIM_API_KEY ?? "" },
    body: JSON.stringify({ ...request, mode: "interactive" }),
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 422) {
    const detail = await res.json().catch(() => ({}));
    return { ok: false, status: 422, error: String(detail.detail ?? "invalid request") };
  }
  if (!res.ok) throw new Error(`engine responded ${res.status}`);
  return { ok: true, data: await res.json() };
}
