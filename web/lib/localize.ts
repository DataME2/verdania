// Text that arrives in English from the database or the engine, shown in the visitor's language. Every
// lookup falls back to the English source, so nothing goes blank when the catalogue lacks an entry.
import type { Messages } from "./messages";
import type { Sensitivity, SimResult } from "./sim-types";

export function localizeParams<P extends { code: string; label: string }>(list: P[], t: Messages): P[] {
  return list.map((p) => ({ ...p, label: t.model.params[p.code] ?? p.label }));
}

export const presetName = (t: Messages, slug: string, name: string) => t.model.presets[slug] ?? name;

export function localizeProjects<P extends { slug: string; title: string; summary: string; socialNote: string; environmentalNote: string; assumptions: string[] }>(
  list: P[],
  t: Messages,
): P[] {
  return list.map((p) => {
    const x = t.model.projects[p.slug];
    return {
      ...p,
      ...(x && { title: x.title, summary: x.summary, socialNote: x.social, environmentalNote: x.environmental }),
      assumptions: p.assumptions.map((a) => t.model.projectAssumptions[a] ?? a),
    };
  });
}

/** Python's "{:g}" for the values the engine writes into its explanations. */
const g = (v: number) => String(Number(v.toPrecision(6)));

/**
 * An engine result in the visitor's language. `values` are the structural parameters the run used (central
 * values plus any overrides): the translated explanations are filled in with them, as the engine does.
 * Fingerprints are untouched: they were computed by the engine on its own output.
 */
export function localizeResult(r: SimResult, t: Messages, values: Record<string, number>): SimResult {
  const m = t.model;
  const label = (code: string, fallback: string) => m.indicators[code] ?? fallback;
  const fill = (template: string) => {
    let missing = false;
    const text = template.replace(/\{(\w+)\}/g, (_, k: string) => (k in values ? g(values[k]) : ((missing = true), k)));
    return missing ? null : text;
  };
  const closure = String(r.inputs.levers.closure ?? "borrow");
  const fixed = m.assumptions && r.assumptions.length === m.assumptions.length + 1 ? m.assumptions : null;
  return {
    ...r,
    indicators: Object.fromEntries(Object.entries(r.indicators).map(([code, ind]) => [code, { ...ind, label: label(code, ind.label) }])),
    mechanisms: r.mechanisms.map((x) => ({ ...x, explanation: (m.mechanisms[x.lever] && fill(m.mechanisms[x.lever])) || x.explanation })),
    assumptions: fixed && m.closure[closure] ? [...fixed, m.closure[closure]] : r.assumptions,
    not_modelled: r.not_modelled.map((x) => m.notModelled[x] ?? x),
    fiscal: {
      ...r.fiscal,
      flags: r.fiscal.flags.map((flag) => {
        const hit = m.exceeds && Object.entries(r.indicators).find(([, ind]) => flag.startsWith(`${ind.label} exceeds `));
        return hit && m.exceeds ? m.exceeds(label(hit[0], hit[1].label), flag.slice(`${hit[1].label} exceeds `.length)) : flag;
      }),
    },
  };
}

export function localizeSensitivity(s: Sensitivity, t: Messages): Sensitivity {
  return {
    ...s,
    targets: Object.fromEntries(Object.entries(s.targets).map(([code, x]) => [code, { ...x, label: t.model.indicators[code] ?? x.label }])),
    rows: s.rows.map((row) => ({ ...row, label: t.model.params[row.parameter] ?? row.label })),
  };
}
