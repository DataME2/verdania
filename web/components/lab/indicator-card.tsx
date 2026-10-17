import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { fmtDelta, fmtValue, tone, type Tone } from "@/lib/format";
import { messages } from "@/lib/i18n";
import type { Locale } from "@/lib/locale";
import type { Indicator } from "@/lib/sim-types";

const TONE: Record<Tone, string> = {
  good: "bg-vivid/20 text-forest", // leaf on this tint is 4.2:1, below AA
  bad: "bg-loss/15 text-loss",
  neutral: "bg-forest/10 text-forest",
};

/** Change vs baseline: arrow + sign + text, never colour alone. */
export function DeltaChip({ delta, unit, desirable, locale }: { delta: number | null; unit: string; desirable: Indicator["desirable"]; locale: Locale }) {
  const Icon = delta == null || Math.abs(delta) < 1e-9 ? Minus : delta > 0 ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${TONE[tone(delta, desirable, unit)]}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {fmtDelta(delta, unit, locale)}
    </span>
  );
}

export function IndicatorCard({ indicator, year, loading, locale }: { indicator?: Indicator; year: number; loading: boolean; locale: Locale }) {
  const c = messages[locale].card;
  if (loading || !indicator) {
    return (
      <div className="rounded-2xl border border-forest/10 bg-white p-5" aria-busy="true">
        <div className="h-4 w-2/3 animate-pulse rounded bg-forest/10" />
        <div className="mt-3 h-8 w-1/2 animate-pulse rounded bg-forest/10" />
        <div className="mt-3 h-5 w-1/3 animate-pulse rounded-full bg-forest/10" />
        <span className="sr-only">{c.recalculating}</span>
      </div>
    );
  }
  const { label, unit, desirable } = indicator;
  const value = indicator.scenario[year] ?? null;
  const delta = indicator.delta[year] ?? null;
  return (
    <div className="rounded-2xl border border-forest/10 bg-white p-5">
      <p className="text-sm font-semibold text-ink/70">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-forest">{fmtValue(value, unit)}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <DeltaChip delta={delta} unit={unit} desirable={desirable} locale={locale} />
        <span className="text-[11px] text-ink/70">{c.vsBaseline}</span>
      </div>
      <p className="mt-2 text-[11px] text-ink/70">
        {c.across(fmtDelta(indicator.delta_p10[year], unit, locale), fmtDelta(indicator.delta_p90[year], unit, locale))}
      </p>
    </div>
  );
}
