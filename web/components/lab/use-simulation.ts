"use client";

import { useEffect, useState } from "react";
import type { SimRequest } from "@/lib/sim-request";
import type { SimResult } from "@/lib/sim-types";

export type SimState =
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "ready"; data: SimResult; error?: undefined }
  | { status: "error"; data?: undefined; error: string };

/** Debounced engine call; a newer request cancels the one in flight. */
export function useSimulation(request: SimRequest, delayMs = 300): SimState {
  const key = JSON.stringify(request);
  const [state, setState] = useState<SimState & { key?: string }>({ status: "loading" });

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/simulate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: key,
          signal: ctrl.signal,
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "The simulation failed.");
        setState({ status: "ready", data: body, key });
      } catch (err) {
        if (!ctrl.signal.aborted) setState({ status: "error", error: (err as Error).message, key });
      }
    }, delayMs);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [key, delayMs]);

  // A result for older inputs is never shown as if it belonged to the current ones.
  return state.key === key ? state : { status: "loading" };
}
