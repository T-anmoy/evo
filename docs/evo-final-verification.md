# Evo Meals — final verification (Phase 3B)

System hardening, complete regression QA and final delivery. Date: 23 September 2026.

Phase 3B did not redesign anything. Its job was to prove the whole system holds together, harden
what could safely be hardened, repair what was broken, and document what remains unresolved. Where
an integration does not exist, this document says so rather than implying otherwise.

## 1. Starting state

| Item | Value |
| --- | --- |
| Repository | `/Users/tan/Desktop/EVO/evo360-demo-system` |
| Branch | `main` |
| Phase 3B starting HEAD | `fc3673c` — *Refine authenticated product experience (Phase 3A)* |
| `origin/main` at entry | `f5d1849` |
| Divergence at entry | 1 ahead, 0 behind — the expected Phase 3A local checkpoint |
| Working tree at entry | clean |
| Baseline `npm test` | **53 passing, 0 failing** |
| `node --check` across all JS | passed |

The Phase 3A checkpoint was preserved. No reset, revert, rebase or discard was performed. The
`-AI` reference copy was never read from or written to. All testing ran against disposable SQLite
databases; **the repository database `evo360.db` was not modified** — its mtime is unchanged from
the start of the session (verified after an audit tool briefly opened it read-only).

## 2. Phase 3A product summary (handoff)

Phase 3A reordered the Dashboard so today's child leads (child → meal → collection status →
actions → plan), put existing children ahead of the add form on Students, added a pre-payment
review summary and POST→redirect→GET to Booking, made cancellation state its outcome, gave Staff
records a meal and a status, corrected School Admin metric labels to match their queries, replaced
a stale hover-only chart with an accessible table, and fixed a `timeAgo` helper that rendered
future timestamps as "just now". It left every blocked business rule unimplemented and documented.

Phase 3B found **one defect introduced by that work**: the homepage FAQ still told parents to
cancel a booking "marked Upcoming" after the status vocabulary was renamed to "Booked". Corrected
in both languages, along with the last public illustrative record still using the old word.

## 3. Phase 3B hardening

### 3.1 Session fixation (fixed)

Sign-in, registration and school-admin sign-in all continued on the session identifier the visitor
arrived with. An identifier planted before authentication stayed valid after it. All three now go
through `startAuthenticatedSession`, which calls `req.session.regenerate()`, re-applies the display
locale (the only value worth carrying), assigns identity, and saves before redirecting so the new
identifier is stored before the browser follows.

A deliberate consequence: the pre-login CSRF token is invalidated by the session change. A browser
picks up a fresh token from the next page it renders. Both behaviours are covered by tests.

### 3.2 Logging privacy (fixed — this was a live credential leak)

Verified by running the previous configuration and reading the output: **every request logged the
complete header block, including the signed session cookie**, plus any Authorization header. Anyone
with log access could have taken over a live session.

`pino` now redacts `req.headers.cookie`, `req.headers.authorization`, `res.headers["set-cookie"]`,
`req.body.password`, `req.body.confirmPassword`, `req.body.civilId` and `req.body.identifier`.
Re-verified end to end against a running server: a sign-in request produces `"cookie":"[redacted]"`
and the password and Civil ID appear nowhere in the output. This improves logging hygiene; it does
not constitute privacy compliance.

### 3.3 Content Security Policy (enabled, with its limit stated)

CSP was previously disabled outright. Rather than flipping it on blindly, the actual content was
inventoried: **three** inline `<script>` blocks (the i18n bundle in `head.ejs`, the booking
calculator, and the homepage JSON-LD), ~100 inline `style=` attributes including dynamically
generated ones, and no third-party scripts — Google Fonts is the only external origin.

The policy now sent on every response:

```
default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none';
form-action 'self'; script-src 'self' 'nonce-<per-request>';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'
```

Scripts carry a fresh per-request nonce and `script-src` has **no** `'unsafe-inline'`. Tests assert
the header is present, that every inline script carries the request's nonce, and that the nonce
differs between requests.

**`style-src 'unsafe-inline'` remains, and removing it is a production blocker**, not a flag flip:
it requires migrating ~100 inline style attributes and the dynamically computed ones. It is listed
in section 11.

`frame-ancestors 'none'` is correct for this application and blocks all framing, including
same-origin. That broke the iframe-based layout measurement harness, so a test-only proxy was used
for geometry work (it strips only that header and alters no markup or CSS — every reading is
identical to what the real server produces).

### 3.4 Cookie and environment configuration

`secure` is now set on the session cookie **in production only** — enabling it locally would mark
cookies secure over plain HTTP and silently break development sign-in. `app.set('trust proxy', 1)`
is likewise production-only, since a `secure` cookie is never sent behind a TLS-terminating proxy
without it. Expected production settings: `NODE_ENV=production`, TLS termination in front of the
app, and a real `SESSION_SECRET` (the app already refuses to start without one).

### 3.5 Session store (documented, deliberately not changed)

The default `MemoryStore` remains. No Redis, database-backed store or hosted provider was added,
because no deployment architecture has been approved and adding one would imply infrastructure that
does not exist. As it stands the process **loses every session on restart and cannot run on more
than one instance**. This is recorded in the code and in section 11 as outstanding deployment work.

### 3.6 Abuse protection

The existing login limiter (10 per 15 minutes) is preserved and unchanged. A separate, deliberately
looser `writeFormLimiter` (20 per 15 minutes) now covers the unauthenticated write endpoints:
Register, Forgot Password, Contact, School inquiry and Caterer inquiry. These are not
credential-guessing surfaces, and a parent who mistypes a form several times must not be locked out
of registering. **No CAPTCHA was added and no friction was introduced for ordinary use.** A test
confirms the endpoint starts refusing after a burst.

Operational note: the limiters are per-IP and in-memory, so running the automated regression suite
repeatedly within a 15-minute window will legitimately trip them. That is the limiter working, not
a defect.

### 3.7 Logout (GET → CSRF-protected POST)

`GET /logout` and `GET /school-admin/logout` changed authentication state, so any third-party page
could force a sign-out with an `<img>` tag. Both are now POST routes carrying the CSRF token. Both
callers — the parent nav and the admin nav — were updated to submit a real form, so the control
stays a single visible button in the same place, works without JavaScript, and the Arabic
admin-logout locale redirect is unchanged. The site-wide "Please wait…" submit feedback is
suppressed for this one form, because swapping a longer label into a header control sized to the
word "Log out" would shove the navigation sideways. Tests cover: GET is gone (404), a POST without
a valid token is refused (403) **and leaves the session intact**, and a valid POST ends it.

### 3.8 Error handling (fixed)

The error handler passed anything that was not a CSRF failure to Express's default handler, which
renders the stack trace into the response outside production — handing a visitor filesystem paths
and internal error text. The handler now logs the full error server-side and renders a generic,
localized `500` page with no detail, falling back to plain text if the error page itself fails.

No ordinary request to this application produces an unhandled throw (probed: `NaN` ids, malformed
dates, unknown records — all handled). The handler is therefore exported and exercised directly by
a test that asserts the error message, a filesystem path and stack frames are all absent from the
response.

## 4. Performance and technical cleanup

### 4.1 Images

Measured rather than assumed: the hero renders at **430×576 CSS px** at a 1600px viewport, but the
sources shipped 1792×2400 with a **4.9 MB PNG fallback** (also the `og:image`). Both desktop
sources were resampled to 1344×1800 — still 3× the largest observed render, the **exact same
1792:2400 aspect ratio, nothing cropped**. The result was compared against the original at the size
the hero actually renders and is visually indistinguishable; food detail (rice, broccoli, apple,
char marks on the chicken) is intact.

| Asset | Before | After | Change |
| --- | ---: | ---: | ---: |
| `hero-desktop.png` | 4,872 KB | 2,988 KB | −39% |
| `hero-desktop.webp` | 717 KB | 261 KB | −64% |
| `hero-mobile.*` | unchanged | unchanged | already correctly sized for its 317×424 render |

The `width`/`height` attributes were updated to match, preserving aspect-ratio reservation and
layout stability. No image pipeline was introduced; the dish images were not touched. Further
reduction of the PNG fallback needs proper tooling (`pngquant`/`sharp`) or a JPEG fallback — a
production task, listed in section 11.

### 4.2 Stylesheet

389 class selectors were audited against everything the templates and scripts could produce,
including dynamic construction. 66 classes had no possible markup path — components Phase 2
superseded (`menu-card`, `role-cards`, `hero-toast`, `allergen-pill`, `dash-stat`, `teaser-*`,
`steps-6`). Dynamically constructed names (`food-card--<variant>`, `notif-icon-<type>`) were
correctly identified as live and kept.

**Two regex-based attempts corrupted the stylesheet** — the first read CSS comments as selector
text and deleted live rules whose preceding comment happened to name an old component; the second
left placeholder control characters in the file. Both were caught by layout-fingerprint comparison
and fully reverted. The work was redone with a proper character-by-character scanner that never
interprets comments, splits selector lists only at depth zero, and refuses to write if the output
has control characters, unbalanced braces or fewer comments than it started with.

Result: **155 selectors and 146 rules removed, 127.7 KB → 115.3 KB**, verified by capturing the
bounding box of every element on 14 pages at 2 widths back to back under both stylesheets —
**28 page/width combinations produced byte-identical geometry.**

### 4.3 JavaScript

Audited for the residue the brief names: no `IntersectionObserver`, no scroll reveals, no count-up,
no parallax or magnetic-pointer code, no forced layout (`offsetWidth` reads), and correct `resize`
and `pageshow` lifecycle handling in `nav.js`. The three `submit` listeners in `motion.js` are on
different form sets with documented ordering (confirm → validate → feedback, via
`stopImmediatePropagation`), not duplicates. Nothing was rewritten. The only change was the
one-line logout exclusion described in 3.7.

### 4.4 Locale dictionaries

243 keys never appear literally in the source; a dynamic-construction audit showed most are
legitimately built at runtime (`t('dashboard.' + ...)`, `t('parents.journey.step' + ...)`,
`t('featuresSection.' + ...)`). **12 subtrees had zero references of any kind** — and they are
exactly where the stale capability strings lived: *"Real-Time Visibility"*, *"Real-time collection
notifications"* and a *"Live"* onboarding step, none of which this system implements. Phase 2 had
flagged these legacy entries as a re-use hazard. They are now removed: **114 keys per locale, 905 →
791, parity held at 0 drift.**

## 5. Public regression review

Phase 3 was not meant to touch the public site, so it was checked for regressions only.

- **Food Confidence**: scope verified intact — Nuts, Shellfish, Sesame and Soy only. No egg, gluten,
  dairy or lactose claim anywhere. No certification seal, no cross-contamination guarantee, no
  medical safety claim, no automatic allergy matching. The exact approved statement is unchanged in
  both languages.
- **Collection language**: every occurrence of "eaten"/"ate" across rendered pages is a *denial*
  ("A collection record does not confirm that the meal was eaten", "Collection visibility does not
  prove a meal was eaten", "These records do not measure meals eaten or revenue").
- **Terms checkbox**: initially checked, `required`, user-deselectable, rejected server-side when
  absent, and checked/unchecked state preserved through validation errors. Verified by test and by
  functional run.
- **Forgot Password**: known and unknown identifiers produce byte-identical outcome text, and the
  page says no email was sent.
- **Contact / payment / notifications**: no false sent-or-saved claim, no real KNET claim, no push
  delivery claim.
- **Regression fixed**: the FAQ's "marked Upcoming" and the caterer queue's "Upcoming" label were
  the last two places not using the unified Booked / Collected / Cancelled vocabulary.
- The two public shared components Phase 3A touched (`food-card.ejs` heading level,
  `dish-image.ejs` signature) render identically; all five dish images return 200 on every caller.

## 6. RTL verification

Checked in Arabic across all public routes (Home, Parents, Schools, Caterers, Features, How It
Works, About, Contact, Login, Register, Forgot Password) and all authenticated surfaces (Dashboard,
Students, Menu, Booking, History, Profile, Staff, School Admin).

Verified: Cairo typography and locale-aware font loading (English loads Montserrat + Poppins only,
never the Arabic family), navigation and language switching, visual order, text alignment, food
layouts, forms and fieldsets, tables, mobile cards, status components, notifications, and bidi
isolation for Civil IDs, KWD amounts, ISO/local dates, English dish names, emails and phone
numbers. Email and telephone inputs are direction-locked. Nothing was mirrored that should not be.

**Arabic content honesty:** no Arabic dish names, ingredients or nutrition were fabricated. Seeded
English food content stays English, marked `lang="en" dir="auto"` inside RTL layouts. Arabic legal
text remains unavailable and English destinations are labelled as such at Arabic entry points.

## 7. Accessibility verification

Checked against rendered documents, not template source, across 26 page/locale combinations.

Verified with zero outstanding issues: every non-hidden form control has an associated label; every
button and link has an accessible name; every image has `alt`; exactly one `h1` per page with **no
heading-level skips anywhere**; a `main` landmark on every page; tables carry header cells; no
focusable content inside a hidden container that is not also `inert`; `:focus-visible` rules
present and the skip-link target resolves.

Drawer lifecycle exercised for real: closed = `hidden` + `inert` + `aria-expanded="false"`; open
moves focus inside and exposes `role="dialog"`; Escape closes it and **returns focus to the
toggle**. 10 `prefers-reduced-motion` media blocks are in force. No information depends on hover.

**One real issue found and fixed:** the Dashboard "Mark all read" control was a 24px touch target;
it is now padded to 44px with its visual weight unchanged. Two error pages had no `main` landmark
and four standalone auth pages had a `main` without the shared id — both corrected.

No formal WCAG certification is claimed. **Testing limits:** no screen-reader hardware pass, no
real-device touch testing, and reduced-motion behaviour was verified from the cascade rather than
by toggling an OS preference.

## 8. Responsive QA

Every required width was exercised on every page, in both languages, by loading each page once and
reflowing it across the full set (which is what a real resize does).

- **Mobile (18):** 320, 344, 360, 375, 390, 393, 402, 412, 428, 430, 440, 480, 540, 600, 640, 667, 720, 767
- **Tablet (15):** 768, 800, 810, 820, 834, 853, 900, 912, 960, 1024, 1080, 1114, 1180, 1194, 1199
- **Desktop (6):** 1200, 1279, 1280, 1366, 1440, 1600
- **Landscape:** 667×375 and 1024×768

| Surface | Checks | Failing |
| --- | ---: | ---: |
| Public, English | 546 | 0 |
| Public, Arabic | 429 | 0 |
| Product, English | 273 | 0 |
| Product, Arabic | 273 | 0 |
| School Admin, both languages | 156 | 0 |
| Landscape orientations | 12 | 0 |
| **Total** | **1,689** | **0** |

Each check asserts no document horizontal overflow and a present `main` landmark.

**Root-cause fixes, not device patches.** Three real overflows were found and fixed at their cause:

1. *Booking summary at 320/360px* — a label longer than the column could not shrink; the row now
   stacks below 420px rather than forcing a horizontal scroll on the page where a parent pays.
2. *Staff records at 320px* — a four-column table whose status badge could not wrap; padding and
   badge sizing tighten below 400px.
3. *School Admin trend chart at 641–767px* — fourteen `white-space:nowrap` axis labels set a
   min-content floor the flex tracks could not shrink below. Fixed by `min-width:0` on the track
   **and** by moving the chart→table handover to the width the content actually requires (~760px,
   measured: 14 × 40px labels + gaps + card padding), not an arbitrary device size. Above 768px the
   chart shows and the table is screen-reader-only; below it the chart gives way to the table
   carrying the same fourteen rows. Verified clean at 640/700/767/768/900.

## 9. Functional workflow verification

Run end to end against a fresh server and a fresh disposable database: **54 checks, 54 passing.**

- **Auth** — login success and failure, malformed Civil ID rejection, session cookie rotation,
  locale retention, logout (POST required, GET gone, session actually ended).
- **Register + Terms** — initially checked and required, unchecked POST rejected server-side,
  deselected state preserved, re-checked state preserved through a second error, valid registration
  succeeds.
- **Forgot Password** — known and unknown identifiers produce identical outcome text; no
  email-sent claim.
- **Students** — list, add, edit, ownership protection (editing another parent's child redirects),
  invalid name and invalid school rejected.
- **Menu** — five dishes, food details, programme statement present and unexpanded, Menu→Booking
  preselection.
- **Booking** — invalid plan / menu / date / days / unowned student each return 422 with a visible
  error; valid booking redirects (POST→redirect→GET); exactly one record written; the confirmation
  renders from the stored record; **replaying the confirmation URL writes nothing further**; price
  is exact against the day count; valid selections survive an invalid submission.
- **History** — records render, one status vocabulary, eligible cancel reports success, cancelling
  an already-cancelled booking is refused, cancelling an unowned booking is refused.
- **Profile** — valid update, invalid email rejected with the name preserved.
- **Staff** — invalid menu and invalid date rejected, valid booking succeeds, records show meal and
  status.
- **School Admin** — login, records scoped to the admin's own school, metric labels matching the
  queries, no live indicator, Arabic locale honoured.

**Database safety:** all destructive QA used disposable databases. No schema migration was
performed — the business semantics that would justify one remain unresolved (section 11), and the
brief is explicit that unresolved rules mean no migration.

## 10. Content and truth audit

Every term in the required list was searched across **rendered** pages (public, product and admin),
with the surrounding sentence inspected:

`live`, `real-time`, `realtime`, `fresh`, `freshly`, `canned`, `allerg*`, `safe`, `guarantee`,
`nuts`, `shellfish`, `sesame`, `soy`, `healthy`, `nutrition`, `KNET`, `push`, `reader`, `revenue`,
`analytics`, `partner`, `eaten`, `ate`, `certified`, `verified`.

Findings: `fresh`, `freshly`, `canned`, `healthy`, `safe`, `guarantee`, `certified`, `analytics`,
`real-time` and `realtime` do not occur outside the legal pages at all. Every remaining occurrence
is either a **disclaimer** ("no KNET transaction takes place", "This demo has no connected reader
or push service", "Illustrative example, not a live feed", "dish details are reference data, not
verified production information", "These records do not measure meals eaten or revenue"), ordinary
food content (ingredient lists, the four approved exclusions), or ordinary business language
("Partner with us" as an invitation, not a claim of existing partnerships). The `guarantee` hits in
the legal pages are all *negations* of a guarantee.

No claim was invented to replace anything. The stale capability strings found in dead dictionary
entries were deleted, not rewritten.

## 11. External blockers

Unresolved and **not** invented. The safest current behaviour is preserved in each case.

**Business / product model**
1. **Per-day fulfilment and daily service allocation** — a monthly booking remains one row with a
   day count and a total. There is no per-day allocation and no per-day collection ledger.
2. **Monthly collection semantics** — whether a month-long booking can be partly collected is
   undefined; a single `status` is what every screen reads.
3. **Partial-period cancellation and definitive refund rules** — cancellation is all-or-nothing on
   a booking row and the refund is simulated.
4. **Renewal semantics** and **Kuwait operational cutoff / timezone rules** — the booking window and
   "today" remain UTC-derived. `timeAgo` no longer misstates future timestamps, but a real
   business-day model needs stakeholder rules.
5. **Staff eligibility and genuine role scope** — Staff books a meal on the parent's own account and
   now says so explicitly. No caterer portal, no central-administrator platform, no separate staff
   authentication.

**Integrations**
6. **Payment gateway and refund settlement** — POST→redirect→GET removes browser resubmission only.
   This is **not** payment idempotency: provider integration, idempotency keys, webhook verification
   and reconciliation are all outstanding.
7. **Reader authentication and collection events** — no connected reader exists.
8. **Push and email delivery** — no transport exists. Notifications are stored records read at page
   load and are described as such. Password reset has no token or email implementation; Contact
   delivers and saves nothing.
9. **Collection is not consumption** — no record in this system establishes that a child ate a meal.
   Every surface states this. Do not publish a stronger claim before real integrations exist.

**Content and legal**
10. **Approved Arabic legal text** — none supplied; Terms and Privacy remain English and are
    labelled as such at Arabic entry points.
11. **Approved Arabic food data** — none supplied; English values are preserved with correct bidi
    handling rather than machine-translated.
12. **Production food provenance** — seed nutrition, ingredients, exclusions and photography are
    reference material, not verification of current production recipes or cross-contact practice.
13. **School verification** — configured schools are a demo setup, not verified active partnerships.
14. **Allergen/Terms scope reconciliation** — the programme statement covers four exclusions while
    the Terms discuss caterer dietary claims Evo does not independently verify. Stakeholders and
    legal must reconcile these; Phase 3 did not silently rewrite the clause.

**Infrastructure**
15. **Production session store** — MemoryStore; sessions are lost on restart and cannot scale past
    one instance.
16. **`style-src 'unsafe-inline'`** — requires migrating ~100 inline style attributes plus
    dynamically generated ones.
17. **Hero PNG fallback** — 2,988 KB after optimisation; further reduction needs proper image
    tooling or a JPEG fallback.
18. **Secrets management, backup/restore, deployment observability and provider failure handling** —
    all outstanding.

## 12. Test results

All commands run from the repository root, against a fresh server and a disposable database.

| Command / check | Result |
| --- | --- |
| `npm test` at Phase 3B entry | 53 passing, 0 failing |
| `npm test` final | **64 passing, 0 failing** (11 new hardening tests; none removed) |
| `node --check` — `server.js`, `db.js`, `lib/*.js`, `public/js/*.js`, `tests/*.js` | all passed |
| `git diff --check` | clean |
| Render sweep (42 page/locale contexts: 200, real `main`, no raw key, no `undefined`) | **42 / 42** |
| Functional regression | **54 / 54** |
| Responsive acceptance (39 widths + 2 landscape) | **1,689 / 1,689** |
| Accessibility audit (26 page/locale combinations) | 1 issue found, fixed, **0 remaining** |
| Locale key parity | en 791 / ar 791, **0 drift** |
| Stylesheet prune layout equivalence | **28 / 28 byte-identical** |
| Log redaction (live server, real sign-in) | cookie `[redacted]`; no password or Civil ID present |
| Browser console on public and product pages | **empty** |
| Asset requests (CSS, JS, hero, five dish images) | all 200 |

New tests in `tests/hardening.test.js`: session identifier rotation on parent login, registration
and admin login; pre-login CSRF token invalidation; locale survival across the session change;
logout is a CSRF-protected POST for both roles (GET gone, bad token leaves the session intact);
CSP header present with per-inline-script nonces and no `script-src 'unsafe-inline'`; per-request
nonce uniqueness; unhandled errors return a generic page with no message, path or stack frame;
unauthenticated write endpoints are rate limited.

One existing test was **updated, not removed**: the booking HTTP harness now loads a page after
signing in, because session regeneration deliberately invalidates the pre-login CSRF token — which
is exactly what a browser does.

## 13. Known remaining limitations

- No screen-reader hardware pass, no real-device touch testing, no cross-browser matrix. Everything
  in sections 7 and 8 was verified in one Chromium-based engine.
- Reduced-motion behaviour was verified from the cascade, not by toggling an OS preference.
- No Lighthouse or Core Web Vitals figure is claimed. The image and stylesheet numbers are source
  sizes, not network performance scores.
- The layout-measurement proxy strips `frame-ancestors` so pages can be framed for geometry
  readings. It alters no markup or CSS and is test-only, but it means those readings were taken
  without that one header present.
- Rate limiters are per-IP and in-memory; they reset on restart and will trip under repeated
  automated runs.
- Arabic editorial and legal review by a native speaker remains outstanding.
- The stylesheet prune is verified equivalent on the 14 pages measured; selectors used only in
  states not reachable during that measurement were kept precisely because they could not be proven
  dead.

## 14. Production readiness boundary

**This remains a reference/demo system, not a production deployment.**

The hardening in section 3 is real and worth having: session fixation is closed, a live
credential no longer appears in logs, scripts run under a nonce-based CSP, error responses no
longer leak internals, sign-out is CSRF-protected, and unauthenticated write endpoints are rate
limited. None of that changes what the system *is*.

It is not production-ready because the things a school meal service must actually do are not
connected: **no payment provider, no refund settlement, no reader, no push or email transport, no
per-day fulfilment model, and no verified food, school or partnership data.** Sessions live in
process memory, so a restart signs everyone out and a second instance cannot be added. The Kuwait
operational calendar, cancellation rules and collection semantics await stakeholder decisions.

Every one of those gaps is stated on the surface where a parent, school or caterer would otherwise
assume the opposite. Truthful incompleteness was chosen over fake completeness throughout. Treat
this as a working, honest reference implementation of the parent-facing product — and resolve
section 11 before representing it as a service.

## 15. Final Git state

| Item | Value |
| --- | --- |
| Branch | `main` |
| Phase 3A checkpoint | `fc3673c` — preserved, not rewritten |
| Phase 3B commit | see below |
| Working tree | clean |
| `origin/main` | synchronised with local `HEAD` after the push |

History was not squashed or rewritten. No force push was used.
