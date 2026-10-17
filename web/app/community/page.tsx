import type { Metadata } from "next";
import Link from "next/link";
import { ContributeForm } from "@/components/community/contribute-form";
import { ScenarioList } from "@/components/scenario/scenario-list";
import { getPublishedScenarios } from "@/lib/data";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.scenarios.communityEyebrow, description: t.scenarios.communityLead };
}

export default async function CommunityPage() {
  const [scenarios, t] = await Promise.all([getPublishedScenarios(), getT()]);
  return (
    <section className="px-5 py-12 lg:px-10 lg:py-16">
      <div className="mx-auto max-w-3xl">
        <span className="text-xs font-bold uppercase tracking-[.25em] text-leaf">{t.scenarios.communityEyebrow}</span>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight text-forest">{t.scenarios.community}</h1>
        <p className="mt-4 text-ink/70">{t.scenarios.communityLead}</p>
        <div className="mt-8 rounded-[2rem] bg-white p-6 shadow-soft">
          <ScenarioList scenarios={scenarios} empty={t.scenarios.communityEmpty} />
        </div>
        <Link href="/experiment" className="mt-6 inline-block font-bold text-forest hover:text-leaf">{t.cta.experiment}</Link>

        <section id="contribute" className="mt-16" aria-labelledby="contribute-title">
          <span className="text-xs font-bold uppercase tracking-[.25em] text-leaf">{t.contribute.eyebrow}</span>
          <h2 id="contribute-title" className="mt-3 font-display text-4xl font-semibold tracking-tight text-forest">{t.contribute.title}</h2>
          <p className="mt-4 text-ink/70">{t.contribute.lead}</p>
          <div className="mt-8 rounded-[2rem] bg-white p-6 shadow-soft">
            <ContributeForm />
          </div>
        </section>
      </div>
    </section>
  );
}
