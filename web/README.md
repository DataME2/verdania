# Verdania web

Next.js 16 (App Router, Cache Components, `proxy.ts`), TypeScript, Tailwind 4, Motion, Supabase Auth (Google).

```bash
cp .env.example .env.local   # fill in the publishable key
npm install
npm run dev                  # http://localhost:3000
npm run lint && npm test && npm run build
```

- `proxy.ts` refreshes the Supabase session on every request and redirects anonymous visitors away from private pages. Pages and Server Functions re-check the session themselves.
- `app/auth/actions.ts` starts Google sign-in, using `SITE_URL` as the fixed return origin. `app/auth/callback/route.ts` exchanges the one-time code. `lib/safe-next.ts` only allows same-site paths after sign-in.
- `lib/data.ts` reads published reference data with no session (`use cache`). Pages show "—" rather than invented figures when data is missing.
- All UI copy lives in `lib/messages.ts`.

This version of Next.js has breaking changes from older ones. Read `node_modules/next/dist/docs/` before changing conventions (see `AGENTS.md`).
