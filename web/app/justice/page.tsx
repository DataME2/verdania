import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";
import { DecileChart } from "@/components/lab/charts";
import { DeltaChip } from "@/components/lab/indicator-card";
import { getBaseline } from "@/lib/data";
import { fmtDelta, fmtValue } from "@/lib/format";
import { t } from "@/lib/messages";
import { runSimulation } from "@/lib/sim";
import type { SimRequest } from "@/lib/sim-request";
import type { SimResult } from "@/lib/sim-types";

export const metadata: Metadata = { title: "Social Justice", description: t.justice.lead };

const j = t.justice;
const TODAY = ["gini_market", "gini_disposable", "poverty_relative", "wealth_top10", "wealth_top1", "labour_share", "catastrophic_health", "regional_ratio"];
const COMPARE = ["median_income", "poverty_relative", "poverty_anchored", "gini_market", "gini_disposable", "wealth_top10", "wealth_top1", "labour_share", "catastrophic_health", "regional_ratio"];
const SYSTEMS = ["A", "B", "C", "D"] as const;
const H = 10;

/** Engine runs only, cached by input: no figure on this page is computed anywhere else. */
async function run(request: SimRequest): Promise<SimResult | null> {
  const out = await runSimulation(request).catch(() => null);
  return out?.ok ? out.data : null;
}

export default function JusticePage() {
  return (
    <section className="px-5 py-12 lg:px-10 lg:py-16">
      <div className="mx-auto max-w-[1240px]">
        <div className="max-w-3xl">
          <span className="text-xs font-bold uppercase tracking-[.25em] text-leaf">{j.eyebrow}</span>
          <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight text-forest lg:text-6xl">{j.title}</h1>
          <p className="mt-5 text-lg leading-relaxed text-ink/70">{j.lead}</p>
        </div>
        {/* five engine runs on a cold cache: the heading shows at once and the results stream in */}
        <Suspense fallback={<p role="status" className="mt-12 text-ink/70">{t.lab.recalculating}</p>}>
          <Results />
        </Suspense>
      </div>
    </section>
  );
}

async function Results() {
  const [baseline, today, ...systems] = await Promise.all([
    getBaseline(),
    run({ levers: {}, horizon: 1 }),
    ...SYSTEMS.map((preset) => run({ preset, levers: {}, horizon: H })),
  ]);
  const names = Object.fromEntries((baseline?.presets ?? []).map((p) => [p.family, p.name]));
  const reference = systems.find(Boolean);
  const deciles = today?.deciles.baseline;

  return (
    <>
      {!today ? (
        <p className="mt-10 text-ink/70">{j.error}</p>
      ) : (
        <>
          {/* ------------------------------------------------------------ today */}
          <section className="mt-12" aria-labelledby="today">
            <h2 id="today" className="font-display text-3xl font-semibold text-forest">{j.today}</h2>
            <p className="mt-2 text-sm text-ink/70">{j.todayLead}</p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {TODAY.map((code) => {
                const ind = today.indicators[code];
                return ind ? (
                  <div key={code} className="flex flex-col-reverse rounded-2xl border border-forest/10 bg-white p-5">
                    <dt className="mt-2 text-sm">
                      <span className="block font-semibold text-ink/80">{ind.label}</span>
                      <span className="mt-1 block text-xs text-ink/70">{j.explain[code]}</span>
                    </dt>
                    <dd className="font-display text-3xl font-semibold tabular-nums text-forest">{fmtValue(ind.baseline[0], ind.unit)}</dd>
                  </div>
                ) : null;
              })}
            </dl>
            <p className="mt-4 text-xs text-ink/70">{j.gender}</p>
          </section>

          {/* ------------------------------------------------------------ redistribution */}
          {deciles && (
            <section className="mt-14 rounded-[2rem] border border-forest/10 bg-white p-6 lg:p-8" aria-labelledby="redistribution">
              <h2 id="redistribution" className="font-display text-3xl font-semibold text-forest">{j.redistribution}</h2>
              <p className="mt-2 max-w-3xl text-sm text-ink/70">{j.redistributionLead(today.deciles.year)}</p>
              <div className="mt-6">
                <DecileChart
                  baseline={deciles.market}
                  scenario={deciles.disposable}
                  year={today.deciles.year}
                  names={[j.market, j.disposable]}
                  title={j.redistribution}
                />
              </div>
            </section>
          )}
        </>
      )}

      {/* ------------------------------------------------------------ four systems */}
      <section className="mt-14" aria-labelledby="systems">
        <h2 id="systems" className="font-display text-3xl font-semibold text-forest">{j.systems}</h2>
        <p className="mt-2 max-w-3xl text-sm text-ink/70">{j.systemsLead(H)}</p>
        {reference ? (
          <div className="mt-6 overflow-x-auto rounded-[2rem] border border-forest/10 bg-white p-4 lg:p-6" role="region" aria-labelledby="systems" tabIndex={0}>
            <table className="w-full min-w-[920px] text-left text-sm tabular-nums">
              <caption className="sr-only">{`${j.systems}: year ${H}, compared with today's policies`}</caption>
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
                {COMPARE.map((code) => {
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
                                <span className="mt-1 block"><DeltaChip delta={ind.delta[H]} unit={ind.unit} desirable={ind.desirable} /></span>
                                <span className="mt-1 block text-[11px] text-ink/70">
                                  {j.range}: {fmtDelta(ind.delta_p10[H], ind.unit)} to {fmtDelta(ind.delta_p90[H], ind.unit)}
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
        ) : (
          <p className="mt-6 text-ink/70">{j.error}</p>
        )}
        <p className="mt-4 max-w-3xl text-sm text-ink/70">
          {j.caveat}{" "}
          <Link href="/methodology" className="font-bold text-forest underline underline-offset-2">{t.experiment.methodology}</Link>
        </p>
      </section>
    </>
  );
}
