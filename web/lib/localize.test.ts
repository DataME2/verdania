// Run: node --experimental-strip-types --test lib/*.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { localizeResult } from "./localize.ts";
import type { Messages, ModelText } from "./messages.ts";
import type { SimResult } from "./sim-types.ts";

const empty: ModelText = {
  indicators: {}, mechanisms: {}, assumptions: null, closure: {}, notModelled: {}, exceeds: null,
  params: {}, presets: {}, regions: {}, versions: {}, projects: {}, projectAssumptions: {},
};
const as = (model: Partial<ModelText>) => ({ model: { ...empty, ...model } }) as unknown as Messages;

const result = {
  inputs: { levers: { closure: "borrow" }, horizon: 10, structural_overrides: {} },
  indicators: {
    gdp_pc: { label: "GDP per person" },
    net_debt_share: { label: "Public debt (net of public assets)" },
  },
  mechanisms: [
    { lever: "bite", explanation: "English bite text", effects: [] },
    { lever: "gmi", explanation: "English gmi text", effects: [] },
  ],
  assumptions: ["one", "two", "Fiscal closure: borrow."],
  not_modelled: ["food security", "something new"],
  fiscal: { sustainable: false, flags: ["Public debt (net of public assets) exceeds 1.5"], valid_until: 10, draws_breaking_down: 0 },
} as unknown as SimResult;

test("English (empty maps) leaves every text as the engine wrote it", () => {
  const r = localizeResult(result, as({}), {});
  assert.deepEqual(r.indicators, result.indicators);
  assert.deepEqual(r.mechanisms, result.mechanisms);
  assert.deepEqual(r.assumptions, result.assumptions);
  assert.deepEqual(r.fiscal.flags, result.fiscal.flags);
});

test("labels, explanations, assumptions and flags in the catalogue's language, with the run's values", () => {
  const t = as({
    indicators: { gdp_pc: "PIB por persona", net_debt_share: "Deuda neta" },
    mechanisms: { bite: "Salario mínimo: eta_mw = {eta_mw}, theta_mw = {theta_mw}.", gmi: "Usa {missing}." },
    assumptions: ["uno", "dos"],
    closure: { borrow: "Regla fiscal: endeudamiento." },
    notModelled: { "food security": "seguridad alimentaria" },
    exceeds: (label, limit) => `${label} supera ${limit}`,
  });
  const r = localizeResult(result, t, { eta_mw: 0.2, theta_mw: 0.0125000001 });
  assert.equal(r.indicators.gdp_pc.label, "PIB por persona");
  assert.equal(r.mechanisms[0].explanation, "Salario mínimo: eta_mw = 0.2, theta_mw = 0.0125.");
  assert.equal(r.mechanisms[1].explanation, "English gmi text", "a placeholder without a value keeps the engine's text");
  assert.deepEqual(r.assumptions, ["uno", "dos", "Regla fiscal: endeudamiento."]);
  assert.deepEqual(r.not_modelled, ["seguridad alimentaria", "something new"]);
  assert.deepEqual(r.fiscal.flags, ["Deuda neta supera 1.5"]);
  assert.equal(r.output_hash, result.output_hash, "fingerprints are untouched");
});

test("a changed engine list of assumptions keeps the engine's text rather than misaligning", () => {
  const r = localizeResult(result, as({ assumptions: ["uno"], closure: { borrow: "Regla fiscal: endeudamiento." } }), {});
  assert.deepEqual(r.assumptions, result.assumptions);
});
