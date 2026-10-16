"""Write the reference-data migration from the engine's own registry, population and baseline run.

    uv run python -m verdania_sim.seed

It is a migration (not seed.sql) because production applies migrations on merge and never runs
seed.sql. The DB therefore never disagrees with the engine about parameters, presets or baseline
figures. A new model version gets a new migration; never edit one that has been deployed.
"""

import json
import sys
import uuid

from .engine import _baseline_central
from .params import BASELINE, LEVERS, MODEL_VERSION, PRESETS, STRUCTURAL, resolve_levers
from .population import POPULATION_SEED, REGIONS, SECTORS, generate, profiles

NS = uuid.UUID("5d1f0c1e-7a43-4c55-9a7e-6f0d2b9c1a10")  # stable ids across re-seeds
BASE_YEAR = 2026
uid = lambda name: str(uuid.uuid5(NS, name))  # noqa: E731

REGION_INFO = {
    "solenne": ("Capital region: services, technology and public administration.", 1850.0),
    "portalis": ("Coastal port: trade, logistics and fishing.", 2900.0),
    "ferrano": ("Industrial belt: manufacturing and energy.", 3400.0),
    "riverna": ("River delta: irrigated farming and food processing.", 4100.0),
    "campovera": ("Grain plains: large-scale cereal farming.", 6800.0),
    "altaverde": ("Highlands: hydro power, forestry and livestock.", 5200.0),
}
SECTOR_DESC = {
    "agriculture": "Crops, livestock, forestry and fishing.",
    "food_processing": "Milling, packing, dairy and cold chains.",
    "industry_energy": "Manufacturing, mining and power generation.",
    "construction": "Buildings, roads and civil works.",
    "private_services": "Trade, transport, finance, technology and personal services.",
    "public_services": "Health, education and public administration.",
}

COMMON_ASSUMPTIONS = [
    "Synthetic project for a fictional country. Figures are illustrative assumptions, not model outputs.",
    "Jobs are direct jobs per V$1m invested over the build phase.",
    "Virtual capital only: no real money, securities or redemption.",
]
# slug, title, category, sector, region, target, public, (low, central, high), jobs/V$1m, social, environment, risk, years
PROJECTS = [
    ("riverna-drip-irrigation", "Riverna drip-irrigation scheme", "agriculture", "agriculture", "riverna",
     18e6, 4e6, (0.03, 0.06, 0.09), 22, "Raises smallholder yields and reduces drought losses.",
     "Cuts irrigation water use by about 30% (project estimate).", "medium", 8),
    ("portalis-milling-cold-chain", "Portalis milling and cold-chain hub", "food_processing", "food_processing",
     "portalis", 25e6, 0, (0.04, 0.08, 0.12), 14, "Less post-harvest loss; processing jobs near farms.",
     "Refrigeration raises electricity demand.", "medium", 10),
    ("altaverde-run-of-river-hydro", "Altaverde run-of-river hydro", "renewable_energy", "industry_energy",
     "altaverde", 60e6, 15e6, (0.02, 0.05, 0.07), 6, "Stable local power prices.",
     "Low-carbon power for about 40,000 homes; river-ecology monitoring required.", "medium", 20),
    ("plains-delta-rural-roads", "Campovera-Riverna rural roads", "infrastructure", "construction", "campovera",
     40e6, 30e6, (0.0, 0.01, 0.02), 18, "Shorter farm-to-market journeys; better school access.",
     "Land take along new routes.", "low", 15),
    ("solenne-agritech-incubator", "Solenne agri-tech incubator", "technology", "private_services", "solenne",
     8e6, 1e6, (-0.05, 0.07, 0.20), 9, "Start-ups serving farmers; skilled jobs in the capital.",
     "Neutral.", "high", 6),
    ("ferrano-affordable-rentals", "Ferrano affordable rental homes", "housing", "construction", "ferrano",
     35e6, 10e6, (0.02, 0.035, 0.05), 12, "About 1,200 homes at capped rents (housing is not modelled in v0.1).",
     "Energy-efficient construction standard.", "low", 25),
    ("campovera-district-clinics", "Campovera district clinics", "healthcare", "public_services", "campovera",
     12e6, 9e6, (0.0, 0.005, 0.01), 25, "Primary care within 30 minutes for rural households.",
     "Neutral.", "low", 10),
    ("food-skills-training", "Food-processing skills programme", "education", "public_services", "riverna",
     6e6, 4e6, (0.0, 0.01, 0.02), 15, "Vocational training for 3,000 workers a year.", "Neutral.", "low", 5),
    ("ferrano-worker-buyout-fund", "Ferrano worker buyout fund", "cooperatives", "industry_energy", "ferrano",
     20e6, 5e6, (0.01, 0.045, 0.08), 10, "Keeps firms local when owners retire; profits shared by workers.",
     "Neutral.", "medium", 10),
    ("small-business-credit", "Small-business credit line", "sme", "private_services", None,
     15e6, 3e6, (0.01, 0.05, 0.09), 20, "Working capital for shops, workshops and transport firms.",
     "Neutral.", "medium", 5),
    ("portalis-port-expansion", "Portalis port expansion (PPP)", "ppp", "private_services", "portalis",
     120e6, 50e6, (0.03, 0.06, 0.09), 5, "Export capacity for farm and food products.",
     "Dredging affects coastal habitats; offsets required.", "medium", 25),
    ("altaverde-community-forestry", "Altaverde community forestry", "community", "agriculture", "altaverde",
     4e6, 1e6, (0.01, 0.03, 0.05), 30, "Village-managed forests with shared income.",
     "Sustainable harvest plan; stores carbon.", "medium", 12),
    ("verdania-public-investment-fund", "Verdania Public Investment Fund", "public_fund", None, None,
     200e6, 100e6, (0.02, 0.04, 0.06), 8, "Pooled public stake across national projects; returns go to the budget.",
     "Screened against an environmental standard.", "low", 20),
]
AGRI_DETAIL = {"riverna-drip-irrigation": ("Rice and vegetables", 6500, 4.2, 18.0, True)}

INDICATOR_CODES = ["gdp_pc", "median_income", "gini_disposable", "gini_market", "poverty_relative",
                   "unemployment", "employment_rate", "labour_share", "health_access", "debt_share",
                   "wealth_top10", "revenue_share"]


def sql(v) -> str:
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(float(v)) if isinstance(v, float) else str(v)
    if isinstance(v, (dict, list)):
        return sql(json.dumps(v, sort_keys=True)) + "::jsonb"
    return "'" + str(v).replace("'", "''") + "'"


def insert(table: str, rows: list[dict]) -> str:
    cols = list(rows[0])
    values = ",\n  ".join("(" + ", ".join(sql(r[c]) for c in cols) + ")" for r in rows)
    return f"insert into public.{table} ({', '.join(cols)}) values\n  {values};\n"


def by_region_code(target: str, select: str, columns: str, rows: list[tuple]) -> str:
    """Compact insert for many rows: short region codes, ids resolved by join (null region = national)."""
    values = ",\n  ".join("(" + ", ".join(sql(v) for v in row) + ")" for row in rows)
    return (f"insert into public.{target}\nselect c.id, r.id, {select}\nfrom (values\n  {values}\n) v({columns})\n"
            "left join public.administrative_regions r on r.code = v.region\n"
            "cross join (select id from public.country_configurations where slug = 'verdania') c;\n")


def build() -> str:
    pop = generate(POPULATION_SEED)
    base = _baseline_central((), 1, "full")
    s, regions = base["series"], base["detail"][0]["regions"]
    country = uid("country:verdania")
    region_id = {code: uid(f"region:{code}") for code, *_ in REGIONS}
    by_region = {r["code"]: r for r in regions}

    parts = [
        "-- Generated by `python -m verdania_sim.seed`. Do not edit by hand.\n",
        f"-- Verdania reference data: model {MODEL_VERSION}, population seed {POPULATION_SEED}. All data synthetic.\n",
        insert("model_versions", [{"version": MODEL_VERSION, "is_current": True,
                                   "notes": "First public model: supply-side macro block, household distribution, "
                                            "presets A-D. See docs/economic-model.md."}]),
        insert("country_configurations", [{
            "id": country, "slug": "verdania", "name": "Verdania", "population": int(len(pop.hh) * pop.weight),
            "base_year": BASE_YEAR, "model_version": MODEL_VERSION, "is_published": True,
            "config": {"virtual_grant_units": 100000, "population_seed": POPULATION_SEED,
                       "households": int(len(pop.hh_size) * pop.weight)}}]),
        insert("economic_sectors", [{"code": c, "name": n, "description": SECTOR_DESC[c], "sort_order": i}
                                    for i, (c, n, _) in enumerate(SECTORS)]),
        insert("administrative_regions", [{
            "id": region_id[c], "country_id": country, "code": c, "name": n, "description": REGION_INFO[c][0],
            "population": int(by_region[c]["population"]), "area_km2": REGION_INFO[c][1]} for c, n, *_ in REGIONS]),
        by_region_code(
            "synthetic_population_profiles (country_id, region_id, age_band, gender, education, sector_code, "
            "person_count, generator_version, generator_seed)",
            "v.age_band, v.gender, v.education, v.sector, v.person_count, "
            f"{sql(MODEL_VERSION)}, {POPULATION_SEED}",
            "region, age_band, gender, education, sector, person_count",
            [(p["region"], p["age_band"], p["gender"], p["education"], p["sector"], p["person_count"])
             for p in profiles(pop)]),
        insert("simulation_parameters", [{
            "model_version": MODEL_VERSION, "code": p.code, "label": p.label, "kind": kind, "unit": p.unit or None,
            "min_value": p.lo, "max_value": p.hi, "default_value": p.default, "evidence": p.evidence,
            "source": p.source or None, "notes": None}
            for kind, reg in (("lever", LEVERS), ("structural", STRUCTURAL)) for p in reg.values()]),
        insert("public_policy_configurations", [{
            "country_id": country, "slug": slug if slug == "baseline" else f"model-{slug.lower()}",
            "name": pr["label"], "model_family": pr["family"],
            "description": "Verdania's starting policy mix." if slug == "baseline" else
            f"Model {slug}: a complete tax-and-spending bundle; every value can be edited.",
            "levers": resolve_levers(None if slug == "baseline" else slug), "model_version": MODEL_VERSION,
            "is_published": True} for slug, pr in PRESETS.items()]),
        insert("investment_projects", [{
            "id": uid(f"project:{p[0]}"), "country_id": country, "slug": p[0], "title": p[1], "summary": p[9],
            "category": p[2], "sector_code": p[3], "region_id": region_id.get(p[4]), "funding_target": p[5],
            "public_contribution": p[6], "private_return_low": p[7][0], "private_return_central": p[7][1],
            "private_return_high": p[7][2], "jobs_per_million": p[8], "social_return_note": p[9],
            "environmental_note": p[10], "risk_level": p[11], "horizon_years": p[12],
            "assumptions": COMMON_ASSUMPTIONS, "is_published": True} for p in PROJECTS]),
        insert("agricultural_projects", [{
            "project_id": uid(f"project:{slug}"), "crop": d[0], "hectares": d[1], "baseline_yield_t_per_ha": d[2],
            "expected_yield_gain_pct": d[3], "irrigated": d[4]} for slug, d in AGRI_DETAIL.items()]),
        by_region_code(
            "economic_indicators (country_id, region_id, code, label, year, value, unit, data_kind)",
            f"v.code, replace(v.code, '_', ' '), {BASE_YEAR}, v.value, 'model', 'synthetic'::public.data_kind",
            "region, code, value",
            [(None, c, round(s[c][0], 6)) for c in INDICATOR_CODES]
            + [(r["code"], k, round(v, 6)) for r in regions for k, v in
               [*((k, r[k]) for k in ("mean_income", "poverty_relative", "unemployment", "health_access")),
                *((f"sector_share_{sc}", sh) for sc, sh in r["sector_shares"].items())]]),
    ]
    assert BASELINE["closure"] == "borrow"
    return "\n".join(parts)


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "../supabase/migrations/20261016120000_reference_data_v0_1.sql"
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        f.write(build())
    print(f"wrote {out}")
