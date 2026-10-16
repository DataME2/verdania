import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { getPopulation, type PopulationCell } from "@/lib/data";
import { SECTOR, t } from "@/lib/messages";

export const metadata: Metadata = { title: "People and Society", description: t.people.lead };

const p = t.people;
const AGES = ["0-14", "15-64", "65+"];
const LEVELS = ["primary", "lower_secondary", "upper_secondary", "tertiary"];
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const int = (v: number) => v.toLocaleString("en");

export default async function PeoplePage() {
  const { cells, generator, seed } = await getPopulation();
  const count = (keep: (c: PopulationCell) => boolean, from = cells) => from.filter(keep).reduce((s, c) => s + c.people, 0);
  const total = count(() => true);
  const working = count((c) => c.age === "15-64");
  const labour = count((c) => c.age === "15-64" && !!c.sector);
  const sectors = Object.keys(SECTOR)
    .map((code) => ({ code, share: labour ? count((c) => c.sector === code) / labour : 0 }))
    .sort((a, b) => b.share - a.share);
  const regions = [...new Set(cells.map((c) => c.region))]
    .map((name) => {
      const rc = cells.filter((c) => c.region === name);
      const people = count(() => true, rc);
      const adults = count((c) => c.age !== "0-14", rc);
      const wa = count((c) => c.age === "15-64", rc);
      return {
        name,
        people,
        children: count((c) => c.age === "0-14", rc) / people,
        older: count((c) => c.age === "65+", rc) / people,
        tertiary: count((c) => c.age !== "0-14" && c.education === "tertiary", rc) / adults,
        participation: count((c) => c.age === "15-64" && !!c.sector, rc) / wa,
      };
    })
    .sort((a, b) => b.people - a.people);

  return (
    <section className="px-5 py-12 lg:px-10 lg:py-16">
      <div className="mx-auto max-w-[1240px]">
        <div className="max-w-3xl">
          <span className="text-xs font-bold uppercase tracking-[.25em] text-leaf">{p.eyebrow}</span>
          <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight text-forest lg:text-6xl">{p.title}</h1>
          <p className="mt-5 text-lg leading-relaxed text-ink/70">{p.lead}</p>
        </div>

        {!total ? (
          <p className="mt-10 text-ink/70">{p.error}</p>
        ) : (
          <>
            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              <Card id="age" title={p.age} lead={p.ageLead}>
                <table className="w-full text-left text-sm tabular-nums">
                  <caption className="sr-only">{p.ageCaption}</caption>
                  <thead>
                    <tr className="border-b border-forest/15 text-xs text-ink/70">
                      <th scope="col" className="py-2 pr-3 font-bold">{p.group}</th>
                      <th scope="col" className="py-2 pr-3 font-bold">{p.women}</th>
                      <th scope="col" className="py-2 pr-3 font-bold">{p.men}</th>
                      <th scope="col" className="py-2 font-bold">{p.share}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-forest/10">
                    {AGES.map((a) => {
                      const all = count((c) => c.age === a);
                      return (
                        <tr key={a}>
                          <th scope="row" className="py-2.5 pr-3 font-semibold text-ink/80">{p.bands[a]}</th>
                          <td className="py-2.5 pr-3">{int(count((c) => c.age === a && c.gender === "female"))}</td>
                          <td className="py-2.5 pr-3">{int(count((c) => c.age === a && c.gender === "male"))}</td>
                          <td className="py-2.5">
                            <Bar value={all / total} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>

              <Card id="education" title={p.education} lead={p.educationLead}>
                <table className="w-full text-left text-sm tabular-nums">
                  <caption className="sr-only">{p.educationCaption}</caption>
                  <thead>
                    <tr className="border-b border-forest/15 text-xs text-ink/70">
                      <th scope="col" className="py-2 pr-3 font-bold">{p.level}</th>
                      <th scope="col" className="py-2 pr-3 font-bold">{p.bands["15-64"]}</th>
                      <th scope="col" className="py-2 font-bold">{p.bands["65+"]}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-forest/10">
                    {LEVELS.map((l) => (
                      <tr key={l}>
                        <th scope="row" className="py-2.5 pr-3 font-semibold text-ink/80">{p.levels[l]}</th>
                        {["15-64", "65+"].map((a) => (
                          <td key={a} className="py-2.5 pr-3">
                            <Bar value={count((c) => c.age === a && c.education === l) / count((c) => c.age === a)} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>

            <div className="mt-6">
              <Card id="work" title={p.work} lead={p.workLead(pct(labour / working))}>
                <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {sectors.map((sc) => (
                    <li key={sc.code}>
                      <div className="flex justify-between text-sm">
                        <span className="text-ink/80">{SECTOR[sc.code]}</span>
                      </div>
                      <Bar value={sc.share} />
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <section className="mt-6 rounded-[2rem] border border-forest/10 bg-white p-6 lg:p-8" aria-labelledby="regions">
              <h2 id="regions" className="font-display text-3xl font-semibold text-forest">{p.regions}</h2>
              <div className="relative mt-5 overflow-x-auto" role="region" aria-labelledby="regions" tabIndex={0}>
                <table className="w-full min-w-[680px] text-left text-sm tabular-nums">
                  <caption className="sr-only">{p.regionsCaption}</caption>
                  <thead>
                    <tr className="border-b border-forest/15 text-xs text-ink/70">
                      {Object.values(p.cols).map((h) => (
                        <th key={h} scope="col" className="py-3 pr-4 font-bold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-forest/10">
                    {regions.map((r) => (
                      <tr key={r.name}>
                        <th scope="row" className="py-3 pr-4 font-bold text-forest">{r.name}</th>
                        <td className="py-3 pr-4">{int(r.people)}</td>
                        <td className="py-3 pr-4">{pct(r.children)}</td>
                        <td className="py-3 pr-4">{pct(r.older)}</td>
                        <td className="py-3 pr-4">{pct(r.tertiary)}</td>
                        <td className="py-3 pr-4">{pct(r.participation)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Link href="/discover" className="mt-5 inline-flex items-center gap-2 font-bold text-forest hover:text-leaf">
                {p.discover} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </section>

            <section className="mt-6 rounded-[2rem] border border-forest/10 bg-cream p-6" aria-labelledby="not-yet">
              <h2 id="not-yet" className="font-display text-xl font-semibold text-forest">{p.notYet}</h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink/80">
                {p.notYetItems.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </section>

            <p className="mt-6 text-xs text-ink/70">{p.footnote(generator ?? "—", seed == null ? "—" : String(seed))}</p>
          </>
        )}
      </div>
    </section>
  );
}

function Card({ id, title, lead, children }: { id: string; title: string; lead: string; children: ReactNode }) {
  return (
    <section className="h-full rounded-[2rem] border border-forest/10 bg-white p-6 lg:p-8" aria-labelledby={id}>
      <h2 id={id} className="font-display text-3xl font-semibold text-forest">{title}</h2>
      <p className="mt-2 text-sm text-ink/70">{lead}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** A share as text plus a bar; the bar is decoration, the number carries the meaning. */
function Bar({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className="w-12 shrink-0 font-semibold text-forest">{pct(value)}</span>
      <span className="hidden h-2 w-full min-w-10 rounded-full bg-forest/10 sm:block" aria-hidden="true">
        <span className="block h-2 rounded-full bg-leaf" style={{ width: `${value * 100}%` }} />
      </span>
    </span>
  );
}
