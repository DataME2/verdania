import type { Metadata } from "next";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { Wallet } from "lucide-react";
import { joinMarket } from "@/app/market/actions";
import { GoogleIcon } from "@/components/icons";
import { MoveForm } from "@/components/market/move-form";
import { ProjectCard } from "@/components/market/project-card";
import { getPortfolio, type Portfolio } from "@/lib/account-data";
import { getViewer } from "@/lib/auth";
import { getProjects, getPublicTotals, type Project, type ProjectTotal } from "@/lib/data";
import { fmtValue } from "@/lib/format";
import { getT } from "@/lib/i18n-server";
import { localizeProjects } from "@/lib/localize";
import type { Messages } from "@/lib/messages";
import { projectPortfolio } from "@/lib/portfolio-math";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.nav.find((n) => n.href === "/market")?.label, description: t.market.description };
}

const money = (v: number) => fmtValue(v, "V$");

export default async function MarketPage() {
  const [stored, totals, viewer, t] = await Promise.all([getProjects(), getPublicTotals(), getViewer(), getT()]);
  const projects = localizeProjects(stored, t);
  const portfolio = viewer ? await getPortfolio() : null;
  const byId = Object.fromEntries(projects.map((p) => [p.id, p]));
  const totalOf = Object.fromEntries(totals.map((x) => [x.projectId, x]));
  const held = Object.fromEntries((portfolio?.allocations ?? []).map((a) => [a.projectId, a.units]));

  return (
    <section className="px-5 py-12 lg:px-10 lg:py-16">
      <div className="mx-auto max-w-[1380px]">
        <span className="text-xs font-bold uppercase tracking-[.25em] text-leaf">{t.market.eyebrow}</span>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight text-forest">{t.market.title}</h1>
        <p className="mt-4 max-w-3xl text-ink/70">{t.market.lead}</p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {t.market.badges.map((b) => (
            <li key={b} className="rounded-full border border-forest/15 bg-white px-3 py-1.5 text-[11px] font-bold text-forest">{b}</li>
          ))}
        </ul>

        <div className="mt-10">
          {!viewer ? (
            <Callout title={t.market.signIn} lead={t.market.signInLead}>
              <Link href="/sign-in?next=/market" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 font-bold text-forest hover:bg-sage">
                <GoogleIcon /> {t.cta.google}
              </Link>
            </Callout>
          ) : !portfolio ? (
            <Callout title={t.market.joinTitle} lead={t.market.joinLead}>
              <form action={joinMarket}>
                <button type="submit" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 font-bold text-forest hover:bg-sage">
                  <Wallet className="h-4 w-4" aria-hidden="true" /> {t.market.join}
                </button>
              </form>
            </Callout>
          ) : (
            <PortfolioPanel portfolio={portfolio} projects={projects} byId={byId} t={t} />
          )}
        </div>

        <h2 className="mt-14 font-display text-3xl font-semibold text-forest">{t.market.projects}</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              total={totalOf[p.id]}
              action={
                portfolio ? (
                  <MoveForm
                    requestId={randomUUID()}
                    to={p.id}
                    max={portfolio.unallocated}
                    label={held[p.id] ? t.market.allocateMore : t.market.allocate}
                    idPrefix={`alloc-${p.id}`}
                  />
                ) : undefined
              }
            />
          ))}
        </div>

        <Dashboard totals={totals} byId={byId} t={t} />
      </div>
    </section>
  );
}

function Callout({ title, lead, children }: { title: string; lead: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start justify-between gap-6 rounded-[2rem] bg-forest p-8 text-white md:flex-row md:items-center">
      <div>
        <h2 className="font-display text-3xl font-semibold">{title}</h2>
        <p className="mt-2 max-w-xl text-white/80">{lead}</p>
      </div>
      {children}
    </div>
  );
}

function PortfolioPanel({ portfolio, projects, byId, t }: { portfolio: Portfolio; projects: Project[]; byId: Record<string, Project>; t: Messages }) {
  const allocated = portfolio.allocations.reduce((s, a) => s + a.units, 0);
  const terms = Object.fromEntries(
    projects.map((p) => [p.id, { low: p.returnLow, central: p.returnCentral, high: p.returnHigh, years: p.years, jobsPerMillion: p.jobsPerMillion }]),
  );
  const proj = projectPortfolio(portfolio.allocations, terms);
  const options = projects.map((p) => ({ value: p.id, label: p.title }));
  const heldOptions = portfolio.allocations.map((a) => ({ value: a.projectId, label: `${byId[a.projectId]?.title ?? t.market.project} (${money(a.units)})` }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <section className="rounded-[2rem] bg-white p-6 shadow-soft" aria-labelledby="portfolio-title">
        <h2 id="portfolio-title" className="font-display text-2xl font-semibold text-forest">{t.market.portfolio}</h2>
        <dl className="mt-4 grid grid-cols-3 gap-3">
          {[
            [t.market.unallocated, portfolio.unallocated],
            [t.market.allocated, allocated],
            [t.market.total, portfolio.initial],
          ].map(([k, v]) => (
            <div key={k as string} className="rounded-2xl bg-cream p-3">
              <dt className="text-xs text-ink/70">{k}</dt>
              <dd className="font-display text-xl font-semibold tabular-nums text-forest">{money(v as number)}</dd>
            </div>
          ))}
        </dl>

        <h3 className="mt-6 text-sm font-bold text-forest">{t.market.holdings}</h3>
        {portfolio.allocations.length === 0 ? (
          <p className="mt-2 text-sm text-ink/70">{t.market.noHoldings}</p>
        ) : (
          <ul className="mt-2 divide-y divide-forest/10">
            {portfolio.allocations.map((a) => (
              <li key={a.projectId} className="grid gap-2 py-3 sm:grid-cols-[1fr_minmax(200px,260px)] sm:items-start">
                <div>
                  <p className="text-sm font-semibold text-ink">{byId[a.projectId]?.title ?? t.market.project}</p>
                  <p className="text-xs tabular-nums text-ink/70">{money(a.units)}</p>
                </div>
                <MoveForm requestId={randomUUID()} from={a.projectId} max={a.units} label={t.market.withdraw} idPrefix={`wd-${a.projectId}`} />
              </li>
            ))}
          </ul>
        )}

        {portfolio.allocations.length > 0 && (
          <div className="mt-4 rounded-2xl border border-forest/10 p-4">
            <h3 className="text-sm font-bold text-forest">{t.market.move}</h3>
            <div className="mt-2">
              <MoveForm requestId={randomUUID()} fromOptions={heldOptions} toOptions={options} max={allocated} label={t.market.moveButton} idPrefix="move" />
            </div>
          </div>
        )}
      </section>

      <div className="space-y-6">
        <section className="rounded-[2rem] border border-sun bg-sun/10 p-6" aria-labelledby="proj-title">
          <h2 id="proj-title" className="text-sm font-bold text-forest">{t.market.projection}</h2>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-forest">
            {proj.invested ? t.market.value(money(proj.value.low), money(proj.value.central), money(proj.value.high)) : "—"}
          </p>
          <p className="mt-1 text-sm text-ink/70">{proj.invested ? t.market.jobs(proj.jobs.toFixed(1)) : t.market.noHoldings}</p>
          <p className="mt-3 text-xs text-ink/70">{t.market.projectionNote}</p>
        </section>

        <section className="rounded-[2rem] bg-white p-6 shadow-soft" aria-labelledby="activity-title">
          <h2 id="activity-title" className="text-sm font-bold text-forest">{t.market.activity}</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {portfolio.ledger.map((e) => (
              <li key={e.id} className="flex justify-between gap-3">
                <span className="text-ink/80">
                  {t.market.entry[e.type]} {e.projectId ? byId[e.projectId]?.title ?? t.market.aProject : t.market.theMarket}
                </span>
                <span className="shrink-0 tabular-nums text-ink/70">{money(e.units)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Dashboard({ totals, byId, t }: { totals: ProjectTotal[]; byId: Record<string, Project>; t: Messages }) {
  const sorted = [...totals].sort((a, b) => b.units - a.units);
  const max = sorted[0]?.units ?? 0;
  return (
    <section className="mt-16 rounded-[2rem] bg-mist p-6 sm:p-8" aria-labelledby="dash-title">
      <h2 id="dash-title" className="font-display text-3xl font-semibold text-forest">{t.market.dashboard}</h2>
      <p className="mt-2 max-w-3xl text-sm text-ink/70">{t.market.dashboardLead}</p>
      {sorted.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-white p-5 text-sm text-ink/70">{t.market.dashboardEmpty}</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {sorted.map((x) => (
            <li key={x.projectId}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="font-semibold text-ink">
                  {byId[x.projectId]?.title} <span className="font-normal text-ink/70">· {t.categories[x.category] ?? x.category}</span>
                </span>
                <span className="shrink-0 tabular-nums text-ink/70">{money(x.units)} · {t.market.people(x.participants)}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-white">
                <div className="h-2 rounded-full bg-forest" style={{ width: `${(x.units / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
