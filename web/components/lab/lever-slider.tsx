"use client";

import { RotateCcw } from "lucide-react";
import { fmtLever, fmtParam } from "@/lib/format";
import type { Lever } from "@/lib/data";
import { useLocale, useT } from "../i18n";

/**
 * Native range input: keyboard, touch and screen readers work out of the box.
 * A policy lever starts at Verdania today; an assumption ("Challenge this result") at its central value.
 */
export function LeverSlider({
  lever,
  value,
  onChange,
  assumption = false,
}: {
  lever: Lever;
  value: number;
  onChange: (v: number) => void;
  assumption?: boolean;
}) {
  const t = useT().slider;
  const locale = useLocale();
  const changed = Math.abs(value - lever.base) > 1e-9;
  const step = assumption ? (lever.max - lever.min) / 50 : lever.unit === "share of output" ? 0.001 : 0.01;
  const show = (v: number, unit: string | null) => (assumption ? fmtParam(v) : fmtLever(v, unit, locale));
  const id = `${assumption ? "assumption" : "lever"}-${lever.code}`;
  return (
    <div className={`rounded-2xl p-3 transition ${changed ? "bg-sun/15 ring-2 ring-sun" : ""}`}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-ink/80">
          {lever.label}
        </label>
        <output htmlFor={id} className="font-display text-lg font-semibold tabular-nums text-forest">
          {show(value, lever.unit)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={lever.min}
        max={lever.max}
        step={step}
        value={value}
        // assumptions are rounded so URLs and run records don't carry float noise
        onChange={(e) => onChange(assumption ? Math.round(Number(e.target.value) * 1e4) / 1e4 : Number(e.target.value))}
        className="mt-2 w-full accent-forest"
        aria-describedby={`${id}-base`}
      />
      <div id={`${id}-base`} className="mt-1 flex items-center justify-between text-[11px] text-ink/70">
        <span>
          {show(lever.min, null)} – {show(lever.max, null)} · {assumption ? t.central : t.today} {show(lever.base, null)}
        </span>
        {changed && (
          <button
            type="button"
            onClick={() => onChange(lever.base)}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold text-forest hover:bg-white"
            aria-label={t.reset(lever.label, assumption)}
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" /> {t.undo}
          </button>
        )}
      </div>
    </div>
  );
}
