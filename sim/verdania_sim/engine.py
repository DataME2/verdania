"""A run = central path + Monte Carlo uncertainty + (full mode) sensitivity, as reproducible JSON.

Central paths use the full 20,000-household sample. Uncertainty draws run on a stratified
2,000-household subsample; their spread is centred on the full-sample central path.
Baseline and scenario share every draw (common random numbers).
"""

import hashlib
import json
import math
import os
import warnings
from functools import lru_cache

import numpy as np

from .model import simulate_path
from .params import BASELINE, LEVERS, MODEL_VERSION, STRUCTURAL, resolve_levers, resolve_structural
from .population import POPULATION_SEED, generate, subsample

HORIZONS = (1, 5, 10, 20)
# ponytail: full mode is ~15-20 s single-threaded (~490 subsample paths); run it as a background job,
# or vectorise draws / use a process pool if saved-scenario latency starts to matter.
DRAWS = {"interactive": 40, "full": 200}
DEFAULT_MC_SEED = 7
SUSTAINABILITY = {"net_debt_share": 1.5, "interest_revenue": 0.25}

# code: (label, unit, desirable direction or None when the judgement is the user's)
INDICATORS = {
    "gdp_pc": ("GDP per person", "V$", "up"),
    "median_income": ("Median disposable income (equivalised)", "V$", "up"),
    "gini_disposable": ("Inequality of disposable income (Gini)", "index", None),
    "gini_market": ("Inequality of market income (Gini)", "index", None),
    "poverty_relative": ("Relative poverty (below 60% of current median)", "share", "down"),
    "poverty_anchored": ("Anchored poverty (below 60% of baseline median)", "share", "down"),
    "wealth_top10": ("Wealth held by the top 10%", "share", None),
    "wealth_top1": ("Wealth held by the top 1%", "share", None),
    "employment_rate": ("Employment rate (ages 15-64)", "share", "up"),
    "unemployment": ("Unemployment rate", "share", "down"),
    "real_wage": ("Mean real wage", "V$", "up"),
    "productivity": ("Output per worker", "V$", "up"),
    "labour_share": ("Labour share of income", "share", None),
    "health_access": ("Health access index", "index", "up"),
    "catastrophic_health": ("People facing catastrophic health spending", "share", "down"),
    "human_capital": ("Human-capital index", "index", "up"),
    "gender_pay_gap": ("Gender pay gap", "share", None),
    "regional_ratio": ("Richest / poorest region income ratio", "ratio", None),
    "revenue_share": ("Public revenue", "share of output", None),
    "spending_share": ("Public spending", "share of output", None),
    "deficit_share": ("Public deficit", "share of output", None),
    "debt_share": ("Public debt (gross)", "share of output", None),
    "net_debt_share": ("Public debt (net of public assets)", "share of output", None),
    "interest_revenue": ("Interest as share of revenue", "share", None),
    "income_tax_share": ("Income-tax revenue", "share of output", None),
    "capital_tax_share": ("Capital and corporate tax revenue", "share of output", None),
    "vat_share": ("VAT revenue", "share of output", None),
    "transfer_share": ("Pensions, benefits and minimum income", "share of output", None),
    "gmi_share": ("Minimum-income top-ups", "share of output", None),
    "private_investment": ("Private investment", "share of output", None),
    "net_exports": ("Net exports", "share of output", None),
    "other_cut_share": ("Automatic spending cut (fiscal rule)", "share of output", None),
}

# Changed lever -> the channels the engine moves (model spec sections 3-5), and a neutral explanation.
MECHANISMS = {
    "tau_top": (["income_tax_share", "gini_disposable"],
                "A different top rate changes revenue from top earners. Part of top-band income responds by "
                "being reported as capital income instead (taxable-income elasticity {e_ti})."),
    "tau_b": (["income_tax_share", "unemployment", "median_income"],
              "The basic rate taxes most earners. A higher average labour-tax rate raises unemployment "
              "a year later (assumption eta_w = {eta_w})."),
    "tau_c": (["private_investment", "capital_tax_share", "gdp_pc"],
              "Corporate tax changes after-tax returns, and private investment responds "
              "(elasticity {eps_tau}). That changes the capital stock and output over time."),
    "tau_k": (["capital_tax_share", "gini_disposable"],
              "Capital-income tax falls on dividends and interest, which are concentrated among wealthy households."),
    "tau_cg": (["capital_tax_share", "gini_disposable"],
               "Capital-gains tax applies to the realised share of retained profits owned by households."),
    "tau_v": (["real_wage", "median_income"],
              "VAT raises consumer prices, so it lowers real wages for a given nominal wage, "
              "and it falls on everyone who consumes."),
    "bite": (["unemployment", "labour_share", "gini_market"],
             "A higher minimum wage lifts pay at the bottom and the labour share (theta_mw = {theta_mw}). "
             "Its employment effect is contested; the central assumption is eta_mw = {eta_mw}, "
             "with a range that includes job gains."),
    "cb": (["labour_share", "gini_market", "unemployment"],
           "Wider bargaining coverage raises the labour share (theta_cb = {theta_cb}) and compresses "
           "wage differences (kappa = {kappa})."),
    "rr": (["unemployment", "poverty_relative"],
           "Higher unemployment benefits support unemployed households. They may lengthen job search "
           "(eta_ub = {eta_ub})."),
    "gmi": (["poverty_anchored", "deficit_share"],
            "The guaranteed minimum income tops up every household below the floor. Its cost depends "
            "on how many households fall below it."),
    "m": (["health_access", "catastrophic_health", "human_capital"],
          "Public health spending replaces out-of-pocket payments, which lowers catastrophic spending. "
          "It raises human capital a year later (phi_h = {phi_h})."),
    "e": (["human_capital", "gdp_pc"],
          "Education spending raises human capital after a 3-year lag (phi_e = {phi_e}), "
          "and output follows."),
    "ig": (["gdp_pc", "productivity"],
           "Public infrastructure builds the public capital stock, which raises output "
           "(elasticity gamma = {gamma})."),
    "s_coop": (["gini_market", "net_debt_share"],
               "Cooperative ownership pays dividends to workers instead of wealth holders. "
               "Buyouts are compensated with public bonds and repaid from coop dividends."),
    "s_pub": (["revenue_share", "net_debt_share"],
              "Public ownership moves enterprise surpluses to the budget. Purchases are compensated "
              "at book value with public bonds, so gross debt rises while net debt does not."),
    "closure": (["other_cut_share", "debt_share"], "The fiscal closure decides whether deficits are borrowed or "
                "trigger automatic cuts to other public spending."),
    "debt_limit": (["other_cut_share", "debt_share"], "Under the adjust-spending closure, other public "
                   "spending is cut whenever debt would exceed this limit."),
}

ASSUMPTIONS = [
    "Fictional country with synthetic data; outputs are model results, not forecasts.",
    "Supply-side model: v0.1 has no demand block, so spending cuts and tax rises have no short-run output cost.",
    "Small open economy: net exports absorb any gap between national saving and investment.",
    "Changes in public or cooperative ownership phase in over 5 years and are compensated at book value "
    "with public bonds.",
    "Top earners respond to the top tax rate only by shifting reported income (avoidance), not by working less.",
    "Pensions, unemployment benefits and the minimum-income top-up are not taxed.",
    "Uncertainty bands show the 10th-90th percentile over structural-parameter draws, not forecast intervals.",
]
NOT_MODELLED = ["housing affordability", "food security", "social mobility", "environmental sustainability",
                "underemployment", "sector supply chains"]


def _r(x) -> float | None:
    x = float(x)
    return None if not math.isfinite(x) else float(f"{x:.6g}")


def _rl(xs) -> list:
    return [_r(x) for x in xs]


def _draw_params(mc_seed: int, n: int, fixed: tuple) -> list[dict]:
    rng = np.random.default_rng(mc_seed)
    fixed = dict(fixed)
    draws = []
    for _ in range(n):
        sp = {code: float(rng.triangular(p.lo, p.default, p.hi)) for code, p in STRUCTURAL.items()}
        draws.append(sp | fixed)
    return draws


@lru_cache(maxsize=16)
def _baseline_draws(mc_seed: int, n: int, fixed: tuple, horizon: int) -> tuple:
    small = subsample(generate(POPULATION_SEED))
    return tuple(simulate_path(small, BASELINE, sp, horizon)["series"]
                 for sp in _draw_params(mc_seed, n, fixed))


@lru_cache(maxsize=16)
def _baseline_central(fixed: tuple, horizon: int, sample: str) -> dict:
    pop = generate(POPULATION_SEED)
    pop = subsample(pop) if sample == "small" else pop
    detail = (0, horizon) if sample == "full" else ()
    return simulate_path(pop, BASELINE, resolve_structural(dict(fixed)), horizon, detail_years=detail)


def canonical_inputs(levers=None, preset=None, horizon=10, structural=None, mode="interactive",
                     mc_seed=DEFAULT_MC_SEED) -> dict:
    if horizon not in HORIZONS:
        raise ValueError(f"horizon must be one of {HORIZONS}")
    if mode not in DRAWS:
        raise ValueError(f"mode must be one of {tuple(DRAWS)}")
    lev = resolve_levers(preset, levers)
    sp = resolve_structural(structural)
    return {
        "model_version": MODEL_VERSION, "population_seed": POPULATION_SEED, "mc_seed": int(mc_seed),
        "mode": mode, "horizon": horizon, "preset": preset, "levers": lev,
        "structural_overrides": {k: sp[k] for k in sorted(structural or {})},
    }


def input_hash(inputs: dict) -> str:
    return hashlib.sha256(json.dumps(inputs, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def run(**kwargs) -> dict:
    inputs = canonical_inputs(**kwargs)
    lev, horizon = inputs["levers"], inputs["horizon"]
    fixed = tuple(sorted(inputs["structural_overrides"].items()))
    sp = resolve_structural(dict(fixed))
    pop = generate(POPULATION_SEED)
    small = subsample(pop)

    base = _baseline_central(fixed, horizon, "full")
    scen = simulate_path(pop, lev, sp, horizon, detail_years=(0, horizon))
    base_small = _baseline_central(fixed, horizon, "small")["series"]
    scen_small = simulate_path(small, lev, sp, horizon)["series"]
    n = DRAWS[inputs["mode"]]
    base_draws = _baseline_draws(inputs["mc_seed"], n, fixed, horizon)
    scen_draws = [simulate_path(small, lev, d, horizon)["series"]
                  for d in _draw_params(inputs["mc_seed"], n, fixed)]

    indicators = {}
    for code, (label, unit, desirable) in INDICATORS.items():
        b, s = np.array(base["series"][code]), np.array(scen["series"][code])
        level = np.array([d[code] for d in scen_draws]) - np.array(scen_small[code])
        delta = (np.array([d[code] for d in scen_draws]) - np.array([d[code] for d in base_draws])
                 - (np.array(scen_small[code]) - np.array(base_small[code])))
        with warnings.catch_warnings():  # all-NaN years after a breakdown are expected
            warnings.simplefilter("ignore", RuntimeWarning)
            lq = np.nanquantile(level, [0.1, 0.9], axis=0)
            dq = np.nanquantile(delta, [0.1, 0.9], axis=0)
        indicators[code] = {
            "label": label, "unit": unit, "desirable": desirable,
            "baseline": _rl(b), "scenario": _rl(s), "delta": _rl(s - b),
            "p10": _rl(s + lq[0]), "p90": _rl(s + lq[1]),
            "delta_p10": _rl(s - b + dq[0]), "delta_p90": _rl(s - b + dq[1]),
        }

    ss = scen["series"]
    flags = [f"{INDICATORS[code][0]} exceeds {limit:g}" for code, limit in SUSTAINABILITY.items()
             if np.nanmax(ss[code]) > limit]
    broke = [d for d in scen_draws if not np.isfinite(d["debt_share"][-1])]
    worst_check = float(max(max(base["checks"].values()), max(scen["checks"].values())))

    result = {
        "model_version": MODEL_VERSION,
        "engine_git_sha": os.environ.get("ENGINE_GIT_SHA", "dev"),
        "input_hash": input_hash(inputs),
        "inputs": inputs,
        "years": list(range(horizon + 1)),
        "indicators": indicators,
        "deciles": {
            "year": horizon,
            "baseline": _detail_deciles(base["detail"].get(horizon)),
            "scenario": _detail_deciles(scen["detail"].get(horizon)),
        },
        "regions": _regions(base["detail"].get(horizon), scen["detail"].get(horizon)),
        "fiscal": {
            "sustainable": bool(not flags and scen["valid_until"] == horizon),
            "flags": flags,
            "valid_until": scen["valid_until"],
            "draws_breaking_down": _r(len(broke) / n),
        },
        "mechanisms": _mechanisms(lev, sp, base["series"], ss, horizon),
        "assumptions": ASSUMPTIONS + [f"Fiscal closure: {lev['closure']}."],
        "not_modelled": NOT_MODELLED,
        "accounting_checks": {"max_relative_error": _r(worst_check), "passed": worst_check < 1e-9},
        "uncertainty": {"draws": n, "sample_households": len(small.hh_size), "percentiles": [10, 90]},
    }
    if inputs["mode"] == "full":
        result["sensitivity"] = _sensitivity(small, lev, fixed, horizon)
    result["output_hash"] = output_hash(result)
    return result


def output_hash(result: dict) -> str:
    """Fingerprint of everything a run reports, except which build produced it. Re-running a saved
    scenario on the same model version and platform must give the same value."""
    body = {k: v for k, v in result.items() if k not in ("engine_git_sha", "output_hash")}
    return hashlib.sha256(json.dumps(body, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def _detail_deciles(d):
    return None if d is None else {k: _rl(v) for k, v in d["deciles"].items()}


def _regions(b, s):
    if b is None or s is None:
        return None
    return [{"code": rb["code"], "population": rb["population"], "sector_shares": rb["sector_shares"],
             "baseline": {k: _r(rb[k]) for k in ("mean_income", "poverty_relative", "unemployment", "health_access")},
             "scenario": {k: _r(rs[k]) for k in ("mean_income", "poverty_relative", "unemployment", "health_access")}}
            for rb, rs in zip(b["regions"], s["regions"])]


def _mechanisms(lev, sp, base, scen, horizon):
    out = []
    for code in LEVERS.keys() | {"closure"}:
        if lev[code] == BASELINE[code]:
            continue
        channels, text = MECHANISMS[code]
        out.append({
            "lever": code, "from": BASELINE[code], "to": lev[code],
            "explanation": text.format(**{k: f"{v:g}" for k, v in sp.items()}),
            "effects": [{"indicator": c, "delta_at_horizon": _r(scen[c][horizon] - base[c][horizon])}
                        for c in channels],
        })
    return sorted(out, key=lambda m: list(LEVERS).index(m["lever"]) if m["lever"] in LEVERS else 99)


SENSITIVITY_TARGETS = ("gdp_pc", "gini_disposable", "poverty_anchored", "debt_share")


def sensitivity(levers=None, preset=None, horizon=10, structural=None) -> dict:
    """Which assumptions drive a policy's effect, on their own: no uncertainty draws, about a second.
    Served separately so that simulate() responses and their fingerprints stay exactly as they were."""
    inputs = canonical_inputs(levers=levers, preset=preset, horizon=horizon, structural=structural)
    fixed = tuple(sorted(inputs["structural_overrides"].items()))
    small = subsample(generate(POPULATION_SEED))
    return {
        "model_version": MODEL_VERSION,
        "horizon": inputs["horizon"],
        "targets": {c: {"label": INDICATORS[c][0], "unit": INDICATORS[c][1]} for c in SENSITIVITY_TARGETS},
        "rows": _sensitivity(small, inputs["levers"], fixed, inputs["horizon"]),
    }


def _sensitivity(small, lev, fixed, horizon):
    """One-at-a-time: each structural parameter at its low and high value, effect on the policy delta."""
    fixed_d = dict(fixed)
    centre = resolve_structural(fixed_d)

    def delta(sp):
        b = simulate_path(small, BASELINE, sp, horizon)["series"]
        s = simulate_path(small, lev, sp, horizon)["series"]
        return {c: s[c][horizon] - b[c][horizon] for c in SENSITIVITY_TARGETS}

    mid = delta(centre)
    rows = []
    for code, p in STRUCTURAL.items():
        if code in fixed_d:
            continue
        lo, hi = delta(centre | {code: p.lo}), delta(centre | {code: p.hi})
        rows.append({"parameter": code, "label": p.label, "low": p.lo, "high": p.hi, "evidence": p.evidence,
                     "effect": {c: {"low": _r(lo[c] - mid[c]), "high": _r(hi[c] - mid[c])}
                                for c in SENSITIVITY_TARGETS}})
    return rows
