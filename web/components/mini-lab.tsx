"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, RotateCcw } from "lucide-react";
import { IndicatorCard } from "@/components/lab/indicator-card";
import { LeverSlider } from "@/components/lab/lever-slider";
import { useSimulation } from "@/components/lab/use-simulation";
import type { Lever } from "@/lib/data";
import { fmtDelta } from "@/lib/format";
import { t } from "@/lib/messages";

const CARDS = ["gdp_pc", "gini_disposable", "poverty_relative", "debt_share"];
const YEAR = 10;

export function MiniLab({ levers }: { levers: Lever[] }) {
  const base = Object.fromEntries(levers.map((l) => [l.code, l.base]));
  const [values, setValues] = useState<Record<string, number>>(base);
  const sim = useSimulation({ levers: values, horizon: YEAR });
  const changed = levers.some((l) => Math.abs(values[l.code] - l.base) > 1e-9);
  const labHref = `/experiment?${new URLSearchParams(Object.entries(values).map(([k, v]) => [k, String(v)]))}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
      <div className="rounded-[2rem] bg-white p-6 shadow-soft sm:p-8">
        <div className="space-y-3">
          {levers.map((lever) => (
            <LeverSlider
              key={lever.code}
              lever={lever}
              value={values[lever.code]}
              onChange={(v) => setValues((s) => ({ ...s, [lever.code]: v }))}
            />
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-forest/10 pt-5">
          <button
            type="button"
            onClick={() => setValues(base)}
            disabled={!changed}
            className="inline-flex items-center gap-2 rounded-full border border-forest/20 px-4 py-2 text-sm font-bold text-forest disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> {t.lab.reset}
          </button>
          <Link href={labHref} className="inline-flex items-center gap-2 font-bold text-forest hover:text-leaf">
            {t.lab.open} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div>
        <div className="grid gap-4 sm:grid-cols-2" aria-live="polite" aria-busy={sim.status === "loading"}>
          {sim.status === "error" ? (
            <p role="alert" className="rounded-2xl bg-loss/10 p-5 text-sm font-semibold text-loss sm:col-span-2">
              {t.lab.error}
            </p>
          ) : (
            CARDS.map((code) => (
              <IndicatorCard key={code} indicator={sim.data?.indicators[code]} year={YEAR} loading={sim.status === "loading"} />
            ))
          )}
        </div>
        <details className="mt-4 rounded-2xl bg-white p-5">
          <summary className="cursor-pointer font-bold text-forest">{t.lab.why}</summary>
          {sim.status !== "ready" ? (
            <p className="mt-3 text-sm text-ink/60">{t.lab.recalculating}</p>
          ) : sim.data.mechanisms.length === 0 ? (
            <p className="mt-3 text-sm text-ink/70">{t.lab.noChange}</p>
          ) : (
            <ul className="mt-3 space-y-3 text-sm text-ink/80">
              {sim.data.mechanisms.map((m) => (
                <li key={m.lever}>
                  {m.explanation}{" "}
                  <span className="text-ink/60">
                    (
                    {m.effects
                      .map((e) => `${sim.data.indicators[e.indicator]?.label ?? e.indicator}: ${fmtDelta(e.delta_at_horizon, sim.data.indicators[e.indicator]?.unit ?? "index")}`)
                      .join("; ")}
                    )
                  </span>
                </li>
              ))}
            </ul>
          )}
        </details>
        <p className="mt-3 text-[11px] text-ink/60">
          {sim.status === "ready" ? t.lab.footnote(sim.data.model_version, sim.data.uncertainty.draws) : t.lab.recalculating}
        </p>
      </div>
    </div>
  );
}
