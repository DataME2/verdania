"use client";

import Link from "next/link";
import { useState } from "react";
import { Anchor, ArrowRight, Building2, Factory, Mountain, Waves, Wheat, type LucideIcon } from "lucide-react";
import type { Region } from "@/lib/data";
import { fmtValue } from "@/lib/format";
import { LAYERS, type Layer } from "@/lib/regions";
import { useT } from "../i18n";

// Each region's share of the drawing matches its share of the land area within about 12%.
const SHAPES: Record<string, { path: string; label: [number, number]; icon: LucideIcon }> = {
  altaverde: { path: "M96 66L226 22L176 214L214 326L188 396L84 392L54 236Z", label: [122, 290], icon: Mountain },
  campovera: { path: "M226 22L400 26L505 56L418 238L176 214Z", label: [334, 126], icon: Wheat },
  portalis: { path: "M505 56L558 148L568 256L526 336L470 250L418 238Z", label: [507, 200], icon: Anchor },
  ferrano: { path: "M176 214L418 238L470 250L420 352L322 336L214 326Z", label: [296, 268], icon: Factory },
  riverna: { path: "M470 250L526 336L488 428L406 488L286 486L290 404L322 336L420 352Z", label: [404, 395], icon: Waves },
  solenne: { path: "M214 326L322 336L290 404L286 486L160 468L188 396Z", label: [232, 455], icon: Building2 },
};

// Light to dark; the two darkest steps carry white labels.
const PALETTE = ["#e4edd9", "#a8d5ba", "#8ec97e", "#6db345", "#4a7c3a", "#2d5016"];

export function RegionExplorer({ regions, national }: { regions: Region[]; national: Record<string, number | null> }) {
  const t = useT();
  const d = t.discover;
  const [layer, setLayer] = useState<Layer>("mean_income");
  const [selected, setSelected] = useState(regions[0].code);
  const region = regions.find((r) => r.code === selected)!;
  const unit = LAYERS.find((l) => l.code === layer)!.unit;

  const values = regions.map((r) => r.stats[layer]);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const step = (v: number) => (hi - lo < 1e-12 ? 2 : Math.round(((v - lo) / (hi - lo)) * (PALETTE.length - 1)));
  const Icon = SHAPES[region.code]?.icon ?? Building2;
  const sectors = Object.entries(region.stats)
    .filter(([k]) => k.startsWith("sector_share_"))
    .map(([k, v]) => [k.slice("sector_share_".length), v] as const)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <div className="h-fit min-w-0 rounded-[2rem] border border-forest/10 bg-white p-5 shadow-soft sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p id="layer-label" className="text-xs font-bold uppercase tracking-widest text-leaf">{d.layer}</p>
          <div role="group" aria-labelledby="layer-label" className="flex flex-wrap gap-1 rounded-full bg-cream p-1">
            {LAYERS.map((l) => (
              <button
                key={l.code}
                type="button"
                aria-pressed={layer === l.code}
                onClick={() => setLayer(l.code)}
                className={`min-h-9 rounded-full px-3 text-xs font-bold transition ${layer === l.code ? "bg-forest text-white" : "text-ink/70 hover:text-forest"}`}
              >
                {d.layers[l.code]}
              </button>
            ))}
          </div>
        </div>

        <svg viewBox="0 0 600 510" className="h-auto w-full" role="group" aria-label={d.map}>
          <rect width="600" height="510" rx="24" fill="#eef4e6" />
          {regions.map((r) => {
            const shape = SHAPES[r.code];
            if (!shape) return null;
            const s = step(r.stats[layer]);
            const on = r.code === selected;
            return (
              <path
                key={r.code}
                d={shape.path}
                fill={PALETTE[s]}
                stroke="#2d5016"
                strokeWidth={2}
                strokeLinejoin="round"
                role="button"
                tabIndex={0}
                aria-pressed={on}
                aria-label={`${r.name}: ${d.layerTitle[layer]} ${fmtValue(r.stats[layer], unit)}`}
                onClick={() => setSelected(r.code)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(r.code);
                  }
                }}
                className="cursor-pointer outline-none transition-[fill] duration-300 hover:opacity-90 focus-visible:stroke-sun focus-visible:[stroke-width:5] motion-reduce:transition-none"
              />
            );
          })}
          {/* drawn last so neighbouring borders don't cover it */}
          <path d={SHAPES[selected]?.path} fill="none" stroke="#e7ba55" strokeWidth="5" strokeLinejoin="round" pointerEvents="none" />
          {/* the river runs from the highlands to the delta; the rail line links the capital, the industrial belt and the port */}
          <path d="M128 118C170 160 196 196 240 250S262 330 286 372S392 440 447 458" fill="none" stroke="#5f9aa1" strokeWidth="6" strokeLinecap="round" opacity=".85" pointerEvents="none" />
          <path d="M250 395L320 290L520 205" fill="none" stroke="#172015" strokeWidth="2.5" strokeDasharray="8 7" opacity=".5" pointerEvents="none" />
          {regions.map((r) => {
            const shape = SHAPES[r.code];
            return shape ? (
              <text
                key={r.code}
                x={shape.label[0]}
                y={shape.label[1]}
                textAnchor="middle"
                pointerEvents="none"
                aria-hidden="true"
                className={`font-display text-[17px] font-bold ${step(r.stats[layer]) >= 4 ? "fill-white" : "fill-ink"}`}
              >
                {r.name}
              </text>
            ) : null;
          })}
        </svg>

        <div className="mt-5 flex flex-col gap-2 border-t border-forest/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold text-ink/70">{d.layerTitle[layer]}</p>
          <div className="flex items-center gap-2 text-[11px] font-bold text-ink/70">
            <span>{d.low} ({fmtValue(lo, unit)})</span>
            <span className="flex h-3 w-32 overflow-hidden rounded-full" aria-hidden="true">
              {PALETTE.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}
            </span>
            <span>{d.high} ({fmtValue(hi, unit)})</span>
          </div>
        </div>
      </div>

      <aside aria-labelledby="region-name" className="h-fit rounded-[2rem] bg-forest p-7 text-white shadow-lift lg:sticky lg:top-28">
        <p className="sr-only" aria-live="polite">{d.selected(region.name)}</p>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="region-name" className="font-display text-4xl font-semibold">{region.name}</h2>
            <p className="mt-2 text-sm text-white/80">{region.description}</p>
          </div>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/10 text-sage">
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-white/5 p-3">
            <dt className="text-xs text-white/70">{d.people}</dt>
            <dd className="font-display text-xl tabular-nums">{region.population.toLocaleString("en")}</dd>
          </div>
          <div className="rounded-2xl bg-white/5 p-3">
            <dt className="text-xs text-white/70">{d.area}</dt>
            <dd className="font-display text-xl tabular-nums">{region.areaKm2.toLocaleString("en")} km²</dd>
            <dd className="text-[11px] text-white/70">{d.density(Math.round(region.population / region.areaKm2).toLocaleString("en"))}</dd>
          </div>
          {LAYERS.filter((l) => l.code !== "sector_share_agriculture").map((l) => (
            <div key={l.code} className="rounded-2xl bg-white/5 p-3">
              <dt className="text-xs text-white/70">{d.layerTitle[l.code]}</dt>
              <dd className="font-display text-xl tabular-nums">{fmtValue(region.stats[l.code], l.unit)}</dd>
              <dd className="text-[11px] text-white/70">{d.national(fmtValue(national[l.code], l.unit))}</dd>
            </div>
          ))}
        </dl>

        <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-sage">{d.jobs}</h3>
        <p className="mt-1 text-xs text-white/70">{d.jobsNote}</p>
        <ul className="mt-3 space-y-2.5">
          {sectors.map(([code, share]) => (
            <li key={code}>
              <div className="flex justify-between text-xs">
                <span className="text-white/80">{t.sectors[code] ?? code}</span>
                <strong className="tabular-nums">{fmtValue(share, "share")}</strong>
              </div>
              <div className="mt-1 h-2 rounded-full bg-white/10" aria-hidden="true">
                <div className="h-2 rounded-full bg-vivid" style={{ width: `${share * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>

        <Link
          href="/experiment"
          className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-5 font-bold text-forest transition hover:-translate-y-0.5 hover:bg-sage"
        >
          {d.experiment} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </aside>
    </div>
  );
}
