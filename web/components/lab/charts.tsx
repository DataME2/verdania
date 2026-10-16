// Hand-drawn SVG charts: two chart types don't justify a charting library. Each has a text summary
// and a data table (native <details>) as the non-visual alternative.
import { fmtValue } from "@/lib/format";
import type { Indicator, Series } from "@/lib/sim-types";

const W = 640;
const H = 260;
const PAD = { l: 76, r: 16, t: 16, b: 32 };

function scale(values: number[]) {
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (hi - lo < 1e-12) [lo, hi] = [lo - Math.abs(lo || 1) * 0.05, hi + Math.abs(hi || 1) * 0.05];
  const pad = (hi - lo) * 0.08;
  return { lo: lo - pad, hi: hi + pad };
}

/** Baseline vs scenario over time, with the scenario's P10–P90 band. Gaps where the model stops. */
export function LineBandChart({ indicator, years }: { indicator: Indicator; years: number[] }) {
  const all = [...indicator.baseline, ...indicator.scenario, ...indicator.p10, ...indicator.p90].filter(
    (v): v is number => v != null && Number.isFinite(v),
  );
  if (!all.length) return <p className="text-sm text-ink/70">No data for this indicator.</p>;
  const { lo, hi } = scale(all);
  const x = (i: number) => PAD.l + (i / Math.max(1, years.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const line = (s: Series) =>
    s.map((v, i) => (v == null ? "" : `${i === 0 || s[i - 1] == null ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)).join("");
  const bandIdx = years.map((_, i) => i).filter((i) => indicator.p10[i] != null && indicator.p90[i] != null);
  const band = bandIdx.length
    ? `M${bandIdx.map((i) => `${x(i)},${y(indicator.p90[i]!)}`).join("L")}L${[...bandIdx].reverse().map((i) => `${x(i)},${y(indicator.p10[i]!)}`).join("L")}Z`
    : "";
  const ticks = [0, 1, 2, 3].map((k) => lo + ((hi - lo) * k) / 3);
  const last = years.length - 1;
  const summary = `${indicator.label}: baseline ${fmtValue(indicator.baseline[last], indicator.unit)} and scenario ${fmtValue(indicator.scenario[last], indicator.unit)} in year ${years[last]}, scenario range ${fmtValue(indicator.p10[last], indicator.unit)} to ${fmtValue(indicator.p90[last], indicator.unit)} across assumptions.`;

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={summary}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="currentColor" className="text-forest/10" />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" className="fill-ink/60 text-[11px]">
              {fmtValue(t, indicator.unit)}
            </text>
          </g>
        ))}
        {years.map((yr, i) =>
          i % Math.max(1, Math.ceil(years.length / 6)) === 0 || i === last ? (
            <text key={yr} x={x(i)} y={H - 10} textAnchor="middle" className="fill-ink/60 text-[11px]">
              {yr === 0 ? "Today" : `Y${yr}`}
            </text>
          ) : null,
        )}
        {band && <path d={band} className="fill-sun/30" />}
        <path d={line(indicator.baseline)} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 5" className="text-ink/70" />
        <path d={line(indicator.scenario)} fill="none" stroke="currentColor" strokeWidth="3" className="text-forest" />
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink/70">
        <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 bg-forest" aria-hidden="true" /> Your scenario</span>
        <span className="inline-flex items-center gap-2"><span className="h-0 w-6 border-t-2 border-dashed border-ink/45" aria-hidden="true" /> Baseline</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-6 bg-sun/30" aria-hidden="true" /> Range across assumptions (P10–P90)</span>
      </figcaption>
      <DataTable
        caption={indicator.label}
        head={["Year", "Baseline", "Scenario", "P10", "P90"]}
        rows={years.map((yr, i) => [
          yr === 0 ? "Today" : `Year ${yr}`,
          ...[indicator.baseline, indicator.scenario, indicator.p10, indicator.p90].map((s) => fmtValue(s[i], indicator.unit)),
        ])}
      />
    </figure>
  );
}

/** Income by decile, two series side by side (default: disposable income, baseline vs scenario, at the horizon). */
export function DecileChart({
  baseline,
  scenario,
  year,
  names = ["Baseline", "Your scenario"],
  title = "Disposable income per decile",
}: {
  baseline: Series;
  scenario: Series;
  year: number;
  names?: [string, string];
  title?: string;
}) {
  const vals = [...baseline, ...scenario].filter((v): v is number => v != null);
  if (!vals.length) return <p className="text-sm text-ink/70">Not available: the model stopped before this year.</p>;
  const hi = Math.max(...vals) * 1.08;
  const slot = (W - PAD.l - PAD.r) / 10;
  const y = (v: number) => PAD.t + (1 - v / hi) * (H - PAD.t - PAD.b);
  const ticks = [0, 1, 2, 3].map((k) => (hi * k) / 3);
  const pct = (i: number) => {
    if (!baseline[i] || scenario[i] == null) return "—";
    const p = (scenario[i]! / baseline[i]! - 1) * 100;
    return `${p > 0 ? "+" : ""}${p.toFixed(1)}`;
  };

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img"
        aria-label={`${title}, year ${year}. ${names[1]} vs ${names[0]}: poorest tenth ${pct(0)}%, richest tenth ${pct(9)}%.`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="currentColor" className="text-forest/10" />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" className="fill-ink/60 text-[11px]">{fmtValue(t, "V$")}</text>
          </g>
        ))}
        {baseline.map((b, i) => {
          const s = scenario[i];
          const x0 = PAD.l + i * slot + slot * 0.14;
          const bw = slot * 0.34;
          return (
            <g key={i}>
              {b != null && <rect x={x0} y={y(b)} width={bw} height={y(0) - y(b)} className="fill-ink/25" />}
              {s != null && <rect x={x0 + bw + 2} y={y(s)} width={bw} height={y(0) - y(s)} className="fill-forest" />}
              <text x={x0 + bw} y={H - 10} textAnchor="middle" className="fill-ink/60 text-[11px]">D{i + 1}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink/70">
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 bg-forest" aria-hidden="true" /> {names[1]}</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 bg-ink/25" aria-hidden="true" /> {names[0]}</span>
        <span>D1 = poorest tenth of people, D10 = richest. Year {year}.</span>
      </figcaption>
      <DataTable
        caption={`${title}, year ${year}`}
        head={["Decile", ...names, "Change"]}
        rows={baseline.map((b, i) => [`D${i + 1}`, fmtValue(b, "V$"), fmtValue(scenario[i], "V$"), `${pct(i)}%`])}
      />
    </figure>
  );
}

function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: string[][] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer font-semibold text-forest">Show data table</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left tabular-nums">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-forest/15 text-ink/70">
              {head.map((h) => <th key={h} scope="col" className="py-1.5 pr-4 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]} className="border-b border-forest/5">
                {r.map((c, j) => (j === 0 ? <th key={j} scope="row" className="py-1 pr-4 font-semibold">{c}</th> : <td key={j} className="py-1 pr-4">{c}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
