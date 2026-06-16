# 🛒 BDShop

A bilingual (English / বাংলা) **online grocery store** for the Bangladesh market — built as a modern, full-stack e-commerce app. Browse a Chaldal-style category tree, add pack-size variants to a slide-in cart, and check out with Cash on Delivery.

> **Note on the stack:** this project runs on a customized **Next.js 16** where some conventions differ from upstream (e.g. middleware is renamed to **Proxy**). See `AGENTS.md` and the bundled docs in `node_modules/next/dist/docs/` before changing framework-level code.

---

## ✨ Features

- **Storefront** — hero, category groups, deals & popular rails, product detail with image gallery
- **Category tree** — parent → subcategory navigation via a desktop left sidebar and a mobile slide-in drawer
- **Search & filtering** — full-text (EN/BN) search with category, price-range, in-stock filters, sorting, and pagination
- **Pack-size variants** — e.g. Rice 1kg / 5kg / 25kg; cards show "From ৳X", detail page has a variant selector with per-variant price & stock
- **Cart** — guest (cookie) + user carts that merge on login; floating right-side mini-cart drawer
- **Checkout** — Bangladesh address form, **Cash on Delivery**, coupon codes, atomic stock decrement, order confirmation
- **Reviews & ratings** — purchase-gated customer reviews
- **Auth** — phone **OTP**, **Google** OAuth, and email/password for admin
- **Admin panel** — dashboard, product CRUD (incl. inventory), and order management
- **i18n** — English & Bangla, locale stored in a cookie (no URL prefix)
- **Money** — stored as integer **poisha** (1 BDT = 100) to avoid floating-point errors

---

## 🧱 Tech stack

| Area | Choice |
|------|--------|
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Language | TypeScript |
| Database | PostgreSQL 16 + Prisma 7 (pg driver adapter) |
| Styling | Tailwind CSS 4 + shadcn/ui, Inter font |
| i18n | next-intl 4 (cookie-based, no routing) |
| Auth | Custom `jose` JWT sessions + `arctic` (Google OAuth); scrypt password/OTP hashing |
| Notifications | Sonner (toasts) |

---

## 🚀 Getting started

### Prerequisites
- Node.js 20+
- Docker (for the Postgres container)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Then set at least:
- `AUTH_SECRET` — sign the session JWT: `openssl rand -base64 32`
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — optional; needed only for Google login. Authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
- `SMS_API_*` — optional; without it, OTP codes are printed to the **server console** in dev

`DATABASE_URL` already points at the Docker Postgres (`postgresql://bdshop:bdshop@localhost:5432/bdshop`).

### 3. Start the database & seed it
```bash
npm run db:up        # start Postgres (Docker)
npm run db:migrate   # apply migrations
npm run db:seed      # load the grocery catalog (58 products, 19 categories)
```

### 4. Run the app
```bash
npm run dev          # http://localhost:3000
```

**Dev admin login:** `admin@bdshop.test` / `ChangeMe123!` → visit `/admin/login`.

---

## 📜 Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run db:up` | Start the Postgres container |
| `npm run db:migrate` | Apply Prisma migrations (dev) |
| `npm run db:seed` | Seed the catalog, admin user, and coupons |
| `npm run db:studio` | Open Prisma Studio (DB GUI) |
| `npm run db:reset` | Drop, re-migrate, and reseed the dev DB |

---

## 🗂️ Project structure

```
prisma/
  schema.prisma         # data model (users, catalog, cart, orders, ...)
  seed.ts               # grocery catalog + admin + coupons
src/
  app/                  # routes (App Router) — storefront, /cart, /checkout,
                        #   /search, /orders, /admin/(panel)/*, /api/auth/google
  components/           # ui/ (shadcn), product/, cart/, category/, search/, layout/, admin/
  lib/                  # db, session, dal, cart, money, phone, *-actions (server actions)
  i18n/                 # next-intl config (cookie-based locale)
  generated/prisma/     # generated Prisma client
messages/               # en.json, bn.json
src/proxy.ts            # Next 16 "Proxy" (admin route gate)
```

### Conventions worth knowing
- **Money** is integer **poisha** everywhere; format with `formatBDT()` (`src/lib/money.ts`).
- **Locale** lives in the `NEXT_LOCALE` cookie (read server-side in `src/i18n/request.ts`); use plain `next/link` + `next/navigation` — there is no `[locale]` URL segment.
- **Auth** is a custom layer (not NextAuth): stateless `jose` sessions in an httpOnly cookie; `requireUser()` / `requireAdmin()` in `src/lib/dal.ts`; `/admin` gated optimistically in `src/proxy.ts` and enforced in the admin layout.
- **Server Actions** under `src/lib/*-actions.ts` handle all mutations.

---

## 💳 Payments & shipping

Checkout currently supports **Cash on Delivery**. Online payment (**SSLCommerz** — bKash/Nagad/cards) and courier integration (**Steadfast**) are scaffolded in the env/schema but not yet implemented.

---

## 🌐 Bilingual

Toggle English / বাংলা from the header. All catalog data carries `nameEn`/`nameBn` (and descriptions), and UI strings live in `messages/{en,bn}.json`.
