"""Model-spec section 10: accounting identities, calibration, determinism and limits.

Behavioural tests check limits only, never the direction of a contested effect.
"""

import json

import numpy as np
import pytest

from verdania_sim import engine
from verdania_sim.model import simulate_path
from verdania_sim.params import BASELINE, CENTRAL, LEVERS, PRESETS, resolve_levers
from verdania_sim.population import REGIONS, generate, gini, subsample

POP = generate()
TOL = 1e-9

EXTREMES = {
    "all_low": {c: p.lo for c, p in LEVERS.items()},
    "all_high": {c: p.hi for c, p in LEVERS.items()} | {"s_pub": 0.5, "s_coop": 0.4},
    "austerity_rule": {"m": 0.08 - 0.01, "gmi": 0.6, "tau_b": 0.05, "closure": "adjust_other", "debt_limit": 0.6},
}


def test_population_invariants():
    assert len(POP.hh) * POP.weight == 2_000_000
    assert len(POP.hh_size) * POP.weight == 800_000
    for r in range(len(REGIONS)):
        for band in range(3):
            g = (POP.region == r) & (POP.band == band)
            assert abs(POP.female[g].sum() - (~POP.female[g]).sum()) <= 1  # 50/50 to the nearest sample person
    for sex in (True, False):  # identical participation, education and sector distributions
        assert POP.in_lf[(POP.band == 1) & (POP.female == sex)].mean() == pytest.approx(0.72, abs=1e-4)
    for s in range(6):
        women = np.mean(POP.sector[POP.in_lf & POP.female] == s)
        men = np.mean(POP.sector[POP.in_lf & ~POP.female] == s)
        assert women == pytest.approx(men, abs=2e-3)
    assert gini(POP.z[POP.in_lf]) == pytest.approx(0.38, abs=1e-3)
    assert np.sort(POP.wealth_share)[-2000:].sum() == pytest.approx(0.58, abs=1e-3)


def test_subsample_is_stratified():
    small = subsample(POP)
    assert len(small.hh) * small.weight == 2_000_000
    # labour-force membership is drawn per person, so the subsample carries sampling noise; bands are
    # centred on the full-sample path, so only the spread comes from here
    assert small.in_lf.sum() * small.weight == pytest.approx(POP.in_lf.sum() * POP.weight, rel=2e-2)


@pytest.mark.parametrize("name", list(PRESETS) + list(EXTREMES))
def test_accounting_identities(name):
    lev = resolve_levers(name if name in PRESETS else None, EXTREMES.get(name))
    r = simulate_path(POP, lev, CENTRAL, 20)
    for check, err in r["checks"].items():
        assert err < TOL, f"{check} off by {err:.2e}"


def test_baseline_is_on_balanced_growth():
    s = simulate_path(POP, BASELINE, CENTRAL, 20)["series"]
    for code in ("capital_output", "labour_share", "unemployment", "private_investment", "human_capital"):
        assert np.ptp(s[code]) < 1e-9, code
    assert abs(s["net_exports"][0]) < 1e-9  # MPC level calibrated to balanced trade
    assert np.ptp(s["debt_share"]) < 0.03  # anchored GMI lets the debt ratio drift slowly


def test_year_zero_is_shared():
    b = simulate_path(POP, BASELINE, CENTRAL, 5)["series"]
    s = simulate_path(POP, resolve_levers("D"), CENTRAL, 5)["series"]
    assert all(b[c][0] == s[c][0] for c in b)


@pytest.mark.parametrize("preset", ["A", "B", "C", "D"])
def test_presets_follow_the_self_financing_rule(preset):
    s = simulate_path(POP, resolve_levers(preset), CENTRAL, 10)["series"]
    assert abs(s["deficit_share"][10]) <= 0.03


def test_limits():
    zero_tax = {"tau_top": 0.20, "tau_b": 0.05, "tau_c": 0.05, "tau_k": 0, "tau_cg": 0, "tau_v": 0}
    s = simulate_path(POP, resolve_levers(None, zero_tax | {"gmi": 0}), CENTRAL, 1)["series"]
    assert s["vat_share"][1] == 0
    assert s["gmi_share"][1] == 0
    assert s["gender_pay_gap"][1] == pytest.approx(0, abs=0.02)  # no gender mechanism in v0.1


def test_breakdown_is_reported_not_hidden():
    lev = resolve_levers(None, {"tau_b": 0.05, "tau_top": 0.2, "tau_v": 0, "tau_c": 0.05, "m": 0.07, "e": 0.08,
                                "ig": 0.08, "gmi": 0.6, "rr": 0.8})
    r = simulate_path(POP, lev, CENTRAL, 20)
    assert r["valid_until"] < 20
    assert np.isnan(r["series"]["gdp_pc"][-1])


def test_lever_validation():
    with pytest.raises(ValueError):
        resolve_levers(None, {"tau_top": 0.95})
    with pytest.raises(ValueError):
        resolve_levers(None, {"nonsense": 1})
    with pytest.raises(ValueError):
        engine.run(horizon=7)


def test_run_is_reproducible():
    a = engine.run(preset="C", horizon=5, levers={"bite": 0.6})
    b = engine.run(preset="C", horizon=5, levers={"bite": 0.6})
    assert json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)
    assert a["input_hash"] != engine.run(preset="C", horizon=5, levers={"bite": 0.6}, mc_seed=8)["input_hash"]
    assert a["accounting_checks"]["passed"]
    # the output fingerprint matches the payload and changes when any result changes
    assert a["output_hash"] == engine.output_hash(a)
    assert a["output_hash"] != engine.run(preset="C", horizon=5, levers={"bite": 0.61})["output_hash"]


def test_run_payload_shape():
    r = engine.run(levers={"tau_top": 0.5, "m": 0.06}, horizon=10)
    gdp = r["indicators"]["gdp_pc"]
    assert len(gdp["scenario"]) == 11 and gdp["delta"][0] == 0
    assert gdp["p10"][10] <= gdp["scenario"][10] <= gdp["p90"][10]
    assert {m["lever"] for m in r["mechanisms"]} == {"tau_top", "m"}
    assert len(r["deciles"]["scenario"]["disposable"]) == 10 and len(r["regions"]) == 6
    baseline = engine.run(horizon=10)
    assert all(v == 0 for v in baseline["indicators"]["gini_disposable"]["delta"])


def test_every_explained_channel_is_returned():
    for code, (channels, _) in engine.MECHANISMS.items():
        assert set(channels) <= set(engine.INDICATORS), f"{code} cites a channel the response omits"
    assert set(engine.MECHANISMS) == set(LEVERS) | {"closure"}


def test_full_mode_has_sensitivity():
    r = engine.run(preset="B", horizon=5, mode="full")
    assert r["uncertainty"]["draws"] == 200
    assert {row["parameter"] for row in r["sensitivity"]} <= set(CENTRAL)
