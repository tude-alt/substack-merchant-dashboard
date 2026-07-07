# AGENTS.md

## Cursor Cloud specific instructions

This is a Next.js 16 (App Router, Turbopack) merchant dashboard using `better-auth`
for email/password auth and `drizzle-orm` over PostgreSQL. There is a single product/service.

### Services and how to run them

- Dev server: `pnpm dev` (serves http://localhost:3000). Standard scripts live in `package.json`.
- PostgreSQL is required. Start it after a fresh VM boot with:
  `sudo pg_ctlcluster 16 main start`
  Local dev DB is `merchant_dashboard`, user/password `postgres`/`postgres` on port 5432.

### Environment variables

`.env.local` (gitignored) is already configured for local dev with `DATABASE_URL`,
`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=http://localhost:3000`, and
`NEXT_PUBLIC_APP_URL=http://localhost:3000`. Recreate it if missing (see `README.md`
for the variable list). Auth cookies are `Secure; SameSite=None` even in dev; this
works on `http://localhost` because browsers treat localhost as a secure context.

### Database schema (non-obvious)

There is NO migration tooling in this repo: `drizzle-kit` is not installed, there are no
migration files, and `better-auth` uses the raw `pg` Pool (it does NOT auto-create tables).
The tables must be created manually to match `lib/db/schema.ts` (the better-auth tables
`user`/`session`/`account`/`verification` use quoted camelCase columns). If `lib/db/schema.ts`
changes, update the DB by hand. On this VM the tables already exist in `merchant_dashboard`.

### Lint (non-obvious)

`pnpm lint` currently fails: the script runs `eslint .` but `eslint` is not a dependency and
there is no eslint config in the repo. Treat lint as unavailable unless the repo adds eslint.

### Testing

There is no automated test suite. Verify changes manually via the dev server: sign up at
`/signup`, complete onboarding, and exercise the dashboard (plans, subscribers, transactions).
