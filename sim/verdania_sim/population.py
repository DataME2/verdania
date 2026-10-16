"""Synthetic population: a weighted sample of 20,000 households (50,000 people, weight 40).

Deterministic given the seed. No parameter depends on gender: women and men get identical
education, participation and sector distributions within every region (exact quotas).
"""

from dataclasses import dataclass, field
from functools import lru_cache

import numpy as np

POPULATION_SEED = 20261016
WEIGHT = 40.0  # each sample household stands for 40 households

# code, name, share of population, regional wage effect (log points)
REGIONS = [
    ("solenne", "Solenne", 0.260, 0.20),
    ("portalis", "Portalis", 0.180, 0.05),
    ("ferrano", "Ferrano", 0.170, 0.00),
    ("riverna", "Riverna", 0.150, -0.10),
    ("campovera", "Campovera", 0.145, -0.15),
    ("altaverde", "Altaverde", 0.095, -0.20),
]
# code, name, wage effect (log points)
SECTORS = [
    ("agriculture", "Agriculture", -0.30),
    ("food_processing", "Food processing", -0.05),
    ("industry_energy", "Industry & energy", 0.10),
    ("construction", "Construction", 0.00),
    ("private_services", "Private services", 0.10),
    ("public_services", "Public services", 0.15),
]
# employment mix by region (rows follow REGIONS, columns follow SECTORS); rows are normalised
SECTOR_MIX = np.array([
    [0.10, 0.05, 0.08, 0.07, 0.43, 0.27],  # Solenne
    [0.28, 0.10, 0.12, 0.07, 0.29, 0.14],  # Portalis
    [0.28, 0.08, 0.30, 0.07, 0.15, 0.12],  # Ferrano
    [0.55, 0.20, 0.05, 0.05, 0.08, 0.07],  # Riverna
    [0.75, 0.06, 0.04, 0.04, 0.06, 0.05],  # Campovera
    [0.65, 0.04, 0.10, 0.05, 0.09, 0.07],  # Altaverde
])
EDUCATION = ["not_applicable", "primary", "lower_secondary", "upper_secondary", "tertiary"]
EDU_SHARES = [0.15, 0.35, 0.35, 0.15]  # adults, primary .. tertiary
EDU_EFFECT = np.array([0.0, -0.35, -0.15, 0.0, 0.45])
AGE_BANDS = ["0-14", "15-64", "65+"]

# (households, working-age adults, children, people 65+) per household type.
# Totals: 20,000 households; 50,000 people = 11,000 children + 32,000 working-age + 7,000 aged 65+.
HOUSEHOLD_TYPES = [
    (3000, 0, 0, 1), (2600, 1, 0, 0), (2000, 0, 0, 2), (4000, 2, 0, 0), (3600, 2, 1, 0),
    (3000, 2, 2, 0), (800, 4, 1, 0), (400, 5, 0, 0), (600, 5, 1, 0),
]
TARGET_WAGE_GINI = 0.38
TARGET_TOP10_WEALTH = 0.58


@dataclass(frozen=True, eq=False)  # identity hash, so a Population can be an lru_cache key
class Population:
    seed: int
    # people
    hh: np.ndarray          # household index
    region: np.ndarray      # region index
    band: np.ndarray        # 0 child, 1 working age, 2 aged 65+
    female: np.ndarray
    edu: np.ndarray         # index into EDUCATION
    in_lf: np.ndarray       # labour-force member
    sector: np.ndarray      # index into SECTORS, -1 outside the labour force
    z: np.ndarray           # wage index (0 outside the labour force)
    risk_rank: np.ndarray   # 0 = lowest job-loss risk; n_lf large for non-members
    ub_eligible: np.ndarray
    # households
    hh_region: np.ndarray
    hh_size: np.ndarray
    eq_scale: np.ndarray    # OECD-modified
    wealth_share: np.ndarray
    weight: float = WEIGHT
    stats: dict = field(default_factory=dict)

    @property
    def n_lf(self) -> int:
        return int(self.in_lf.sum())


def gini(x: np.ndarray, w: np.ndarray | None = None) -> float:
    """Weighted Gini coefficient (x >= 0 not required; uses the standard Lorenz formula)."""
    w = np.ones_like(x) if w is None else w
    o = np.argsort(x, kind="stable")
    x, w = x[o], w[o]
    cw = np.cumsum(w)
    cxw = np.cumsum(x * w)
    total = cxw[-1]
    if total == 0:
        return 0.0
    lorenz_area = np.sum(w * (cxw - x * w / 2)) / (cw[-1] * total)
    return float(1 - 2 * lorenz_area)


def _quotas(n: int, shares) -> np.ndarray:
    """Largest-remainder split of n into integer counts matching shares."""
    shares = np.asarray(shares, float) / np.sum(shares)
    raw = shares * n
    counts = np.floor(raw).astype(int)
    counts[np.argsort(-(raw - counts), kind="stable")[: n - counts.sum()]] += 1
    return counts


def _assign_by_quota(idx: np.ndarray, shares, rng) -> np.ndarray:
    """Shuffle idx and label consecutive blocks 0..k-1 with exact quota sizes."""
    labels = np.repeat(np.arange(len(shares)), _quotas(len(idx), shares))
    out = np.empty(len(idx), int)
    out[rng.permutation(len(idx))] = labels
    return out


def _bisect(f, lo, hi, target, iters=40):
    for _ in range(iters):
        mid = (lo + hi) / 2
        lo, hi = (mid, hi) if f(mid) < target else (lo, mid)
    return (lo + hi) / 2


@lru_cache(maxsize=4)
def generate(seed: int = POPULATION_SEED) -> Population:
    rng = np.random.default_rng(seed)
    shares = [r[2] for r in REGIONS]

    # households: each type split across regions by population share
    rows = []
    for count, n_w, n_c, n_e in HOUSEHOLD_TYPES:
        for r, k in enumerate(_quotas(count, shares)):
            rows += [(r, n_w, n_c, n_e)] * int(k)
    hh_arr = np.array(rows)
    hh_region, n_w, n_c, n_e = hh_arr.T
    n_hh = len(hh_arr)
    ids = np.arange(n_hh)

    # people
    hh = np.concatenate([np.repeat(ids, n_w), np.repeat(ids, n_c), np.repeat(ids, n_e)])
    band = np.concatenate([np.full(n_w.sum(), 1), np.full(n_c.sum(), 0), np.full(n_e.sum(), 2)])
    region = hh_region[hh]
    n = len(hh)

    female = np.zeros(n, bool)
    for r in range(len(REGIONS)):
        for b in range(3):
            g = np.flatnonzero((region == r) & (band == b))
            female[g[rng.permutation(len(g))[: len(g) // 2]]] = True

    edu = np.zeros(n, int)
    in_lf = np.zeros(n, bool)
    sector = np.full(n, -1)
    for sex in (True, False):
        adults = np.flatnonzero((band > 0) & (female == sex))
        edu[adults] = 1 + _assign_by_quota(adults, EDU_SHARES, rng)
        working = np.flatnonzero((band == 1) & (female == sex))
        lf = working[rng.permutation(len(working))[: round(0.72 * len(working))]]
        in_lf[lf] = True
        for r in range(len(REGIONS)):
            members = lf[region[lf] == r]
            sector[members] = _assign_by_quota(members, SECTOR_MIX[r], rng)

    # wage index: log z = regional + education + sector effects + noise; sigma calibrated to the Gini target
    lf_idx = np.flatnonzero(in_lf)
    fixed = (np.array([r[3] for r in REGIONS])[region[lf_idx]] + EDU_EFFECT[edu[lf_idx]]
             + np.array([s[2] for s in SECTORS])[sector[lf_idx]])
    eps = rng.standard_normal(len(lf_idx))
    sigma = _bisect(lambda s: gini(np.exp(fixed + s * eps)), 0.05, 1.5, TARGET_WAGE_GINI)
    z = np.zeros(n)
    z[lf_idx] = np.exp(fixed + sigma * eps)

    # job-loss risk: negatively related to the wage index, plus noise; ranked 0 = safest
    logz = np.log(z[lf_idx])
    score = -(logz - logz.mean()) / logz.std() + rng.standard_normal(len(lf_idx))
    risk_rank = np.full(n, n)
    risk_rank[lf_idx[np.argsort(score, kind="stable")]] = np.arange(len(lf_idx))
    ub_eligible = in_lf & (rng.random(n) < 0.60)

    hh_size = np.bincount(hh, minlength=n_hh)
    adults = n_w + n_e
    eq_scale = 1 + 0.5 * (adults - 1) + 0.3 * n_c

    # wealth: lognormal, related to household earning capacity, calibrated to the top-10% share
    capacity = np.bincount(hh, weights=z, minlength=n_hh) + 0.4 * z[lf_idx].mean() * n_e
    cap = (np.log1p(capacity) - np.log1p(capacity).mean()) / np.log1p(capacity).std()
    noise = rng.standard_normal(n_hh)
    mix = 0.5 * cap + np.sqrt(0.75) * noise

    def top10(s):
        wv = np.exp(s * mix)
        return np.sort(wv)[-n_hh // 10:].sum() / wv.sum()

    sigma_w = _bisect(top10, 0.1, 4.0, TARGET_TOP10_WEALTH)
    wealth = np.exp(sigma_w * mix)

    return Population(
        seed=seed, hh=hh, region=region, band=band, female=female, edu=edu, in_lf=in_lf,
        sector=sector, z=z, risk_rank=risk_rank, ub_eligible=ub_eligible, hh_region=hh_region,
        hh_size=hh_size, eq_scale=eq_scale, wealth_share=wealth / wealth.sum(),
        stats={"wage_sigma": sigma, "wealth_sigma": sigma_w, "people": n * WEIGHT, "households": n_hh * WEIGHT},
    )


@lru_cache(maxsize=4)
def subsample(pop: Population, step: int = 10) -> Population:
    """Every step-th household. Households are generated in type x region blocks, so this is
    an exact stratified subsample. Used for Monte Carlo draws, where speed matters more than detail."""
    keep_hh = np.arange(0, len(pop.hh_size), step)
    new_id = np.full(len(pop.hh_size), -1)
    new_id[keep_hh] = np.arange(len(keep_hh))
    keep = new_id[pop.hh] >= 0
    lf = pop.in_lf[keep]
    rank = np.full(int(keep.sum()), int(keep.sum()))
    order = np.argsort(np.where(lf, pop.risk_rank[keep], np.iinfo(np.int64).max), kind="stable")
    rank[order[: int(lf.sum())]] = np.arange(int(lf.sum()))
    share = pop.wealth_share[keep_hh]
    return Population(
        seed=pop.seed, hh=new_id[pop.hh[keep]], region=pop.region[keep], band=pop.band[keep],
        female=pop.female[keep], edu=pop.edu[keep], in_lf=lf, sector=pop.sector[keep], z=pop.z[keep],
        risk_rank=rank, ub_eligible=pop.ub_eligible[keep], hh_region=pop.hh_region[keep_hh],
        hh_size=pop.hh_size[keep_hh], eq_scale=pop.eq_scale[keep_hh], wealth_share=share / share.sum(),
        weight=pop.weight * step, stats=pop.stats | {"subsample_step": step},
    )


def profiles(pop: Population) -> list[dict]:
    """Aggregate cell counts (population scale) for synthetic_population_profiles."""
    sector = np.where(pop.in_lf, pop.sector, len(SECTORS))
    key = (((pop.region * 3 + pop.band) * 2 + pop.female) * len(EDUCATION) + pop.edu) * (len(SECTORS) + 1) + sector
    counts = np.bincount(key)
    out = []
    for cell in np.flatnonzero(counts):
        k = int(cell)
        s, k = k % (len(SECTORS) + 1), k // (len(SECTORS) + 1)
        e, k = k % len(EDUCATION), k // len(EDUCATION)
        f, k = k % 2, k // 2
        b, r = k % 3, k // 3
        out.append({
            "region": REGIONS[r][0], "age_band": AGE_BANDS[b], "gender": "female" if f else "male",
            "education": EDUCATION[e], "sector": SECTORS[s][0] if s < len(SECTORS) else None,
            "person_count": int(counts[cell] * pop.weight),
        })
    return out
