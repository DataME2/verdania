"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FlaskConical, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import type { Evidence, Lever, Parameter } from "@/lib/data";
import { fmtDelta, fmtParam, fmtValue } from "@/lib/format";
import { LEVER_GROUPS } from "@/lib/levers";
import { t } from "@/lib/messages";
import { HORIZONS, type SimRequest } from "@/lib/sim-request";
import { DecileChart, LineBandChart } from "./charts";
import { DeltaChip, IndicatorCard } from "./indicator-card";
import { LeverSlider } from "./lever-slider";
import { SaveScenario } from "./save-scenario";
import { SensitivityPanel } from "./sensitivity";
import { useSimulation } from "./use-simulation";

export type PresetOption = { id: "baseline" | "A" | "B" | "C" | "D"; name: string; levers: Record<string, number | string> };

const CHALLENGES = t.experiment.challenges;
const REGION_COLS = [
  { code: "mean_income", unit: "V$", desirable: "up" },
  { code: "poverty_relative", unit: "share", desirable: "down" },
  { code: "unemployment", unit: "share", desirable: "down" },
  { code: "health_access", unit: "index", desirable: "up" },
] as const;
const EPS = 1e-9;
const EVIDENCE: Evidence[] = ["contested", "theoretical", "empirical-range", "synthetic"];

type State = {
  challenge: string;
  preset: PresetOption["id"];
  values: Record<string, number>;
  closure: string;
  horizon: SimRequest["horizon"];
  /** assumption overrides only; an assumption at its central value is absent */
  structural: Record<string, number>;
};

function numeric(levers: Record<string, number | string>) {
  return Object.fromEntries(Object.entries(levers).filter(([, v]) => typeof v === "number")) as Record<string, number>;
}

function fromUrl(params: URLSearchParams, presets: PresetOption[], levers: Lever[], assumptions: Parameter[]): State {
  const preset = presets.find((p) => p.id === params.get("preset"))?.id ?? "baseline";
  const start = presets.find((p) => p.id === preset)!.levers;
  const values = numeric(start);
  for (const l of levers) {
    const v = Number(params.get(l.code));
    if (params.has(l.code) && Number.isFinite(v)) values[l.code] = Math.min(l.max, Math.max(l.min, v));
  }
  const closure = params.get("closure") === "adjust_other" ? "adjust_other" : String(start.closure ?? "borrow");
  const structural: Record<string, number> = {};
  for (const a of assumptions) {
    const v = Number(params.get(a.code));
    if (params.has(a.code) && Number.isFinite(v) && Math.abs(v - a.base) > EPS) structural[a.code] = Math.min(a.max, Math.max(a.min, v));
  }
  const h = Number(params.get("horizon"));
  const challenge = CHALLENGES.find((c) => c.slug === params.get("challenge"))?.slug ?? CHALLENGES[0].slug;
  return { challenge, preset, values, closure, horizon: (HORIZONS as readonly number[]).includes(h) ? (h as State["horizon"]) : 10, structural };
}

function toUrl(s: State, presets: PresetOption[]) {
  const start = presets.find((p) => p.id === s.preset)!.levers;
  const q = new URLSearchParams();
  if (s.challenge !== CHALLENGES[0].slug) q.set("challenge", s.challenge);
  if (s.preset !== "baseline") q.set("preset", s.preset);
  if (s.horizon !== 10) q.set("horizon", String(s.horizon));
  for (const [k, v] of Object.entries(s.values)) if (Math.abs(v - Number(start[k])) > EPS) q.set(k, String(v));
  if (s.closure !== start.closure) q.set("closure", s.closure);
  for (const [k, v] of Object.entries(s.structural)) q.set(k, String(v));
  return q.toString();
}

export function Lab({
  levers,
  presets,
  assumptions,
  regions,
  signedIn,
}: {
  levers: Lever[];
  presets: PresetOption[];
  assumptions: Parameter[];
  regions: Record<string, string>;
  signedIn: boolean;
}) {
  const params = useSearchParams();
  const byCode = useMemo(() => Object.fromEntries(levers.map((l) => [l.code, l])), [levers]);
  const [s, setS] = useState<State>(() => fromUrl(new URLSearchParams(params.toString()), presets, levers, assumptions));
  const [challengeOpen] = useState(() => Object.keys(s.structural).length > 0);
  const [chart, setChart] = useState("");
  // Below lg the levers live in a bottom sheet over the results (PRD §6); from lg up they sit beside them.
  const [sheet, setSheet] = useState(false);
  const barButton = useRef<HTMLButtonElement>(null);
  const doneButton = useRef<HTMLButtonElement>(null);
  const cards = useRef<HTMLDivElement>(null);
  const ch = CHALLENGES.find((c) => c.slug === s.challenge)!;
  const shown = (ch.cards as readonly string[]).includes(chart) ? chart : ch.cards[0];

  const overrides = assumptions.filter((a) => a.code in s.structural);
  const request: SimRequest = {
    preset: s.preset,
    levers: { ...s.values, closure: s.closure },
    horizon: s.horizon,
    ...(overrides.length ? { structural: s.structural } : {}),
  };
  const sim = useSimulation(request, 400);
  const query = toUrl(s, presets);
  const changed = levers.filter((l) => Math.abs(s.values[l.code] - l.base) > EPS).length + (s.closure !== "borrow" ? 1 : 0);

  // Shareable state without a navigation: the URL always describes the scenario on screen.
  useEffect(() => {
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, [query]);

  useEffect(() => {
    if (!sheet) return;
    cards.current?.scrollIntoView({ block: "start" }); // the numbers stay in sight above the sheet
    doneButton.current?.focus();
  }, [sheet]);
  const closeSheet = () => {
    setSheet(false);
    barButton.current?.focus();
  };

  const set = (patch: Partial<State>) => setS((prev) => ({ ...prev, ...patch }));
  const applyPreset = (p: PresetOption) =>
    set({ preset: p.id, values: numeric(p.levers), closure: String(p.levers.closure ?? "borrow") });
  const setAssumption = (a: Parameter, v: number) =>
    setS((prev) => {
      const structural = { ...prev.structural };
      if (Math.abs(v - a.base) < EPS) delete structural[a.code];
      else structural[a.code] = v;
      return { ...prev, structural };
    });
  const today = presets.find((p) => p.id === "baseline")!;
  const tryOut = (overrides: Record<string, number>) => set({ preset: "baseline", values: { ...numeric(today.levers), ...overrides }, closure: "borrow" });

  const h = s.horizon;
  const data = sim.status === "ready" ? sim.data : undefined;
  const loading = sim.status === "loading";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(320px,420px)_1fr]">
      {/* ------------------------------------------------------------ controls */}
      <div className="space-y-6">
        <section className="rounded-[2rem] bg-forest p-6 text-white" aria-labelledby="challenge">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t.experiment.challengePick}>
            {CHALLENGES.map((c, i) => (
              <button
                key={c.slug}
                type="button"
                aria-pressed={c.slug === s.challenge}
                title={c.question}
                onClick={() => set({ challenge: c.slug })}
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[.12em] transition ${
                  c.slug === s.challenge ? "bg-sage text-forest" : "text-sage ring-1 ring-sage/40 hover:bg-white/10"
                }`}
              >
                {t.experiment.challengeLabel(i + 1)}
              </button>
            ))}
          </div>
          <h2 id="challenge" className="mt-4 font-display text-2xl font-semibold leading-tight">{ch.question}</h2>
          <p className="mt-3 text-sm text-white/80">{ch.lead}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {ch.tries.map((x) => (
              <button
                key={x.label}
                type="button"
                onClick={() => tryOut(x.levers)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-forest hover:bg-sage"
              >
                <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" /> {x.label}
              </button>
            ))}
          </div>
        </section>

        <fieldset className="rounded-[2rem] bg-white p-5 shadow-soft">
          <legend className="sr-only">{t.experiment.systems}</legend>
          <p className="text-sm font-bold text-forest" aria-hidden="true">{t.experiment.systems}</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={s.preset === p.id}
                onClick={() => applyPreset(p)}
                className={`rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition ${
                  s.preset === p.id ? "border-forest bg-forest text-white" : "border-forest/15 hover:border-forest"
                }`}
              >
                {p.id === "baseline" ? t.experiment.today : `${p.id} · ${p.name}`}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm font-bold text-forest" id="horizon-label">{t.experiment.horizon}</p>
          <div className="mt-2 flex gap-2" role="group" aria-labelledby="horizon-label">
            {HORIZONS.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={h === n}
                onClick={() => set({ horizon: n })}
                className={`flex-1 rounded-full border px-2 py-1.5 text-sm font-bold ${
                  h === n ? "border-forest bg-forest text-white" : "border-forest/15 text-forest hover:border-forest"
                }`}
              >
                {t.experiment.years(n)}
              </button>
            ))}
          </div>
        </fieldset>

        <div
          id="lab-levers"
          data-open={sheet || undefined}
          onKeyDown={(e) => e.key === "Escape" && sheet && closeSheet()}
          className={`space-y-6 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:max-h-[55dvh] max-lg:space-y-3 max-lg:overflow-y-auto max-lg:overscroll-contain max-lg:rounded-t-[2rem] max-lg:bg-cream max-lg:px-3 max-lg:pb-4 max-lg:shadow-[0_-16px_40px_rgb(0_0_0/0.18)] ${sheet ? "" : "max-lg:hidden"}`}
        >
          <div className="sticky top-0 z-10 -mx-3 flex items-center justify-between gap-3 bg-cream px-4 pb-2 pt-3 lg:hidden">
            <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-forest/25" />
            <button ref={doneButton} type="button" onClick={closeSheet} className="min-h-11 rounded-full bg-forest px-5 text-sm font-bold text-white hover:bg-leaf">
              {t.experiment.done}
            </button>
          </div>
          <div className="rounded-[2rem] bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold text-forest">{t.experiment.levers}</h2>
              <span className="text-xs font-bold text-ink/70" aria-live="polite">{t.experiment.changed(changed)}</span>
            </div>
            {LEVER_GROUPS.map(([group, codes]) => (
              <fieldset key={group} className="mt-5">
                <legend className="text-xs font-bold uppercase tracking-[.18em] text-leaf">{t.experiment.groups[group]}</legend>
                <div className="mt-2 space-y-2">
                  {codes.filter((c) => byCode[c]).map((c) => (
                    <LeverSlider key={c} lever={byCode[c]} value={s.values[c]} onChange={(v) => set({ values: { ...s.values, [c]: v } })} />
                  ))}
                </div>
              </fieldset>
            ))}
            <fieldset className="mt-5">
              <legend className="text-xs font-bold uppercase tracking-[.18em] text-leaf">{t.experiment.groups.fiscal}</legend>
              <label className="mt-2 block text-sm font-semibold text-ink/80" htmlFor="closure">{t.experiment.closure}</label>
              <select
                id="closure"
                value={s.closure}
                onChange={(e) => set({ closure: e.target.value })}
                className={`mt-1 w-full rounded-2xl border bg-white px-3 py-2 text-sm ${s.closure !== "borrow" ? "border-sun ring-2 ring-sun" : "border-forest/20"}`}
              >
                {Object.entries(t.experiment.closureOptions).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </select>
              {s.closure === "adjust_other" && byCode.debt_limit && (
                <div className="mt-2">
                  <LeverSlider lever={byCode.debt_limit} value={s.values.debt_limit} onChange={(v) => set({ values: { ...s.values, debt_limit: v } })} />
                </div>
              )}
            </fieldset>
            <button
              type="button"
              onClick={() => applyPreset(today)}
              disabled={changed === 0}
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-forest/20 px-4 py-2 text-sm font-bold text-forest disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> {t.experiment.resetAll}
            </button>
          </div>
  
          {assumptions.length > 0 && (
            <details className="rounded-[2rem] bg-white p-5 shadow-soft" open={challengeOpen}>
              <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="font-display text-xl font-semibold text-forest">{t.challenge.title}</span>
                <span className="text-xs font-bold text-ink/70" aria-live="polite">{t.challenge.changed(overrides.length)}</span>
              </summary>
              <p className="mt-3 text-sm text-ink/70">{t.challenge.lead}</p>
              {EVIDENCE.map((ev) => {
                const group = assumptions.filter((a) => a.evidence === ev);
                return group.length ? (
                  <fieldset key={ev} className="mt-5">
                    <legend className="text-xs font-bold uppercase tracking-[.18em] text-leaf">{t.methodology.evidence[ev].label}</legend>
                    <p className="mt-1 text-[11px] text-ink/70">{t.methodology.evidence[ev].text}</p>
                    <div className="mt-2 space-y-2">
                      {group.map((a) => (
                        <LeverSlider key={a.code} lever={a} assumption value={s.structural[a.code] ?? a.base} onChange={(v) => setAssumption(a, v)} />
                      ))}
                    </div>
                  </fieldset>
                ) : null;
              })}
              <button
                type="button"
                onClick={() => set({ structural: {} })}
                disabled={overrides.length === 0}
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-forest/20 px-4 py-2 text-sm font-bold text-forest disabled:opacity-40"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> {t.challenge.reset}
              </button>
            </details>
          )}
        </div>
      </div>

      <div id="lever-bar" className="fixed inset-x-0 bottom-0 z-30 border-t border-forest/10 bg-cream/95 px-4 py-3 backdrop-blur lg:hidden">
        <button
          ref={barButton}
          type="button"
          aria-expanded={sheet}
          aria-controls="lab-levers"
          onClick={() => setSheet(true)}
          className="flex min-h-12 w-full items-center justify-between gap-3 rounded-full bg-forest px-5 font-bold text-white"
        >
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> {t.experiment.adjust}
          </span>
          <span className="text-xs font-semibold text-sage">{t.experiment.changed(changed)}</span>
        </button>
      </div>

      {/* ------------------------------------------------------------ results */}
      <div className="min-w-0 space-y-6" aria-busy={loading}>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-3xl font-semibold text-forest">
            {t.experiment.results} <span className="text-lg text-ink/70">· {t.experiment.at(h)}</span>
          </h2>
          <p className="text-xs font-semibold text-ink/70" aria-live="polite">
            {loading ? t.lab.recalculating : data ? `Model v${data.model_version} · ${data.uncertainty.draws} draws · not a forecast` : ""}
          </p>
        </div>

        {overrides.length > 0 && (
          <section className="rounded-2xl border border-sun bg-sun/15 p-4" aria-labelledby="overrides-title">
            <h3 id="overrides-title" className="text-sm font-bold text-forest">{t.challenge.chips}</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {overrides.map((a) => (
                <li key={a.code} className="inline-flex items-center gap-1 rounded-full bg-white py-1 pl-3 pr-1 text-xs font-semibold text-ink">
                  {t.challenge.chip(a.label, fmtParam(s.structural[a.code]), fmtParam(a.base))}
                  <button
                    type="button"
                    onClick={() => setAssumption(a, a.base)}
                    aria-label={t.challenge.remove(a.label)}
                    className="grid h-6 w-6 place-items-center rounded-full text-forest hover:bg-sun/30"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink/70">{t.challenge.fixed}</p>
          </section>
        )}

        <SaveScenario challenge={s.challenge} request={request} signedIn={signedIn} next={`/experiment${query ? `?${query}` : ""}`} />

        {sim.status === "error" && (
          <p role="alert" className="rounded-2xl bg-loss/10 p-5 text-sm font-semibold text-loss">{sim.error || t.lab.error}</p>
        )}
        {data && (data.fiscal.valid_until < h || !data.fiscal.sustainable) && (
          <div role="status" className="flex gap-3 rounded-2xl border border-sun bg-sun/15 p-4 text-sm text-ink">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-forest" aria-hidden="true" />
            <p>
              <strong>{t.experiment.unsustainable}</strong>{" "}
              {data.fiscal.valid_until < h ? t.experiment.breakdown(data.fiscal.valid_until) : data.fiscal.flags.join("; ")}
            </p>
          </div>
        )}

        <div ref={cards} className="grid scroll-mt-24 gap-4 sm:grid-cols-2 2xl:grid-cols-4" aria-live="polite">
          {sim.status !== "error" &&
            ch.cards.map((c) => <IndicatorCard key={c} indicator={data?.indicators[c]} year={h} loading={loading} />)}
        </div>

        {data && (
          <>
            <section className="rounded-[2rem] bg-white p-6 shadow-soft" aria-labelledby="chart-title">
              <h3 id="chart-title" className="font-display text-xl font-semibold text-forest">{t.experiment.chart}</h3>
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Indicator">
                {ch.cards.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={shown === c}
                    onClick={() => setChart(c)}
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${shown === c ? "border-forest bg-forest text-white" : "border-forest/15 text-forest hover:border-forest"}`}
                  >
                    {data.indicators[c].label}
                  </button>
                ))}
              </div>
              <div className="mt-4">
                <LineBandChart indicator={data.indicators[shown]} years={data.years} />
              </div>
            </section>

            <section className="rounded-[2rem] bg-white p-6 shadow-soft" aria-labelledby="gains-title">
              <h3 id="gains-title" className="font-display text-xl font-semibold text-forest">{t.experiment.whoGains}</h3>
              <p className="mt-1 text-sm text-ink/70">{t.experiment.whoGainsLead}</p>
              <div className="mt-4">
                <DecileChart
                  baseline={data.deciles.baseline?.disposable ?? []}
                  scenario={data.deciles.scenario?.disposable ?? []}
                  year={data.deciles.year}
                />
              </div>
            </section>

            {data.regions && (
              <section className="rounded-[2rem] bg-white p-6 shadow-soft" aria-labelledby="where-title">
                <h3 id="where-title" className="font-display text-xl font-semibold text-forest">{t.experiment.where}</h3>
                <p className="mt-1 text-sm text-ink/70">{t.experiment.whereLead(h)}</p>
                <div className="relative mt-4 overflow-x-auto" role="region" aria-labelledby="where-title" tabIndex={0}>
                  <table className="w-full min-w-[600px] text-left text-sm tabular-nums">
                    <caption className="sr-only">{t.experiment.whereCaption(h)}</caption>
                    <thead>
                      <tr className="border-b border-forest/15 text-xs text-ink/70">
                        <th scope="col" className="py-2 pr-4 font-bold">{t.experiment.region}</th>
                        {REGION_COLS.map((c) => (
                          <th key={c.code} scope="col" className="py-2 pr-4 font-bold">{t.discover.layers[c.code]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-forest/10">
                      {data.regions.map((r) => (
                        <tr key={r.code} className="align-top">
                          <th scope="row" className="py-2.5 pr-4 font-semibold text-forest">{regions[r.code] ?? r.code}</th>
                          {REGION_COLS.map((c) => {
                            const b = r.baseline[c.code];
                            const v = r.scenario[c.code];
                            return (
                              <td key={c.code} className="py-2.5 pr-4">
                                <span className="block font-semibold">{fmtValue(v, c.unit)}</span>
                                <span className="mt-1 block">
                                  <DeltaChip delta={v == null || b == null ? null : v - b} unit={c.unit} desirable={c.desirable} />
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section className="rounded-[2rem] bg-white p-6 shadow-soft" aria-labelledby="why-title">
              <h3 id="why-title" className="font-display text-xl font-semibold text-forest">{t.experiment.why}</h3>
              {data.mechanisms.length === 0 ? (
                <p className="mt-2 text-sm text-ink/70">{t.lab.noChange}</p>
              ) : (
                <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm text-ink/80">
                  {data.mechanisms.map((m) => (
                    <li key={m.lever}>
                      <strong>{byCode[m.lever]?.label ?? t.experiment.closure}</strong>: {m.explanation}{" "}
                      <span className="text-ink/70">
                        ({m.effects.map((e) => `${data.indicators[e.indicator]?.label}: ${fmtDelta(e.delta_at_horizon, data.indicators[e.indicator]?.unit ?? "index")}`).join("; ")})
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <SensitivityPanel request={request} />

            <section className="rounded-[2rem] border border-forest/10 bg-cream p-6" aria-labelledby="assumptions-title">
              <h3 id="assumptions-title" className="font-display text-xl font-semibold text-forest">{t.experiment.assumptions}</h3>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink/80">
                {data.assumptions.map((a) => <li key={a}>{a}</li>)}
              </ul>
              <p className="mt-3 text-sm text-ink/70">
                <strong>{t.experiment.notModelled}</strong> {data.not_modelled.join(", ")}.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-ink/70">
                {data.accounting_checks.passed && (
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-leaf" aria-hidden="true" /> {t.experiment.accounting}</span>
                )}
                <Link href="/methodology" className="font-bold text-forest hover:text-leaf">{t.experiment.methodology}</Link>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
