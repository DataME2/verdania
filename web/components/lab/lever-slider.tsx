"use client";

import { RotateCcw } from "lucide-react";
import { fmtLever } from "@/lib/format";
import type { Lever } from "@/lib/data";

/** Native range input: keyboard, touch and screen readers work out of the box. */
export function LeverSlider({ lever, value, onChange }: { lever: Lever; value: number; onChange: (v: number) => void }) {
  const changed = Math.abs(value - lever.base) > 1e-9;
  const step = lever.unit === "share of output" ? 0.001 : 0.01;
  const id = `lever-${lever.code}`;
  return (
    <div className={`rounded-2xl p-3 transition ${changed ? "bg-sun/15 ring-2 ring-sun" : ""}`}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-ink/80">
          {lever.label}
        </label>
        <output htmlFor={id} className="font-display text-lg font-semibold tabular-nums text-forest">
          {fmtLever(value, lever.unit)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={lever.min}
        max={lever.max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-forest"
        aria-describedby={`${id}-base`}
      />
      <div id={`${id}-base`} className="mt-1 flex items-center justify-between text-[11px] text-ink/70">
        <span>
          {fmtLever(lever.min, null)} – {fmtLever(lever.max, null)} · Verdania today {fmtLever(lever.base, null)}
        </span>
        {changed && (
          <button
            type="button"
            onClick={() => onChange(lever.base)}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold text-forest hover:bg-white"
            aria-label={`Reset ${lever.label} to today's value`}
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" /> Undo
          </button>
        )}
      </div>
    </div>
  );
}
