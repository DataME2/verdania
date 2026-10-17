import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { getBaseline, getMethodology, type Evidence, type Parameter } from "@/lib/data";
import { fmtLever } from "@/lib/format";
import { getLocale, getT } from "@/lib/i18n-server";
import { localizeParams } from "@/lib/localize";
import { INTL, type Locale } from "@/lib/locale";
import type { Messages } from "@/lib/messages";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.nav.find((n) => n.href === "/methodology")?.label, description: t.methodology.lead };
}

type M = Messages["methodology"];
const REPO = "https://github.com/DataME2/verdania";
const num = (v: number) => v.toLocaleString("en", { maximumFractionDigits: 3 }).replace("-", "−");

const EVIDENCE_STYLE: Record<Evidence, string> = {
  "empirical-range": "bg-sage/50 text-forest",
  contested: "bg-sun/30 text-ink",
  theoretical: "bg-mist text-forest",
  synthetic: "bg-white text-ink/70 border border-forest/15",
};

export default async function MethodologyPage() {
  const [baseline, t, locale] = await Promise.all([getBaseline(), getT(), getLocale()]);
  const m = t.methodology;
  const date = (iso: string) => new Date(iso).toLocaleDateString(INTL[locale], { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const data = baseline ? await getMethodology(baseline.modelVersion) : null;
  const current = data?.versions.find((v) => v.isCurrent);
  const parameters = localizeParams(data?.parameters ?? [], t);
  const levers = parameters.filter((p) => p.kind === "lever");
  const structural = parameters.filter((p) => p.kind === "structural");

  return (
    <section className="px-5 py-12 lg:px-10 lg:py-16">
      <div className="mx-auto max-w-4xl">
        <span className="text-xs font-bold uppercase tracking-[.25em] text-leaf">{m.eyebrow}</span>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight text-forest">{m.title}</h1>
        <p className="mt-4 text-lg text-ink/75">{m.lead}</p>
        {current && <p className="mt-3 text-sm font-semibold text-forest">{m.status(current.version, date(current.releasedAt))}</p>}
        <p className="mt-5 rounded-2xl border border-forest/15 bg-white px-5 py-4 text-sm text-ink/80">{m.disclaimer}</p>
        <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold">
          <a href={`${REPO}/blob/main/docs/economic-model.md`} className="text-forest underline hover:text-leaf">{m.spec}</a>
          <a href={`${REPO}/tree/main/sim`} className="text-forest underline hover:text-leaf">{m.code}</a>
        </p>

        <nav aria-label={m.toc} className="mt-8 rounded-2xl bg-mist/60 px-5 py-4">
          <h2 className="text-xs font-bold uppercase tracking-[.2em] text-forest">{m.toc}</h2>
          <ol className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {Object.entries(m.sections).map(([id, label]) => (
              <li key={id}><a href={`#${id}`} className="text-forest hover:text-leaf hover:underline">{label}</a></li>
            ))}
          </ol>
        </nav>

        <Section m={m} id="rules">
          <ul className="list-disc space-y-2 pl-5">{m.rules.map((r) => <li key={r}>{r}</li>)}</ul>
        </Section>

        <Section m={m} id="model">
          <div className="grid gap-4">
            {m.blocks.map((b) => (
              <article key={b.title} className="rounded-2xl bg-white p-5 shadow-soft">
                <h3 className="font-display text-xl font-semibold text-forest">{b.title}</h3>
                <p className="mt-2">{b.text}</p>
                {b.equation && <p className="mt-3 break-words rounded-lg bg-cream px-3 py-2 font-mono text-sm text-ink">{b.equation}</p>}
              </article>
            ))}
          </div>
        </Section>

        <Section m={m} id="limits">
          <p className="rounded-2xl border-l-4 border-sun bg-white px-5 py-4 font-semibold">{m.noDemand}</p>
          <ul className="mt-4 list-disc space-y-2 pl-5">{m.limits.map((l) => <li key={l}>{l}</li>)}</ul>
          <h3 className="mt-6 font-display text-xl font-semibold text-forest">{m.roadmap}</h3>
          <dl className="mt-2 space-y-2">
            {m.roadmapItems.map((r) => (
              <div key={r.version} className="flex gap-3">
                <dt className="w-12 shrink-0 font-bold text-forest">{r.version}</dt>
                <dd>{r.text}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section m={m} id="parameters">
          {!data?.parameters.length ? (
            <p role="status">{m.noParameters}</p>
          ) : (
            <>
              <dl className="grid gap-2 sm:grid-cols-2">
                {(Object.keys(m.evidence) as Evidence[]).map((k) => (
                  <div key={k} className="flex items-start gap-2 text-sm">
                    <dt><EvidenceBadge m={m} kind={k} /></dt>
                    <dd className="text-ink/75">{m.evidence[k].text}</dd>
                  </div>
                ))}
              </dl>
              <ParamTable m={m} t={t} locale={locale} caption={m.levers} rows={levers} lever />
              <ParamTable m={m} t={t} locale={locale} caption={m.structural} rows={structural} />
            </>
          )}
        </Section>

        <Section m={m} id="uncertainty">
          <ul className="list-disc space-y-2 pl-5">{m.uncertainty.map((u) => <li key={u}>{u}</li>)}</ul>
        </Section>

        <Section m={m} id="checks">
          <ol className="list-decimal space-y-1.5 pl-5">{m.checks.map((c) => <li key={c}>{c}</li>)}</ol>
          <p className="mt-4 text-ink/75">{m.checksNote}</p>
        </Section>

        <Section m={m} id="data">
          <p>{m.data(data?.empiricalRows ?? 0)}</p>
          <p className="mt-3 text-sm text-ink/70">{m.sources}</p>
        </Section>

        <Section m={m} id="versions">
          <ul className="space-y-3">
            {(data?.versions ?? []).map((v) => (
              <li key={v.version} className="rounded-2xl bg-white p-5 shadow-soft">
                <p className="font-bold text-forest">
                  v{v.version} · {date(v.releasedAt)}
                  {v.isCurrent && <span className="ml-2 rounded-full bg-vivid/20 px-2 py-0.5 text-xs">{m.current}</span>}
                </p>
                <p className="mt-1 text-sm text-ink/75">{t.model.versions[v.version] ?? v.notes}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section m={m} id="reproduce">
          <p>{m.reproduceLead}</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">{m.record.map((r) => <li key={r}>{r}</li>)}</ul>
          <ol className="mt-4 list-decimal space-y-2 pl-5">{m.reproduceSteps.map((s) => <li key={s}>{s}</li>)}</ol>
          <p className="mt-6 flex flex-wrap gap-x-6 gap-y-2 font-bold">
            <Link href="/community" className="text-forest hover:text-leaf">{t.scenarios.community}</Link>
            <Link href="/experiment" className="text-forest hover:text-leaf">{t.cta.experiment}</Link>
          </p>
        </Section>
      </div>
    </section>
  );
}

function Section({ m, id, children }: { m: M; id: keyof M["sections"]; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mt-14">
      <h2 id={`${id}-title`} className="font-display text-3xl font-semibold tracking-tight text-forest">{m.sections[id]}</h2>
      <div className="mt-4 text-ink/85">{children}</div>
    </section>
  );
}

function EvidenceBadge({ m, kind }: { m: M; kind: Evidence }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ${EVIDENCE_STYLE[kind]}`}>{m.evidence[kind].label}</span>;
}

// Below `sm` the value columns collapse into the parameter cell, so the table never needs sideways scrolling.
function ParamTable({ m, t, locale, caption, rows, lever }: { m: M; t: Messages; locale: Locale; caption: string; rows: Parameter[]; lever?: boolean }) {
  const wide = "hidden px-3 py-3 sm:table-cell";
  return (
    <div className="mt-8 rounded-2xl bg-white shadow-soft">
      <table className="w-full text-left text-sm">
        <caption className="px-5 pt-4 text-left font-display text-lg font-semibold text-forest">{caption}</caption>
        <thead className="text-xs uppercase tracking-wider text-ink/70">
          <tr>
            <th scope="col" className="px-5 py-3">{m.columns.parameter}</th>
            <th scope="col" className={wide}>{lever ? m.columns.baseline : m.columns.central}</th>
            <th scope="col" className={wide}>{m.columns.range}</th>
            {!lever && <th scope="col" className={`${wide} pr-5`}>{m.columns.evidence}</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-forest/10">
          {rows.map((p) => {
            const value = lever ? fmtLever(p.base, p.unit, locale) : num(p.base);
            const range = lever ? `${fmtLever(p.min, null, locale)} – ${fmtLever(p.max, p.unit, locale)}` : t.common.between(num(p.min), num(p.max));
            const zero = !lever && p.min < 0 && p.max > 0;
            return (
              <tr key={p.code} className="align-top">
                <th scope="row" className="px-5 py-3 font-semibold text-ink">
                  {p.label}
                  <span className="ml-1.5 font-mono text-xs font-normal text-ink/70">{p.code}</span>
                  {p.source && <span className="mt-1 block text-xs font-normal italic text-ink/70">{p.source}</span>}
                  <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-normal tabular-nums sm:hidden">
                    <span>{lever ? m.columns.baseline : m.columns.central}: {value}</span>
                    <span>{m.columns.range}: {range}</span>
                    {zero && <span className="font-bold text-ink/70">{m.crossesZero}</span>}
                    {!lever && <EvidenceBadge m={m} kind={p.evidence} />}
                  </span>
                </th>
                <td className={`${wide} whitespace-nowrap tabular-nums`}>{value}</td>
                <td className={`${wide} whitespace-nowrap tabular-nums`}>
                  {range}
                  {zero && <span className="mt-1 block text-xs font-bold text-ink/70">{m.crossesZero}</span>}
                </td>
                {!lever && <td className={`${wide} pr-5`}><EvidenceBadge m={m} kind={p.evidence} /></td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
