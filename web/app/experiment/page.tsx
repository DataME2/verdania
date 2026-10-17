import type { Metadata } from "next";
import { Suspense } from "react";
import { Lab, type PresetOption } from "@/components/lab/lab";
import { getViewer } from "@/lib/auth";
import { getBaseline, getLevers, getMethodology, getRegions } from "@/lib/data";
import { getT } from "@/lib/i18n-server";
import { localizeParams, presetName } from "@/lib/localize";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.experiment.title, description: t.experiment.description };
}

export default async function ExperimentPage() {
  const [baseline, viewer, regionList, t] = await Promise.all([getBaseline(), getViewer(), getRegions(), getT()]);
  const regions = Object.fromEntries(regionList.map((r) => [r.code, r.name]));
  const [storedLevers, methodology] = baseline
    ? await Promise.all([getLevers(baseline.modelVersion), getMethodology(baseline.modelVersion)])
    : [[], null];
  const levers = localizeParams(storedLevers, t);
  const assumptions = localizeParams(methodology?.parameters.filter((p) => p.kind === "structural") ?? [], t);
  const presets: PresetOption[] = (baseline?.presets ?? [])
    .map((p) => ({ id: (p.family ?? "baseline") as PresetOption["id"], name: presetName(t, p.slug, p.name), levers: p.levers }))
    .sort((a, b) => (a.id === "baseline" ? -1 : b.id === "baseline" ? 1 : a.id.localeCompare(b.id)));

  return (
    <section className="px-5 py-12 lg:px-10 lg:py-16">
      <div className="mx-auto max-w-[1380px]">
        <span className="text-xs font-bold uppercase tracking-[.25em] text-leaf">{t.experiment.eyebrow}</span>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight text-forest">{t.experiment.title}</h1>
        <div className="mt-10">
          {levers.length && presets.length ? (
            <Suspense fallback={<p className="text-ink/70">{t.lab.recalculating}</p>}>
              <Lab levers={levers} presets={presets} assumptions={assumptions} regions={regions} signedIn={!!viewer} />
            </Suspense>
          ) : (
            <p className="text-ink/70">{t.lab.error}</p>
          )}
        </div>
      </div>
    </section>
  );
}
