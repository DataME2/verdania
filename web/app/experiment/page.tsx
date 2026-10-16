import type { Metadata } from "next";
import { Suspense } from "react";
import { Lab, type PresetOption } from "@/components/lab/lab";
import { getBaseline, getLevers } from "@/lib/data";
import { t } from "@/lib/messages";

export const metadata: Metadata = {
  title: "Run an experiment",
  description: "Change Verdania's policies and see the simulated consequences, with uncertainty ranges and assumptions.",
};

export default async function ExperimentPage() {
  const baseline = await getBaseline();
  const levers = baseline ? await getLevers(baseline.modelVersion) : [];
  const presets: PresetOption[] = (baseline?.presets ?? [])
    .map((p) => ({ id: (p.family ?? "baseline") as PresetOption["id"], name: p.name, levers: p.levers }))
    .sort((a, b) => (a.id === "baseline" ? -1 : b.id === "baseline" ? 1 : a.id.localeCompare(b.id)));

  return (
    <section className="px-5 py-12 lg:px-10 lg:py-16">
      <div className="mx-auto max-w-[1380px]">
        <span className="text-xs font-bold uppercase tracking-[.25em] text-leaf">{t.experiment.eyebrow}</span>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight text-forest">{t.experiment.title}</h1>
        <div className="mt-10">
          {levers.length && presets.length ? (
            <Suspense fallback={<p className="text-ink/60">{t.lab.recalculating}</p>}>
              <Lab levers={levers} presets={presets} />
            </Suspense>
          ) : (
            <p className="text-ink/70">{t.lab.error}</p>
          )}
        </div>
      </div>
    </section>
  );
}
