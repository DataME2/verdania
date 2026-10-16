"""Model v0.1: one deterministic path. Equations follow docs/economic-model.md sections 2-7.

All flows are annual, real, in V$ at population scale unless the name ends in `_h`
(per sample household) or is a per-person array.
"""

import numpy as np

from .params import BASELINE, CALIBRATION as CAL
from .population import REGIONS, SECTORS, Population

N_DECILES = 10
# Beyond these the path is outside the model's validity (no default, inflation or financial crisis block).
BREAKDOWN = {"debt_share": 3.0, "interest_revenue": 0.6}


class CalibrationError(ValueError):
    pass


def balanced_growth(sp: dict) -> float:
    """Exact discrete-time growth rate with K/Y and G/Y constant."""
    return (1 + sp["g_a"]) ** (1 / (1 - sp["alpha"] - sp["gamma"])) - 1


def _sorted_stats(x: np.ndarray, w: np.ndarray):
    """Order, cumulative weight share at each unit's midpoint, weighted median and Gini of x."""
    order = np.argsort(x)
    xs, ws = x[order], w[order]
    cw = np.cumsum(ws)
    total_w = cw[-1]
    mid = (cw - ws / 2) / total_w
    median = float(xs[np.searchsorted(cw, total_w / 2)])
    cxw = np.cumsum(xs * ws)
    gini = 0.0 if cxw[-1] == 0 else float(1 - 2 * np.sum(ws * (cxw - xs * ws / 2)) / (total_w * cxw[-1]))
    return order, mid, median, gini


def _top_share(x: np.ndarray, frac: float) -> float:
    k = max(1, int(round(len(x) * frac)))
    return float(np.partition(x, len(x) - k)[-k:].sum() / x.sum())


def _calibrate_mpc(quintile: np.ndarray, income: np.ndarray, target: float) -> np.ndarray:
    """Scale the saving-rate schedule (1 - MPC) by one factor so consumption hits target.

    Proportional scaling keeps the shape: richer quintiles save a larger share of income.
    """
    saving_shape = 1 - np.asarray(CAL["mpc"])
    lo, hi = 0.0, 1 / saving_shape.max()
    for _ in range(60):
        lam = (lo + hi) / 2
        # more saving -> less consumption; move lam down if consumption is below target
        lo, hi = (lo, lam) if np.sum((1 - lam * saving_shape)[quintile] * income) < target else (lam, hi)
    return 1 - (lo + hi) / 2 * saving_shape


def simulate_path(pop: Population, lev: dict, sp: dict, horizon: int, detail_years=()) -> dict:
    """Run years 0..horizon. Year 0 is the shared calibration year; levers apply from year 1.

    Returns {"series": {code: [...]}, "detail": {year: {...}}, "checks": {...}, "valid_until": year}.
    """
    base = BASELINE
    w = pop.weight
    n_hh = len(pop.hh_size)
    alpha, gamma = sp["alpha"], sp["gamma"]
    g_star = balanced_growth(sp)
    persons = pop.hh_size.astype(float)
    total_persons = persons.sum()
    n_people = len(pop.hh) * w
    elderly = pop.band == 2
    working_age = (pop.band == 1).sum() * w
    lf, n_lf = pop.in_lf, pop.n_lf
    bc = lambda v: np.bincount(pop.hh, weights=v, minlength=n_hh)  # noqa: E731
    need_w = bc(np.where(elderly, 2.5, 1.0))  # health-need weights per household
    n_regions = len(REGIONS)

    def employed_mask(u):
        return lf & (pop.risk_rank < n_lf - int(round(u * n_lf)))

    # ---- calibration (section 2): the baseline starts on its balanced-growth path
    y = CAL["y0"]
    k = y * CAL["iota0"] / (sp["delta"] + g_star)
    g = y * base["ig"] / (sp["delta_g"] + g_star)
    l0 = employed_mask(CAL["u0"]).sum() * w
    tfp = y / (k ** alpha * g ** gamma * l0 ** (1 - alpha))
    h = 1.0
    debt = CAL["d0"] * y
    debt_dom = (1 - CAL["foreign_debt_share"]) * debt
    coop_claim = 0.0
    nfa = 0.0
    s_pub_prev, s_coop_prev = base["s_pub"], base["s_coop"]
    s_coll0 = base["s_pub"] + base["s_coop"]
    hh_assets = (1 - s_pub_prev - s_coop_prev) * k + debt_dom
    wealth = pop.wealth_share * hh_assets / w
    d_base = g_star * CAL["d0"]  # debt-stable deficit ratio
    d_prev = d_base
    tau_l_prev = tau_l_base = None
    o_share = med_gmi = med0 = mpc = None
    debt_expected = None
    valid_until = horizon

    series: dict[str, list] = {}
    detail: dict[int, dict] = {}
    checks = {"income_output": 0.0, "wages": 0.0, "dividends": 0.0, "expenditure": 0.0,
              "sector_balances": 0.0, "debt": 0.0, "wealth": 0.0}

    def rec(**kv):
        for key, val in kv.items():
            series.setdefault(key, []).append(float(val))

    for t in range(horizon + 1):
        lv = base if t == 0 else lev

        # ---- ownership (section 4): linear phase-in, compensated at book value with public bonds
        phase = 0.0 if t == 0 else min(1.0, t / CAL["phase_in_years"])
        s_pub = base["s_pub"] + (lev["s_pub"] - base["s_pub"]) * phase
        s_coop = base["s_coop"] + (lev["s_coop"] - base["s_coop"]) * phase
        d_pub, d_coop = s_pub - s_pub_prev, s_coop - s_coop_prev
        comp = (d_pub + max(d_coop, 0.0)) * k
        debt += comp
        debt_dom += comp
        coop_claim += max(d_coop, 0.0) * k
        s_pub_prev, s_coop_prev = s_pub, s_coop
        if debt_expected is not None:
            checks["debt"] = max(checks["debt"], abs(debt - comp - debt_expected) / y)

        # ---- labour market (section 3)
        d_bite, d_rr, d_cb = lv["bite"] - base["bite"], lv["rr"] - base["rr"], lv["cb"] - base["cb"]
        d_taul = 0.0 if tau_l_prev is None else tau_l_prev - tau_l_base
        u_target = np.clip(CAL["u0"] + sp["eta_mw"] * d_bite + sp["eta_ub"] * d_rr
                           + sp["eta_w"] * d_taul + sp["eta_cb"] * d_cb, 0.02, 0.40)
        employed = employed_mask(u_target)
        unemployed = lf & ~employed
        labour = employed.sum() * w

        # ---- production and factor incomes (sections 2-3)
        y = tfp * k ** alpha * g ** gamma * (h * labour) ** (1 - alpha)
        s_l = float(np.clip(CAL["s_l0"] + sp["theta_cb"] * d_cb + sp["theta_mw"] * d_bite, 0.35, 0.75))
        wages_total = s_l * y
        profit = y - wages_total
        zt = np.where(employed, pop.z ** (1 - sp["kappa"] * d_cb), 0.0)
        zt = np.where(employed, np.maximum(zt, lv["bite"] * np.median(zt[employed])), 0.0)
        wage = zt * (wages_total / (zt.sum() * w))
        wbar = wages_total / labour

        # ---- firms and ownership (section 4)
        nos = profit - sp["delta"] * k
        pub_surplus = s_pub * nos
        nos_pc = (1 - s_pub) * nos
        t_c = lv["tau_c"] * max(nos_pc, 0.0)
        pi_at = nos_pc - t_c
        retained = sp["rho_ret"] * pi_at
        retained_hh = retained * (1 - s_pub - s_coop) / (1 - s_pub)  # household owners' share
        div = pi_at - retained
        div_c = div * s_coop / (1 - s_pub)
        div_p = div - div_c
        net_debt = debt - s_pub * k - coop_claim
        rate = sp["r0"] + sp["rho_d"] * max(0.0, net_debt / y - 0.6)
        coop_interest = min(max(div_c, 0.0), rate * coop_claim)
        coop_per_worker = (div_c - coop_interest) / labour

        # ---- personal taxes and transfers (sections 5-6)
        ws = wealth / wealth.sum()
        lab = wage + np.where(employed, coop_per_worker, 0.0)
        allow, thr = CAL["allowance"] * wbar, CAL["top_threshold"] * wbar
        taxable_share = min(1.0, CAL["top_taxable0"]
                            * ((1 - lv["tau_top"]) / (1 - base["tau_top"])) ** sp["e_ti"])
        shifted = np.maximum(lab - thr, 0.0) * (1 - taxable_share)  # reported as capital income instead
        taxable = lab - shifted
        tax_l = (lv["tau_b"] * np.clip(taxable - allow, 0.0, thr - allow)
                 + lv["tau_top"] * np.maximum(taxable - thr, 0.0))
        pension = np.where(elderly, CAL["pension_rr"] * wbar, 0.0)
        benefit = np.where(unemployed & pop.ub_eligible, lv["rr"] * wbar, 0.0)

        lab_h, tax_l_h, pen_h, ub_h = bc(lab), bc(tax_l), bc(pension), bc(benefit)
        priv_h = div_p * ws / w
        int_h = rate * debt_dom * ws / w
        gains_h = CAL["realised_gains"] * retained_hh * ws / w
        tax_k_h = lv["tau_k"] * (priv_h + int_h + bc(shifted))
        tax_cg_h = lv["tau_cg"] * gains_h
        market_h = lab_h + priv_h + int_h
        yd_pre = market_h + pen_h + ub_h - tax_l_h - tax_k_h - tax_cg_h
        if t == 0:
            med_gmi = _sorted_stats(yd_pre / pop.eq_scale, persons)[2]
        gmi_h = np.maximum(0.0, lv["gmi"] * med_gmi * pop.eq_scale - yd_pre)
        yd = yd_pre + gmi_h
        eq = yd / pop.eq_scale
        order, mid, median, gini_d = _sorted_stats(eq, persons)
        if t == 0:
            med0 = median
        quintile = np.empty(n_hh, int)
        quintile[order] = np.minimum((mid * 5).astype(int), 4)

        # ---- government before VAT (section 5)
        t_l, t_k, t_cg = tax_l_h.sum() * w, tax_k_h.sum() * w, tax_cg_h.sum() * w
        pen, ub, gmi = pen_h.sum() * w, ub_h.sum() * w, gmi_h.sum() * w
        health, educ, inv_g = lv["m"] * y, lv["e"] * y, lv["ig"] * y
        transfers = pen + ub + gmi
        interest = rate * debt
        revenue_ex_vat = t_l + t_k + t_cg + t_c + pub_surplus + coop_interest

        # ---- private investment (section 4)
        iota = (CAL["iota0"] * ((1 - lv["tau_c"]) / (1 - base["tau_c"])) ** sp["eps_tau"]
                * ((1 - s_l) / (1 - CAL["s_l0"])) ** sp["eps_pi"] - sp["psi"] * max(0.0, d_prev - d_base))
        inv_p = max(iota, 0.02) * y

        # ---- consumption (section 6); year 0 calibrates the MPC level to balanced trade
        income_pos = np.maximum(yd, 0.0)
        if t == 0:
            target_c = y - inv_p - revenue_ex_vat - d_base * y + transfers + interest
            mpc = _calibrate_mpc(quintile, income_pos, target_c / w)
        cons_h = mpc[quintile] * income_pos
        save_h = yd - cons_h
        cons = cons_h.sum() * w
        t_v = lv["tau_v"] / (1 + lv["tau_v"]) * cons

        # ---- budget (section 5)
        revenue = revenue_ex_vat + t_v
        if t == 0:
            o_share = (revenue + d_base * y - (health + educ + inv_g + transfers + interest)) / y
            if o_share < 0:
                raise CalibrationError("baseline revenue cannot fund baseline spending")
        other = o_share * y
        deficit = health + educ + other + inv_g + transfers + interest - revenue
        other_cut = 0.0
        if lv["closure"] == "adjust_other":
            max_deficit = lv["debt_limit"] * y * (1 + g_star) - debt
            if deficit > max_deficit:
                other_cut = min(other, deficit - max_deficit)
                other -= other_cut
                deficit -= other_cut
        spending = health + educ + other + inv_g + transfers + interest

        # ---- external account (section 7)
        gov_cons = health + educ + other
        nx = y + t_v - cons - inv_p - inv_g - gov_cons
        ca = nx - rate * (debt - debt_dom)

        # ---- accounting checks (section 10), relative to output
        s_hh = save_h.sum() * w
        s_firm = retained + sp["delta"] * k
        s_gov = revenue - (gov_cons + transfers + interest)
        checks["income_output"] = max(checks["income_output"], abs(wages_total + profit - y) / y)
        checks["wages"] = max(checks["wages"], abs(wage.sum() * w - wages_total) / y)
        checks["dividends"] = max(checks["dividends"], abs(priv_h.sum() * w - div_p) / y)
        checks["expenditure"] = max(checks["expenditure"],
                                    abs(cons + inv_p + inv_g + gov_cons + nx - (y + t_v)) / y)
        checks["sector_balances"] = max(checks["sector_balances"],
                                        abs(s_hh + s_firm + s_gov - inv_p - inv_g - ca) / y)

        # ---- indicators (section 9)
        oop_h = max(0.0, CAL["health_need"] - lv["m"]) * y * need_w / (need_w.sum() * w)
        catastrophic = (oop_h > 0) & (oop_h > CAL["catastrophic"] * income_pos)
        cat_share = persons[catastrophic].sum() / total_persons
        eq_market = market_h / pop.eq_scale
        reg_inc = (np.bincount(pop.hh_region, eq * persons, n_regions)
                   / np.bincount(pop.hh_region, persons, n_regions))
        men, women = employed & ~pop.female, employed & pop.female
        price = (1 + lv["tau_v"]) / (1 + base["tau_v"])
        gdp = y + t_v
        rec(
            gdp=gdp, gdp_pc=gdp / n_people, output=y,
            median_income=median, gini_disposable=gini_d,
            gini_market=_sorted_stats(eq_market, persons)[3],
            poverty_relative=persons[eq < 0.6 * median].sum() / total_persons,
            poverty_anchored=persons[eq < 0.6 * med0].sum() / total_persons,
            wealth_top10=_top_share(wealth, 0.10), wealth_top1=_top_share(wealth, 0.01),
            employment_rate=labour / working_age, unemployment=1 - labour / (n_lf * w),
            real_wage=wbar / price, productivity=y / labour, labour_share=s_l,
            catastrophic_health=cat_share, health_access=1 - sp["beta_forgo"] * cat_share,
            human_capital=h,
            gender_pay_gap=(wage[men].mean() - wage[women].mean()) / wage[men].mean(),
            regional_ratio=reg_inc.max() / reg_inc.min(),
            revenue_share=revenue / y, spending_share=spending / y, deficit_share=deficit / y,
            debt_share=debt / y, net_debt_share=net_debt / y, interest_rate=rate,
            interest_revenue=interest / revenue, income_tax_share=t_l / y,
            capital_tax_share=(t_k + t_cg + t_c) / y, vat_share=t_v / y,
            transfer_share=transfers / y, gmi_share=gmi / y, other_cut_share=other_cut / y,
            private_investment=inv_p / y, net_exports=nx / y, capital_output=k / y,
            consumption_share=cons / gdp,
        )

        if t in detail_years:
            detail[t] = _detail(pop, persons, order, mid, eq, eq_market, median, catastrophic,
                                unemployed, reg_inc, sp["beta_forgo"])

        # ---- state transitions
        debt_expected = debt + deficit
        debt += deficit
        debt_dom += (1 - CAL["foreign_debt_share"]) * deficit
        k = (1 - sp["delta"]) * k + inv_p
        g = (1 - sp["delta_g"]) * g + inv_g
        hh_assets += s_hh + retained_hh
        wealth = wealth + save_h + retained_hh * ws / w
        checks["wealth"] = max(checks["wealth"], abs(wealth.sum() * w - hh_assets) / y)
        tfp *= 1 + sp["g_a"] + sp["zeta_own"] * (s_pub + s_coop - s_coll0)
        e_lag = lev["e"] if t - 3 >= 1 else base["e"]
        m_lag = lev["m"] if t - 1 >= 1 else base["m"]
        h *= 1 + sp["phi_e"] * (e_lag - base["e"]) + sp["phi_h"] * (m_lag - base["m"])
        nfa += ca
        d_prev = deficit / y
        tau_l_prev = t_l / wages_total
        if t == 0:
            tau_l_base = tau_l_prev

        last = {code: vals[-1] for code, vals in series.items()}
        if (any(last[code] > limit for code, limit in BREAKDOWN.items())
                or not all(np.isfinite(v) for v in last.values())):
            valid_until = t
            break

    for vals in series.values():  # years past a breakdown are not meaningful
        vals.extend([float("nan")] * (horizon + 1 - len(vals)))
    return {"series": series, "detail": detail, "checks": checks, "valid_until": valid_until}


def _detail(pop, persons, order, mid, eq, eq_market, median, catastrophic, unemployed, reg_inc, beta):
    n_hh, n_regions = len(persons), len(REGIONS)
    dec_of = np.empty(n_hh, int)
    dec_of[order] = np.minimum((mid * N_DECILES).astype(int), N_DECILES - 1)
    dw = np.bincount(dec_of, persons, N_DECILES)
    reg_persons = np.bincount(pop.hh_region, persons, n_regions)
    reg_poor = np.bincount(pop.hh_region, persons * (eq < 0.6 * median), n_regions)
    reg_lf = np.bincount(pop.region[pop.in_lf], minlength=n_regions)
    reg_unemp = np.bincount(pop.region[unemployed], minlength=n_regions)
    reg_cat = np.bincount(pop.hh_region, persons * catastrophic, n_regions)
    return {
        "deciles": {
            "market": (np.bincount(dec_of, eq_market * persons, N_DECILES) / dw).tolist(),
            "disposable": (np.bincount(dec_of, eq * persons, N_DECILES) / dw).tolist(),
        },
        "regions": [{
            "code": REGIONS[r][0],
            "population": float(reg_persons[r] * pop.weight),
            "mean_income": float(reg_inc[r]),
            "poverty_relative": float(reg_poor[r] / reg_persons[r]),
            "unemployment": float(reg_unemp[r] / reg_lf[r]),
            "health_access": float(1 - beta * reg_cat[r] / reg_persons[r]),
            "sector_shares": {
                SECTORS[s][0]: float(np.mean(pop.sector[pop.in_lf & (pop.region == r)] == s))
                for s in range(len(SECTORS))
            },
        } for r in range(n_regions)],
    }
