import type { Metadata } from "next";
import Link from "next/link";
import { ScenarioList } from "@/components/scenario/scenario-list";
import { getPublishedScenarios } from "@/lib/data";
import { t } from "@/lib/messages";

export const metadata: Metadata = { title: "Community", description: t.scenarios.communityLead };

export default async function CommunityPage() {
  const scenarios = await getPublishedScenarios();
  return (
    <section className="px-5 py-12 lg:px-10 lg:py-16">
      <div className="mx-auto max-w-3xl">
        <span className="text-xs font-bold uppercase tracking-[.25em] text-leaf">Community</span>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight text-forest">{t.scenarios.community}</h1>
        <p className="mt-4 text-ink/70">{t.scenarios.communityLead}</p>
        <div className="mt-8 rounded-[2rem] bg-white p-6 shadow-soft">
          <ScenarioList scenarios={scenarios} empty={t.scenarios.communityEmpty} />
        </div>
        <Link href="/experiment" className="mt-6 inline-block font-bold text-forest hover:text-leaf">{t.cta.experiment}</Link>
      </div>
    </section>
  );
}
