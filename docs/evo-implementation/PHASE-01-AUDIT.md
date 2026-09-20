# Phase 1 — Forensic Audit & Safe Foundation

Status: **complete** (audit + safe structural prep only — no visual redesign, no business-logic changes).

- **Baseline Git SHA:** `1d76a67b9792f72f44463947edc2de26449edb0f` (branch `main`, clean working tree, up to date with `origin/main`)
- **Baseline test status:** `npm test` → 21/21 passing, 3 suites (`pricing.test.js`, `mask.test.js`, `civil-id-masking.test.js`), 0 failures
- **Test status after Phase 1 changes:** 21/21 passing (unchanged — no test was added or modified; no business logic changed)

---

## A. Repository architecture

**Stack:** Node.js (CommonJS) + Express 4 + EJS (server-rendered views) + better-sqlite3 (real on-disk SQLite, WAL mode). No frontend framework, no build step — static CSS/JS served directly from `public/`.

| Area | Location |
|---|---|
| Entrypoint | [server.js](../../server.js) — single file, all routes, middleware, and view-model assembly |
| Dependencies | [package.json](../../package.json) — express, express-session, express-rate-limit, bcryptjs, better-sqlite3, csrf-sync, helmet, compression, dotenv, ejs, pino/pino-http |
| Route modules | None — all routes live directly in `server.js` (no `routes/` split) |
| Middleware | helmet (CSP disabled — inline styles/scripts in views), compression, pino-http request logging, `express.urlencoded`, static file serving (1-day cache + ETag), `express-session`, `csrf-sync` synchronizer-token CSRF, `express-rate-limit` on both login endpoints |
| Data layer | [db.js](../../db.js) — one function per query, better-sqlite3, row↔object mappers, two atomic transactions (`bookAndCharge`, `cancelAndRefund`) |
| Migrations | [db/migrate.js](../../db/migrate.js) applies [migrations/*.sql](../../migrations) in filename order, tracked in a `schema_migrations` table, idempotent |
| Pure business logic | [lib/pricing.js](../../lib/pricing.js) (booking total + end-of-month calc, DB-agnostic, unit tested), [lib/mask.js](../../lib/mask.js) (Civil ID masking, unit tested) |
| Views | [views/*.ejs](../../views) — one file per page, plus [views/partials/](../../views/partials) for header/footer/nav/shared fragments |
| Static assets | [public/css/style.css](../../public/css/style.css) (1,473 lines, one shared stylesheet), [public/js/motion.js](../../public/js/motion.js), [public/js/nav.js](../../public/js/nav.js), [public/js/notifications.js](../../public/js/notifications.js), `public/images/` |
| Seed data | [seed.json](../../seed.json) — loaded once on first run if `parents` table is empty (`seedIfEmpty()` in db.js) |
| Tests | [tests/*.test.js](../../tests) — `node:test`, no external test framework |

**Run method (as documented in README, verified working):** `npm install && npm start`, opens on `http://localhost:3000`. `evo360.db` is created and migrated automatically on first run. No external database server required.

---

## B. Route contract

All routes below were read directly from `server.js` — none were assumed from the prompt or from documentation.

| URL | Method(s) | Access | Source | Template | Key middleware | Data dependencies | Must-preserve behavior | Status |
|---|---|---|---|---|---|---|---|---|
| `/favicon.ico` | GET | public | server.js:127 | — (204 no body) | — | — | Silent 204 | OK |
| `/health` | GET | public | server.js:130 | — (JSON) | — | `db.getPlans()` | 200/503 based on DB reachability | OK |
| `/` | GET | public | server.js:140 | home.ejs | — | `db.getMenuItems()`, `db.getPlans()` | Marketing homepage | OK |
| `/schools` | GET | public | server.js:148 | schools.ejs | — | — | — | OK |
| `/schools/inquiry` | POST | public | server.js:152 | schools.ejs (re-render) or redirect | CSRF | `db.createInquiry()` | Server-side validation of org name/contact/email/message | OK |
| `/parents` | GET | public | server.js:173 | parents.ejs | — | `db.getMenuItems()`, `db.getPlans()` | — | OK |
| `/caterers` | GET | public | server.js:181 | caterers.ejs | — | — | — | OK |
| `/caterers/inquiry` | POST | public | server.js:185 | caterers.ejs (re-render) or redirect | CSRF | `db.createInquiry()` | Same validation pattern as schools inquiry | OK |
| `/how-it-works` | GET | public | server.js (new, added Phase 1) | how-it-works.ejs (new) | — | — | Standalone version of the former `/#how-it-works` home-page anchor | **NEW — added Phase 1** |
| `/features` | GET | public | server.js (new, added Phase 1) | features.ejs (new) | — | — | Standalone version of the former `/#features` home-page anchor | **NEW — added Phase 1** |
| `/about` | GET | public | server.js:206 | about.ejs | — | — | — | OK |
| `/privacy` | GET | public | server.js:210 | privacy.ejs | — | — | Real, specific privacy policy text (not lorem ipsum) | OK |
| `/terms` | GET | public | server.js:214 | terms.ejs | — | — | Real, specific terms text, explicit "we don't independently verify caterer/allergen claims" disclaimers | OK |
| `/contact` | GET | public | server.js:218 | contact.ejs | — | — | — | OK |
| `/contact` | POST | public | server.js:222 | contact.ejs (re-render) | CSRF | none — logs only, **not persisted anywhere** | Demo-only; explicitly commented as not integrated with email/CRM | OK (documented limitation) |
| `/sitemap.xml` | GET | public | server.js:236 | — (XML) | — | — | Must list every public marketing page | Updated Phase 1 to include the 2 new routes |
| `/robots.txt` | GET | public | server.js:245 | — (text) | — | — | Disallows all authenticated/app routes | Updated Phase 1 to include the 2 new routes |
| `/login` | GET | public | server.js:271 | login.ejs | — | — | — | OK |
| `/login` | POST | public | server.js:275 | login.ejs (on error) or redirect | `loginLimiter` (10/15min/IP), CSRF | `db.findParentByCivilId`, bcrypt compare | Rate limiting, generic error message (no user enumeration) | OK |
| `/forgot-password` | GET | public | server.js:285 | forgot-password.ejs | — | — | — | OK |
| `/forgot-password` | POST | public | server.js:289 | forgot-password.ejs | CSRF | none — logs only, no email sent | Never reveals whether identifier matches an account | OK |
| `/register` | GET | public | server.js:297 | register.ejs | — | — | — | OK |
| `/register` | POST | public | server.js:301 | register.ejs (on error) or redirect | CSRF | `db.findParentByCivilId`, `db.createParent`, bcrypt hash | Name/email/phone/password-strength validation, duplicate Civil ID check, password confirmation match | OK |
| `/logout` | GET | authenticated (no-op if not) | server.js:336 | — (redirect) | — | — | Destroys session | OK |
| `/school-admin/login` | GET | public | server.js:349 | school-admin-login.ejs | — | — | Separate auth system from parent login | OK |
| `/school-admin/login` | POST | public | server.js:353 | school-admin-login.ejs (on error) or redirect | `loginLimiter`, CSRF | `db.findSchoolAdminByEmail`, bcrypt compare | — | OK |
| `/school-admin/logout` | GET | school-admin session | server.js:363 | — (redirect) | — | — | — | OK |
| `/school-admin/dashboard` | GET | **school-admin only** | server.js:367 | school-admin-dashboard.ejs | `requireSchoolAdmin` | `db.getStudentsBySchool`, `db.getBookingsForSchool` | Scoped strictly to `admin.school` — never cross-school data | OK |
| `/dashboard` | GET | **parent only** | server.js:413 | dashboard.ejs | `requireAuth` | students, bookings, notifications, renewal candidates | Calendar-accurate "active today" / renewal-window logic | OK |
| `/notifications/:id/read` | POST | parent only | server.js:508 | — (redirect) | `requireAuth`, CSRF | `db.markNotificationRead` scoped to `parent.id` | Cannot mark another parent's notification read (parentId filter in SQL) | OK |
| `/notifications/read-all` | POST | parent only | server.js:514 | — (redirect) | `requireAuth`, CSRF | `db.markAllNotificationsRead` | Scoped to `parent.id` | OK |
| `/booking/:id/renew` | POST | parent only | server.js:520 | — (redirect) | `requireAuth`, CSRF | ownership check (`student.parentId !== parent.id` → redirect), `calculateBookingTotal`, `db.bookAndCharge` | **Recalculates against the new month's real school-day calendar — never repeats the old amount** | OK |
| `/students` | GET | parent only | server.js:548 | students.ejs | `requireAuth` | `db.getStudentsByParent` | Civil ID masked in list | OK |
| `/students/:id/edit` | GET | parent only, ownership-checked | server.js:554 | students.ejs | `requireAuth` | ownership check, `db.findStudentById` | Redirects to `/students` if student belongs to another parent | OK |
| `/students` | POST | parent only | server.js:562 | — (redirect) | `requireAuth`, CSRF | ownership check on edit path, `db.createStudent`/`db.updateStudent` | Civil ID is never accepted on the edit branch — cannot be overwritten once set | OK |
| `/menu` | GET | parent only | server.js:582 | menu.ejs | `requireAuth` | `db.getMenuItems` | Allergen/nutrition disclaimers present | OK |
| `/booking` | GET | parent only | server.js:603 | booking.ejs | `requireAuth` | students, menu items, plans, school calendar (120-day horizon), smart defaults | — | OK |
| `/booking` | POST | parent only | server.js:632 | booking.ejs (re-render) | `requireAuth`, CSRF | ownership check on student, `calculateBookingTotal`, `db.bookAndCharge` | **Server-side recalculation is authoritative — never trusts a client-submitted total.** Monthly plans price only real school days; zero-school-days case is rejected with a clear message | OK — this is the core "KWD 0.00 bug" fix; do not touch without re-verifying `tests/pricing.test.js` |
| `/history` | GET | parent only | server.js:685 | history.ejs | `requireAuth` | `db.getBookingsForParent` | — | OK |
| `/history/:id/cancel` | POST | parent only | server.js:696 | — (redirect) | `requireAuth`, CSRF | ownership + status check (`status === 'upcoming'`), `db.cancelAndRefund` (atomic transaction) | Cannot cancel another parent's booking or a non-upcoming booking | OK |
| `/profile` | GET | parent only | server.js:707 | profile.ejs | `requireAuth` | `currentParent` | Civil ID masked, read-only | OK |
| `/profile` | POST | parent only | server.js:712 | — (redirect) | `requireAuth`, CSRF | `db.updateParent` | Only name/email/phone are mutable — Civil ID and password are not touched by this route | OK |
| `/staff` | GET | parent only (mirrors real app's separate Staff section) | server.js:720 | staff.ejs | `requireAuth` | `db.getStaffBookingsByParent`, `db.getPlans` | — | OK |
| `/staff` | POST | parent only | server.js:727 | — (redirect) | `requireAuth`, CSRF | `db.createStaffBooking` | — | OK |
| `*` (404) | any | public | server.js:741 | 404.ejs | — | — | — | OK |
| CSRF error handler | any | public | server.js:745 | — (plain text 403) | — | — | `EBADCSRFTOKEN` → friendly message, not a stack trace | OK |

**Routes referenced in README that do not exist in the codebase (documentation defect, not a missing feature):** `/wallet`, `/wallet/topup`. See [CLAIMS-REGISTRY.md](CLAIMS-REGISTRY.md) and the Content/Claim Audit section below — these were removed by `migrations/004_school_calendar_remove_wallet.sql` but the README had not been updated. **Fixed in this phase** (README edited to remove the stale wallet/top-up references — documentation-only change, zero functional risk).

---

## C. Functional dependency map

| Capability | Where it actually lives |
|---|---|
| Registration / login | `server.js` `POST /register`, `POST /login`; passwords hashed with `bcryptjs` (`bcrypt.hashSync`/`compareSync`), stored in `parents.password_hash` |
| Session auth | `express-session`, cookie `httpOnly`, `sameSite: lax`, 30-day `maxAge`; `req.session.parentId` set on login/register, checked by `requireAuth` (server.js:114) |
| Student records scoped to parent | Every student/booking query in `db.js` is scoped by `parent_id` at the SQL level (`WHERE parent_id = ?` / joined through `students.parent_id`); route handlers additionally re-check `student.parentId === parent.id` before any mutation (e.g. server.js:558, :575, :700, :724) |
| School calendar drives pricing | `school_calendar_days` table (migration 004) + `db.getSchoolDaysInRange(school, start, end)`; consumed by `lib/pricing.js`'s `calculateBookingTotal` |
| Booking totals computed | `lib/pricing.js` `calculateBookingTotal()` — pure function, unit tested in `tests/pricing.test.js` (10 cases incl. the KWD 0.00 regression) |
| Server-side price/date validation | `POST /booking` (server.js:632) recomputes `total`/`days` from `plans` + `schoolCalendar` server-side — the client-side script in `booking.ejs` only renders a live preview; it is never trusted as the source of truth |
| Notifications written | `db.insertNotification` (private to db.js), called from `bookAndCharge`, `cancelAndRefund`, and `ensureRenewalNotification` (de-duplicated per booking via `related_id` + `type`) |
| Cancellation/refund simulation | `db.cancelAndRefund` — single `db.transaction()`, sets booking `status = 'cancelled'`, inserts a "refunded to original payment method (demo — simulated)" notification. **No real payment gateway is invoked anywhere in this codebase.** |
| Payment simulated | `POST /booking` renders "charged via KNET (demo — no real payment processed)"; no `KNET_MERCHANT_ID`/`KNET_API_KEY` are ever read outside `.env.example`'s documentation comment |
| School-admin scope enforced | `requireSchoolAdmin` (server.js:341) + `getStudentsBySchool`/`getBookingsForSchool` filtered by `admin.school` string — there is no cross-school leak path found |
| Enquiry forms processed | `POST /schools/inquiry` and `POST /caterers/inquiry` → `db.createInquiry` → `inquiries` table (migration 003). **No admin UI reads this table** — inquiries are captured but there is currently no way to view them except direct DB access. Flagged in [BLOCKERS.md](BLOCKERS.md). |

---

## D. Content / claim audit

Search performed across every `.ejs` view, `public/js/*.js`, and `README.md` for: old Evo360 wording, wallet references, unsupported "most parents/leading/best/#1" claims, invented statistics, placeholder testimonials, blanket allergen claims, production-payment wording, sample dashboard numbers presented as real, and stale anchor assumptions.

**Overall finding: this codebase is already unusually disciplined about not fabricating claims.** Specific findings:

| Finding | File | Assessment | Action taken / recommended |
|---|---|---|---|
| Trust-stat and testimonial sections are explicitly gated off (`SHOW_TRUST_STATS = false`, `SHOW_TESTIMONIALS = false`) with a comment: *"no real figures... and no real testimonials have been collected yet. An omitted section is honest; a placeholder or invented number is not."* | [views/home.ejs:1-8](../../views/home.ejs) | **Correct, no action needed.** This is the pattern later phases should keep following for any new numeric/social-proof claim. | None |
| "Most parents choose this" badge on the subscription plan card | [views/home.ejs:341](../../views/home.ejs), [views/parents.ejs:121](../../views/parents.ejs), [views/booking.ejs:86](../../views/booking.ejs) | **Unverified comparative claim** — there is no data source (no analytics, no plan-selection stats table) backing "most parents choose this." | Not fixed in Phase 1 (a copy/marketing decision, not a structural one) — flagged in [CLAIMS-REGISTRY.md](CLAIMS-REGISTRY.md) as **not verified, do not carry forward without either real data or rewording to "Recommended" / removing the comparative claim**. |
| Allergen/dietary disclaimers are present and explicit — "not independently verified by Evo Meals", "per-dish information, not an independently verified guarantee" | [views/menu.ejs:19](../../views/menu.ejs), [views/parents.ejs] FAQ answer in home.ejs:620, [views/terms.ejs] | **Correct, no action needed.** This is exactly the "no blanket allergen-free claims" guardrail already in place. | None |
| "Real-time data from your school's program — not a preview" / "Live data" tag on school-admin dashboard | [views/school-admin-dashboard.ejs:14,16](../../views/school-admin-dashboard.ejs) | Accurate as written — the dashboard genuinely queries live rows from `bookings`/`students` for that `admin.school`, not canned data. Demo seed data is real rows, not a mocked view. | None — the "live" framing is honest given the current seed-data-backed demo. |
| Homepage explicitly labels its own dashboard screenshot: *"a preview of the interface, not live data from your program"* | [views/home.ejs:468](../../views/home.ejs) | **Correct** — pre-empts exactly the "sample data implied as production" risk called out in the guardrails. | None |
| README describes a wallet system (`/wallet`, `/wallet/topup`, wallet balance, transaction history, `processTopUp()`) that was **removed** by `migrations/004_school_calendar_remove_wallet.sql` | [README.md](../../README.md) (pre-fix) | **Stale documentation, factually wrong about current code.** This is a source-of-truth conflict between docs and executable code — resolved in favor of the code per the audit's source-of-truth hierarchy. | **Fixed in this phase** — README edited to describe the current calendar-based, wallet-free billing model and the direct-charge-per-booking flow. Documentation-only change. |
| No instances found of: fabricated school/student counts, invented ratings/awards/certifications, fabricated company history/founding claims, "#1"/"leading"/"trusted by thousands" language, or claims of browser/device testing that wasn't performed | (whole-repo grep) | N/A | None — nothing to fix |
| Old "Evo360" branding appears only in the **email domain / social handles** (`info@evo360.tech`, `instagram.com/evo360.tech`) and the repo/package name (`evo360-demo-system`) — the product-facing brand everywhere else is consistently "Evo Meals" | sitefoot.ejs, appfoot.ejs, package.json | Not a user-facing content defect — these read as the underlying company/domain name, distinct from the "Evo Meals" product brand, consistently applied. | None — flagged only for awareness in case a later phase wants a single consistent domain |

No fabricated statistics, invented testimonials, unsupported medical/safety guarantees, or invented company history were found anywhere in the current view layer. The one real defect (stale wallet claims in README) has been corrected.

---

## E. Design-system inventory

Defined in [public/css/style.css](../../public/css/style.css) (1,473 lines, single shared stylesheet, no preprocessor, no CSS framework):

- **Color tokens** (`:root`, style.css:7-95): a teal/navy/cream/lime/coral palette (`--navy-950`, `--ice-*`, `--cream-*`, `--lime-*`, `--muted`, `--line`, `--border-input`, etc.). `--muted` carries an inline comment recording its contrast ratios (6.4:1–7.6:1) — evidence of a deliberate prior accessibility pass, not an arbitrary choice.
- **Typography:** Montserrat (700/800 weight, headings/buttons) + Poppins (400/500/600, body) loaded from Google Fonts in `partials/head.ejs`.
- **Spacing/radius:** `--radius-sm` (10px) / `--radius` (16px) / `--radius-lg` (24px); container widths `.wrap` (1120px) and `.wrap-wide` (1280px), both with 24px side padding.
- **Shadows:** `--shadow-sm`/`--shadow`/`--shadow-lg`, all teal-tinted (not neutral black), consistent with the palette.
- **Motion:** named easing curves (`--ease-standard`, `--ease-out`, `--ease-spring`) and durations (`--dur-micro` 140ms → `--dur-hero` 750ms), all respecting `@media (prefers-reduced-motion: reduce)` (7 separate reduced-motion overrides found).
- **Buttons:** `.btn` family (`btn-primary`, `btn-outline`, `btn-ghost`, `btn-dark`, `btn-danger`, `btn-sm`) — every variant enforces `min-height:44px` (touch-target size), documented inline as deliberate.
- **Cards:** `.card`, `.stat`, `.menu-card`, `.data-card` — consistent radius/shadow/border treatment.
- **Icons:** inline SVG only (no icon font, no external icon library) — every icon in every view is hand-authored inline `<svg>`.
- **Imagery:** real dish photography exists for 5 menu items (`public/images/menu/*.webp`+`.png`, via `partials/dish-image.ejs`), with an explicit, honest fallback to a generic line-icon for any menu item name that doesn't exactly match — "rather than guessing or mismatching a dish to the wrong picture" (comment in dish-image.ejs and server.js).

---

## F. Responsive risk audit

- **Global overflow guard:** `html{overflow-x:hidden}` (style.css:108) with an inline comment explicitly calling this "a safety net, not the fix" for real overflow sources (fixed pixel widths, unconstrained content) — i.e. the team is already aware this masks rather than solves. No new fixed-width regressions were introduced in Phase 1 (no CSS was touched).
- **Breakpoints in use:** `max-width` at 400/480/520/560/640/700/800/900/960/1400px and `min-width` at 768px — a wide, somewhat unsystematic set (13 distinct breakpoints) rather than a small fixed scale (e.g. sm/md/lg). Not a bug, but a maintainability risk for later phases: a design-token pass could consolidate these into a documented scale.
- **Fixed-position risk areas, deliberately handled:** the notification dropdown switches from `position:absolute` to `position:fixed` with explicit `top/left/right` insets below 480px width (style.css:372-377, :401-402) — comment explains this is because `position:fixed` on mobile Safari must use true-viewport insets, not `position:absolute`'s containing-block math. Mobile nav locks body scroll via `position:fixed` + stored `scrollY` (public/js/nav.js) specifically because "locking scroll with `overflow:hidden` alone doesn't reliably stop touch-scroll on mobile Safari."
- **Confirm-bar in booking.ejs** goes `position:fixed` at the bottom of the viewport below 640px (style.css:544-546) — a common, deliberate mobile-checkout pattern, not a bug.
- **No responsive testing was actually performed in this phase** beyond a single mobile-viewport (375×812) screenshot check of the two newly-added pages (`/how-it-works`, `/features`) in the built-in browser, confirming no layout break from wrapping the extracted partials in a page shell. **A full device-matrix pass across all 24 views was not performed and should not be claimed as done.**

---

## G. Localization readiness

**Current state: zero i18n infrastructure.** All user-visible strings are hardcoded English, inline in:
- Every `.ejs` view (headings, body copy, button labels, placeholder text, alt text)
- Server-side flash/validation messages in `server.js` (e.g. `'Enter a valid email address.'`, `'Passwords don't match.'`, rate-limit message)
- Client-side validation/UI strings in `public/js/motion.js` (button loading-state labels) and inline `<script>` blocks in `booking.ejs`
- Notification message templates assembled server-side in `db.js` (e.g. `` `${studentName} — Booking confirmed: ...` ``) and `server.js` (renewal reminder text)
- `lib/pricing.js`/`server.js` date/currency formatting is hardcoded to `en-GB` locale and `KWD` currency (`app.locals.fmtDate`, `fmtTime`, `fmtKWD` in server.js:85-98)

There is no `i18n`/`i18next`/locale-JSON pattern anywhere in the repo, no `lang` attribute switching (every view hardcodes `<html lang="en">`), and no RTL handling (relevant given Kuwait/Arabic as a likely future requirement). **No localization work was done in this phase** — flagged as a Phase 2+ concern in [BLOCKERS.md](BLOCKERS.md) since it requires a client decision on scope (which locales, RTL support) before any structural prep (e.g. wrapping strings in a translation helper) would be safe to build.

---

## H. Current information architecture

| Page | Job | Overlap / duplication found |
|---|---|---|
| `/` (home) | Full narrative pitch to all audiences at once — hero → how-it-works → for-schools teaser → for-parents deep dive → for-caterers teaser → features → nutrition → dashboard preview → FAQ | Duplicates large blocks of `/parents` (identical "How it works for you" steps, identical pricing cards, identical tap-demo visual) and smaller blocks of `/schools`/`/caterers` (teaser copy is a subset of those pages' own hero/benefits). This duplication is a **content architecture** finding, not fixed in Phase 1 (fixing it would mean rewriting home page narrative scope, which is copy/structure work explicitly deferred to a later phase). |
| `/parents` | Parent-specific deep dive — steps, pricing, this-week's-menu preview | Its "How it works" step list and pricing cards are near-verbatim duplicates of sections on `/`. |
| `/schools` | School-specific pitch + lead-capture form | Its hero CTA now links directly to `/how-it-works` (fixed in this phase) instead of round-tripping through the homepage anchor. |
| `/caterers` | Caterer-specific pitch + lead-capture form | Self-contained, least overlap of the three audience pages. |
| `/how-it-works` **(new)** | Standalone, shareable/linkable version of the 5-role platform flow | Content is the *same* partial used inline on `/` — reused, not duplicated (see Section 6 below). |
| `/features` **(new)** | Standalone, shareable/linkable version of the by-role feature list | Same reuse pattern as `/how-it-works`. |
| `/about` | Company story/values — three short pillars, no fabricated history | Minimal, no overlap. |
| `/contact` | Generic contact form (not routed to schools/caterers inquiry forms) | A parent, school, or caterer landing here has a role dropdown, but submissions go nowhere except the server log (`logger.info(...)`) — no persistence, no email. This is a real functional gap worth a later-phase decision (see BLOCKERS). |
| `/privacy`, `/terms` | Real, specific, non-boilerplate legal text with genuine platform-specific disclaimers (caterer-verification disclaimer, delivery-time disclaimer, data-sharing-with-caterer disclosure) | No overlap; appropriately separated. |
| `/login`, `/register`, `/forgot-password` | Parent auth | No overlap; `/forgot-password` explicitly labeled as a simulated flow. |
| `/school-admin/login`, `/school-admin/dashboard` | Separate, lightweight school-admin auth + single-school reporting view | Cleanly separated from parent auth (different session key, different `requireSchoolAdmin` middleware). |

---

## I. Verified claim registry

See [CLAIMS-REGISTRY.md](CLAIMS-REGISTRY.md).

---

## Page contract summary

See [PAGE-CONTRACT.md](PAGE-CONTRACT.md) for the full per-page contract (purpose, audience, CTAs, deferred information, SEO intent). This is the source of truth Phases 2–5 should design against.

---

## Exact files changed in Phase 1

**New files:**
- `views/partials/how-it-works-section.ejs` — extracted verbatim from the home-page "How It Works" section (no copy changes)
- `views/partials/features-section.ejs` — extracted verbatim from the home-page "Features" section (no copy changes)
- `views/how-it-works.ejs` — new standalone page shell (nav + hero + shared partial + CTA + footer), reusing the existing `hero-inner-page`/`cta-band` patterns already used by `about.ejs`/`schools.ejs`/`caterers.ejs`
- `views/features.ejs` — same pattern
- `docs/evo-implementation/PHASE-01-AUDIT.md`, `CLAIMS-REGISTRY.md`, `PAGE-CONTRACT.md`, `BLOCKERS.md` — this audit

**Modified files:**
- `server.js` — added `GET /how-it-works` and `GET /features` routes; added both new pages to the `/sitemap.xml` page list and the `/robots.txt` `Allow` list
- `views/home.ejs` — replaced the two inline sections with `<%- include('partials/how-it-works-section') %>` / `<%- include('partials/features-section') %>` (byte-identical rendered output — verified via manual route smoke test, not a visual diff tool)
- `views/partials/sitenav.ejs` — desktop and mobile nav links for "How It Works"/"Features" changed from `/#how-it-works`/`/#features` (home-page anchors) to `/how-it-works`/`/features` (standalone routes), with `active` state highlighting added
- `views/partials/sitefoot.ejs` — footer "How It Works" link updated the same way
- `views/schools.ejs` — hero CTA "See how the platform works" updated from `/#how-it-works` to `/how-it-works`
- `README.md` — removed stale wallet/`/wallet/topup` references (migration 004 already removed this system; the README had not been updated to match)

**No changes were made to:** `db.js`, `lib/pricing.js`, `lib/mask.js`, any `migrations/*.sql` file, `seed.json`, any authentication/session/CSRF/rate-limit configuration, any booking/pricing/cancellation logic, or any existing route's behavior.

---

## Exact behaviors intentionally left untouched

- Booking total calculation, monthly/school-calendar pricing, and the zero-school-days rejection path (`lib/pricing.js`, `POST /booking`, `POST /booking/:id/renew`)
- Cancellation + refund transaction (`db.cancelAndRefund`)
- Civil ID masking everywhere it is displayed
- CSRF protection, rate limiting, session configuration, password hashing
- School-admin scoping (`getStudentsBySchool`/`getBookingsForSchool`)
- The "most parents choose this" comparative claim (flagged, not removed — a copy decision, not a structural one; see Claims Registry)
- Home-page content duplication with `/parents` (an information-architecture finding for a later phase, not a Phase 1 structural-safety issue)
- `/contact` form's lack of persistence/email integration (pre-existing, documented in the view's own code comment)
- Zero i18n infrastructure (flagged for a client scoping decision, not started)

---

## Blockers needing client input

See [BLOCKERS.md](BLOCKERS.md).

---

## Recommended execution focus for Phase 2

1. **Resolve the "Most parents choose this" claim** — either produce real plan-selection data to back it, or reword to a non-comparative statement (e.g. "Recommended" / "Pay only for real school days"). Low effort, removes the one unverified marketing claim still in the live content.
2. **Decide the `/contact` form's destination** — currently demo-only (logged, not sent/stored). A real inbox/CRM integration or at minimum a persisted `inquiries`-style table (mirroring what `/schools/inquiry` and `/caterers/inquiry` already do) would close a real functional gap without touching any other business logic.
3. **Home-page vs. `/parents` content overlap** — decide whether `/` should trim its parent-focused section now that `/parents` exists in full, or whether the duplication is intentional (funnel design). This is a content-architecture decision, best made with the Page Contract (this phase's deliverable) as the reference.
4. **Localization scoping decision** (see Blockers) — needed before any i18n structural work can start safely.
5. **Design-token consolidation** — 13 distinct CSS breakpoints could be rationalized to a documented scale as part of any visual-refresh work, without needing a full redesign.
6. Continue using the Page Contract and Claims Registry from this phase as the constraint set for any new copy — the existing codebase's discipline around not fabricating statistics/testimonials should be preserved, not relaxed, in later phases.
