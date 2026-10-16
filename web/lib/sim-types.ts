// The parts of the engine's /v1/simulate response the UI reads (sim/verdania_sim/engine.py).
export type Series = (number | null)[];

export type Indicator = {
  label: string;
  unit: string;
  desirable: "up" | "down" | null;
  baseline: Series;
  scenario: Series;
  delta: Series;
  p10: Series;
  p90: Series;
  delta_p10: Series;
  delta_p90: Series;
};

export type SimResult = {
  model_version: string;
  engine_git_sha: string;
  input_hash: string;
  output_hash: string;
  inputs: { levers: Record<string, number | string>; horizon: number; structural_overrides: Record<string, number> };
  years: number[];
  indicators: Record<string, Indicator>;
  deciles: {
    year: number;
    baseline: { market: Series; disposable: Series } | null;
    scenario: { market: Series; disposable: Series } | null;
  };
  /** per region at the horizon; null when the run stops before it */
  regions: { code: string; population: number; baseline: Record<string, number | null>; scenario: Record<string, number | null> }[] | null;
  fiscal: { sustainable: boolean; flags: string[]; valid_until: number; draws_breaking_down: number | null };
  mechanisms: {
    lever: string;
    from: number | string;
    to: number | string;
    explanation: string;
    effects: { indicator: string; delta_at_horizon: number | null }[];
  }[];
  assumptions: string[];
  not_modelled: string[];
  accounting_checks: { passed: boolean; max_relative_error: number | null };
  uncertainty: { draws: number; percentiles: number[] };
};
