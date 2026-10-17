"use client";

import { useEffect, useState } from "react";
import type { SimRequest } from "@/lib/sim-request";
import type { SimResult } from "@/lib/sim-types";

export type EngineState<T> =
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "ready"; data: T; error?: undefined }
  | { status: "error"; data?: undefined; error: string };
export type SimState = EngineState<SimResult>;

/**
 * Debounced engine call through one of the site's API routes; a newer request cancels the one in flight.
 * An error carries the route's message (already in the visitor's language), or "" when there is none
 * (network failure, unreadable reply): callers then show their own message.
 */
export function useEngine<T>(path: string, request: SimRequest, delayMs = 300, enabled = true): EngineState<T> {
  const key = JSON.stringify(request);
  const [state, setState] = useState<EngineState<T> & { key?: string }>({ status: "loading" });

  useEffect(() => {
    if (!enabled) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(path, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: key,
          signal: ctrl.signal,
        });
        const body = await res.json().catch(() => ({}));
        setState(res.ok ? { status: "ready", data: body, key } : { status: "error", error: String(body.error ?? ""), key });
      } catch {
        if (!ctrl.signal.aborted) setState({ status: "error", error: "", key });
      }
    }, delayMs);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [path, key, delayMs, enabled]);

  // A result for older inputs is never shown as if it belonged to the current ones.
  return state.key === key ? state : { status: "loading" };
}

export function useSimulation(request: SimRequest, delayMs = 300): SimState {
  return useEngine<SimResult>("/api/simulate", request, delayMs);
}
