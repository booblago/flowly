# Flowly

A Trello-class delivery board built with **Next.js + TypeScript** — kanban plus inbox, automations, SLA, analytics, and Stripe billing. Live product URL included (not localhost-only).

## Live demo

- **App:** [https://flowly-bice.vercel.app](https://flowly-bice.vercel.app)
- **Repo:** [https://github.com/booblago/flowly](https://github.com/booblago/flowly)

### Demo login

| | |
|---|---|
| Email | `demo@flowly.app` |
| Password | `demo1234` |

Or open **Demo board** from the landing / login page — no signup needed.

## Why Flowly (beyond basic kanban)

- Boards, lists, cards with drag-and-drop (`@dnd-kit`)
- Workspaces, labels, comments, checklists
- Priority, due dates, estimate / logged hours, WIP limits, SLA timers
- **Smart Inbox** — overdue, due soon, unassigned, high-impact, SLA risk
- **Calendar view** for due dates
- **Automations** — rules with triggers, actions, Pro conditions / multi-action
- **Delivery analytics** — completion, priority mix, automation runs, SLA
- Activity feed + in-app notifications
- Recurring cards + client share reports (Pro)
- Free / Pro plans with Stripe Checkout + Customer Portal
- Multilingual UI (EN / UK / DE / FR), legal + support pages
- Seeded demo board for a quick product walkthrough

## Database (real persistence)

Flowly is **not** a fake front-end mock.

| Environment | Storage | Notes |
|---|---|---|
| **Production (Vercel)** | **Upstash Redis** | Shared durable DB across serverless instances. Users, boards, cards, automations survive deploys and cold starts. |
| **Local (`npm run dev`)** | **SQLite + Drizzle ORM** (`data/flowly.db`) | Same app schema; auto-created and seeded on first run. |

Schema covers users (auth + plans + Stripe ids), workspaces, boards, lists, cards, activities, notifications, and automation rules.

Copy `.env.example` → `.env.local`. For production Redis, set:

```bash
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

Without Redis on Vercel the app falls back to ephemeral runtime cache (not recommended).

## Quick start (local)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Localhost only works on your machine — use the **live demo URL** to share the product.

### Stripe billing (Flowly Pro)

1. Add `STRIPE_SECRET_KEY` from [Stripe test API keys](https://dashboard.stripe.com/test/apikeys).
2. Optional: create a Product ($12/mo) and set `STRIPE_PRICE_ID`. If omitted, Checkout uses inline `$12/mo` price data.
3. Forward webhooks locally:

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

Paste the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET`, restart `npm run dev`.

4. In the app: **Account → Unlock Pro** → Stripe Checkout. **Manage billing** → Customer Portal.

Use Stripe test cards (e.g. `4242 4242 4242 4242`).

## Stack

- **Next.js** App Router + **TypeScript** + **Tailwind CSS**
- **NextAuth** (credentials) + bcrypt password hashes
- **`@dnd-kit`** drag-and-drop
- **SQLite + Drizzle ORM** locally · **Upstash Redis** in production
- **Stripe** — Checkout, Customer Portal, webhooks (Free / Pro)
- Optional **Resend** for email verification (`RESEND_API_KEY`)

## Scripts

- `npm run dev` — local development
- `npm run build` — production build
- `npm run start` — start production server
- `npm run db:studio` — open Drizzle Studio (local SQLite)
- `npm run db:reset` — wipe local SQLite + reseed on next boot

## Product walkthrough

Suggested path on the live demo:

1. Landing → one-click **Demo board**
2. Drag cards, set priority, open a card (checklist / comments)
3. **Smart Inbox** → **Analytics** → **Automations**
4. (Optional) Register → Account → Stripe test checkout for Pro
