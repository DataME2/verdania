import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Lock, Globe } from "lucide-react";
import { deleteScenario, setVisibility } from "@/app/scenarios/actions";
import { IndicatorCard } from "@/components/lab/indicator-card";
import { VerifyButton } from "@/components/scenario/verify-button";
import { getScenario, scenarioRequest } from "@/lib/account-data";
import { getLevers, getMethodology } from "@/lib/data";
import { fmtLever, fmtParam } from "@/lib/format";
import { t } from "@/lib/messages";
import { runSimulation } from "@/lib/sim";

const CARDS = ["gdp_pc", "median_income", "poverty_anchored", "poverty_relative", "gini_disposable", "debt_share"];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const s = await getScenario((await params).id);
  return { title: s?.title ?? "Scenario", robots: s?.visibility === "public" ? undefined : { index: false } };
}

export default async function ScenarioPage({ params }: { params: Promise<{ id: string }> }) {
  const scenario = await getScenario((await params).id);
  if (!scenario) notFound(); // missing, or private and not yours: the database returns nothing either way

  const [levers, methodology] = await Promise.all([getLevers(scenario.modelVersion), getMethodology(scenario.modelVersion)]);
  const overrides = (methodology.parameters ?? []).filter((p) => p.kind === "structural" && p.code in scenario.structural);
  const changed = levers.filter((l) => typeof scenario.levers[l.code] === "number" && Math.abs(Number(scenario.levers[l.code]) - l.base) > 1e-9);
  const closureChanged = scenario.levers.closure && scenario.levers.closure !== "borrow";
  const lab = new URLSearchParams(changed.map((l) => [l.code, String(scenario.levers[l.code])]));
  if (closureChanged) lab.set("closure", String(scenario.levers.closure));
  if (scenario.horizon !== 10) lab.set("horizon", String(scenario.horizon));
  for (const [k, v] of Object.entries(scenario.structural)) lab.set(k, String(v));

  const outcome = await runSimulation(scenarioRequest(scenario)).catch(() => null);
  const result = outcome?.ok ? outcome.data : null;

  return (
    <section className="px-5 py-12 lg:px-10 lg:py-16">
      <div className="mx-auto max-w-[1100px] space-y-8">
        <header>
          <p className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[.2em] text-leaf">
            <span className="inline-flex items-center gap-1">
              {scenario.visibility === "public" ? <Globe className="h-3.5 w-3.5" aria-hidden="true" /> : <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
              {scenario.visibility === "public" ? t.scenarios.public : t.scenarios.private}
            </span>
            <span>{t.scenarios.model(scenario.modelVersion)}</span>
            <span>{t.scenarios.horizon(scenario.horizon)}</span>
            <span>
              {t.scenarios.savedOn} {new Date(scenario.createdAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}
            </span>
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-forest sm:text-5xl">{scenario.title}</h1>
          {scenario.description && <p className="mt-3 max-w-3xl whitespace-pre-line text-ink/80">{scenario.description}</p>}
        </header>

        <section className="rounded-[2rem] bg-white p-6 shadow-soft" aria-labelledby="levers-title">
          <h2 id="levers-title" className="font-display text-xl font-semibold text-forest">{t.scenarios.changed}</h2>
          {changed.length === 0 && !closureChanged ? (
            <p className="mt-2 text-sm text-ink/70">{t.scenarios.unchanged}</p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {changed.map((l) => (
                <li key={l.code} className="flex justify-between gap-3 rounded-xl bg-sun/15 px-3 py-2 text-sm">
                  <span className="text-ink/80">{l.label}</span>
                  <span className="shrink-0 font-bold tabular-nums text-forest">
                    {fmtLever(l.base, l.unit)} → {fmtLever(Number(scenario.levers[l.code]), l.unit)}
                  </span>
                </li>
              ))}
              {closureChanged && (
                <li className="flex justify-between gap-3 rounded-xl bg-sun/15 px-3 py-2 text-sm">
                  <span className="text-ink/80">{t.experiment.closure}</span>
                  <span className="font-bold text-forest">{fmtLever(String(scenario.levers.closure), null)}</span>
                </li>
              )}
            </ul>
          )}
          {overrides.length > 0 && (
            <>
              <h3 className="mt-5 text-sm font-bold text-forest">{t.challenge.scenario}</h3>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {overrides.map((p) => (
                  <li key={p.code} className="flex justify-between gap-3 rounded-xl bg-sun/15 px-3 py-2 text-sm">
                    <span className="text-ink/80">{p.label}</span>
                    <span className="shrink-0 font-bold tabular-nums text-forest">
                      {fmtParam(p.base)} → {fmtParam(scenario.structural[p.code])}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <Link href={`/experiment${lab.size ? `?${lab}` : ""}`} className="mt-4 inline-flex items-center gap-2 font-bold text-forest hover:text-leaf">
            {t.scenarios.openLab} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>

        <section aria-labelledby="results-title">
          <h2 id="results-title" className="font-display text-2xl font-semibold text-forest">{t.scenarios.results(scenario.horizon)}</h2>
          {result ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CARDS.map((c) => <IndicatorCard key={c} indicator={result.indicators[c]} year={scenario.horizon} loading={false} />)}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl bg-loss/10 p-5 text-sm font-semibold text-loss">{t.lab.error}</p>
          )}
          {result && (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-ink/70">
              {result.assumptions.map((a) => <li key={a}>{a}</li>)}
            </ul>
          )}
        </section>

        <section className="rounded-[2rem] border border-forest/10 bg-cream p-6" aria-labelledby="repro-title">
          <h2 id="repro-title" className="font-display text-xl font-semibold text-forest">{t.scenarios.verify}</h2>
          <p className="mt-1 break-all text-xs text-ink/70">
            {t.scenarios.fingerprint}: <code>{scenario.outputHash ?? "—"}</code>
          </p>
          <div className="mt-4">
            <VerifyButton id={scenario.id} />
          </div>
        </section>

        {scenario.isOwner && (
          <div className="flex flex-wrap gap-3">
            <form action={setVisibility}>
              <input type="hidden" name="id" value={scenario.id} />
              <input type="hidden" name="visibility" value={scenario.visibility === "public" ? "private" : "public"} />
              <button type="submit" className="rounded-full bg-forest px-5 py-2 text-sm font-bold text-white hover:bg-leaf">
                {scenario.visibility === "public" ? t.scenarios.makePrivate : t.scenarios.makePublic}
              </button>
            </form>
            <details className="group">
              <summary className="cursor-pointer list-none rounded-full border border-loss/40 px-5 py-2 text-sm font-bold text-loss hover:bg-loss/10">
                {t.scenarios.delete}…
              </summary>
              <form action={deleteScenario} className="mt-2 rounded-2xl border border-loss/30 bg-white p-3 text-sm">
                <input type="hidden" name="id" value={scenario.id} />
                <p className="text-ink/80">This permanently deletes the scenario{scenario.visibility === "public" ? " and removes it from the Community page" : ""}.</p>
                <button type="submit" className="mt-2 rounded-full bg-loss px-4 py-1.5 font-bold text-white">Delete permanently</button>
              </form>
            </details>
          </div>
        )}
      </div>
    </section>
  );
}
