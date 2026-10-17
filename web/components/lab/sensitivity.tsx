"use client";

import { useState } from "react";
import { fmtDelta, fmtParam } from "@/lib/format";
import type { SimRequest } from "@/lib/sim-request";
import type { Sensitivity } from "@/lib/sim-types";
import { useLocale, useT } from "../i18n";
import { useEngine } from "./use-simulation";

const TOP = 8;

/** "Which assumptions drive this result?": a tornado of one-at-a-time effects, fetched only while open. */
export function SensitivityPanel({ request }: { request: SimRequest }) {
  const t = useT();
  const locale = useLocale();
  const c = t.sensitivity;
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("poverty_anchored");
  const sens = useEngine<Sensitivity>("/api/sensitivity", request, 500, open);
  const data = sens.status === "ready" ? sens.data : undefined;
  const unit = data?.targets[target]?.unit ?? "share";
  const size = (r: Sensitivity["rows"][number]) => Math.max(Math.abs(r.effect[target]?.low ?? 0), Math.abs(r.effect[target]?.high ?? 0));
  const rows = data ? [...data.rows].sort((a, b) => size(b) - size(a)).slice(0, TOP) : [];
  const max = Math.max(1e-12, ...rows.map(size));
  const moved = rows.length > 0 && size(rows[0]) >= 1e-9;
  const bar = (v: number | null) => {
    const w = (Math.abs(v ?? 0) / max) * 50;
    return { width: `${w}%`, left: (v ?? 0) < 0 ? `${50 - w}%` : "50%" };
  };

  return (
    <details className="rounded-[2rem] bg-white p-6 shadow-soft" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="cursor-pointer font-display text-xl font-semibold text-forest">{c.title}</summary>
      <p className="mt-2 text-sm text-ink/70">{c.lead}</p>
      {data && (
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={c.pick}>
          {Object.entries(data.targets).map(([code, tg]) => (
            <button
              key={code}
              type="button"
              aria-pressed={target === code}
              onClick={() => setTarget(code)}
              className={`rounded-full border px-3 py-1 text-xs font-bold ${target === code ? "border-forest bg-forest text-white" : "border-forest/15 text-forest hover:border-forest"}`}
            >
              {tg.label}
            </button>
          ))}
        </div>
      )}
      <div className="mt-5" aria-live="polite">
        {sens.status === "error" && <p className="text-sm font-semibold text-loss">{sens.error || t.lab.error}</p>}
        {sens.status === "loading" && open && <p className="text-sm text-ink/70">{t.lab.recalculating}</p>}
        {data && !moved && <p className="text-sm text-ink/70">{c.none}</p>}
        {data && moved && (
          <>
            <p className="text-sm font-semibold text-ink/80">{c.chartTitle(data.targets[target].label, data.horizon)}</p>
            <ol className="mt-3 space-y-3">
              {rows.map((r) => (
                <li key={r.parameter} className="grid gap-1 text-sm sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:items-center sm:gap-4">
                  <div>
                    <span className="font-semibold text-ink/80">{r.label}</span>{" "}
                    <span className="whitespace-nowrap text-[11px] font-bold text-leaf">{t.methodology.evidence[r.evidence].label}</span>
                    <span className="block text-[11px] text-ink/70">
                      {c.low} {fmtParam(r.low)}: {fmtDelta(r.effect[target]?.low, unit, locale)} · {c.high} {fmtParam(r.high)}: {fmtDelta(r.effect[target]?.high, unit, locale)}
                    </span>
                  </div>
                  <div className="relative h-5 rounded bg-forest/5" aria-hidden="true">
                    <span className="absolute inset-y-0 left-1/2 w-px bg-ink/30" />
                    <span className="absolute top-0.5 h-2 rounded-sm bg-ink/35" style={bar(r.effect[target]?.low ?? null)} />
                    <span className="absolute bottom-0.5 h-2 rounded-sm bg-forest" style={bar(r.effect[target]?.high ?? null)} />
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink/70">
              <span className="inline-flex items-center gap-2"><span className="h-2 w-5 rounded-sm bg-ink/35" aria-hidden="true" /> {c.low}</span>
              <span className="inline-flex items-center gap-2"><span className="h-2 w-5 rounded-sm bg-forest" aria-hidden="true" /> {c.high}</span>
              <span>{c.note}</span>
            </p>
          </>
        )}
      </div>
    </details>
  );
}
