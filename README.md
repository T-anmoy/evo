# Evo Meals Demo System

A real, working multi-page demo of the redesigned Evo Meals school meal platform.
This is not a mockup: real login sessions backed by
a real SQLite database, a real booking engine that always calculates a
correct total, a real wallet with transaction history, real Civil ID
masking, CSRF protection, rate-limited login, and structured logging.

## Run it (takes about a minute)

```bash
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

No database server to install — [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
runs an on-disk SQLite file (`evo360.db`), created and migrated automatically
on first run. This runs identically on Windows, Mac, and Linux.

A `.env` file with a locally-generated `SESSION_SECRET` is included so this
works with zero setup. **Generate a new secret before deploying anywhere
shared** — see `.env.example`.

## Demo login

```
Civil ID:  111111111111
Password:  demo1234
```

This account comes pre-loaded with two children (Ahmed at Kuwait English
School, Sara at American Creativity Academy), a wallet balance, and booking
history — so the dashboard looks alive the moment you log in. You can also
register a brand new account from the homepage to see the empty-state flows.

## What's actually fixed here, vs. the live evo360.tech system

Every one of these was a real finding from the audit of the live site and app:

| Issue found in the live system | How this demo fixes it |
|---|---|
| Booking always showed KWD 0.00 — no menu periods configured | `/booking` computes a real total from an actual selected plan every time — try it, it always works |
| Civil ID numbers shown in plain text | Masked everywhere (`lib/mask.js` → `maskCivilId`), only last 4 digits shown |
| No wallet or balance visibility anywhere | Full `/wallet` page — balance, top-up, transaction history |
| No cancellation/refund policy or mechanism | `/history` — cancel any upcoming booking, wallet is refunded automatically |
| Blank pages with no "empty state" messaging | Every list view has a real empty-state message |
| Menu tabs existed but were never populated | `/menu` — real dish names, real nutrition data, allergen badges |
| No meal-collection status visible to parents | Dashboard shows "Collected at 12:14 PM" the moment a meal is picked up |
| Staff section existed in the app but was undocumented | `/staff` — a working staff booking flow |

## Project structure

```
server.js         — all routes (auth, booking, wallet, students, etc.)
db.js             — SQLite data layer (better-sqlite3); one function per query
db/migrate.js     — applies migrations/*.sql in order, tracked in schema_migrations
migrations/       — numbered SQL schema files — never hand-edit the schema
lib/pricing.js    — pure booking-total calculation (unit tested, no DB)
lib/mask.js       — Civil ID display masking (unit tested)
seed.json         — starting demo data (parent, students, menu, plan pricing)
evo360.db         — SQLite database file, created on first run — gitignored
tests/            — node:test suite (pricing, masking, and a real HTTP
                    integration test that boots the app end-to-end)
views/            — EJS templates, one per page
public/css        — shared stylesheet (same brand system as the marketing demo)
```

## Running tests

```bash
npm test
```

Covers the booking total calculation (single-day vs. monthly, insufficient
balance rejection, and the exact KWD 0.00 regression this project fixed), the
Civil ID masking helper, and an integration test that logs in as the seeded
demo parent and asserts no route ever renders a raw Civil ID.

## The data layer

`db.js` is backed by real SQLite via `better-sqlite3` — safe for concurrent
writers, with `bookAndCharge` (create booking + debit wallet) and
`cancelAndRefund` (cancel booking + credit wallet) each wrapped in a single
database transaction, so a crash mid-request can never leave a charge with
no booking or vice versa. Schema changes go through numbered files in
`migrations/`, applied automatically on startup (or manually via
`npm run migrate`) — never hand-edit `evo360.db`'s schema directly.

Plan pricing (single-day rate, monthly flat rate) lives in the `plans`
table, seeded from `seed.json` — not hardcoded in route logic — so prices
can change without a code deploy.

## Payment gateway

`/wallet/topup` still simulates the KNET charge — real KNET/Bookey
integration is gated on sandbox credentials (see `KNET_MERCHANT_ID` /
`KNET_API_KEY` in `.env.example`). The route and response shape are already
stable; `processTopUp()` in `server.js` is the only place that needs to
change once credentials are issued.

## Security

- Session secret loaded from `SESSION_SECRET` (env), not hardcoded.
- `/login` is rate-limited (10 attempts / 15 min / IP).
- Every POST form carries a CSRF token (`csrf-sync`, synchronizer token
  pattern — the right fit for a session-based app like this one).
- `helmet` sets standard security headers on every response.
- Civil ID is masked everywhere it's displayed, including in the student
  edit form — the raw value is never sent to the browser for an existing
  student, matching the read-only pattern already used on `/profile`.

## Resetting the demo data

If the data gets messy after a demo session, stop the server, delete the
database file, and restart — it will regenerate fresh from `seed.json`
automatically.

```bash
rm evo360.db evo360.db-wal evo360.db-shm
npm start
```
# evo
