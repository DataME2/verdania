import type { Metadata } from "next";
import { RegionExplorer } from "@/components/discover/region-explorer";
import { getBaseline, getRegions } from "@/lib/data";
import { fmtValue } from "@/lib/format";
import { getT } from "@/lib/i18n-server";
import { LAYERS } from "@/lib/regions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.discover.title, description: t.discover.lead };
}

export default async function DiscoverPage() {
  const [baseline, stored, t] = await Promise.all([getBaseline(), getRegions(), getT()]);
  const d = t.discover;
  const regions = stored.map((r) => ({ ...r, description: t.model.regions[r.code] ?? r.description }));
  const ind = baseline?.indicators ?? {};
  const people = regions.reduce((s, r) => s + r.population, 0);
  // Regional means weighted by population give the national mean; the other national figures are stored.
  const national: Record<string, number | null> = {
    mean_income: people ? regions.reduce((s, r) => s + r.stats.mean_income * r.population, 0) / people : null,
    poverty_relative: ind.poverty_relative ?? null,
    unemployment: ind.unemployment ?? null,
    health_access: ind.health_access ?? null,
  };

  return (
    <section className="px-5 py-12 lg:px-10 lg:py-16">
      <div className="mx-auto max-w-[1240px]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[.25em] text-leaf">{d.eyebrow}</span>
            <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight text-forest lg:text-6xl">{d.title}</h1>
            <p className="mt-5 text-lg leading-relaxed text-ink/70">{d.lead}</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-forest/15 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[.15em] text-forest shadow-sm">
            <span className="h-2 w-2 rounded-full bg-vivid" aria-hidden="true" /> {d.synthetic}
          </span>
        </div>

        {regions.length ? (
          <>
            <div className="mt-10">
              <RegionExplorer regions={regions} national={national} />
            </div>

            <div className="mt-8 rounded-[2rem] border border-forest/10 bg-white p-6 lg:p-8">
              <h2 id="regions-table" className="font-display text-3xl font-semibold text-forest">{d.table}</h2>
              <div className="relative mt-5 overflow-x-auto" role="region" aria-labelledby="regions-table" tabIndex={0}>
                <table className="w-full min-w-[720px] text-left text-sm tabular-nums">
                  <caption className="sr-only">{d.tableCaption}</caption>
                  <thead>
                    <tr className="border-b border-forest/15 text-xs text-ink/70">
                      <th scope="col" className="py-3 pr-4 font-bold">{d.region}</th>
                      <th scope="col" className="py-3 pr-4 font-bold">{d.people}</th>
                      <th scope="col" className="py-3 pr-4 font-bold">{d.area}</th>
                      {LAYERS.map((l) => (
                        <th key={l.code} scope="col" className="py-3 pr-4 font-bold">{d.layers[l.code]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-forest/10">
                    {regions.map((r) => (
                      <tr key={r.code}>
                        <th scope="row" className="py-3 pr-4 font-bold text-forest">{r.name}</th>
                        <td className="py-3 pr-4">{r.population.toLocaleString("en")}</td>
                        <td className="py-3 pr-4">{r.areaKm2.toLocaleString("en")} km²</td>
                        {LAYERS.map((l) => (
                          <td key={l.code} className="py-3 pr-4">{fmtValue(r.stats[l.code], l.unit)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="mt-4 space-y-1 text-xs text-ink/70">
                {LAYERS.map((l) => (
                  <li key={l.code}>
                    <strong>{d.layers[l.code]}:</strong> {d.layerTitle[l.code]}
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <p className="mt-10 text-ink/70">{d.error}</p>
        )}

        <p className="mt-6 text-xs leading-relaxed text-ink/70">{d.footnote(baseline?.modelVersion ?? "0.1.0")}</p>
      </div>
    </section>
  );
}
