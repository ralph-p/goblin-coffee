# Goblin Coffee — Roadmap

## Context
Ralph wants a Shopify-style store for his coffee roasting business, plus an admin dashboard to run the roastery. Payments are Interac e-Transfer, confirmed by hand. Shipping uses flat or weight-based rates, with local pickup and delivery as options. There will be optional customer accounts and transactional email. The roadmap also covers subscriptions, discount codes and a blog. Admin tracks green bean lots, roast logs and packaging stock.

Stack: Next.js (full stack, App Router), Netlify, Neon Postgres and AWS S3, with a move to self-hosting later. `RRCoffee/` is an earlier version (Next 16, Drizzle, Neon, Clerk, S3, storefront, admin roasting, blog). The new project is a **fresh repo** that ports useful pieces from it.

## Decisions (from Q&A)
| Area | Choice |
|---|---|
| ORM / DB | Drizzle + Neon Postgres (reuse the RRCoffee pattern) |
| Auth | **Better Auth** (stored in our own DB): guest checkout, optional customer accounts, `admin` role. Replaces Clerk so self-hosting doesn't depend on a hosted auth service |
| Payments | Interac e-Transfer, **manual confirmation** in admin |
| Shipping | Admin-editable flat/weight-based rate table + local pickup/delivery (by postal-code prefix) |
| Email | Resend + React Email |
| Storage | AWS S3 via `@aws-sdk/client-s3` with a configurable `endpoint`, so MinIO/R2 work later |
| UI | Tailwind v4 + shadcn/ui (port RRCoffee's components) |
| Repo | `https://github.com/ralph-p/goblin-coffee` (private), local folder `C:\Users\Ralph\Documents\projects\goblin-coffee` |
| Brand | **Goblin Coffee**: earth tones, with sustainability and a connection to nature as the core message |

## Brand & design direction
- **Palette** (Tailwind v4 `@theme` tokens, light and dark): moss green, bark/espresso brown, clay/terracotta, oat/parchment backgrounds, lichen/sage accents. Check every pairing for WCAG AA contrast.
- **Type:** a warm, slightly organic serif for headings (e.g. Fraunces) and a clean sans for body (e.g. Inter).
- **Texture:** paper/grain backgrounds, hand-drawn botanical or forest line art, rounded organic shapes, and a playful but understated goblin mascot/mark.
- **Sustainability as product features, not just copy:**
  - Each product shows origin/farm story, process, and sourcing info (direct/fair trade, organic). This data comes from `green_lots`/`suppliers`, so it is real, not hard-coded.
  - Packaging info (compostable/recyclable bags) and a **bag-return/refill program** flag on orders. Bag returns are tracked in packaging inventory.
  - Option to choose low-impact fulfillment (pickup/local delivery highlighted, "consolidate shipments" note).
  - A "Roasted on" date on every bag/product and small-batch messaging, both pulled from roast logs.
  - An About/Sustainability page and blog category ("From the Forest Floor"-style journal).

## Portability rules (for the later self-host move)
- `output: "standalone"`. No Netlify-only APIs in app code. Scheduled jobs are plain `POST /api/cron/*` routes protected by `CRON_SECRET`. A Netlify scheduled function calls them now; system cron or a container calls them later.
- DB access goes through a single `lib/db.ts`. Use Neon's serverless driver now; switching to `pg` later is a small change in this one file.
- Email goes through `lib/email/send.ts` and storage through `lib/storage.ts`, so the providers can be swapped.
- All config lives in env vars and is validated with zod in `lib/env.ts`.
- Use Drizzle migrations (`drizzle-kit generate` + `migrate`), not `push`, from day one.

---

## Phase 0 — Base project ✅
1. Create `C:\Users\Ralph\Documents\projects\goblin-coffee`.
2. `pnpm create next-app` with TypeScript, App Router, Tailwind, ESLint and `src/`. Read `node_modules/next/dist/docs/` first: Next 16 has breaking changes (e.g. `proxy.ts` instead of middleware).
3. Add Drizzle, `@neondatabase/serverless`, zod, Better Auth, `@aws-sdk/client-s3`, Resend, React Email and shadcn/ui.
4. Skeleton:
   ```
   src/app/(store)/…        storefront
   src/app/(account)/…      customer account
   src/app/admin/…          dashboard (role-gated)
   src/app/api/cron/…       scheduled job endpoints
   src/db/schema/*.ts       split by domain (catalog, orders, inventory, content, auth)
   src/lib/{env,db,storage,auth,money,email}/
   ```
5. Add `.env.example`, `README.md` (setup + roadmap link), `docs/ROADMAP.md` (this roadmap), `netlify.toml` and a CI workflow (lint + typecheck + build).
6. Add Goblin Coffee theme tokens (earth-tone palette, fonts) in `globals.css` and a placeholder branded landing page.
7. `git init`, first commit, `git remote add origin https://github.com/ralph-p/goblin-coffee.git`, push `main`. If the push needs auth, Ralph runs it via `! git push -u origin main`.

## Status (mocked backends)
Phases 1, 2, 3 and 5 are built against **mocked** services (in-memory repo, local file storage, dev mailbox).
Still to do for those phases: the Drizzle/Neon `Repo`, real S3 and Resend wiring, Better Auth for the admin,
and `"use cache"` + `cacheTag` for catalog reads once data lives in a real DB.

## Phase 1 — Catalog & storefront
- Schema: `products` (origin, process, roast level, tasting notes, slug, status), `variants` (size_g, grind options, price_cents, weight_g for shipping, SKU), `product_images` (S3 key, sort order).
- Admin product CRUD with S3 presigned uploads (port `asset-image-upload` and `product-image-gallery-admin`).
- Storefront: home, shop grid with filters, product page, cart (port `cart-context` and keep the cart in a cookie).

## Phase 2 — Checkout, orders & e-Transfer
- Checkout: contact → fulfillment (ship / pickup / local delivery) → address → review. Guest checkout, or signed in.
- Canadian sales tax: a GST/HST/PST rate table by province, with tax snapshotted on the order.
- `orders` / `order_items` keep price snapshots. Every order gets a human-readable number (e.g. `GC-1042`) that the customer puts in the e-Transfer message.
- Status machine: `awaiting_payment → paid → roasting → packed → shipped | ready_for_pickup → completed`, plus `cancelled`. Each change is logged to `order_events`.
- Order confirmation page and email show the e-Transfer recipient email, exact amount, order number as the message, and a payment deadline.
- Admin: an order list filtered by status, plus **one-click "Mark paid"** (records amount, date and optional bank reference). Admin can also change status and add tracking number/carrier.
- Cron: send payment reminders after X days. Auto-cancel unpaid orders after Y days, which releases stock.
- Rate limiting on checkout (port `rate-limit.ts`) and a honeypot field.

## Phase 3 — Shipping & email
- `shipping_zones` / `shipping_rates` (province or region, weight bands, free-shipping threshold). Local delivery uses a postal-code (FSA) allowlist. Pickup has location and instructions. All of these are editable in admin.
- Printable packing slip.
- React Email templates: order received + payment instructions, payment confirmed, shipped (with tracking), ready for pickup, payment reminder, cancelled.

## Phase 4 — Customer accounts
- Better Auth email/password + magic link. Account pages: order history, saved addresses, profile.
- Guest orders are linked to an account when one is created with the same verified email.
- Admin users carry the role `admin`, and `proxy.ts` plus server-side `requireAdmin()` guard the dashboard.

## Phase 5 — Roastery operations (admin)
- **Green inventory:** `suppliers`, `green_lots` (origin, farm, process, variety, harvest, cost/kg, kg received, kg remaining, arrival date).
- **Roast logs:** `roast_batches` (lot, product, date, green g in, roasted g out, computed weight-loss %, profile/curve notes, charge/drop temps, dev time, cupping score + notes). Saving a batch deducts green stock and adds roasted stock to the product.
- **Roast queue:** paid orders are aggregated into a "what to roast" list by product and grams needed.
- **Packaging stock:** `packaging_items` (bags by size, labels, valves, boxes) with stock + reorder thresholds. A per-variant bill of materials is deducted automatically when an order is packed. Low-stock alerts appear on the dashboard and go out by email.
- Every stock change writes a row to `inventory_movements`, giving an audit trail.

## Phase 6 — Dashboard & reporting
- Home tiles: orders awaiting payment (with total $), paid-not-shipped, the roast queue, low stock.
- Reports: sales by product/month, COGS (green cost/kg ÷ yield + packaging), margin per bag, and roast yield trends. CSV export.

## Phase 7 — Discounts, blog, subscriptions
- **Discount codes:** % / fixed / free shipping, with min subtotal, expiry, usage limits and per-customer limits.
- **Blog / brewing guides:** port the RRCoffee `posts` + editor, using Markdown/MDX and S3 cover images, plus SEO metadata, sitemap and OG images.
- **Subscriptions** (account required): product/variant, cadence (2/4/6 weeks), next date, pause/skip/cancel. A cron job creates a normal `awaiting_payment` order each cycle and emails e-Transfer instructions, so the manual flow stays the same.

## Phase 8 — Hardening & launch
- Error monitoring (Sentry), analytics (Plausible or Umami, both self-hostable), and DB backups (Neon branching + a nightly `pg_dump` to S3).
- Legal pages (privacy, terms, refunds), CASL-compliant email consent, and accessibility + Lighthouse passes.
- Playwright E2E for checkout → mark paid → ship. Vitest for money, tax, shipping and the status machine.

## Phase 9 — Self-hosting (later)
- Dockerfile (standalone output) + docker-compose with app, Postgres and MinIO, behind Caddy/Traefik. A cron container hits `/api/cron/*`.
- Data migration: `pg_dump` from Neon → restore. Sync S3 to MinIO, or keep S3.

---

## Verification
- **Phase 0:** `pnpm dev` serves the starter page. `pnpm lint`, `pnpm typecheck` and `pnpm build` pass. `drizzle-kit generate` runs against Neon. `git remote -v` shows the private repo and the first commit is on GitHub.
- **Every phase after that:** a Netlify deploy preview per PR. Phase 2 and later also need an E2E run of the full order lifecycle against a Neon branch DB.

## Accounts & keys needed
Neon connection string, AWS S3 bucket + IAM keys, Resend API key (verified domain), and the e-Transfer recipient email. See `.env.example`.
