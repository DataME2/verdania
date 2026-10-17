import "server-only";
import { unstable_cache } from "next/cache";
import type { SimRequest } from "./sim-request";
import type { Sensitivity, SimResult } from "./sim-types";

export type EngineOutcome<T> = { ok: true; data: T } | { ok: false; status: 422; error: string };
export type SimOutcome = EngineOutcome<SimResult>;

async function post<T>(path: string, body: object): Promise<EngineOutcome<T>> {
  const res = await fetch(`${process.env.SIM_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-sim-key": process.env.SIM_API_KEY ?? "" },
    body: JSON.stringify(body),
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

/** One engine run, always computed. Used where the answer must be fresh: saving and reproducing. */
export function simulateFresh(request: SimRequest): Promise<SimOutcome> {
  return post<SimResult>("/v1/simulate", { ...request, mode: "interactive" });
}

/**
 * The same run, cached for interactive use. The engine is deterministic for a given input and model
 * version, so identical requests (including ones it rejects with 422) are served from cache.
 * Outages throw and are not cached.
 */
export const runSimulation = unstable_cache(simulateFresh, ["simulation-v2"], { revalidate: 86_400 });

/** Which assumptions drive a scenario's effect (one at a time, low and high end of each range); cached the same way. */
export const runSensitivity = unstable_cache((request: SimRequest) => post<Sensitivity>("/v1/sensitivity", request), ["sensitivity-v1"], {
  revalidate: 86_400,
});

/** A cached run, or null when the engine is unreachable or rejects it: pages then say so, never guess. */
export async function runOrNull(request: SimRequest): Promise<SimResult | null> {
  const out = await runSimulation(request).catch(() => null);
  return out?.ok ? out.data : null;
}
