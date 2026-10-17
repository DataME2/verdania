import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DeltaChip } from "@/components/lab/indicator-card";
import { getBaseline } from "@/lib/data";
import { fmtDelta, fmtValue } from "@/lib/format";
import { getLocale, getT } from "@/lib/i18n-server";
import { presetName } from "@/lib/localize";
import { runOrNull } from "@/lib/sim";
import { localized } from "@/lib/sim-localized";

export const SYSTEMS = ["A", "B", "C", "D"] as const;
export const H = 10;

/**
 * The four economic systems at year H, each against keeping today's policies, with the range across
 * uncertain assumptions. Engine runs only, cached by input, so /justice and /systems share them.
 */
export async function SystemsTable({ codes, labelledBy, caption }: { codes: string[]; labelledBy: string; caption: string }) {
  const [baseline, t, locale, ...systems] = await Promise.all([
    getBaseline(),
    getT(),
    getLocale(),
    ...SYSTEMS.map((preset) => runOrNull({ preset, levers: {}, horizon: H }).then(localized)),
  ]);
  const j = t.justice;
  const names = Object.fromEntries((baseline?.presets ?? []).map((p) => [p.family, presetName(t, p.slug, p.name)]));
  const reference = systems.find(Boolean);
  if (!reference) return <p className="mt-6 text-ink/70">{j.error}</p>;

  return (
    <div className="relative mt-6 overflow-x-auto rounded-[2rem] border border-forest/10 bg-white p-4 lg:p-6" role="region" aria-labelledby={labelledBy} tabIndex={0}>
      <table className="w-full min-w-[920px] text-left text-sm tabular-nums">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-forest/15 align-bottom">
            <th scope="col" className="py-3 pr-4 text-xs font-bold text-ink/70">{j.measure}</th>
            <th scope="col" className="py-3 pr-4 text-xs font-bold text-ink/70">{j.keepToday}</th>
            {SYSTEMS.map((s) => (
              <th key={s} scope="col" className="py-3 pr-4">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-forest font-display font-bold text-white">{s}</span>
                <span className="mt-2 block font-display text-base font-semibold leading-tight text-forest">{names[s] ?? s}</span>
                <Link href={`/experiment?preset=${s}`} className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-leaf hover:text-forest">
                  {j.open} <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-forest/10">
          {codes.map((code) => {
            const ref = reference.indicators[code];
            if (!ref) return null;
            return (
              <tr key={code} className="align-top">
                <th scope="row" className="py-3 pr-4 font-semibold text-ink/80">{ref.label}</th>
                <td className="py-3 pr-4 font-semibold">{fmtValue(ref.baseline[H], ref.unit)}</td>
                {systems.map((r, i) => {
                  const ind = r?.indicators[code];
                  return (
                    <td key={SYSTEMS[i]} className="py-3 pr-4">
                      {ind ? (
                        <>
                          <span className="block font-semibold text-forest">{fmtValue(ind.scenario[H], ind.unit)}</span>
                          <span className="mt-1 block"><DeltaChip delta={ind.delta[H]} unit={ind.unit} desirable={ind.desirable} locale={locale} /></span>
                          <span className="mt-1 block text-[11px] text-ink/70">
                            {j.range}: {t.common.between(fmtDelta(ind.delta_p10[H], ind.unit, locale), fmtDelta(ind.delta_p90[H], ind.unit, locale))}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
