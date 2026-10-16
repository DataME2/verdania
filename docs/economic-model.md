# Verdania Economic Model — Specification v0.1

Status: **implemented in `sim/` (verdania-sim 0.1.0), central values accepted for launch, open to revision** · Python 3.11 + NumPy

Single source for parameter values: [`sim/verdania_sim/params.py`](../sim/verdania_sim/params.py). If this document and the code disagree, the code is what runs; fix whichever is wrong.

> Every figure produced by this model is a **simulated output for a fictional country**. It is not a forecast, not a causal estimate for any real economy, and not investment advice.

## 0. Design rules

1. **Aggregate-first.** The macro block runs on national aggregates. Distribution runs on a weighted synthetic household sample of 20,000 households (weight 40 each, so 800,000 households and 2,000,000 people). No two-million-row tables, anywhere.
2. **Deterministic core, explicit uncertainty.** With central parameter values a run is fully deterministic. Uncertainty comes from Monte Carlo draws over *structural* parameters, never over the user's policy levers.
3. **Identities hold by construction**, and tests check them every year of every run (§10).
4. **No baked-in conclusions.** Every behavioural link is a named parameter with a central value, a range, and an evidence label: `empirical-range`, `contested`, `theoretical` or `synthetic`. Where the literature disagrees on sign, the range crosses zero.
5. **Small v0.1.** v0.1 implements only what Challenge 1 and the homepage mini-experiment need. Everything else is listed in §11 as later work and shown in the UI as "not modelled yet". It is never faked.

## 1. Time, units, population

- Annual steps `t = 0 … H`, with `H ∈ {1, 5, 10, 20}`. All values are real (constant prices). There is no inflation block in v0.1.
- **Year 0 is the shared calibration year:** every scenario starts from the same baseline state, and policy levers apply from year 1.
- Currency: Verdanian credit **V$** (fictional, simulation only).
- Population is fixed in v0.1 (no births, deaths or migration): N = 2,000,000, 50% women and 50% men in every region and age band (to the nearest sample person).

| Region | Character | People |
|---|---|---|
| Solenne | capital, services & tech | 520,000 |
| Portalis | coastal port, trade & logistics | 360,000 |
| Ferrano | industrial belt | 340,000 |
| Riverna | river delta, food processing | 300,000 |
| Campovera | grain plains | 290,000 |
| Altaverde | highlands, hydro & forestry | 190,000 |

Age bands: 0–14 22%, 15–64 64%, 65+ 14%. Household sizes: 1 person 28%, 2 people 30%, 3 people 18%, 4 people 15%, 5+ people 9% (mean 2.5).

Employment by sector, identical for women and men within every region (exact quotas). Regions have their own sector mixes, and nationally they come to about: agriculture 38%, food processing 9%, industry & energy 12%, construction 6%, private services 22%, public services 14%.

Household composition is fixed by 9 household types: 20,000 sample households holding 11,000 children, 32,000 working-age adults and 7,000 people aged 65+. Each type is split across regions by population share.

### 1.1 Synthetic population generator (`verdania_sim.population`, seed stored)

Per person:
- region, age band, gender (50/50 within region × age band)
- education: adults 15% primary-or-less, 35% lower secondary, 35% upper secondary, 15% tertiary, with exact gender-identical quotas
- labour-force membership: 72% of working-age women and of working-age men
- sector
- wage index `z_i ~ LogNormal(μ_region + β_edu + β_sector, σ_z)`, where σ_z is solved so that the wage-index Gini of the labour force = 0.38
- an employment-risk rank: standardised `−log z` plus noise. The highest ranks are the first to lose jobs.
- unemployment-benefit eligibility (60% of labour-force members)

Per household:
- equivalence scale (OECD-modified: 1 + 0.5 per extra adult + 0.3 per child)
- initial wealth share: lognormal, correlated (0.5) with household earning capacity, with σ solved so that the top 10% hold 58%

**No occupation, wage or leadership parameter depends on gender.** Any gender gap that appears is an outcome of a modelled mechanism. In v0.1 no such mechanism exists, so the expected gap is 0 ± sampling noise, and the UI says exactly that.

The generator writes aggregate cell counts (`synthetic_population_profiles`) to the database. A browsable person sample (`synthetic_people`) arrives with the People and Society page. The engine regenerates its 20,000-household working sample from the same seed in memory (seed `20261016`).

## 2. Production

$$Y_t = A_t\,K_t^{\alpha}\,G_t^{\gamma}\,(h_t L_t)^{1-\alpha}$$

| Symbol | Meaning |
|---|---|
| `Y` | value added (GDP at basic prices); GDP at market prices = `Y + T_v` |
| `K` | productive capital, all ownership forms (ownership tracked as shares, §4) |
| `G` | public infrastructure capital |
| `L` | employed persons |
| `h` | human-capital index, `h_0 = 1` |
| `A` | total factor productivity |

Accumulation:

$$K_{t+1}=(1-\delta)K_t+I^p_t \qquad G_{t+1}=(1-\delta_G)G_t+I^G_t$$

$$A_{t+1}=A_t\,(1+g_A+\zeta_{own}\,(\sigma^{coll}_t-\sigma^{coll}_0))$$

$$h_{t+1}=h_t\,(1+\varphi_E\,(e_{t-3}-e_0)+\varphi_H\,(m_{t-1}-m_0))$$

Here `e` is public education spending and `m` public health spending, both as shares of Y. `σ^coll = σ^pub + σ^coop` is the collectively owned share of capital.

**Calibration (automatic, documented in every run).** Exact discrete balanced-growth rate `g* = (1 + g_A)^{1/(1−α−γ)} − 1`. Set `K_0 = ι_0 Y_0 / (δ + g*)` and `G_0 = i^G_0 Y_0 / (δ_G + g*)`, then solve `A_0` from the production function. The baseline therefore starts on its balanced-growth path, so the policy-free baseline moves only through growth and wealth dynamics, not through calibration artefacts.

## 3. Labour market

Labour force `LF = p · N_{15–64}` with participation `p = 0.72`. Employment `L_t = LF (1 − u_t)`.

$$u_t=\mathrm{clip}\big(u_0+\eta_{mw}\,\Delta bite_t+\eta_{ub}\,\Delta rr_t+\eta_{w}\,\Delta\bar\tau^L_t+\eta_{cb}\,\Delta CB_t,\;0.02,\;0.40\big)$$

- `bite` = minimum wage ÷ median wage
- `rr` = unemployment-benefit replacement rate
- `τ̄^L` = average effective labour-tax rate, `T_L / W`, taken from the previous year (a one-year response lag)
- `CB` = collective-bargaining coverage
- `Δ` = deviation from baseline

**Who becomes unemployed:** the people with the highest employment-risk scores. This is deterministic given the seed, so job losses from a binding minimum wage fall on workers near the floor.

**Labour share of value added:**

$$s^L_t=\mathrm{clip}\big(s^L_0+\theta_{cb}\,\Delta CB_t+\theta_{mw}\,\Delta bite_t,\;0.35,\;0.75\big)\qquad W_t=s^L_t\,Y_t\qquad \Pi_t=Y_t-W_t$$

**Individual wages:**
1. Apply bargaining compression relative to baseline, then the minimum-wage floor: `z̃_i = max(z_i^{1−κ·ΔCB_t}, bite_t · median(z̃))`.
2. Scale so that the wages of employed persons sum exactly to `W_t`.

**Top taxable-income response (tax base only).** The share of top-band income reported as labour income is `min(1, 0.85 · ((1−τ_top,t)/(1−τ_top,0))^{e_ti})`. The rest is reported as capital income and taxed at `τ_k`. v0.1 treats the elasticity as income shifting (avoidance), not as reduced work, so it moves tax revenue but not output.

## 4. Firms, ownership, capital income

Net operating surplus: `NOS = Π − δK`. Ownership shares of capital: public `σ^pub`, cooperative/worker-owned `σ^coop`, private households `1 − σ^pub − σ^coop`.

| Flow | Formula |
|---|---|
| Public-enterprise surplus (to government) | `σ^pub · NOS` |
| Corporate tax (private + coop) | `T_c = τ_c · (1 − σ^pub) · NOS` |
| After-tax profit | `Π^at = (1 − σ^pub) · NOS − T_c` |
| Retained earnings | `R = ρ_ret · Π^at` |
| Dividends | `Div = (1 − ρ_ret) · Π^at` |
| Coop dividend (equal per employed person, after buyout interest) | `Div · σ^coop / (1 − σ^pub) − min(that, i·B^coop)` |
| Private dividend (by household wealth share) | `Div · (1 − σ^pub − σ^coop) / (1 − σ^pub)` |

`ρ_ret = 0.10` (range 0.05–0.20) is low on purpose. Operating surplus here includes self-employed mixed income and household-owned capital, which in national accounts flow mostly to households. A higher value makes firms' gross saving exceed investment on the balanced-growth path.

**Ownership changes** (`s_pub`, `s_coop`) phase in linearly over 5 years:
- **Increases** are compensated at book value with public bonds issued to the former owners. Household wealth is unchanged at the moment of transfer, and gross public debt rises.
- **Cooperative buyouts** leave the government holding a buyout claim `B^coop`. Coops service it at the government's interest rate out of coop dividends.
- **Decreases in public ownership** (privatisation) are sold to households for bonds.
- **Decreases in cooperative ownership** pass to private owners without a public flow.

**Private gross investment:**

$$I^p_t=Y_t\Big[\iota_0\Big(\tfrac{1-\tau_{c,t}}{1-\tau_{c,0}}\Big)^{\varepsilon_\tau}\Big(\tfrac{\Pi_t/Y_t}{\Pi_0/Y_0}\Big)^{\varepsilon_\pi}-\psi\,\max\big(0,\;d_{t-1}-d_0\big)\Big]$$

`d` is the government deficit as a share of Y. `ψ` is crowding-out: 0 means none, 1 means each extra point of deficit displaces one point of private investment.

## 5. Government

**Revenue:** `T = T_L + T_k + T_cg + T_c + T_v + σ^pub·NOS + coop buyout interest`

Pensions, unemployment benefits and the minimum-income top-up are untaxed in v0.1.

| Tax | Base | Rule |
|---|---|---|
| `T_L` personal income | wages + coop dividends, per person | allowance `0.3·w̄`; basic rate `τ_b` up to `1.5·w̄`; top rate `τ_top` above (`w̄` = mean wage) |
| `T_k` capital income | private dividends + domestic interest | `τ_k` flat |
| `T_cg` capital gains | retained earnings attributed to household owners, realised share `ρ_real = 0.3` | `τ_cg` flat |
| `T_c` corporate | see §4 | `τ_c` |
| `T_v` VAT | household consumption (VAT-inclusive) | `τ_v / (1 + τ_v) · C` |

**Spending:** `S = M + E + O + I^G + Pen + UB + GMI + i_t·D_t`

| Item | Rule |
|---|---|
| `M` public health | lever, % of Y |
| `E` public education | lever, % of Y |
| `O` other public consumption | **calibration residual**: set at t=0 so the baseline debt ratio is constant, then held fixed as % of Y |
| `I^G` public investment | lever, % of Y |
| `Pen` pensions | each person 65+ receives `0.40 · w̄` |
| `UB` unemployment benefit | coverage 0.6 of unemployed × `rr · w̄` |
| `GMI` guaranteed minimum income | tops up each household's equivalised disposable income to `gmi ×` the year-0 median of pre-top-up equivalised income (an anchored floor, so its cost is endogenous) |
| Interest | `i_t = r_0 + ρ_d · max(0, ND_t/Y_t − 0.60)` on **net** debt `ND = D − σ^pub·K − B^coop` (public equity and buyout claims at book value). Using net rather than gross debt is a contested choice; it avoids penalising compensated public ownership as if it were pure borrowing. |

**Budget identity (checked every year):**

$$D_{t+1}=D_t+(S_t-T_t)+\text{compensation}_{t+1}$$

**Fiscal closure** (an explicit, user-visible assumption):
- `borrow` (default): deficits add to debt.
- `adjust_other`: `O` is cut automatically so that `D/Y` never exceeds the user's limit. The cut is reported as a separate line item.

**Sustainability flag:** net debt above 150% of output, or interest above 25% of revenue, in any year.

**Breakdown guard:** the model has no default, inflation or financial-crisis block. If gross debt passes 300% of output, interest passes 60% of revenue, or any value stops being finite, the run stops. That year is reported as `valid_until`, later years are returned as empty (null), and the UI says the path is outside the model's validity.

Debt ownership: compensation bonds are held by domestic households. Other borrowing is 60% domestic (households, in proportion to wealth) and 40% the rest of the world.

## 6. Households

| Income concept | Definition |
|---|---|
| Market income | wages + coop dividend + private dividend + domestic interest |
| Gross income | market income + pensions + UB + GMI |
| Disposable income | gross income − `T_L` − `T_k` − `T_cg` |
| Equivalised disposable income | disposable income ÷ equivalence scale |

**Consumption:** `C_h = c_q · max(Y^d_h, 0)`, with `q` the quintile of equivalised disposable income (person-weighted).
- The saving-rate schedule `1 − c_q ∝ (0.03, 0.08, 0.14, 0.20, 0.32)` keeps its shape: richer quintiles save a larger share.
- Its level is scaled once, in year 0, so the baseline has **balanced trade (NX₀ = 0)**.
- On the balanced-growth path net investment is only about 4% of output, so the calibrated household saving rates are low: about 0.4% for the bottom quintile and 4% for the top.

**Saving and wealth:** `s_h = Y^d_h − C_h`. Household wealth accumulates from saving plus the household owners' share of retained profits, allocated by wealth share:

$$a_{h,t+1}=a_{h,t}+s_{h,t}+R^{hh}_t\cdot\frac{a_{h,t}}{\sum a}$$

with `A_0 = (1 − σ^pub − σ^coop)·K_0 + D^{dom}_0`. Assets are held at book value; foreign assets earn no return in v0.1.

**Health financing.** Total health need is fixed at 7% of Y. Out-of-pocket spending `OOP = 7%·Y − M`, allocated per person with weights 1 (under 65) and 2.5 (65+).
- A household is in *catastrophic health spending* if OOP > 10% of its disposable income. This is the WHO/SDG 3.8.2 threshold.
- A share `β_forgo` of such households forgo care. Health access index = 1 − (people forgoing ÷ N).

## 7. Closing the accounts

GDP at market prices: `Y + T_v`.

Net exports are the residual, which makes this a small-open-economy approximation:

$$NX_t=(Y_t+T_{v,t})-C_t-I^p_t-I^G_t-(M_t+E_t+O_t)$$

Current account: `CA = NX − i·D^{for}`. It accumulates into net foreign assets.

v0.1 has **no demand block**: tax rises and spending cuts carry no short-run output cost, and spending increases bring no demand boost. Output responds only through supply channels (capital, public capital, human capital, employment). This is the model's most important simplification, and the UI states it in every result's assumptions.

## 8. Parameters

### 8.1 Policy levers (user-controlled, v0.1)

| Code | Lever | Range | Baseline |
|---|---|---|---|
| `tau_top` | Top income-tax rate | 0.20–0.70 | 0.35 |
| `tau_b` | Basic income-tax rate | 0.05–0.40 | 0.22 |
| `tau_c` | Corporate tax | 0.05–0.45 | 0.25 |
| `tau_k` | Capital-income tax | 0.00–0.50 | 0.20 |
| `tau_cg` | Capital-gains tax | 0.00–0.50 | 0.15 |
| `tau_v` | VAT | 0.00–0.25 | 0.12 |
| `bite` | Minimum wage, share of median wage | 0.30–0.70 | 0.45 |
| `cb` | Collective-bargaining coverage | 0.10–0.90 | 0.35 |
| `rr` | Unemployment-benefit replacement rate | 0.00–0.80 | 0.40 |
| `gmi` | Guaranteed minimum income, share of baseline median | 0.00–0.60 | 0.20 |
| `m` | Public health spending, % of Y | 0.01–0.07 | 0.045 |
| `e` | Public education spending, % of Y | 0.02–0.08 | 0.042 |
| `ig` | Public infrastructure investment, % of Y | 0.01–0.08 | 0.030 |
| `s_coop` | Cooperative / worker-owned capital share | 0.00–0.50 | 0.03 |
| `s_pub` | Public ownership of capital | 0.00–0.80 | 0.10 |
| `closure` | Fiscal closure | borrow / adjust_other | borrow |
| `debt_limit` | Debt limit (for `adjust_other`) | 0.30–1.50 | 0.90 |

**Economic-system presets A–D** are complete policy bundles (taxes *and* spending) stored in `public_policy_configurations`. A label never changes an equation.

Design rule, applied identically to all four: at central parameter values each preset finances itself, with |deficit| ≤ 3% of output in year 10 (enforced by a test). Without this rule, the comparison would mostly measure which preset forgot to raise taxes.

| Preset | top | basic | corp | cap. inc. | cap. gains | VAT | min wage | CB | rr | gmi | health | edu | infra | coop | public |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Baseline | .35 | .22 | .25 | .20 | .15 | .12 | .45 | .35 | .40 | .20 | 4.5% | 4.2% | 3.0% | .03 | .10 |
| A Market-led | .30 | .18 | .20 | .15 | .10 | .10 | .35 | .15 | .25 | .05 | 2.5% | 3.5% | 2.0% | .02 | .05 |
| B Social-market | .42 | .24 | .25 | .25 | .20 | .16 | .50 | .55 | .55 | .15 | 5.0% | 4.5% | 3.0% | .05 | .10 |
| C Social-democratic | .52 | .28 | .25 | .30 | .30 | .22 | .55 | .80 | .65 | .25 | 6.5% | 5.5% | 3.5% | .10 | .15 |
| D Collective ownership | .45 | .28 | .20 | .30 | .30 | .18 | .60 | .85 | .60 | .30 | 7.0% | 6.0% | 5.0% | .35 | .45 |

### 8.2 Structural parameters (uncertain, drawn in Monte Carlo)

| Code | Meaning | Central | Low–High | Evidence |
|---|---|---|---|---|
| `alpha` | capital elasticity | 0.35 | 0.30–0.40 | empirical-range |
| `gamma` | output elasticity of public capital | 0.08 | 0.00–0.15 | empirical-range¹ |
| `delta` / `delta_g` | depreciation, private / public | 0.06 / 0.04 | ±0.02 / ±0.01 | synthetic |
| `g_a` | trend TFP growth | 0.010 | 0.005–0.015 | synthetic |
| `iota0` | baseline private investment rate | 0.18 | fixed | synthetic |
| `eps_tau` | investment response to `(1−τ_c)` | 0.5 | 0.0–1.0 | contested |
| `eps_pi` | investment response to profit share | 0.5 | 0.0–1.0 | contested |
| `psi` | crowding-out of private investment by deficits | 0.3 | 0.0–1.0 | contested |
| `eta_mw` | Δu per unit of minimum-wage bite | 0.05 | **−0.05**–0.20 | contested² |
| `eta_ub` | Δu per unit of replacement rate | 0.03 | 0.00–0.08 | contested |
| `eta_w` | Δu per unit of labour-tax rate | 0.05 | 0.00–0.15 | contested |
| `eta_cb` | Δu per unit of bargaining coverage | 0.00 | −0.02–0.04 | contested³ |
| `theta_cb` | Δ labour share per unit of coverage | 0.10 | 0.00–0.25 | theoretical |
| `theta_mw` | Δ labour share per unit of bite | 0.05 | 0.00–0.15 | theoretical |
| `kappa` | wage compression from bargaining | 0.15 | 0.00–0.30 | theoretical |
| `e_ti` | taxable-income elasticity, top earners | 0.25 | 0.10–0.50 | empirical-range⁴ |
| `phi_e` | h-growth per point of education spending (3-yr lag) | 0.10 | 0.00–0.25 | theoretical |
| `phi_h` | h-growth per point of health spending (1-yr lag) | 0.05 | 0.00–0.15 | theoretical |
| `zeta_own` | TFP-growth effect of collective ownership share | 0.00 | **−0.02**–0.01 | contested |
| `rho_ret` | retained share of after-tax operating surplus (see §4) | 0.10 | 0.05–0.20 | synthetic |
| `r0` / `rho_d` | base interest rate / debt risk premium | 0.04 / 0.05 | 0.03–0.06 / 0.02–0.10 | synthetic |
| `beta_forgo` | share of catastrophic-spending households forgoing care | 0.5 | 0.3–0.8 | synthetic |

Notes. These sources need checking against the originals before the methodology page goes public:

¹ Bom & Ligthart (2014), *Journal of Economic Surveys*, meta-analysis, mean ≈ 0.08.
² The minimum-wage employment literature disagrees on sign at moderate bites (e.g. Cengiz et al. 2019 vs Neumark & Wascher). The range deliberately crosses zero.
³ OECD (2019), *Negotiating Our Way Up*: the effects depend on coordination.
⁴ Saez, Slemrod & Giertz (2012), *Journal of Economic Literature*.

### 8.3 Uncertainty and sensitivity

- **Monte Carlo:** draws from Triangular(low, central, high), using `numpy.random.default_rng(mc_seed)`: 40 draws in interactive mode, 200 in full mode (saved and published scenarios). Baseline and scenario share the same draws (common random numbers), so a Δ band measures the policy effect, not noise.
- **Speed:** draws run on an exact stratified subsample of 2,000 households (every 10th, across household type × region). Each band is the subsample's spread around its own central run, re-centred on the full-sample central path: `P_k = central_full + (P_k(draws) − central_subsample)`.
- **Reported:** central path (all central values, full sample) plus P10 and P90 per indicator per year, for both the level and the Δ vs baseline. Also reported: the share of draws that hit the breakdown guard.
- **Sensitivity (tornado):** one parameter at a time, low vs high, effect on Δ GDP per capita, Δ Gini, Δ anchored poverty and Δ D/Y at the horizon.
- **"Challenge this result":** the user can override any structural central value within its range. The override is stored in the run inputs.

## 9. Indicators produced (v0.1)

GDP and GDP per capita (market prices) · real growth · median equivalised disposable income · Gini of market income **and** of disposable income (person-weighted) · top 10% / top 1% wealth share · relative poverty (< 60% of current median) **and** anchored poverty (< 60% of baseline median) · employment rate · unemployment · mean real wage · labour productivity `Y/L` · labour share · health access index and catastrophic-spending rate · human-capital index · gender pay gap (expected 0 in v0.1) · regional mean income and the max/min regional ratio · revenue, spending, deficit, D/Y, interest/revenue · income by decile (D1–D10), market vs disposable.

**Marked "not modelled in v0.1":** housing affordability, food security, social mobility, environmental sustainability, underemployment, sector supply chains.

## 10. Accounting tests (run on every result; a failure blocks publishing)

Implemented in `sim/tests/test_engine.py` (engine) and `supabase/checks/` (database). Identities are checked every year, for every preset and for extreme lever settings, within 1e-9 of output:

1. `W + Π = Y`.
2. Σ household wages = W; Σ household private dividends = `Div_p`.
3. `C + I^p + I^G + M + E + O + NX = Y + T_v`.
4. Sectoral balances: `S^hh + S^firm + S^gov − I^p − I^G = CA`. This is the strongest check, because it ties every flow together.
5. `D_{t+1} − D_t = S_t − T_t + compensation`.
6. `Σ_h a_h = A_t`.
7. Determinism: identical inputs and seed give byte-identical output JSON and the same input hash.
8. Baseline calibration: with no lever changes, `K/Y`, `s^L`, `u`, the private-investment rate and `h` stay constant, and `NX₀ = 0`. `D/Y` drifts by less than 3 points over 20 years, because the minimum-income floor is anchored rather than indexed.
9. Year 0 is identical across scenarios.
10. Every preset meets the self-financing rule (§8.1).
11. Ledger (database side): for every portfolio, unallocated + Σ allocations = initial grant.

A mutation test (dropping one revenue flow) makes check 4 fail, so these checks are live.

Behavioural tests check **limits only** (e.g. VAT 0 ⇒ VAT revenue 0; `gmi = 0` ⇒ GMI spending 0; gender pay gap ≈ 0; an unfunded spending spree trips the breakdown guard rather than returning numbers). They never check the *direction* of a contested effect.

## 11. Explicitly out of v0.1 (roadmap)

| Version | Adds |
|---|---|
| v0.2 | 6-sector input–output block (agriculture → food processing link, food prices, food security); demand/output-gap block for downturns; housing block; carbon price and emissions; competition policy (markups); sector-tagged investment projects feeding `K` composition |
| v0.3 | Social mobility (parent–child rank links); regional policy levers; underemployment; care-time and part-time channels (possible gender-gap mechanisms) |
| v0.4 | Collective-planning allocation alternatives for Model D; trade policy |

## 12. Reproducibility record

Every run stores:
- `model_version`
- `engine_git_sha`
- `population_seed`
- `mc_seed`
- `horizon`
- the full lever vector
- structural overrides
- `input_hash = sha256(canonical_json(inputs))`
- timestamp and output JSON

Re-running a stored input on the same `model_version` must reproduce the output exactly (test 7).
