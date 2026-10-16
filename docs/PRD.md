# Verdania — Product Requirements (MVP)

*Can an economy serve humanity?* · A project of **Let's the Data Talk** · Status: draft v0.1, 2026-10-16

Companion documents:
- [economic-model.md](economic-model.md) — equations, parameters, tests
- [`supabase/migrations/`](../supabase/migrations/) — database design, executable
- [mvp-plan.md](mvp-plan.md) — delivery plan
- Superdesign canvas — UI prototype (see the plan, M1)

## 1. Problem and question

Can an economy keep the benefits of entrepreneurship, markets and private investment while ensuring prosperity serves society as a whole?

Verdania lets anyone test that question on a fictional, agriculture-led country of 2,000,000 synthetic citizens. Visitors change policies, allocate virtual capital and read the calculated consequences. They see aggregates *and* who gains or loses, with every assumption visible.

The starting hypothesis is that markets without social safeguards can undermine social justice. It is something to **test**, not something the engine is built to confirm.

## 2. Non-negotiables

| # | Rule | Enforced by |
|---|---|---|
| N1 | All capital is virtual. No payments, securities, redemption or real investment. | No payment code; `VRD` currency check; UI badges; ToS |
| N2 | All people and economic data are synthetic and labelled. Empirical calibration data carries source and date. | `data_kind` columns; DB check that empirical rows have provenance |
| N3 | Simulated results are never presented as forecasts or proven causal effects. | Copy rules in the design system; "Model output, not a forecast" next to every result |
| N4 | No hard-coded conclusion. Contested effects have ranges that can cross zero. | Model spec §0, §8.2; review of central values before launch |
| N5 | No opaque single score. An optional user-defined welfare function must show its weights. | Dashboard design |
| N6 | Privileged credentials never reach the browser. Roles are never taken from client input. | `service_role` used only server-side; `grant_role()` is admin-only; RLS checks |
| N7 | The core experiment is free and needs no account. | Routing; anonymous simulation endpoint |

## 3. Users

| User | Needs | Account |
|---|---|---|
| Curious visitor | Understand the question in under a minute; move a lever; see an honest result | none |
| Participant | Save scenarios, allocate virtual capital, publish a scenario, compare with others | Google |
| Educator / student | Reproducible scenarios to cite; a clear methodology | optional |
| Researcher (role) | Parameter overrides and sensitivity analysis | Google + granted role |
| Moderator / admin (role) | Hide published content, grant roles, read the audit log | Google + granted role |

## 4. MVP scope

**In:**
- Animated homepage with a live 3-lever mini-experiment
- Discover map (6 regions)
- Economic Lab with Challenge 1 ("Does higher growth necessarily reduce poverty?") fully working
- Presets A–D as lever bundles
- Social-justice indicators from model v0.1 (economic-model.md §9)
- Google sign-in
- Private and public saved scenarios, with reproduce-from-record
- Virtual market: 100,000 units, allocate / reallocate / withdraw, public aggregate totals
- Methodology page generated from the parameter registry
- English UI, with every string in message files from day one

**Shown as "coming next":** People and Society deep-dive, Community forum, more challenges, more languages, and the v0.2 model blocks (food, housing, environment, supply chains).

**Out:** real money in any form, user-uploaded files, premium tiers.

## 5. Key journeys and requirements

### J1 Visitor runs the homepage experiment (no account)
- **R1.1** Three sliders: top tax, minimum wage, public health spend. After a 250 ms debounce, the server recalculates.
- **R1.2** Four indicator cards, each with value, Δ vs baseline (arrow + sign, never colour alone) and a P10–P90 range.
- **R1.3** While recalculating, cards show a skeleton. A value animates only after the engine returns it.
- **R1.4** "Why did this change?" lists the mechanisms tied to the changed levers.
- **R1.5** Reset to baseline. Deep link to the Lab carrying the same lever values (URL query).

### J2 Visitor runs a Lab experiment
- **R2.1** Pick a challenge, a preset A–D, a horizon of 1/5/10/20 years, and any v0.1 lever. Changed levers are highlighted and can be undone one by one.
- **R2.2** Results show:
  - indicator grid with Δ and range
  - time-series chart (baseline vs scenario, with uncertainty band)
  - income-decile chart, market vs disposable income
  - mechanisms
  - assumptions, with a link to methodology
  - a fiscal-sustainability flag
- **R2.3** "Challenge this result": override structural parameters within their published range. The override shows as a chip and is part of the run record.
- **R2.4** Every chart has a data-table toggle and a text summary.

### J3 Sign in and save
- **R3.1** "Continue with Google" through Supabase Auth (PKCE). The callback route exchanges the code. A `next` parameter is accepted only as a same-site relative path.
- **R3.2** First sign-in creates a private profile holding only display name and avatar. A privacy notice is shown before the first save.
- **R3.3** Save scenario → private by default. Publish → public, with its assumptions, model version and run hash.
- **R3.4** Any saved or published scenario can be re-run. The same model version must reproduce identical numbers.
- **R3.5** Sign out; sessions refresh server-side. Private routes (`/account`, `/market/portfolio`) redirect to sign-in and return afterwards.

### J4 Virtual investment market
- **R4.1** Joining grants 100,000 units once per account. The grant size is configurable.
- **R4.2** Project cards show:
  - funding target
  - public contribution
  - private return range
  - jobs per V$1m
  - social and environmental notes
  - risk
  - time horizon
  - assumptions

  Private financial return and social return appear in separate labelled blocks.
- **R4.3** Allocate / reallocate / withdraw call `move_virtual_units()` with a client-generated request id. The database is the only authority on balances, and the UI re-reads after each change.
- **R4.4** The public dashboard shows totals by category and project, hidden below 5 participants, labelled "participant preferences, not model results and not real investor demand".

### J5 Methodology
- **R5.1** Model definitions, equations, a parameter table (rendered from `simulation_parameters`), evidence labels, limitations, version history (`model_versions`), and how to reproduce a run.

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Accessibility | WCAG 2.2 AA; keyboard access everywhere; native range inputs; map regions are buttons with a list alternative; `prefers-reduced-motion` turns off counters, parallax and pulses |
| Performance | Home LCP < 2.5 s on a mid-range phone over 4G; initial JS for home < 200 KB gzip; charts and map lazy-loaded; simulation p95 < 1.5 s for H = 10 with n = 200 Monte Carlo draws |
| Responsiveness | Works at 360 px with no horizontal scroll; Lab levers become a bottom sheet on mobile |
| Security | RLS on every table (checked by `supabase/checks`); service key only in server environments; simulation endpoint rate-limited per IP; CSP headers; no user-controlled redirects |
| Privacy | Minimal profile; profiles private by default; account deletion cascades to user data (audit rows keep only the user id) |
| Reproducibility | Each run stores inputs, seeds, model version, engine git SHA and input hash (model spec §12) |
| i18n | `next-intl`-style message catalogues; locale-aware number formatting; `preferred_language` on the profile |

## 7. Architecture

```
Browser (Next.js app, TypeScript)
 ├─ public pages, Lab UI, map (SVG), charts
 ├─ supabase-js (anon key + user JWT) ──► Supabase: Auth (Google), Postgres + RLS,
 │                                         RPC: join_virtual_market, move_virtual_units,
 │                                         public_allocation_totals
 └─ POST /api/simulate ──► Next.js server route
                            ├─ validate input, compute input_hash
                            ├─ cache lookup / write (service role, server-only)
                            └─ call sim service (shared secret) ──► Python FastAPI + NumPy
                                                                    engine `verdania_sim` 0.1.0
```

- The simulation engine never runs in the browser and never inside Postgres.
- Virtual-capital writes do not pass through Next.js: the database function is the trusted server-side operation (locks, idempotency, constraints).
- Repository layout: `web/` (Next.js), `sim/` (Python), `supabase/` (migrations, seed, checks), `docs/`.

## 8. MVP acceptance criteria (brief §14 + §18) → how they are verified

| # | Criterion | Verified by | Status (2026-10-16) |
|---|---|---|---|
| 1 | Engaging, animated homepage presenting Verdania as a fictional research experiment | Design approval; Playwright smoke test; reduced-motion snapshot | ✅ approved in M1; `web/e2e`: J1 and reduced-motion test |
| 2 | Working JS interactions on the main journeys | Playwright: J1, J2, J4 | ✅ `web/e2e/journeys.spec.ts` |
| 3 | ≥ 3 configurable scenarios (A–D target) | Presets seeded; Lab test switches presets | ✅ A–D seeded; J2 switches to C |
| 4 | Functioning interactive policy experiment | Engine tests + J1/J2 end-to-end | ✅ |
| 5 | Output and distribution side by side | Lab layout test | ✅ J2 checks "Over time" and "Who gains?" |
| 6 | Gini and disposable income computed consistently | Engine tests 1–8 (model spec §10) | ✅ `sim/tests` |
| 7 | Assumptions explained; simulated vs empirical separated | Methodology page; `data_kind` checks | ✅ `/methodology` from the registry (J5); empirical rows counted live |
| 8 | Save and reproduce scenarios | J3 test: reproduce gives identical hash and output | ✅ engine test 7; live engine gives identical fingerprints; production save path checked (rolled back). Sign-in can't be automated, so the UI save is checked by the owner |
| 9 | No real financial transactions | No payment dependencies (CI check); virtual-units copy check | ✅ CI step |
| 10 | Server-validated virtual balances | `supabase/checks/10_rls_and_ledger.sql` | ✅ and the owner's production portfolio balances |
| 11 | Supabase Postgres primary DB; Google sign-in | Deployed configuration; auth e2e | ✅ owner signed in on production |
| 12 | Explore without registering | Anonymous e2e | ✅ every e2e test runs anonymously |
| 13 | RLS + protected server operations | Checks against local and production | ✅ production: RLS on every table, no anonymous write grants, no private rows readable anonymously |
| 14 | Accessible, responsive, motion alternatives | axe-core in CI; manual keyboard and mobile pass | ✅ axe WCAG 2.2 AA and 360 px on 11 pages (every page in the navigation, plus a Lab with changes), mobile drawer, skip link; a full manual screen-reader pass is still worth doing before wider launch |
| 15 | Automated tests for auth, permissions, economics | CI pipeline covering all of the above | ✅ `.github/workflows/ci.yml`, end-to-end steps included |

## 9. Open decisions (owner: project lead)

1. **Hosting — decided 2026-10-16:** AWS, owner's own account, `ap-southeast-2`. Web on **AWS Amplify Hosting** (auto-deploys `main` via `amplify.yml`; Amplify supports Next.js ≤ 15, so `web/` runs Next.js 15). Engine on **AWS Lambda** (python3.12, arm64) behind a Function URL, called only by the website's server with `SIM_API_KEY` (`sim/deploy/`). DNS in Route 53. **Domain decided:** `https://verdania.datamanagementengineer.com`. Supabase Site URL = this domain; redirect allow-list = `http://localhost:3000/auth/callback` and `https://verdania.datamanagementengineer.com/auth/callback`.
2. **Central parameter values** in model spec §8.2, especially the contested ones (`eta_mw`, `psi`, `zeta_own`, `theta_cb`). These need review by an economist before publication.
3. **Google Cloud project** that owns the OAuth client and consent screen (brand: Let's the Data Talk).
4. **Languages** after English, and in what order.
5. **Community forum** moderation model, before it is built (v0.2).
