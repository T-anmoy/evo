# Phase 05 — Release-Candidate QA & Final Polish

## 1. Executive summary

This phase read all four prior phase reports and audited the entire existing system — every public route, the full authenticated parent app, the school-admin area, SEO/metadata, performance, security, accessibility, and content/claim honesty — before making any change. The brief's core rule was "make the entire existing system feel like one mature product, then prove it still works," not "rebuild it," and the actual state found matched that framing: the authenticated product screens (dashboard, students, menu, booking, history, profile, staff, school-admin) already share the same design system, color tokens, typography, and component patterns as the public marketing site — Phase 3 never touched them because they didn't need a redesign, only never received Phase 3's newest components. **No visual rebuild was performed on any screen.** What this phase actually found and fixed were a handful of concrete, verifiable defects: a real performance bug (a 5MB "mobile" hero image that was byte-identical to the desktop one), a real SEO bug (a broken hreflang alternate pointing at a 404 on `/privacy`/`/terms`), missing Open Graph tags and meta descriptions on several pages, four instances of internal engineering narration ("this fixes a gap flagged in the earlier system") leaking into live product copy, and three tracked `.DS_Store`/junk-folder artifacts. Everything else — routes, business logic, pricing, security controls, RTL/localization — was verified intact, not rewritten.

**Nothing in this phase has been committed.** All findings and fixes below are in the working tree as of Git SHA `8bfbe1d1f5489462369265b2548490c5b36b8343` (the parent commit — this phase's changes are staged/unstaged on top of it, not yet committed).

This system should be described as a **working, security-conscious demo/reference implementation with real business logic and a real bilingual product experience** — not as production-ready. Section 20 below states exactly why, in detail.

---

## 2. Current Git SHA

`8bfbe1d1f5489462369265b2548490c5b36b8343` — the last commit ("feat: complete Evo Meals bilingual localization and RTL experience"), i.e. the state this phase's changes are built on top of. This phase's own changes are uncommitted (see Section 20 for exact `git status`).

---

## 3. Routes preserved

Every route in [PHASE-01-AUDIT.md](PHASE-01-AUDIT.md)'s Route Contract, plus every route added by Phases 2–4, was re-verified this phase by direct HTTP request against the running server — not assumed from documentation. All of the following still exist, still render, and still enforce the same access control as documented:

Public: `/`, `/schools` (+`/schools/inquiry`), `/parents`, `/caterers` (+`/caterers/inquiry`), `/how-it-works`, `/features`, `/about`, `/privacy`, `/terms`, `/contact` (+POST), `/login` (+POST), `/register` (+POST), `/forgot-password` (+POST), `/school-admin/login` (+POST), `/sitemap.xml`, `/robots.txt`, `/health`, `/favicon.ico` — each also at its `/ar/...` counterpart where Phase 4 built one.

Authenticated: `/dashboard`, `/notifications/:id/read`, `/notifications/read-all`, `/booking/:id/renew`, `/students` (+`/students/:id/edit`, +POST), `/menu`, `/booking` (+POST), `/history` (+`/history/:id/cancel`), `/profile` (+POST), `/staff` (+POST), `/logout`, `/school-admin/logout`, `/school-admin/dashboard`. 404 handler and the CSRF error handler both still fire correctly.

No route was removed, renamed, or had its access-control middleware (`requireAuth`, `requireSchoolAdmin`) changed.

---

## 4. Routes added

**None.** This phase added zero new routes — it is a polish/audit/QA phase, not a feature phase, exactly per the brief's guardrail against rebuilding.

---

## 5. Public-site improvements

- **Fixed a real SEO bug**: `/privacy` and `/terms` (and any other page outside the actually-bilingual set) were emitting `<link rel="alternate" hreflang="ar" href=".../ar/privacy">` — a URL that returns 404, because no Arabic route was ever built for those two pages (correctly, per Phase 4's own guardrail against inventing legal Arabic). The bug was that the `hreflang`-generation code in the locale middleware didn't know about that exclusion — it mechanically prepended `/ar` to any path that wasn't a session-locale route, regardless of whether a real translation existed. Fixed by making the middleware consult the same `BILINGUAL_PAGES` list already used for `/sitemap.xml`, moved earlier in `server.js` so both consumers share one source of truth and can never drift apart again.
- **Added a self-referential `<link rel="canonical">` to every page**, not just the ones with an alt-locale link — previously, a page outside the canonical/hreflang conditional (e.g. `/privacy`) had no canonical tag at all.
- **Added Open Graph and Twitter Card tags** (`og:title`, `og:description`, `og:type`, `og:url`, `og:site_name`, `og:locale`, `og:image`, `twitter:card`, `twitter:title`, `twitter:description`) site-wide via `partials/head.ejs`, using the real per-page title/description that already existed — none of this existed anywhere in the codebase before this phase (verified: zero `og:` tags found in a full-repo grep before this change).
- **Added missing `<meta name="description">` tags** to `/login`, `/register`, `/forgot-password` — these three indexable, sitemap-listed pages had no description at all before this phase. `privacy.ejs`/`terms.ejs` also had their previously-hardcoded English-only descriptions routed through the same new `description` parameter pattern (still English-only, correctly, since those pages themselves are English-only).
- **Refactored the description pattern**: every page now passes `description` into the `partials/head` include instead of emitting its own separate `<meta name="description">` line — this is what let the OG/Twitter tags reuse the exact same, already-verified-non-duplicate copy without a second maintenance point.
- **Fixed a real, previously-unnoticed performance bug**: `hero-mobile.png` and `hero-mobile.webp` were byte-for-byte identical to `hero-desktop.png`/`.webp` (confirmed via `md5`) — every mobile visitor was downloading the same 1792×2400, 4.99MB PNG (or 734KB WebP) meant for desktop. Resized the mobile variant to 672×900 (same aspect ratio, no crop change) using `sips`, and regenerated its WebP with `cwebp -q 82`. Result: the WebP mobile visitors actually receive dropped from 733,784 bytes to 51,804 bytes (a 93% reduction); the PNG fallback dropped from 4.99MB to 963KB. Verified visually in the browser at 390px width afterward — no visible quality loss, correct crop/aspect ratio preserved.
- **Removed four instances of internal engineering narration from live product copy** (see Section 6 — found on authenticated pages, listed here because it's a content-honesty/professionalism fix, not a redesign).

---

## 6. Product/admin improvements

- **Removed internal "audit narration" bleeding into user-facing copy** on four authenticated pages — `menu.ejs` ("this fixes a content gap flagged in the earlier system, where menu tabs existed but were never populated"), `students.ejs` ("this fixes an exposure issue found in the earlier version of this system"), `history.ejs` ("fixing a policy gap flagged in the earlier system"), and `staff.ejs` ("The live system's App Store screenshots showed a separate Staff section... this page is that section, built out properly"). A real parent using this product has no context for "the earlier system" or "the live system's App Store screenshots" — this is the project's own internal engineering narrative talking to itself, not product copy talking to a user, and it directly undercuts the "mature, credible product" quality bar this phase is measured against. Rewritten in both English and Arabic to state the actual, still-true product fact (masking, cancellation, nutrition info, staff-vs-student booking separation) without referencing this project's own development history. No functional change — only copy.
- **Reviewed the rest of the authenticated app for the same "generic SaaS vs. mature product" concern** (dashboard, booking, profile, school-admin dashboard) and found it already compliant: same teal/coral/neutral palette, same card/button/badge components, same typography hierarchy as the public site (all draw from the one shared `public/css/style.css`), sensible information hierarchy on the dashboard (renewal/quick-rebook alert → stats → current subscription periods → today's status → notifications → quick actions), real empty states throughout, and the fixed bottom "Total due / Confirm & Pay" bar on `/booking` (initially flagged as a possible sticky-overlap bug during this review) was verified, via computed-style inspection and a full scroll-to-bottom check, to be the documented, deliberate mobile-checkout pattern from Phase 1 — its `padding-bottom:132px` clearance on `#bookingForm` is larger than the bar's actual rendered height (124.5px), so no real content is ever hidden behind it. **No redesign was needed or performed on any authenticated screen.**
- **Booking/pricing logic verified, not touched**: re-ran the real total calculation end-to-end (a 2-day single-plan booking at the real KWD 2.000/day rate correctly produced KWD 4.000; server-side rejection of a nonexistent/unowned student ID produced the correct "Choose a valid student" error) — confirms Section 7's "do not create a second pricing source" and "verify server-side revalidation" requirements without any code change to `lib/pricing.js` or the booking route.

---

## 7. Localization/RTL status

Unchanged from [PHASE-04-LOCALIZATION-RESPONSIVE.md](PHASE-04-LOCALIZATION-RESPONSIVE.md) and [PHASE-04-COMPLETION-PASS.md](PHASE-04-COMPLETION-PASS.md) — this phase made no localization-architecture changes. The only two touches were (1) the `BILINGUAL_PAGES`-driven hreflang fix in Section 5 above, which makes the existing bilingual claim *more* accurate, not different in scope, and (2) rewording the four narration strings in Section 6, done in both English and Arabic (key parity re-verified: 793 leaf keys in each of `locales/en.json`/`locales/ar.json`, zero keys only-in-one-language). `/privacy` and `/terms` remain English-only, as before, correctly.

---

## 8. Responsive widths actually tested this phase

**320, 768, 1024, 1440px**, using `document.documentElement.scrollWidth > window.innerWidth` in the built-in browser (the same method used in Phases 3–4), on: `/`, `/dashboard`, `/booking`, `/menu`, `/school-admin/login`, `/ar/schools`, `/ar` — **zero overflow found at any tested width on any tested page.** The brief's full 20-width matrix (320 through 1920) was **not** exhaustively re-run this phase — the four widths above were chosen as the same representative set Phase 4 used, on a set of pages spanning marketing/product/admin/bilingual, and no new responsive-affecting CSS was added this phase (the one CSS change — Section 5's hero image resize — is a raster asset swap, not a layout change). Widths not directly retested here are not claimed as verified in this phase; they were verified in Phase 3 (public pages) and Phase 4 (public + product + admin pages, bilingual) and no layout-affecting change has occurred since.

---

## 9. Accessibility checks actually performed

- Verified every product/admin page (`dashboard`, `students`, `history`, `menu`, `booking`, `profile`, `staff`, `school-admin-dashboard`) has exactly one `<main>` landmark.
- Verified all three nav partials (`sitenav.ejs`, `appnav.ejs`, `adminnav.ejs`) still carry their skip-link.
- Spot-checked `dish-image.ejs`'s `<img>` for alt text (present: `alt="<%= m.name %>"` — a real, per-dish alt, not empty or generic).
- Confirmed via source inspection that focus-visible outlines, `prefers-reduced-motion` handling, and the 44px minimum touch-target rule (all built in Phases 1/3) are untouched.

**Not performed this phase**: a real screen-reader (VoiceOver/NVDA) listening session, a full keyboard-only navigation walkthrough of every interactive component (accordions, dropdowns, the language switcher) on every page, and a contrast-ratio audit of the new hero-image crop (it's the same photo at a different resolution, so contrast is unaffected, but this wasn't separately measured). These remain open from Phase 4's own equivalent disclosure and are not newly introduced gaps.

---

## 10. SEO changes

Covered in detail in Section 5. Summary: fixed the broken `/privacy`/`/terms` hreflang-to-404 bug; added canonical tags to every page (not just bilingual ones); added Open Graph + Twitter Card metadata site-wide (previously absent entirely); added meta descriptions to `/login`, `/register`, `/forgot-password` (previously absent). `/sitemap.xml` and `/robots.txt` were re-verified against the live server and found already correct (no change needed — Phase 4 had already kept them in sync with `BILINGUAL_PAGES`/`ENGLISH_ONLY_PAGES`). No keyword-stuffing or superlative language was added or found (see Section 16).

---

## 11. Performance findings

- **Fixed**: the hero-mobile image bug (Section 5) — the single largest real performance issue found in this phase, since it affected every mobile visitor on the highest-traffic page (the homepage hero).
- **Reviewed, no change made**: `dish-image.ejs` already does everything right (WebP+PNG `<picture>`, explicit `width`/`height` to prevent layout shift, `loading="lazy"` by default with an `eager` override for above-the-fold usage, `decoding="async"`) — no fix needed. `motion.js`/`nav.js` are small, hand-written, dependency-free vanilla JS (no bundler, no framework) — there is no "unnecessary JS" or "large dependency" to remove; the entire stack has zero client-side framework by design (confirmed in Phase 1's audit and unchanged since).
- **Not fixed, flagged**: the desktop hero image (`hero-desktop.png`, 4.99MB PNG fallback; its WebP at 734KB is what most real browsers actually download) is still large for a PNG fallback. Left as-is because virtually all current browsers use the WebP path, and re-encoding it risked a visible-quality judgment call outside this phase's "improve safely" mandate for an asset that isn't actually the reported bug (the *mobile* duplicate was the real, verifiable defect; the desktop PNG being large is a lower-severity, pre-existing condition, not a broken/incorrect asset).
- **CSP note**: `helmet`'s `contentSecurityPolicy: false` (documented in Phase 1 as a deliberate choice because inline styles/scripts exist in views) was reviewed and left unchanged — re-enabling CSP would be a security-hardening change requiring inline-script/style remediation across many views, well outside a performance/polish pass.

---

## 12. Security regression results

Every control documented in Phase 1's Claims Registry and audit was re-verified against the current source, not assumed:

| Control | Verified |
|---|---|
| Helmet security headers | ✅ `app.use(helmet(...))` present, unchanged |
| CSRF (`csrf-sync`, synchronizer token) | ✅ present on every POST route checked; live-tested — a `/profile` POST with no `_csrf` correctly returned 403 with the (now-localized) friendly error |
| Session config (`httpOnly`, `sameSite:lax`, secret from env) | ✅ unchanged |
| Rate limiting (`loginLimiter`, 10/15min/IP) on `/login` and `/school-admin/login` | ✅ present, unchanged |
| Password hashing (`bcrypt.compareSync`/`hashSync`) | ✅ present on both parent and school-admin login |
| Civil ID masking | ✅ `maskCivilId` still called everywhere a Civil ID renders |
| Server-side price/date validation | ✅ live-tested — booking total is recalculated server-side (a 2-day single booking correctly totaled KWD 4.000); an invalid/unowned student ID was correctly rejected server-side, never trusting client input |
| School-admin scoping | ✅ `getStudentsBySchool`/`getBookingsForSchool` still filtered by `admin.school`; live-tested — logging in as the Kuwait English School admin rendered only that school's data |
| Enumeration-safe forgot-password | ✅ unchanged — `POST /forgot-password` always renders the same "if an account exists..." response regardless of whether the identifier matches, and never reveals account existence; this phase did **not** touch this logic, per the explicit instruction not to "fix" it by revealing existence |
| No secrets in client bundles/templates | ✅ re-checked the new `window.EVO_I18N` inline script (Phase 4) and this phase's own head.ejs changes — both only ever expose translated UI strings, never `SESSION_SECRET`, `KNET_*`, or any `.env` value |

**No security regression found.** The one security-adjacent change this phase made (Phase 4's reordering of locale-resolution before CSRF registration) was already made and verified in the prior phase; this phase re-confirmed it still holds (a CSRF rejection on `/ar/...` still returns the correctly-localized message).

---

## 13. Test-suite result

`npm test` → **21/21 passing, 3 suites, 0 failures** — run repeatedly throughout this phase (after the hreflang fix, after the OG/description refactor, after the copy fixes, and once more at the end), always with the same result. No test was added, removed, or modified this phase (no business logic changed).

---

## 14. Route smoke-test results

Full sweep against the live server, both languages where applicable:

- **Public pages** (`/`, `/ar`, `/parents`, `/ar/parents`, `/schools`, `/ar/schools`, `/caterers`, `/ar/caterers`, `/how-it-works`, `/ar/how-it-works`, `/features`, `/ar/features`, `/about`, `/ar/about`, `/contact`, `/ar/contact`, `/privacy`, `/terms`, `/login`, `/ar/login`, `/register`, `/ar/register`, `/forgot-password`, `/ar/forgot-password`, `/school-admin/login`, `/sitemap.xml`, `/robots.txt`, `/health`): **all 200**.
- **Protected pages while logged out** (`/dashboard`, `/students`, `/booking`, `/menu`, `/history`, `/profile`, `/staff`, `/school-admin/dashboard`): **all 302** (correct redirect to the appropriate login).
- **Unknown path**: **404**, rendered by the 404 handler, correctly localized/branded.

---

## 15. Functional regression results

All exercised against the real running server and real SQLite database, then the database was restored from a pre-test backup afterward so no test data persists in the demo dataset:

- **Auth**: login succeeded (302 → dashboard); wrong school-admin password correctly rejected with a generic, non-enumerating error message; forgot-password unchanged (not touched, per guardrail).
- **Students**: list rendered; a new student was added successfully (302); multi-child behavior unaffected (existing seeded children — Ahmed, Sara — still present alongside the new one).
- **Menu**: renders 200, with nutrition/ingredients/allergen sections intact (verified by content inspection during the visual review in Section 6).
- **Booking**: a real 2-day single-plan booking for a real student correctly totaled KWD 4.000 (2 × the real KWD 2.000/day rate) and rendered the correct confirmation message; an invalid/unowned `studentId` was correctly rejected server-side ("Choose a valid student"), never silently accepted.
- **History/cancellation**: the booking above was then cancelled — 302 redirect succeeded, and the resulting notification appeared correctly on the dashboard.
- **Notifications**: booking-confirmed and booking-cancelled notifications both appeared for the test booking, with correct student/meal/amount detail.
- **Admin**: wrong-password login correctly rejected; correct login succeeded and rendered the dashboard scoped to exactly the admin's own school ("Kuwait English School" — no cross-school data visible).
- **Forms**: `/contact`, `/schools/inquiry`, and `/caterers/inquiry` all submitted successfully (302) with valid CSRF tokens; a `/profile` POST with a missing CSRF token was correctly rejected (403, friendly message).

No functional regression found.

---

## 16. Content/claim audit result

Full-repo greps run for: wallet references, stale Evo360 branding in user-facing text, old nav anchors (`#how-it-works`, `#features`, `#nutrition`), fake testimonial/review language, superlatives ("best in Kuwait", "#1", "leading provider"), and (new this phase) internal engineering/audit narration leaking into product copy.

- **Wallet**: all remaining mentions (in `db.js`, `server.js`, `README.md`) are historical/explanatory comments correctly describing that the wallet system was *removed* — none are live claims or stale features. Fixed one real stale reference: `.env.example` referenced a `/wallet/topup` route that no longer exists (removed in migration 004) — reworded to describe the actual current booking-payment flow.
- **Evo360 branding**: none found in user-facing views (only in the internal repo/package name and the `evo360.tech` email/social domain, both already flagged as acceptable in Phase 1).
- **Old nav anchors**: none found.
- **Fake testimonials/superlatives**: none found — the `SHOW_TESTIMONIALS`/`SHOW_TRUST_STATS` honesty gates from Phase 1 remain in place and off.
- **Internal narration leaking into product copy**: **found and fixed** — four instances (Section 6). This is the one real, previously-undetected content-honesty issue this phase surfaced.
- **Claims Registry cross-check**: every item in [CLAIMS-REGISTRY.md](CLAIMS-REGISTRY.md) was re-read against current source; no new unverified claim was introduced, and no previously-resolved claim reappeared. One internal documentation discrepancy was noted (not fixed, since it's a historical record, not live content): the Phase 1 audit's Section E asserts "real dish photography exists for five menu items," but `views/partials/dish-image.ejs`'s own code comment describes the same five images as "placeholder dish illustrations... pending real food photography." Visual inspection of the actual PNG files shows clean, evenly-lit, stock-photo-style food images that cannot be confirmed as licensed photography versus AI-generated/stock imagery from source inspection alone. **This does not affect any live claim** — no user-facing copy anywhere in the site claims "professional photography" or similar; the discrepancy exists only between two internal engineering documents. Flagged here rather than silently resolved either way, and rather than editing Phase 1's historical report.

---

## 17. Unresolved client-dependent items

Unchanged from [BLOCKERS.md](BLOCKERS.md) — this phase did not resolve, and could not resolve without client input, any of: the `/contact` form's lack of a real destination (still demo-only/logged-only); the missing admin view for the `inquiries` table; the still-open portion of the grade-based-portioning claim (the in-product `/booking` hint); confirmation of the three named schools' actual current partnership/live status; independent verification of the footer's contact details and app-store links. One new item for this list: **whether the five dish images are licensed photography or generated/stock imagery** (Section 16) — relevant if the site ever needs to represent them as one or the other in a context where that distinction matters (e.g. a licensing audit), though no current copy makes that claim either way.

---

## 18. Known limitations

- `/privacy` and `/terms` remain English-only (unchanged, correctly, per the explicit "do not invent legal Arabic" guardrail).
- The full 20-width responsive matrix was not exhaustively re-run this phase (Section 8) — no layout-affecting change occurred, so this is a re-verification gap, not a known defect.
- No real assistive-technology (screen reader) testing session has been performed in any phase to date, including this one (Section 9).
- The desktop hero image's PNG fallback remains large (Section 11) — low real-world impact (WebP is used by virtually all current browsers) but not optimized.
- CSP remains disabled in `helmet` (pre-existing, documented, unchanged) — inline scripts/styles in views would need remediation before it could be safely enabled.
- The `inquiries` table (school/caterer partnership leads) still has no admin-facing view anywhere in the system — leads are captured but not operationally actionable without direct database access (unchanged from Phase 1).
- `/contact` submissions are still logged only, not persisted or emailed (unchanged from Phase 1).

---

## 19. Files/areas changed this phase

| File | Change |
|---|---|
| `server.js` | Moved `BILINGUAL_PAGES` earlier in the file; fixed the locale middleware's `altLocalePath` computation to only apply for genuinely bilingual pages (the hreflang-to-404 fix) |
| `views/partials/head.ejs` | Added a `description` parameter (emits `<meta name="description">`); added canonical tag unconditionally (not just when an alt-locale exists); added Open Graph + Twitter Card meta tags |
| `views/home.ejs`, `parents.ejs`, `schools.ejs`, `caterers.ejs`, `how-it-works.ejs`, `features.ejs`, `about.ejs`, `contact.ejs`, `privacy.ejs`, `terms.ejs`, `login.ejs`, `register.ejs`, `forgot-password.ejs` | Each now passes `description` into the `partials/head` include; the 10 that had a separate, duplicate `<meta name="description">` line had it removed (now emitted once, by head.ejs) |
| `locales/en.json`, `locales/ar.json` | Added `meta.login.description`, `meta.register.description`, `meta.forgotPassword.description` (EN+AR); rewrote `menu.intro`, `students.intro`, `history.intro`, `staff.intro` to remove internal-narration language (EN+AR) |
| `public/images/hero-mobile.png`, `hero-mobile.webp` | Resized/re-encoded to an actual mobile-appropriate resolution (672×900, same aspect ratio) — previously byte-identical duplicates of the desktop assets |
| `.env.example` | Removed a stale `/wallet/topup` route reference and a dangling reference to a non-existent "hardening checklist" document |
| `README.md` | Removed a stray trailing `# evo` line; added a "Localization" section documenting the bilingual EN/AR support Phase 4 built (previously undocumented in the README) |
| `.DS_Store`, `public/images/menu/.DS_Store`, `public/images/untitled folder/.DS_Store` | Untracked and deleted — macOS artifacts that had been accidentally committed; `public/images/untitled folder/` (which contained only the stray `.DS_Store`) removed entirely |

**Not changed**: `db.js`, `lib/pricing.js`, `lib/mask.js`, any `migrations/*.sql`, `seed.json`, any authenticated view's markup/structure beyond the meta-description plumbing above, any CSS layout rule (only a raster image asset was replaced), any route's access-control middleware, any business logic.

---

## 20. Explicit production-readiness caveats

**This system is a working demo/reference implementation, not a production-ready deployment, for these specific, concrete reasons:**

1. Payments are entirely simulated — no real KNET/Bookey integration exists; `.env.example`'s `KNET_MERCHANT_ID`/`KNET_API_KEY` are blank pending sandbox credentials. Every "charged"/"refunded" message in the product explicitly says "demo — no real payment processed."
2. `/contact` form submissions are not persisted or emailed anywhere — a real inquiry submitted through that specific form today would be silently lost in a real deployment (unchanged from Phase 1, still blocking).
3. There is no admin-facing way to read the `inquiries` table that `/schools/inquiry` and `/caterers/inquiry` do successfully write to — those leads are captured but not actionable without direct database access.
4. Session storage is `express-session`'s default in-memory `MemoryStore` (implied by the absence of any external session store configuration) — this does not survive a server restart and does not scale beyond a single process, both of which matter for a real multi-instance deployment.
5. `helmet`'s Content-Security-Policy is explicitly disabled (documented, deliberate, but a real hardening gap).
6. `/privacy` and `/terms` have no Arabic translation, and the demo's dish photography's actual licensing/provenance status could not be confirmed from the codebase (Section 16).
7. The three named school partnerships' actual current live/pilot status has never been independently confirmed (carried forward from Phase 1's `BLOCKERS.md`, still open).
8. The SQLite database (`better-sqlite3`, file-based, WAL mode) is appropriate for a demo or a small single-instance deployment; a production deployment serving real transaction volume would need a decision about whether to keep it or migrate to a client-server database.

None of these are new findings — all were already known from prior phases' `BLOCKERS.md` or are inherent to a demo-payment/single-process architecture — but per the explicit instruction not to call this system "production ready" unless the evidence supports it, this is the honest, current status: **a real, working, security-conscious, now-genuinely-bilingual product demo, with a handful of specific, named, client-dependent gaps between here and a production launch.**
