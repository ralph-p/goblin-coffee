# Goblin Coffee

Storefront and roastery admin for Goblin Coffee, a small-batch roaster built around sustainability and a connection with nature.

- **Store:** catalog, cart, checkout paid by Interac e-Transfer (confirmed manually), shipping or local pickup/delivery, optional customer accounts.
- **Admin:** orders, green bean lots, roast logs, packaging stock, reporting.

See **[docs/ROADMAP.md](docs/ROADMAP.md)** for the full phased plan.

## Stack

Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind v4 + shadcn/ui · Drizzle ORM + Neon Postgres · Better Auth · AWS S3 · Resend + React Email · Netlify (self-hosting planned).

## Getting started

No accounts or env vars are needed. Neon, S3 and email are mocked locally:

```bash
pnpm install
pnpm dev                     # http://localhost:3000 (store) and /admin (roastery)
```

| Service | Local default | Real driver (later) |
|---|---|---|
| Database | `DATA_DRIVER=memory`: in-memory repo, seeded with sample data and snapshotted to `.data/dev-db.json` | `neon` (Drizzle; not built yet) |
| File storage | `STORAGE_DRIVER=local`: `.data/uploads`, served from `/api/files/*` | `s3` (AWS S3, or MinIO/R2 via `S3_ENDPOINT`) |
| Email | `EMAIL_DRIVER=dev`: saved to **/admin/dev/mailbox** | `resend` |

`pnpm dev:reset` wipes `.data/` back to the seed data.

| Script | Purpose |
|---|---|
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm lint` / `typecheck` / `test` | Checks (all run in CI) |
| `pnpm dev:reset` | Reset local mock data |
| `pnpm db:generate` / `db:migrate` / `db:studio` | Drizzle, for the future Neon repo |

## Layout

```
src/domain/            pure business rules: types, pricing, tax, order state machine, roasting math
src/server/repo/       Repo interface + in-memory implementation (+ seed data)
src/server/services/   workflows: catalog, cart, checkout, orders, roasting, inventory, jobs
src/server/adapters/   storage (local/S3) and mailer (dev outbox/Resend)
src/emails/            React Email templates
src/app/(store)/       storefront: shop, product, cart, checkout, order status
src/app/admin/         roastery: dashboard, orders, roasting, products, inventory, settings, dev mailbox
src/app/api/cron/      scheduled jobs (POST with Bearer CRON_SECRET)
```

Pages and server actions call **services**; services only talk to the `Repo` and `Mailer` interfaces they're
handed (`Ctx`). Tests use the same services against a fresh seeded memory repo and a fake clock.

## Core workflows

- **Checkout:** cart (cookie) → contact + pickup/local delivery/shipping → order `GC-####` created `awaiting_payment`
  → email with e-Transfer instructions (amount, recipient, order number as the message).
- **Payment:** admin records the e-Transfer with **Mark paid**. Reminder and auto-cancel jobs handle stragglers.
- **Roasting (hybrid stock):** paid orders draw on roasted stock. The **roast queue** shows each shortfall and a
  suggested green weight. **Logging a batch** moves green coffee to the roasted shelf.
- **Packing:** requires enough roasted coffee, then deducts it plus each size's packaging bill of materials.
  Every change is written to stock history.
- **Delivery:** ship (with tracking), out for local delivery, or ready for pickup. Each emails the customer.
  Bag returns are tracked for the sustainability stats.

## Portability

The app is kept host-agnostic so it can move off Netlify later:

- Data access goes only through the `Repo` interface (`src/server/repo/`).
- Storage goes through `src/server/adapters/storage.ts` (set `S3_ENDPOINT` to use MinIO/R2).
- Email goes through the `Mailer` interface (`src/server/adapters/mailer.ts`).
- Cron jobs are plain HTTP routes.
- `NEXT_OUTPUT=standalone pnpm build` produces a Docker-ready server.
