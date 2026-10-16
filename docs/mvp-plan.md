# Verdania — MVP Delivery Plan

Each milestone ends with a check that can be run or observed. **You** = actions only the project owner can take (accounts, credentials, approvals).

| M | Milestone | Deliverables | Done when | You |
|---|---|---|---|---|
| **M0** | Foundations ✅ 2026-10-16 | Design system (`.superdesign/design-system.md`); Home, Discover and Lab drafts on the canvas; model spec; PRD; core schema migration + RLS/ledger checks | `node supabase/checks/run.mjs` → `ALL CHECKS PASSED` | — |
| **M1** | Design approval | Iterate the Home / Discover / Lab drafts; flow pages for Market, Justice, Methodology if wanted | You approve a direction for each page | Review the canvas, give feedback |
| **M2** | Supabase live | Migration applied to project `iugiqzxmftspqspchgil`; `seed.sql` (country, 6 regions, sectors, model 0.1.0, parameter registry, presets A–D + baseline, one project per category, generator output); checks re-run against a Supabase branch | Checks pass on the branch; anon key can read only published rows | Authenticate the Supabase MCP (`/mcp`) |
| **M3** | Web shell + Google sign-in | `web/` Next.js + TypeScript + Tailwind + Framer Motion; header/nav/footer from the approved design; `/auth/callback`; sign in/out; profile; protected `/account`; message catalogues | e2e: anonymous browsing works; sign-in round trip on preview; `next` param rejects external URLs | Create the Google OAuth client; paste client ID/secret into Supabase Auth; approve redirect URLs |
| **M4** | Engine v0.1 | `sim/` Python package `verdania_sim`: population generator, calibration, model, Monte Carlo, sensitivity; FastAPI `POST /v1/simulate`, `GET /v1/parameters` | Model-spec tests 1–8 pass; baseline is stationary; same inputs give the same bytes; p95 < 1.5 s at H = 10, n = 200 | Sign off central parameter values (PRD §9.2) |
| **M5** | Working experiments | `/api/simulate` (validation, hash, cache, rate limit); homepage mini-experiment and Lab Challenge 1 wired to real results; mechanisms text; uncertainty bands; data tables; reduced-motion mode | e2e J1 + J2 against the live engine; no number appears before the engine returns it | — |
| **M6** | Virtual market + saved scenarios | Market page and project cards; allocation UI via `move_virtual_units` with request ids; public totals; save / publish / reproduce scenarios | e2e J3 + J4; double-click and retry never double-allocate; reproduce gives identical output | — |
| **M7** | Publish | Methodology page from `simulation_parameters` + `model_versions`; deploy web + sim; production env vars; security pass (RLS checks on prod, no service key in client bundle, CSP); axe + mobile pass | Acceptance table in PRD §8 all green; public URL live | Choose hosting (PRD §9.1); domain DNS |

## Order of work inside each milestone

1. Write the failing check first: the accounting identity, the RLS case, or the e2e step.
2. Build the smallest thing that passes it.
3. Ship behind the real data path. No mocked numbers in production UI.

## Risks

| Risk | Mitigation |
|---|---|
| Contested parameter choices read as political bias | Ranges that cross zero; evidence labels; "Challenge this result"; external review before launch |
| Simulation cost under traffic | Cache by input hash (identical inputs are free); debounce; per-IP rate limit; scale-to-zero container |
| Allocation manipulation (bots, multiple accounts) | One portfolio per Google account; idempotent RPC; public totals hidden under 5 participants; add Turnstile if abuse appears |
| Users reading outputs as forecasts | Badges beside every result; methodology one click away; copy review in M7 |
| Scope creep from the full brief | v0.2 items are visible in the UI as "coming next", not half-built |
