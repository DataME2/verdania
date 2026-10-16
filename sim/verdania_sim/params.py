"""Parameter registry for model v0.1: the single source for the engine, the API and the DB seed.

Mirrors docs/economic-model.md section 8. Change values here, never in the equations.
"""

from dataclasses import dataclass

MODEL_VERSION = "0.1.0"


@dataclass(frozen=True)
class Param:
    code: str
    label: str
    unit: str
    lo: float
    hi: float
    default: float  # lever baseline, or structural central value
    evidence: str = "synthetic"  # empirical-range | contested | theoretical | synthetic
    source: str = ""


def _index(items: list[Param]) -> dict[str, Param]:
    return {p.code: p for p in items}


LEVERS = _index([
    Param("tau_top", "Top income-tax rate", "share", 0.20, 0.70, 0.35),
    Param("tau_b", "Basic income-tax rate", "share", 0.05, 0.40, 0.22),
    Param("tau_c", "Corporate tax rate", "share", 0.05, 0.45, 0.25),
    Param("tau_k", "Capital-income tax rate", "share", 0.00, 0.50, 0.20),
    Param("tau_cg", "Capital-gains tax rate", "share", 0.00, 0.50, 0.15),
    Param("tau_v", "VAT rate", "share", 0.00, 0.25, 0.12),
    Param("bite", "Minimum wage (share of median wage)", "share", 0.30, 0.70, 0.45),
    Param("cb", "Collective-bargaining coverage", "share", 0.10, 0.90, 0.35),
    Param("rr", "Unemployment-benefit replacement rate", "share", 0.00, 0.80, 0.40),
    Param("gmi", "Guaranteed minimum income (share of baseline median)", "share", 0.00, 0.60, 0.20),
    Param("m", "Public health spending", "share of output", 0.01, 0.07, 0.045),
    Param("e", "Public education spending", "share of output", 0.02, 0.08, 0.042),
    Param("ig", "Public infrastructure investment", "share of output", 0.01, 0.08, 0.030),
    Param("s_coop", "Cooperative / worker-owned capital share", "share", 0.00, 0.50, 0.03),
    Param("s_pub", "Public ownership of capital", "share", 0.00, 0.80, 0.10),
    Param("debt_limit", "Debt limit (used by the adjust-spending closure)", "share of output", 0.30, 1.50, 0.90),
])
CLOSURES = ("borrow", "adjust_other")
BASELINE = {code: p.default for code, p in LEVERS.items()} | {"closure": "borrow"}

STRUCTURAL = _index([
    Param("alpha", "Capital elasticity of output", "", 0.30, 0.40, 0.35, "empirical-range"),
    Param("gamma", "Output elasticity of public capital", "", 0.00, 0.15, 0.08, "empirical-range",
          "Bom & Ligthart (2014), Journal of Economic Surveys: meta-analysis mean about 0.08"),
    Param("delta", "Private capital depreciation", "per year", 0.04, 0.08, 0.06),
    Param("delta_g", "Public capital depreciation", "per year", 0.03, 0.05, 0.04),
    Param("g_a", "Trend TFP growth", "per year", 0.005, 0.015, 0.010),
    Param("eps_tau", "Investment response to (1 - corporate tax)", "elasticity", 0.0, 1.0, 0.5, "contested"),
    Param("eps_pi", "Investment response to profit share", "elasticity", 0.0, 1.0, 0.5, "contested"),
    Param("psi", "Crowding-out of private investment by deficits", "", 0.0, 1.0, 0.3, "contested"),
    Param("eta_mw", "Unemployment response to minimum-wage bite", "per unit", -0.05, 0.20, 0.05, "contested",
          "Minimum-wage employment effects disagree on sign at moderate bites (e.g. Cengiz et al. 2019)"),
    Param("eta_ub", "Unemployment response to replacement rate", "per unit", 0.0, 0.08, 0.03, "contested"),
    Param("eta_w", "Unemployment response to labour-tax rate", "per unit", 0.0, 0.15, 0.05, "contested"),
    Param("eta_cb", "Unemployment response to bargaining coverage", "per unit", -0.02, 0.04, 0.0, "contested",
          "OECD (2019) Negotiating Our Way Up: effects depend on coordination"),
    Param("theta_cb", "Labour-share response to bargaining coverage", "per unit", 0.0, 0.25, 0.10, "theoretical"),
    Param("theta_mw", "Labour-share response to minimum-wage bite", "per unit", 0.0, 0.15, 0.05, "theoretical"),
    Param("kappa", "Wage compression from bargaining", "", 0.0, 0.30, 0.15, "theoretical"),
    Param("e_ti", "Taxable-income elasticity of top earners", "elasticity", 0.10, 0.50, 0.25, "empirical-range",
          "Saez, Slemrod & Giertz (2012), Journal of Economic Literature"),
    Param("phi_e", "Human-capital growth per point of education spending (3-year lag)", "", 0.0, 0.25, 0.10,
          "theoretical"),
    Param("phi_h", "Human-capital growth per point of health spending (1-year lag)", "", 0.0, 0.15, 0.05,
          "theoretical"),
    Param("zeta_own", "TFP-growth effect of collective ownership share", "per unit", -0.02, 0.01, 0.0, "contested"),
    Param("rho_ret", "Retained share of after-tax operating surplus", "share", 0.05, 0.20, 0.10, "synthetic",
          "Low because operating surplus here includes self-employed mixed income and household-owned capital"),
    Param("r0", "Base interest rate on public debt", "per year", 0.03, 0.06, 0.04),
    Param("rho_d", "Debt risk premium per unit of debt above 60% of output", "", 0.02, 0.10, 0.05),
    Param("beta_forgo", "Share of catastrophic-spending households forgoing care", "share", 0.3, 0.8, 0.5),
])
CENTRAL = {code: p.default for code, p in STRUCTURAL.items()}

# Fixed synthetic calibration targets (model spec sections 1-7).
CALIBRATION = {
    "y0": 33.0e9,          # value added at t=0, V$
    "s_l0": 0.55,          # labour share
    "u0": 0.085,           # unemployment rate
    "participation": 0.72,
    "iota0": 0.18,         # private investment / output
    "d0": 0.48,            # public debt / output
    "foreign_debt_share": 0.40,
    "pension_rr": 0.40,    # pension per person 65+, share of mean wage (UB coverage 0.6 is set in population.py)
    "health_need": 0.07,   # total health need, share of output
    "catastrophic": 0.10,  # WHO / SDG 3.8.2 threshold
    "allowance": 0.30,     # personal allowance, share of mean wage
    "top_threshold": 1.50, # top-rate threshold, share of mean wage
    "top_taxable0": 0.85,  # share of top-band income reported at baseline rates
    "realised_gains": 0.30,
    "phase_in_years": 5,   # ownership changes phase in linearly
    "mpc": (0.97, 0.92, 0.86, 0.80, 0.68),  # by equivalised-disposable-income quintile
}

# Presets are complete policy bundles (taxes AND spending). Design rule, applied identically to all
# four: at central parameters each preset finances itself, |deficit| <= 3% of output in year 10.
# A label never changes an equation; every value can be edited by the user.
PRESETS = {
    "baseline": {"label": "Verdania today", "family": None, "levers": {}},
    "A": {"label": "Market-led capitalism", "family": "A", "levers": {
        "tau_top": 0.30, "tau_b": 0.18, "tau_c": 0.20, "tau_k": 0.15, "tau_cg": 0.10, "tau_v": 0.10,
        "bite": 0.35, "cb": 0.15, "rr": 0.25, "gmi": 0.05,
        "m": 0.025, "e": 0.035, "ig": 0.02, "s_coop": 0.02, "s_pub": 0.05}},
    "B": {"label": "Regulated social-market economy", "family": "B", "levers": {
        "tau_top": 0.42, "tau_b": 0.24, "tau_c": 0.25, "tau_k": 0.25, "tau_cg": 0.20, "tau_v": 0.16,
        "bite": 0.50, "cb": 0.55, "rr": 0.55, "gmi": 0.15,
        "m": 0.050, "e": 0.045, "ig": 0.03, "s_coop": 0.05, "s_pub": 0.10}},
    "C": {"label": "Social-democratic mixed economy", "family": "C", "levers": {
        "tau_top": 0.52, "tau_b": 0.28, "tau_c": 0.25, "tau_k": 0.30, "tau_cg": 0.30, "tau_v": 0.22,
        "bite": 0.55, "cb": 0.80, "rr": 0.65, "gmi": 0.25,
        "m": 0.065, "e": 0.055, "ig": 0.035, "s_coop": 0.10, "s_pub": 0.15}},
    "D": {"label": "Collective-ownership economy", "family": "D", "levers": {
        "tau_top": 0.45, "tau_b": 0.28, "tau_c": 0.20, "tau_k": 0.30, "tau_cg": 0.30, "tau_v": 0.18,
        "bite": 0.60, "cb": 0.85, "rr": 0.60, "gmi": 0.30,
        "m": 0.070, "e": 0.060, "ig": 0.05, "s_coop": 0.35, "s_pub": 0.45}},
}


def resolve_levers(preset: str | None = None, overrides: dict | None = None) -> dict:
    """Baseline <- preset <- user overrides, validated against the registry."""
    levers = dict(BASELINE)
    if preset:
        if preset not in PRESETS:
            raise ValueError(f"unknown preset {preset!r}")
        levers |= PRESETS[preset]["levers"]
    for code, value in (overrides or {}).items():
        if code == "closure":
            if value not in CLOSURES:
                raise ValueError(f"closure must be one of {CLOSURES}")
        elif code not in LEVERS:
            raise ValueError(f"unknown lever {code!r}")
        elif not LEVERS[code].lo <= float(value) <= LEVERS[code].hi:
            raise ValueError(f"{code} must be within [{LEVERS[code].lo}, {LEVERS[code].hi}]")
        levers[code] = value if code == "closure" else float(value)
    if levers["s_pub"] + levers["s_coop"] > 0.9:
        raise ValueError("public + cooperative ownership cannot exceed 0.9")
    return levers


def resolve_structural(overrides: dict | None = None) -> dict:
    sp = dict(CENTRAL)
    for code, value in (overrides or {}).items():
        if code not in STRUCTURAL:
            raise ValueError(f"unknown structural parameter {code!r}")
        p = STRUCTURAL[code]
        if not p.lo <= float(value) <= p.hi:
            raise ValueError(f"{code} must be within its published range [{p.lo}, {p.hi}]")
        sp[code] = float(value)
    return sp
