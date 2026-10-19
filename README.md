# Flowly

A Trello-class project board built with **Next.js + TypeScript**, with extra delivery tools for portfolio demos on Upwork.

## Why Flowly (beyond basic kanban)

- Boards, lists, cards with drag-and-drop
- Workspaces, members, labels, comments, checklists
- Priority, due dates, estimate / logged hours
- **Smart Inbox** — overdue, due soon, unassigned, high-impact
- **Calendar view** for due dates
- **Delivery analytics** — completion, priority mix, time tracking
- Activity feed + in-app notifications
- Demo seed data for client walkthroughs

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Live demo (Vercel)

Deploy to Vercel and share the `*.vercel.app` URL with clients — **localhost only works on your PC**.

On Vercel the app uses an in-memory demo database (resets on cold starts). Locally it uses SQLite in `data/flowly.db`.

### Demo login

- Email: `demo@flowly.app`
- Password: `demo1234`

### Stripe billing (Flowly Pro)

1. Copy `.env.example` → `.env.local` (or fill the Stripe vars already there).
2. Add `STRIPE_SECRET_KEY` from [Stripe test API keys](https://dashboard.stripe.com/test/apikeys).
3. Optional: create a Product ($12/mo) and set `STRIPE_PRICE_ID`. If omitted, Checkout uses inline `$12/mo` price data.
4. Forward webhooks locally:

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

Paste the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET`, restart `npm run dev`.

5. In the app: **Account → Unlock Pro** opens Stripe Checkout. After pay, plan becomes `pro`. **Manage billing** opens the Stripe Customer Portal (cancel / update card).

Use Stripe test cards (e.g. `4242 4242 4242 4242`).

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- NextAuth (credentials)
- `@dnd-kit` for drag-and-drop
- **SQLite + Drizzle ORM** (`data/flowly.db`) — real SQL storage for users, boards, cards, automations (auto-seeded on first run; legacy `data/db.json` is imported once if present)
- **Stripe** — Checkout + Customer Portal + webhooks for Flowly Pro subscriptions

## Scripts

- `npm run dev` — local development
- `npm run build` — production build
- `npm run start` — start production server
- `npm run db:studio` — open Drizzle Studio for the SQLite DB
- `npm run db:reset` — wipe SQLite + reseed on next boot

## Upwork tip

Share the live demo URL + this repo. Walk clients through: Landing → Demo login → Board drag-and-drop → Smart Inbox → Analytics.
