import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DecileChart } from "@/components/lab/charts";
import { H, SystemsTable } from "@/components/systems-table";
import { fmtValue } from "@/lib/format";
import { t } from "@/lib/messages";
import { runOrNull } from "@/lib/sim";

export const metadata: Metadata = { title: "Social Justice", description: t.justice.lead };

const j = t.justice;
const TODAY = ["gini_market", "gini_disposable", "poverty_relative", "wealth_top10", "wealth_top1", "labour_share", "catastrophic_health", "regional_ratio"];
const COMPARE = ["median_income", "poverty_relative", "poverty_anchored", "gini_market", "gini_disposable", "wealth_top10", "wealth_top1", "labour_share", "catastrophic_health", "regional_ratio"];

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
  // every figure on this page is an engine run, cached by input
  const today = await runOrNull({ levers: {}, horizon: 1 });
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
        <SystemsTable codes={COMPARE} labelledBy="systems" caption={`${j.systems}: year ${H}, compared with today's policies`} />
        <p className="mt-4 max-w-3xl text-sm text-ink/70">
          {j.caveat}{" "}
          <Link href="/methodology" className="font-bold text-forest underline underline-offset-2">{t.experiment.methodology}</Link>
        </p>
      </section>
    </>
  );
}
