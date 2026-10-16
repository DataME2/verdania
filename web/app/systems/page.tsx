import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";
import { H, SYSTEMS, SystemsTable } from "@/components/systems-table";
import { getBaseline, getLevers } from "@/lib/data";
import { fmtLever } from "@/lib/format";
import { LEVER_GROUPS } from "@/lib/levers";
import { t } from "@/lib/messages";

export const metadata: Metadata = { title: "Economic Systems", description: t.systemsPage.lead };

const s = t.systemsPage;
const OUTCOMES = ["gdp_pc", "productivity", "employment_rate", "unemployment", "real_wage", "private_investment", "revenue_share", "spending_share", "deficit_share", "debt_share"];

export default async function SystemsPage() {
  const baseline = await getBaseline();
  const levers = baseline ? await getLevers(baseline.modelVersion) : [];
  const byCode = Object.fromEntries(levers.map((l) => [l.code, l]));
  const today = baseline?.presets.find((p) => !p.family);
  const systems = SYSTEMS.map((f) => baseline?.presets.find((p) => p.family === f)).filter((p) => !!p);

  return (
    <section className="px-5 py-12 lg:px-10 lg:py-16">
      <div className="mx-auto max-w-[1240px]">
        <div className="max-w-3xl">
          <span className="text-xs font-bold uppercase tracking-[.25em] text-leaf">{s.eyebrow}</span>
          <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight text-forest lg:text-6xl">{s.title}</h1>
          <p className="mt-5 text-lg leading-relaxed text-ink/70">{s.lead}</p>
        </div>

        {!today || systems.length === 0 ? (
          <p className="mt-10 text-ink/70">{t.lab.error}</p>
        ) : (
          <>
            <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {systems.map((p) => (
                <li key={p.slug} className="flex flex-col rounded-[2rem] border border-forest/10 bg-white p-6">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-forest font-display text-lg font-bold text-white">{p.family}</span>
                  <h2 className="mt-4 font-display text-2xl font-semibold leading-tight text-forest">{p.name}</h2>
                  <p className="mt-3 flex-1 text-sm text-ink/80">{s.families[p.family!]}</p>
                  <Link href={`/experiment?preset=${p.family}`} className="mt-5 inline-flex items-center gap-2 font-bold text-forest hover:text-leaf">
                    {s.open} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>

            <section className="mt-14" aria-labelledby="rules">
              <h2 id="rules" className="font-display text-3xl font-semibold text-forest">{s.rules}</h2>
              <p className="mt-2 max-w-3xl text-sm text-ink/70">{s.rulesLead}</p>
              <div className="relative mt-6 overflow-x-auto rounded-[2rem] border border-forest/10 bg-white p-4 lg:p-6" role="region" aria-labelledby="rules" tabIndex={0}>
                <table className="w-full min-w-[760px] text-left text-sm tabular-nums">
                  <caption className="sr-only">{s.rulesCaption}</caption>
                  <thead>
                    <tr className="border-b border-forest/15 text-xs text-ink/70">
                      <th scope="col" className="py-3 pr-4 font-bold">{s.policy}</th>
                      <th scope="col" className="py-3 pr-4 font-bold">{s.today}</th>
                      {systems.map((p) => (
                        <th key={p.slug} scope="col" className="py-3 pr-4 font-bold">
                          {p.family} · {p.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  {LEVER_GROUPS.map(([group, codes]) => (
                    <tbody key={group} className="divide-y divide-forest/10">
                      <tr>
                        <th scope="rowgroup" colSpan={2 + systems.length} className="pb-1 pt-5 text-xs font-bold uppercase tracking-[.18em] text-leaf">
                          {t.experiment.groups[group]}
                        </th>
                      </tr>
                      {codes.filter((c) => byCode[c]).map((c) => {
                        const base = Number(today.levers[c]);
                        return (
                          <tr key={c}>
                            <th scope="row" className="py-2.5 pr-4 font-semibold text-ink/80">{byCode[c].label}</th>
                            <td className="py-2.5 pr-4">{fmtLever(base, byCode[c].unit)}</td>
                            {systems.map((p) => {
                              const v = Number(p.levers[c]);
                              const dir = Math.abs(v - base) < 1e-9 ? 0 : v > base ? 1 : -1;
                              return (
                                <td key={p.slug} className={`py-2.5 pr-4 ${dir ? "font-semibold text-forest" : "text-ink/70"}`}>
                                  {fmtLever(v, byCode[c].unit)}
                                  {dir !== 0 && (
                                    <>
                                      <span aria-hidden="true"> {dir > 0 ? "↑" : "↓"}</span>
                                      <span className="sr-only"> ({dir > 0 ? s.higher : s.lower})</span>
                                    </>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  ))}
                </table>
              </div>
            </section>
          </>
        )}

        <section className="mt-14" aria-labelledby="outcomes">
          <h2 id="outcomes" className="font-display text-3xl font-semibold text-forest">{s.outcomes}</h2>
          <p className="mt-2 max-w-3xl text-sm text-ink/70">{s.outcomesLead(H)}</p>
          {/* four engine runs, shared with /justice through the cache; the rest of the page doesn't wait */}
          <Suspense fallback={<p role="status" className="mt-6 text-ink/70">{t.lab.recalculating}</p>}>
            <SystemsTable codes={OUTCOMES} labelledBy="outcomes" caption={`${s.outcomes}: year ${H}, compared with today's policies`} />
          </Suspense>
          <Link href="/justice" className="mt-5 inline-flex items-center gap-2 font-bold text-forest hover:text-leaf">
            {s.justice} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      </div>
    </section>
  );
}
