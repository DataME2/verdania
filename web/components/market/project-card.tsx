import type { ReactNode } from "react";
import { Briefcase, Leaf, MapPin, TrendingUp } from "lucide-react";
import type { Project, ProjectTotal } from "@/lib/data";
import { fmtValue } from "@/lib/format";
import { getT } from "@/lib/i18n-server";

const pct = (r: number) => `${(r * 100).toFixed(1)}%`;
const money = (v: number) => fmtValue(v, "V$");

export async function ProjectCard({ project: p, total, action }: { project: Project; total?: ProjectTotal; action?: ReactNode }) {
  const t = await getT();
  const sought = p.fundingTarget - p.publicContribution;
  const progress = total && sought > 0 ? Math.min(1, total.units / sought) : 0;
  return (
    <article className="flex flex-col rounded-[2rem] border border-forest/10 bg-white p-6 shadow-soft" aria-labelledby={`p-${p.id}`}>
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-leaf">
        <span>{t.categories[p.category] ?? p.category}</span>
        {p.region && (
          <span className="inline-flex items-center gap-1 text-ink/70">
            <MapPin className="h-3 w-3" aria-hidden="true" /> {p.region}
          </span>
        )}
      </div>
      <h3 id={`p-${p.id}`} className="mt-2 font-display text-2xl font-semibold leading-tight text-forest">{p.title}</h3>
      <p className="mt-2 text-sm text-ink/70">{p.summary}</p>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
        {[
          [t.market.target, money(p.fundingTarget)],
          [t.market.publicPart, money(p.publicContribution)],
          [t.market.privatePart, money(sought)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-cream p-2">
            <dt className="text-ink/70">{k}</dt>
            <dd className="mt-0.5 font-bold tabular-nums text-forest">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-4 rounded-2xl border border-forest/10 p-3" aria-label={t.market.privateReturn}>
        <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-forest">
          <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> {t.market.privateReturn}
        </h4>
        <p className="mt-1 text-sm">
          <strong className="tabular-nums text-forest">{pct(p.returnCentral)}</strong> {t.market.perYear}{" "}
          <span className="text-ink/70">({t.market.range(pct(p.returnLow), pct(p.returnHigh))})</span>
        </p>
        <p className="mt-1 text-xs text-ink/70">{t.market.risk[p.risk]} · {t.market.years(p.years)}</p>
      </section>

      <section className="mt-3 rounded-2xl border border-forest/10 p-3" aria-label={t.market.social}>
        <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-forest">
          <Leaf className="h-3.5 w-3.5" aria-hidden="true" /> {t.market.social}
        </h4>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink/80">
          <Briefcase className="h-3.5 w-3.5 shrink-0 text-leaf" aria-hidden="true" /> {t.market.jobsPerMillion(p.jobsPerMillion)}
        </p>
        <p className="mt-1 text-sm text-ink/80">{p.socialNote}</p>
        <p className="mt-1 text-sm text-ink/80">{p.environmentalNote}</p>
      </section>

      <details className="mt-3 text-xs text-ink/70">
        <summary className="cursor-pointer font-semibold text-forest">{t.market.assumptions}</summary>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          {p.assumptions.map((a) => <li key={a}>{a}</li>)}
        </ul>
      </details>

      <div className="mt-4 text-xs text-ink/70">
        {total ? (
          <>
            <p>{t.market.participants(money(total.units), total.participants)}</p>
            <div className="mt-1 h-2 rounded-full bg-forest/10" role="img" aria-label={`${Math.round(progress * 100)}% ${t.market.progress}`}>
              <div className="h-2 rounded-full bg-vivid" style={{ width: `${progress * 100}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-ink/70">{Math.round(progress * 100)}% {t.market.progress}</p>
          </>
        ) : (
          <p>{t.market.tooFew}</p>
        )}
      </div>

      {action && <div className="mt-4 border-t border-forest/10 pt-4">{action}</div>}
    </article>
  );
}
