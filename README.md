# Verdania

*Can an economy serve humanity?* A public economic-simulation lab about a fictional, agriculture-led country of 2,000,000 synthetic citizens. A project of **Let's the Data Talk**.

From Latin *viridis* (green), evoking agriculture, growth and prosperity.

> All people and data are synthetic. All capital is virtual: nothing here can hold, move or redeem real money. Simulated results are model outputs, not forecasts.

## Repository

| Path | What |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | Product requirements, non-negotiables, acceptance criteria |
| [`docs/economic-model.md`](docs/economic-model.md) | Model v0.1 specification: equations, parameters, tests |
| [`docs/mvp-plan.md`](docs/mvp-plan.md) | Delivery milestones M0–M7 |
| [`.superdesign/`](.superdesign/) | Design system and Superdesign draft references |
| [`web/`](web/) | Next.js website: home, Google sign-in, account (see [`web/README.md`](web/README.md)) |
| [`sim/`](sim/) | `verdania-sim`: Python engine + FastAPI service |
| [`supabase/`](supabase/) | Migrations (schema + engine-generated reference data), RLS / ledger checks. Migrations deploy to production on merge to `main`. |

## Run the checks

```bash
# engine: accounting identities, calibration, determinism, API (Python 3.11+, uv)
cd sim && uv run pytest

# database: all migrations (schema + reference data) + RLS + virtual ledger, on in-memory Postgres (no Docker)
npm i -D @electric-sql/pglite && node supabase/checks/run.mjs

# website: lint, redirect-safety test, production build
cd web && npm run lint && npm test && npm run build

# regenerate the reference-data migration from the engine (only before it is deployed;
# a new model version gets a new migration)
cd sim && uv run python -m verdania_sim.seed
```

Run the engine locally: `cd sim && SIM_DEV=1 uv run uvicorn verdania_sim.api:app --reload`. In any shared environment, set `SIM_API_KEY` instead.

## License

MIT
