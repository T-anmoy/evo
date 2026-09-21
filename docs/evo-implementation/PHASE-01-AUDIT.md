# Phase 01 — Forensic Audit & Safe System Cleanup (2026-09-22 revisit)

Status: **complete** (audit + safe cleanup only — no redesign, no business-logic changes).

This supersedes the numbers in the original version of this file (baseline SHA
`1d76a67`, 1,473-line stylesheet). The codebase has grown substantially since
then — full i18n (English/Arabic, `lib/i18n.js` + `locales/*.json`), migration
005, and further visual-refinement passes — so this pass re-audits the system
as it exists today rather than assuming the old numbers still hold. The prior
content (route contract, claim audit, design-system inventory, IA map) is
still broadly accurate and is not repeated in full here; only what changed or
was newly found is recorded below.

- **Starting SHA:** `a275102d68e7e0edadc27d6ab4e22112d688574e` (branch `main`, clean, up to date with `origin/main`)
- **Baseline test status:** `npm test` → 21/21 passing, 3 suites (`pricing.test.js`, `mask.test.js`, `civil-id-masking.test.js`)
- **Test status after cleanup:** 21/21 passing (unchanged — no test added/modified, no business logic touched)

---

## A. Current architecture (unchanged shape, updated inventory)

Node.js (CommonJS) + Express 4 + EJS + better-sqlite3 (WAL mode). No build
step; `public/css/style.css` and `public/js/*.js` served as-is.

| Area | Location | Note |
|---|---|---|
| Entrypoint | [server.js](../../server.js) (1,025 lines) | all routes/middleware in one file |
| Data layer | [db.js](../../db.js) | one function per query, two atomic transactions |
| Migrations | [migrations/001–005](../../migrations) | idempotent, tracked in `schema_migrations` |
| Business logic | [lib/pricing.js](../../lib/pricing.js), [lib/mask.js](../../lib/mask.js), [lib/validate.js](../../lib/validate.js), [lib/i18n.js](../../lib/i18n.js) | all required from `server.js`, all live |
| i18n | [lib/i18n.js](../../lib/i18n.js) + [locales/en.json](../../locales/en.json) / [locales/ar.json](../../locales/ar.json) | 817 keys each, **fully in sync** (0 missing/extra either direction) — added since the original Phase 1 pass |
| Views | [views/*.ejs](../../views) (24 pages) + [views/partials/*.ejs](../../views/partials) (10 partials) | |
| Static assets | [public/css/style.css](../../public/css/style.css) (2,031 lines before this pass → **1,905 after**), [public/js/motion.js](../../public/js/motion.js), [nav.js](../../public/js/nav.js), [notifications.js](../../public/js/notifications.js) | all three JS files confirmed `<script src>`-loaded from `partials/head.ejs`/`appnav.ejs`/`sitenav.ejs` |
| Seed data | [seed.json](../../seed.json) | loaded once if `parents` table empty |
| Tests | [tests/*.test.js](../../tests) (3 files, 21 cases) | all reference live code paths |

**Dependencies** ([package.json](../../package.json)): all 12 runtime deps
(`bcryptjs`, `better-sqlite3`, `compression`, `csrf-sync`, `dotenv`, `ejs`,
`express`, `express-rate-limit`, `express-session`, `helmet`, `pino`,
`pino-http`) confirmed required somewhere in the codebase — **none unused**.

---

## B. Routes — confirmed live (spot-checked against server.js, not re-transcribed in full)

Public: `/`, `/ar`, `/schools` (+`/ar`), `/parents`, `/caterers`, `/how-it-works`,
`/features`, `/about`, `/privacy`, `/terms`, `/contact`, `/sitemap.xml`,
`/robots.txt`, `/login`, `/forgot-password`, `/register`,
`/school-admin/login`.

Authenticated (parent): `/dashboard`, `/students`, `/menu`, `/booking`,
`/history`, `/profile`, `/staff`, plus POST actions for notifications,
booking renewal/cancel.

Authenticated (school admin): `/school-admin/dashboard`.

All routes above were grepped directly from `server.js` (`app.get`/`app.post`)
— see the `app\.` route list captured during this audit. No route was
assumed from documentation. Route architecture was **not** changed in this
pass.

---

## C. Git / worktree audit

Found one stray worktree: `.claude/worktrees/evo-meals-platform-reposition-6abe5d`.

- Detached HEAD, clean working tree (`nothing to commit`).
- Its `package.json` description read *"redesigned Evo360 school meal
  system... real wallet"* and its `migrations/` only contained `001_init.sql`
  — i.e. it predates migration 002 (menu nutrition columns) and migration
  004 (wallet removal). It is a stale pre-wallet-removal snapshot, not
  in-progress work.
- **Removed** via `git worktree remove` (proper Git mechanism, not manual
  deletion of `.git` metadata). Confirmed via `git worktree list` afterward
  — only the main worktree remains.

No other worktrees, no stale branches beyond `main`, nothing else prunable.

---

## D. Asset audit

- `public/images/menu/*.png` + `*.webp` (5 dishes) — all 5 confirmed referenced
  by exact name match in `server.js`'s `DISH_IMAGE_SLUGS` map, rendered via
  `views/partials/dish-image.ejs`'s `<picture>` (webp source + png fallback).
  **Keep both formats** — intentional fallback pair, not duplicates.
- `public/images/hero-desktop.{png,webp}` + `hero-mobile.{png,webp}` — all 4
  referenced in `views/home.ejs` (`<picture>`/`srcset` responsive pair) and
  `views/partials/head.ejs` (preload hint). **Keep.**
- `public/.DS_Store`, `public/images/.DS_Store` — accidental macOS artifacts,
  already gitignored (`.gitignore` has `.DS_Store`), never tracked by Git.
  **Removed locally** (no git change — they were never committed).

No genuinely orphaned or duplicate-but-unintentional assets found.

---

## E. CSS forensic audit — the main finding of this pass

`public/css/style.css` was traced selector-by-selector against every
`views/*.ejs`, `views/partials/*.ejs`, and `public/js/*.js` file (including a
check for server-side dynamic class construction, e.g.
`class="notif-icon notif-icon-<%= n.type %>"` in `dashboard.ejs`/`appnav.ejs`,
which is real and was **kept**, not flagged as dead).

**Removed — confirmed zero references anywhere in views/JS/server (verified
independently, not just via the tracing pass):**

- Legacy marketing-section classes replaced by newer components, in full:
  `.section-tagline`, `.trust-grid`/`.trust-grid-4`/`.trust-card`/`.trust-icon`
  (+ its own 2 responsive breakpoints), `.hero-proof` (+ `.proof-label`,
  `.schools span`, all `.hero-copy > .hero-proof` animation/responsive
  references — superseded by `.proof-row`), `.badge-save` (superseded by the
  `most-popular`-style badge pattern), `.faq-groups`/`.faq-group-head`,
  `.mid-cta`/`.mid-cta-row`, `.cta-inner`/`.cta-copy`/`.cta-echo*` (6 rules —
  `cta-band` now uses `.grid-3`/`.benefit-card` instead), `.why-grid`/
  `.why-card`/`.why-icon`, `.steps-5`, `.value-checklist`,
  `.feature-roles`/`.feature-role`/`.feature-role-icon`/`.feature-chip-list`
  (the file's own comment already said *"Kept for compatibility... no longer
  uses .feature-roles"* — confirmed and removed), `.age-portion-note`/
  `.age-portion-icon`, `.testimonial-card`/`.testimonial-role`/
  `.testimonial-name`/`.testimonial-pending`, and the `.benefit-card-wide`
  modifier (base `.benefit-card`/`.benefit-icon-grid` are live and kept).
- Dead custom properties (defined, never consumed via `var()` anywhere,
  including within the stylesheet itself): `--green-950`, `--green-800`,
  `--yellow-500`, `--school-yellow-soft`, `--cream-100`, `--space-1`,
  `--space-5`, `--space-6`. (`--navy-950`/`--navy-800`/`--navy-700` and the
  `--lime-*` alias family remain — confirmed 198 live call sites — and were
  **not** touched.)
- All dead classes were also removed from shared comma-separated selector
  lists (hover-lift rules, `user-select:none` list, reduced-motion
  overrides) rather than deleting those shared rules outright — e.g.
  `.menu-card, .trust-card, .feature-role, ...{transition:...}` had only the
  dead tokens trimmed, the rule itself (and its still-live members) kept.

**Result: 2,031 → 1,905 lines (126 lines removed).** Verified: brace-balance
check (`{`/`}` count nets to 0), `npm test` still 21/21, and manual
screenshot/DOM verification of `/`, `/parents`, `/schools`, `/caterers`,
`/features` in the browser preview post-cleanup — no visual regression, no
console errors.

**Confirmed NOT dead (do not remove in a future pass without re-checking):**
`.notif-icon-booking_cancelled` / `.notif-icon-low_balance` — a static grep
flags these as unreferenced, but they're consumed via dynamic EJS string
interpolation (`notif-icon-<%= n.type %>`) with `n.type` values set in
`server.js`. Keep.

**No duplicate rule definitions and no orphaned `@keyframes` were found** —
all 15 keyframe blocks are referenced by a live `animation:` declaration, and
the two selectors that looked like duplicates on a mechanical pass
(`.hero-copy > .eyebrow...` and `.process-connector`) are legitimate
`@media`-scoped overrides, not true duplicates.

---

## F. REFINE LATER — messy-but-active systems (not touched this pass)

Flagged for a Phase 02 design-system consolidation, not fixed now (fixing
would be a redesign decision, out of scope for a forensic cleanup):

1. **Legacy color-alias duplication.** The stylesheet's own header comment
   says `--forest`/`--leaf`/`--school-yellow` are canonical and
   `--navy-*`/`--lime-*` are "kept as aliases" for a past rename — but the
   rename never propagated. 198 call sites still use the old `--navy-*`/
   `--lime-*` names vs. ~30 using the new canonical names. Two names for the
   same colors, most usage on the "deprecated" side.
2. **Competing secondary-button styles.** `.btn-ghost` and `.btn-outline` are
   both actively used (8 and 11 use-sites respectively), near-identical
   transparent/white-bg secondary button treatments. Worth consolidating to
   one in a future visual pass.
3. **13 distinct responsive breakpoints** (`max-width` at 400–1400px in ~10
   different values, plus `min-width:768px`) rather than a documented scale —
   a maintainability risk flagged in the original Phase 1 audit and still
   true today. Not touched (would require re-testing every breakpoint).

---

## G. Source-vs-render / responsive spot-check

Checked in the browser preview (dev server on `localhost:3000`) at 320px,
768px, and desktop width on `/`, `/features`, `/how-it-works`, `/parents`:

- **No horizontal overflow found** at 320px or 768px on any of the four pages
  checked (`document.documentElement.scrollWidth` matched the viewport
  width, or was within 2px — normal scrollbar-gutter rounding).
- No console errors on any page checked.
- This was a **spot-check**, not a full 24-view × 10-breakpoint matrix — a
  full responsive audit across every view was not performed and should not
  be claimed as done.

No visual defects were "fixed" in this pass — per the Phase 01 brief, this
was forensic/cleanup only, not a redesign pass.

---

## H. Decision map

| Category | Items |
|---|---|
| **KEEP** | All routes, all views/partials, all JS files, all migrations/seed data, all tests, all i18n files, all image assets (incl. both webp/png of each pair), all npm dependencies, the `--navy-*`/`--lime-*` alias token family (live, just messy — see Refine Later) |
| **REFINE LATER** | Navy/lime vs. forest/leaf/school-yellow token duplication; `.btn-ghost` vs `.btn-outline` consolidation; 13-breakpoint responsive scale |
| **REMOVED** | ~126 lines of confirmed-dead CSS (see Section E — full list of selectors/tokens); 2 stray `.DS_Store` files (gitignored, never tracked); 1 stale detached-HEAD worktree (`.claude/worktrees/evo-meals-platform-reposition-6abe5d`, pre-migration-002 snapshot) |
| **INVESTIGATE** | Nothing left unresolved — every suspicious item found during this pass was either confirmed dead (removed) or confirmed live (kept) via direct grep verification, not left ambiguous |

---

## I. Recommendations for Phase 02

1. Consolidate the `--navy-*`/`--lime-*` alias tokens onto the canonical
   `--forest`/`--leaf`/`--school-yellow` names (198 call sites) — a
   mechanical rename, not a visual change, but touches most of the file so
   it's better done as its own reviewed pass.
2. Pick one of `.btn-ghost` / `.btn-outline` as the single secondary-button
   treatment and migrate the other's call sites.
3. Rationalize the 13 responsive breakpoints to a documented scale (e.g.
   sm/md/lg/xl) as part of any visual-refresh work — not required before
   then.
4. The earlier Phase 1 audit's still-open items (unverified "most parents
   choose this" comparative claim, `/contact` form's lack of persistence,
   home vs. `/parents` content overlap) remain open — see the original
   sections of this document's history in Git for details, or
   [BLOCKERS.md](BLOCKERS.md) / [CLAIMS-REGISTRY.md](CLAIMS-REGISTRY.md).

---

## Exact changes made in this pass

**Modified:**
- `public/css/style.css` — removed ~126 lines of confirmed-dead selectors,
  comma-list tokens, and custom properties (see Section E for the full list).
  No live selector, live custom property, or base/utility rule was touched.
- `docs/evo-implementation/PHASE-01-AUDIT.md` — this file, rewritten to
  reflect the current system state.

**Removed (non-code):**
- `.claude/worktrees/evo-meals-platform-reposition-6abe5d` (via `git worktree
  remove`)
- `public/.DS_Store`, `public/images/.DS_Store` (local-only, gitignored,
  never tracked)

**Not changed:** routes, views, JS files, `db.js`, `lib/*.js`, migrations,
seed data, tests, locales, auth/session/CSRF/rate-limit configuration,
booking/pricing/cancellation logic, any visual design (colors, typography,
layout, buttons, page content).
