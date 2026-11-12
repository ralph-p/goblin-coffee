# Goblin Coffee

Storefront and roastery admin for Goblin Coffee, a small-batch roaster built around sustainability and a connection with nature.

- **Store:** catalog, cart, checkout paid by Interac e-Transfer (confirmed manually), shipping or local pickup/delivery, optional customer accounts.
- **Admin:** orders, green bean lots, roast logs, packaging stock, reporting.

See **[docs/ROADMAP.md](docs/ROADMAP.md)** for the full phased plan.

## Stack

Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind v4 + shadcn/ui · Drizzle ORM + Neon Postgres · Better Auth · AWS S3 · Resend + React Email · Netlify (self-hosting planned).

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in values
pnpm dev                     # http://localhost:3000
```

| Script | Purpose |
|---|---|
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm lint` / `typecheck` | Checks (also run in CI) |
| `pnpm db:generate` | Generate SQL migrations from `src/db/schema` |
| `pnpm db:migrate` | Apply migrations to `DATABASE_URL` |
| `pnpm db:studio` | Browse the database |

## Layout

```
src/app/(store)/       storefront
src/app/(account)/     customer account
src/app/admin/         roastery dashboard
src/app/api/cron/      scheduled jobs (POST with Bearer CRON_SECRET)
src/db/                Drizzle client + schema (one file per domain)
src/lib/               env, storage (S3), email, money helpers
```

## Portability

The app is kept host-agnostic so it can move off Netlify later:

- DB access goes only through `src/db/index.ts`.
- Storage goes through `src/lib/storage.ts` (set `S3_ENDPOINT` to use MinIO/R2).
- Email goes through `src/lib/email/send.ts`.
- Cron jobs are plain HTTP routes.
- `NEXT_OUTPUT=standalone pnpm build` produces a Docker-ready server.
