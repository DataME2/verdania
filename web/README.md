# Verdania web

Next.js 15 (App Router, `middleware.ts`), TypeScript, Tailwind 4, Motion, Supabase Auth (Google). Hosted on AWS Amplify, which supports Next.js up to 15.

```bash
cp .env.example .env.local   # fill in the publishable key and the engine settings
npm install
npm run dev                  # http://localhost:3000
npm run lint && npm test && npm run build
```

- `middleware.ts` refreshes the Supabase session on every request and redirects anonymous visitors away from private pages. Pages and Server Functions re-check the session themselves.
- `app/auth/actions.ts` starts Google sign-in, using `SITE_URL` as the fixed return origin. `app/auth/callback/route.ts` exchanges the one-time code. `lib/safe-next.ts` only allows same-site paths after sign-in.
- `lib/data.ts` reads published reference data with no session (`unstable_cache`). Pages show "—" rather than invented figures when data is missing.
- `app/api/simulate/route.ts` is the only door to the simulation engine. It checks request shape, rate-limits, and adds the server-only `SIM_API_KEY`. Results are cached per input (`lib/sim.ts`).
- All UI copy lives in `lib/messages.ts`.
