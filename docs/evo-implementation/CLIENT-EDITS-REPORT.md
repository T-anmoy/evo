# Evo Meals client edits report

## Delivery and preflight

Implemented the ten requested phases directly on `main`. The phase commits are listed below; Phase 10 contains final QA fixes, coverage and this report. Delivery verification appears in the final section.

The initial checkout was `main` at `1aee5c6`. The only initial untracked content was the supplied `public/images/brand/` directory. The preceding five commits were `1aee5c6`, `8cb02ae`, `2e65265`, `03312da`, and `656b85c`. `npm install` succeeded. The baseline suite passed **64 tests**; the final suite passes **70 tests**, with no failures or skips. Full tests passed before each phase commit.

No deployment configuration, existing booking rows, legal wording, default checked registration consent, staff booking behavior, Contact form behavior, palette or motion system was changed. Existing metadata was retained.

## Changes by phase

### Phase 1: Register hint and About story

Commit: `c363062`.

Files: `locales/ar.json`, `locales/en.json`, `views/about.ejs`.

### Phase 2: Shared logo, optimized assets and favicon

Commit: `c5455ef`.

Files: `public/css/style.css`, `public/images/brand/evo-mark.png`, `public/images/brand/evo-mark.webp`, `public/images/brand/evo360logo.png`, `public/images/brand/evo360logo.webp`, `views/404.ejs`, `views/500.ejs`, `views/forgot-password.ejs`, `views/login.ejs`, `views/partials/adminnav.ejs`, `views/partials/appnav.ejs`, `views/partials/brand-logo.ejs`, `views/partials/head.ejs`, `views/partials/sitefoot.ejs`, `views/partials/sitenav.ejs`, `views/register.ejs`, `views/school-admin-login.ejs`.

### Phase 3: Shared Terms content and accessible dialog

Commit: `d9dc5da`.

Files: `locales/ar.json`, `locales/en.json`, `public/css/style.css`, `public/js/terms-dialog.js`, `views/partials/terms-content.ejs`, `views/partials/terms-dialog.ejs`, `views/register.ejs`, `views/terms.ejs`.

### Phase 4: Add-student entry point and validated Class/Section lists

Commit: `6c9727b`.

Files: `lib/validate.js`, `locales/ar.json`, `locales/en.json`, `migrations/006_student_class_section.sql`, `public/js/students.js`, `server.js`, `views/partials/student-form.ejs`, `views/students.ejs`.

### Phase 5: Collection display feature flag, disabled by default

Commit: `59790f3`.

Files: `lib/features.js`, `locales/ar.json`, `locales/en.json`, `public/css/style.css`, `server.js`, `tests/features.test.js`, `views/dashboard.ejs`, `views/history.ejs`, `views/home.ejs`, `views/how-it-works.ejs`, `views/parents.ejs`, `views/partials/collection-demo.ejs`, `views/partials/example-status.ejs`, `views/partials/features-section.ejs`, `views/partials/parent-journey.ejs`, `views/partials/sitefoot.ejs`, `views/school-admin-dashboard.ejs`, `views/staff.ejs`.

### Phase 6: Features merged into the three-step booking guide

Commit: `e4df31b`.

Files: `locales/ar.json`, `locales/en.json`, `public/css/style.css`, `server.js`, `views/features.ejs`, `views/home.ejs`, `views/how-it-works.ejs`, `views/parents.ejs`, `views/partials/sitenav.ejs`.

### Phase 7: Corporate Meals inquiry page and permanent redirects

Commit: `bf1ff59`.

Files: `locales/ar.json`, `locales/en.json`, `server.js`, `views/caterers.ejs`, `views/contact.ejs`, `views/corporate-meals.ejs`, `views/home.ejs`, `views/partials/features-section.ejs`, `views/partials/sitefoot.ejs`, `views/partials/sitenav.ejs`.

### Phase 8: Authoritative monthly subscription flow, calendar, seed and dashboards

Commit: `91aaba3`.

Files: `db.js`, `db/subscriptions.js`, `lib/booking-input.js`, `lib/pricing.js`, `lib/subscription-routes.js`, `lib/subscription.js`, `locales/ar.json`, `locales/en.json`, `migrations/007_subscriptions.sql`, `public/css/style.css`, `public/js/subscription.js`, `seed.json`, `server.js`, `tests/booking-input.test.js`, `tests/pricing.test.js`, `tests/subscription-flow.test.js`, `tests/subscription.test.js`, `views/booking.ejs`, `views/dashboard.ejs`, `views/parents.ejs`, `views/partials/subscription-review.ejs`, `views/partials/terms-dialog.ejs`, `views/school-admin-dashboard.ejs`, `views/subscription-meals.ejs`.

### Phase 9: Subscription history, PDF invoices and cancellation removal

Commit: `8b42749`.

Files: `db.js`, `lib/invoice.js`, `locales/ar.json`, `locales/en.json`, `package-lock.json`, `package.json`, `public/css/style.css`, `public/js/motion.js`, `server.js`, `tests/subscription-flow.test.js`, `views/history.ejs`, `views/home.ejs`.

### Phase 10: tests and QA

Added localization and student migration checks, expanded transactional and HTTP coverage, and removed unused legacy booking write helpers. Reused the six-month constant in the form, handled non-string student submissions safely, preserved changed meal choices when proceeding directly to payment, and adjusted Arabic header controls at narrow widths. The disabled collection flag now also removes the collection-reader metaphor from the 404 page. Terms dialog styling uses the existing legal presentation.

Files: `db.js`, `lib/subscription-routes.js`, `locales/en.json`, `locales/ar.json`, `public/css/style.css`, `public/js/terms-dialog.js`, `server.js`, `tests/subscription-flow.test.js`, `tests/localization.test.js`, `tests/student-migration.test.js`, `views/404.ejs`, `views/booking.ejs`, `views/subscription-meals.ejs`, this report and `client-edits-qa/` evidence.

## Assumptions for client confirmation

| Item | Implemented default |
|---|---|
| First month | Earliest month whose first day is at least seven days after the Kuwait payment/booking date. The pure function isolates this rule. A booking on 22 November 2025 starts December under this rule; the supplied guide showed January. |
| Duration | One to six consecutive calendar months. |
| Meal changes | Allowed strictly before 48 hours before midnight at the start of the meal day in Kuwait; locked at the exact boundary. |
| Classes and sections | KG1, KG2, Grade 1–12; sections A–F. Known stored variations normalize; unknown values remain untouched. |
| Default meals | Rotate by meal-day index through ascending menu IDs, excluding tags containing Dessert. The supplied menu yields IDs 1–4 and excludes dessert ID 5. Replace with the client's approved rotation when available. |
| Corporate Meals | Inquiry-only; no corporate account or payment flow was invented. Employee range uses existing `scale_info`. |
| Invoice | English-only, generated with PDFKit on demand. Existing contact details and masked Civil ID; no invented legal entity, registration or VAT number. |
| Payment terms | Existing, unchanged Terms of Use stand in for dedicated payment terms. Replace only when the client supplies approved text. |
| Logo | Supplied transparent 4104×1212 PNG has a white **EVO 360** wordmark and **Inspire - Innovate - Evolve** tagline. The site name remains Evo Meals. This mismatch needs client confirmation. The transparent mark crop is 975×1212. No recoloring or filtering. |
| Calendar | Illustrative Friday/Saturday weekends and existing placeholder holiday offsets; startup fills missing dates through the end of the eighth month ahead without replacing existing rows. Not a real school calendar. |
| Demo seed | Each demo child has a paid current-month subscription, simulated as purchased seven days before its first day. Existing deployed legacy rows remain in place and are neither migrated into subscriptions nor displayed. |
| Draft | One active draft per parent session. Replacing it invalidates older form tokens. |
| KNET | Simulated only. No real payment is processed. |

## Verification

- Automated tests cover first-month and Kuwait-date boundaries, 1–6 months, complete calendars, positive totals, three-decimal money, tampered drafts, refreshed prices, stale tokens, step order, ownership, unique month booking, double-submit idempotence and transaction rollback.
- HTTP checks cover meal changes and cutoff, PDF ownership/headers, removed renewal/cancellation routes, bilingual permanent redirects, corporate validation/storage, class/section validation, consent and disabled/enabled collection rendering.
- Localization checks compare complete English/Arabic key sets (including 165 added and 25 changed Arabic strings), literal translation references and dynamic translation families, and reject references to removed keys.
- Rendered Terms text before and after extraction is identical: 5,929 normalized characters. The modal and page use one legal content partial.
- Browser sweep checked 25 pages in both languages at all 12 requested widths: 320, 344, 360, 375, 390, 412, 430, 768, 820, 1024, 1280 and 1440. It produced 600 page/width checks plus two registration keyboard checks and 104 screenshots. It found the narrow Arabic header overflow subsequently fixed in Phase 10.
- The final authenticated-page recheck completed **386 checks and 68 screenshots with zero horizontal overflow**. Its only console findings were the two view-transition aborts described below. Expected 404/500 responses were checked intentionally. Results: `client-edits-qa/final-layout-recheck.json`.
- Keyboard checks filled every registration field, opened/scrolled/closed Terms with Enter/Escape, and confirmed field values, checked consent and focus restoration. Booking checks changed meals, proceeded with the keyboard, declined/accepted Terms and reached simulated KNET.
- A separate browser with JavaScript disabled completed a two-month Arabic booking, including changed meal persistence, full-page Terms and simulated payment. The registration fallback retains its new-tab Terms link and form values.
- The generated invoice was rendered to PNG and visually inspected; its contact details, masked ID, monthly figures, total and simulated payment label fit clearly.
- No CSP violations were recorded. The initial rapid browser sweep recorded three view-transition aborts in the existing motion system; the final layout recheck still recorded two such aborts despite requesting Chromium disable cross-document view transitions. This console-error acceptance item remains a documented limitation of the unchanged motion system. No motion changes were made.

Evidence: `client-edits-qa/initial-sweep.json`, `client-edits-qa/no-javascript.json`, `client-edits-qa/tests.txt`; complete local screenshots are in `/tmp/evo-qa/` and final authenticated-page captures in `/tmp/evo-qa-recheck/`. Representative contact sheets and the final recheck results accompany this report.

## Discrepancies and out-of-scope findings

- `docs/evo-implementation/FINAL-REFINEMENT-PROMPT.md:56` says **“8. Do not remove existing pages.”** The current user instruction explicitly overrides that rule. The Features and Caterers views were removed with permanent redirects.
- The Home/Parents hero toasts described in the prompt were already absent. Existing collection-related elements were gated wherever present.
- The seeded Class/Section values already matched the approved lists; the normalization migration handles older variants.
- The 404/500 logo cards are light backgrounds, so they use the mark plus live brand name.
- Existing page metadata still includes older caterer/collection wording because the scope fence explicitly protects meta titles and descriptions. Remaining mentions are inventoried below.
- `npm install` reported five pre-existing dependency advisories: body-parser (moderate), brace-expansion (high), express (moderate), ip-address (moderate), and qs (moderate). Unrelated dependency upgrades were not applied.
- The existing session storage configuration remains unchanged; drafts follow its existing persistence behavior.
- The existing failed-add student form uses an editing-shaped error object and can mask the entered Civil ID on redisplay. Civil ID behavior was explicitly outside this task; it was not redesigned.
- Existing historical `booking_cancelled` notifications still render. No cancellation action remains. The legacy `bookings` table and its rows remain intact, and application booking writes use the new subscription tables.

## Remaining “caterer” mentions

The following case-insensitive inventory includes active partner copy, preserved metadata, retained locale keys, redirect/tests and historical documentation. Partner descriptions and legal text were intentionally retained. Paths and line numbers refer to the completed source before adding this report. The report itself is excluded to avoid a recursive inventory.

```text
README.md:120:The public marketing pages (`/`, `/parents`, `/schools`, `/caterers`, `/how-it-works`,
db.js:370:// ---------- Inquiries (Schools / Caterers lead capture) ----------
docs/evo-final-verification.md:113:Register, Forgot Password, Contact, School inquiry and Caterer inquiry. These are not
docs/evo-final-verification.md:223:- **Regression fixed**: the FAQ's "marked Upcoming" and the caterer queue's "Upcoming" label were
docs/evo-final-verification.md:230:Checked in Arabic across all public routes (Home, Parents, Schools, Caterers, Features, How It
docs/evo-final-verification.md:368:   now says so explicitly. No caterer portal, no central-administrator platform, no separate staff
docs/evo-final-verification.md:391:    the Terms discuss caterer dietary claims Evo does not independently verify. Stakeholders and
docs/evo-final-verification.md:467:Every one of those gaps is stated on the surface where a parent, school or caterer would otherwise
docs/evo-implementation/BLOCKERS.md:9:- **Issue:** `POST /contact` (server.js:222) validates input and calls `logger.info(...)` with an explicit code comment: *"Demo only — no email/CRM integration wired up yet."* Nothing is persisted or sent anywhere. By contrast, `/schools/inquiry` and `/caterers/inquiry` both persist to a real `inquiries` table.
docs/evo-implementation/BLOCKERS.md:18:- **Issue:** `/schools/inquiry` and `/caterers/inquiry` both write real rows to `inquiries` (migration 003), but no route or view anywhere reads that table back. There is no way to see submitted leads except direct database access.
docs/evo-implementation/BLOCKERS.md:21:- **Client decision required:** Is an admin-facing inquiries list in scope for a later phase, and if so, does it belong behind a new admin auth role, or the existing school-admin login (which is scoped per-school and wouldn't fit a cross-school/caterer inquiry list)?
docs/evo-implementation/CLAIMS-REGISTRY.md:23:| 15 | Testimonials (parent/school/caterer quotes) | None found — `SHOW_TESTIMONIALS = false`, placeholder text explicitly reads "[Quote pending — real testimonial from a parent using Evo Meals]" | **No — do not invent or turn on without real, attributable quotes** | All | Same pattern as #14. Do not attribute a quote to an invented person. |
docs/evo-implementation/CLAIMS-REGISTRY.md:31:| 22 | Caterer order-queue table (`/caterers`, added Phase 2) | New content, no backing data — explicitly a mockup | Yes, **only with the "illustrative example... not a live feed" label already attached** | Caterers | Added in Phase 2 to make the "digital order queue" concept tangible. Uses the same seeded menu item names as the rest of the site (real product data) but invented example order rows — never publish this table without its illustrative-example qualifier. |
docs/evo-implementation/FINAL-REFINEMENT-PROMPT.md:118:- connected school/parent/caterer flow
docs/evo-implementation/FINAL-REFINEMENT-PROMPT.md:198:Caterers
docs/evo-implementation/FINAL-REFINEMENT-PROMPT.md:265:8. concise school/caterer pathway
docs/evo-implementation/FINAL-REFINEMENT-PROMPT.md:579:E. ORGANIZATION / SCHOOL / CATERER NAME
docs/evo-implementation/FINAL-REFINEMENT-PROMPT.md:599:Caterer examples:
docs/evo-implementation/FINAL-REFINEMENT-PROMPT.md:1163:- /caterers
docs/evo-implementation/FINAL-REFINEMENT-PROMPT.md:1179:- /ar/caterers
docs/evo-implementation/FINAL-REFINEMENT-PROMPT.md:1207:- caterer inquiry validation
docs/evo-implementation/FINAL-REFINEMENT-QA.md:16:- Every public/authenticated form's client- and server-side validation (`server.js`, `public/js/motion.js`, `views/register.ejs`, `views/students.ejs`, `views/profile.ejs`, `views/contact.ejs`, `views/schools.ejs`, `views/caterers.ejs`)
docs/evo-implementation/FINAL-REFINEMENT-QA.md:27:Separately, `.partner-form-wrap` (the Schools/Caterers lead-capture layout) and roughly 30 other grid declarations used bare `1fr` / `1fr 1fr` tracks. A CSS grid item's default `min-width` is `auto` (its own max-content size), so a track declared as plain `1fr` cannot shrink below its content's natural width — this is what caused the *actual* horizontal-overflow bug found during the responsive sweep (see section 15), on `/schools`, `/caterers`, and (more severely, since Arabic UI strings run longer) nearly every Arabic page at 320px.
docs/evo-implementation/FINAL-REFINEMENT-QA.md:34:- **Drawer hierarchy**, top to bottom: **Check My School** (new, primary) + **Log in** as a two-up priority row → **Register** → the full nav list (Home, For Parents, For Schools, For Caterers, How It Works, Features, About, Contact) → language switch, matching the spec's target order exactly.
docs/evo-implementation/FINAL-REFINEMENT-QA.md:41:Audited the existing section order against the spec's desired narrative (proposition → check school/login → verified school context → food/menu proof → journey → collection confirmation → multiple children → school/caterer pathway → app → FAQ → final CTA). **The existing order already matched this exactly** (sections `4.1`–`4.10` in `home.ejs`) — no reordering was needed. Changes were limited to the hero CTA row (above) and are otherwise covered by the palette change (section 8).
docs/evo-implementation/FINAL-REFINEMENT-QA.md:62:- `POST /schools/inquiry` and `POST /caterers/inquiry`: organization-name and contact-name checks upgraded from "non-empty" to real format checks (`isValidOrgName` rejects digits-only, allows real names like "360 Foods"; `isValidName` for the contact person). Phone, if provided, is now validated (was previously accepted unchecked).
docs/evo-implementation/FINAL-REFINEMENT-QA.md:161:**Public (EN):** `/`, `/parents`, `/schools`, `/caterers`, `/how-it-works`, `/features`, `/about`, `/contact`, `/login`, `/register`, `/forgot-password`, `/privacy`, `/terms`, and a 404 path.
docs/evo-implementation/FINAL-REFINEMENT-QA.md:162:**Public (AR):** `/ar`, `/ar/parents`, `/ar/schools`, `/ar/caterers`, `/ar/how-it-works`, `/ar/features`, `/ar/about`, `/ar/contact`, `/ar/login`, `/ar/register`, `/ar/forgot-password`.
docs/evo-implementation/FINAL-REFINEMENT-QA.md:203:views/caterers.ejs
docs/evo-implementation/PAGE-CONTRACT.md:10:- **Primary audience:** Parents (per the required parent-first homepage strategy), with clear secondary routing to Schools/Caterers.
docs/evo-implementation/PAGE-CONTRACT.md:12:- **Secondary CTA:** "Explore the School platform" / "Explore the Caterer platform" (routes to `/schools`, `/caterers`).
docs/evo-implementation/PAGE-CONTRACT.md:13:- **Belongs here:** Brand introduction, the 5-role how-it-works summary (via shared partial), a condensed for-schools/for-parents/for-caterers teaser, feature summary (via shared partial), nutrition/menu preview, dashboard preview (explicitly labeled as a non-live preview), FAQ.
docs/evo-implementation/PAGE-CONTRACT.md:14:- **Must defer elsewhere:** Full parent step-by-step detail belongs on `/parents` (currently duplicated — see audit Section H, a Phase 2+ decision); full school benefits belong on `/schools`; full caterer benefits belong on `/caterers`; full feature-by-role detail belongs on `/features`; full platform-flow detail belongs on `/how-it-works`.
docs/evo-implementation/PAGE-CONTRACT.md:46:### `/caterers` — For Caterers
docs/evo-implementation/PAGE-CONTRACT.md:50:- **Primary CTA:** "Partner with us" (scrolls to `#caterer-form` → `POST /caterers/inquiry`).
docs/evo-implementation/PAGE-CONTRACT.md:53:- **Required trust/qualification notes:** No caterer count, order-volume, or revenue figures currently exist — do not add without verified numbers.
docs/evo-implementation/PAGE-CONTRACT.md:61:- **Primary audience:** Any — this page is audience-neutral by design (it exists precisely so schools/parents/caterers pages, and external links/ads, have one canonical place to point to instead of a homepage anchor).
docs/evo-implementation/PAGE-CONTRACT.md:62:- **Primary CTA:** "Create your account" (parent-biased default, consistent with the parent-first strategy), with explicit links out to `/parents`, `/schools`, `/caterers` for audience-specific next steps.
docs/evo-implementation/PAGE-CONTRACT.md:63:- **Belongs here:** Exactly the 5-step platform-flow content (School → Parent → Evo Meals → Caterer → Student), reused via `partials/how-it-works-section.ejs` — the same content shown inline on `/`.
docs/evo-implementation/PAGE-CONTRACT.md:64:- **Must defer elsewhere:** Audience-specific benefits/pricing/forms — this page intentionally stays generic and links out rather than duplicating `/parents`/`/schools`/`/caterers` content.
docs/evo-implementation/PAGE-CONTRACT.md:75:- **Belongs here:** The by-role feature chip list (Parents/Schools/Caterers/Students/Administrators), reused via `partials/features-section.ejs`.
docs/evo-implementation/PAGE-CONTRACT.md:100:- **Must defer elsewhere:** School/caterer partnership inquiries are better served by the dedicated `/schools`/`/caterers` forms (which actually persist to the `inquiries` table) — `/contact` submissions are currently **logged only, not stored or emailed anywhere** (see Blockers).
docs/evo-implementation/PAGE-CONTRACT.md:111:- **Belongs here:** Data collection/sharing/retention detail (`/privacy`); marketplace model, caterer-verification disclaimer, order/cancellation terms (`/terms`).
docs/evo-implementation/PAGE-CONTRACT.md:113:- **Required trust/qualification notes:** Both already contain the correct disclaimers (no independent caterer/allergen verification, no delivery-time guarantee, data shared with catering partner disclosed) — preserve these verbatim in any future copy pass; they are load-bearing legal qualifiers, not marketing copy to be "improved" away.
docs/evo-implementation/PHASE-01-AUDIT.md:46:Public: `/`, `/ar`, `/schools` (+`/ar`), `/parents`, `/caterers`, `/how-it-works`,
docs/evo-implementation/PHASE-01-AUDIT.md:139:screenshot/DOM verification of `/`, `/parents`, `/schools`, `/caterers`,
docs/evo-implementation/PHASE-02-CONTENT-IA.md:17:| `views/home.ejs` | Full content/structure rewrite — from a 15-section mega-page duplicating `/parents`, `/schools`, `/caterers`, and `/features` content, down to the ~10 purposeful moments specified in this phase (hero, supported schools, trust row, menu proof, core journey, collection proof, multiple children, B2B pathways, app, short FAQ, final CTA) |
docs/evo-implementation/PHASE-02-CONTENT-IA.md:20:| `views/caterers.ejs` | Restructured from 3 sections into the spec's structure (hero, digital order queue, demand visibility, school-specific fulfilment, reduced manual processing, onboarding, enquiry); added a new illustrative order-queue table to make the kitchen experience tangible, per the brief's explicit request |
docs/evo-implementation/PHASE-02-CONTENT-IA.md:21:| `views/contact.ejs` | Restructured into three intent pathways (parent support / school partnership / catering partnership); the two B2B pathways link to the existing, already-working `/schools#partner-form` and `/caterers#caterer-form` forms instead of duplicating them; the parent-support form is unchanged functionally, with softer, non-SLA copy |
docs/evo-implementation/PHASE-02-CONTENT-IA.md:22:| `views/how-it-works.ejs` | Added the three short role-flow summaries (Parent: Book→Pay→Tap→Notified; School: Set up→Monitor→Report; Caterer: Receive→Prepare→Deliver) below the canonical 6-step sequence |
docs/evo-implementation/PHASE-02-CONTENT-IA.md:42:| "For Schools" 6-bullet teaser + "For Caterers" 4-bullet teaser (the entire mini sales pitch for each) | **`/schools`** and **`/caterers`** respectively — the homepage now shows only the two concise panels specified in section 4.7 ("Run your school meal programme with less manual coordination" / "Prepare from clear digital demand and school-specific orders"), each linking to the full page |
docs/evo-implementation/PHASE-02-CONTENT-IA.md:45:| 11-question, 5-category mega-FAQ | **Condensed to 4 conversion-relevant questions** (tap mechanics, payment safety, allergy handling, cancellation) directly on the homepage, with a link to `/parents` (booking/pricing detail) and `/features` (platform-wide capability detail). The "Schools & Caterers" FAQ category was dropped from the homepage FAQ specifically because that content is now properly owned by the dedicated `/schools` and `/caterers` pages (onboarding sections) rather than a homepage footnote. |
docs/evo-implementation/PHASE-02-CONTENT-IA.md:58:4. **New caterer order-queue table** (added this phase, `/caterers`) — explicitly labeled "Illustrative example... not a live feed" in its own section intro, per the guardrail against presenting demo/sample records as live customer activity.
docs/evo-implementation/PHASE-02-CONTENT-IA.md:59:5. **No new unverified claims were introduced anywhere else** — every new sentence written this phase was checked against what section 6/7's guardrails explicitly prohibit (no guaranteed revenue, adoption, volume, or savings language was added to `/schools` or `/caterers`; no caterer partnership/revenue-share model was described, since none is verified — see the explicit "skipped" comment in `caterers.ejs` above the onboarding section).
docs/evo-implementation/PHASE-02-CONTENT-IA.md:69:| `/` | Check Your School → `#supported-schools` (same page) · See How It Works → `/how-it-works` · Download App → `#app` (same page) · Explore the menu experience → `/parents#menu` · For Schools panel → `/schools` · For Caterers panel → `/caterers` · App Store / Google Play → external store links · Final CTA: Parent → `/register` + `/login`, School → `/schools`, Caterer → `/caterers` |
docs/evo-implementation/PHASE-02-CONTENT-IA.md:72:| `/caterers` | Partner with us → `#caterer-form` · form submit → `POST /caterers/inquiry` — **zero `/register` CTAs** |
docs/evo-implementation/PHASE-02-CONTENT-IA.md:73:| `/how-it-works` | Create your account → `/register` (single CTA) · in-copy links to `/parents`, `/schools`, `/caterers` |
docs/evo-implementation/PHASE-02-CONTENT-IA.md:74:| `/contact` | Use the form below → `#parent-support` (same page) · Go to School partnership form → `/schools#partner-form` · Go to Catering partnership form → `/caterers#caterer-form` · form submit → `POST /contact` — **zero `/register` CTAs** |
docs/evo-implementation/PHASE-02-CONTENT-IA.md:77:Across all seven public marketing pages, only two (`/parents`, `/how-it-works`) send any CTA to `/register`, and both do so alongside at least one non-register alternative (`/login`, or the audience-specific pages). `/schools`, `/caterers`, and `/contact` send zero CTAs to `/register`.
docs/evo-implementation/PHASE-02-CONTENT-IA.md:83:- **`/features`**: already grouped by Parents/Students/Schools/Caterers/Administrators exactly as section 9 of this phase's brief specifies, and every listed capability was independently verified against actual routes/DB tables in the Phase 1 audit. No enterprise features, integrations, or analytics beyond what's real were present. No change needed.
docs/evo-implementation/PHASE-02-CONTENT-IA.md:102:`/`, `/schools`, `/parents`, `/caterers`, `/how-it-works`, `/features`, `/about`, `/privacy`, `/terms`, `/contact`, `/login`, `/register`, `/forgot-password`, `/school-admin/login`, `/sitemap.xml`, `/robots.txt`, `/health`.
docs/evo-implementation/PHASE-02-CONTENT-IA.md:114:- `POST /caterers/inquiry` (from the restructured `/caterers` page) → 302 (success)
docs/evo-implementation/PHASE-02-CONTENT-IA.md:118:**Visual verification (browser, not just HTTP status):** loaded `/` in the built-in browser and scrolled through every new section (hero, supported schools, trust row, menu proof, 6-step journey, collection proof, multiple children, B2B panels, app, FAQ, final CTA). This caught and fixed one real visual defect: the "Supported schools" list initially used `.proof-name` styling (white text, `color:#fff`) inside a light `on-cream` section, making the school names invisible — fixed by moving the content into the original dark `.proof-section`/`.proof-wrap` structure those CSS classes were actually designed for. Also spot-checked `/schools`, `/caterers`, `/contact`, `/parents`, and `/how-it-works` via rendered page text extraction to confirm section order and copy matched what was written.
docs/evo-implementation/PHASE-02-CONTENT-IA.md:127:- ✅ No important business information was simply deleted — relocated (dashboard preview → `/schools`, teaser content → `/schools`/`/caterers`) or represented elsewhere (FAQ → link to full detail on `/parents`/`/features`), except for two already-flagged unverified claims that were removed per claim discipline (see Section 3, items 1–2) and two generic-positioning sections that were dead weight, not information (Section 2's last two rows)
docs/evo-implementation/PHASE-02-CONTENT-IA.md:128:- ✅ Parent, school, and caterer intents are clearly separated (`/contact`'s three pathways; `/schools` and `/caterers` now carry zero parent-facing CTAs; the homepage's Final CTA separates all three explicitly)
docs/evo-implementation/PHASE-02-CONTENT-IA.md:140:3. All Phase 1 blockers (`/contact` form has no destination, no admin view for the `inquiries` table, localization/RTL scope, unverified contact details) remain open and unaffected by this phase — `/contact`'s underlying POST behavior was deliberately left unchanged (still logs only, doesn't persist) since fixing that is a data/backend decision, not a content/IA one; the page now at least makes it clearer that the two B2B pathways go through the two forms that *do* persist (`/schools/inquiry`, `/caterers/inquiry`).
docs/evo-implementation/PHASE-02-CONTENT-IA.md:148:1. **The new order-queue table on `/caterers`** reuses the existing `.data-table-view`/`.badge` components from the authenticated app (history/school-admin views) — it works and is legible, but wasn't designed as a marketing artifact; a Phase 3 pass could give it a more deliberate "proof" visual treatment.
docs/evo-implementation/PHASE-02-CONTENT-IA.md:153:6. **Mobile/responsive testing beyond the single-viewport spot check** done in this phase (375×812 for the homepage during Phase 1's `/how-it-works`/`/features` additions) — a full device-matrix pass across the newly restructured `/schools`, `/caterers`, and `/contact` pages was not performed and should not be assumed complete.
docs/evo-implementation/PHASE-03-VISUAL.md:17:| `views/partials/sitenav.ejs` | Desktop nav reordered to the parent-first hierarchy the brief specifies (For Parents, For Schools, For Caterers, How It Works, Features, About, Contact); dropped the separate "Home" link from the desktop row (logo already serves that role — kept in the mobile drawer where a full-screen menu benefits from an explicit way back); added the inert language-switch placeholder (disabled button, both desktop and mobile) |
docs/evo-implementation/PHASE-03-VISUAL.md:21:| `views/caterers.ejs` | Order-queue table given a header row with a `.sample-tag` "Illustrative example" badge (previously only a sentence in the section intro) |
docs/evo-implementation/PHASE-03-VISUAL.md:75:3. **The "Product preview" / "Illustrative example" labels**, previously inconsistent plain text or a one-off `.dash-preview-tag`, were unified into one `.sample-tag` component (plus a `.on-dark` variant for dark surfaces) and applied consistently across the homepage, `/parents`, `/schools`, and `/caterers` wherever demo/seeded data is shown — directly serving the "label sample/demo values clearly... keep the visual language consistent" instruction.
docs/evo-implementation/PHASE-03-VISUAL.md:77:**What was deliberately left as cards, and why:** the three-panel B2B routing on the homepage, the three-pathway intent panels on `/contact`, the three-audience final CTA, and the operational-visibility/caterer-benefit grids (2–3 items each) were *not* converted. A small, fixed number of parallel choices (2–3 audiences, 2–3 benefits) is a legitimate use of a card — the brief's concern is a *wall* of many identical cards standing in for what should be a statement, a list, or a visual, not any use of a card at all. Converting these would have meant inventing a different pattern for its own sake.
docs/evo-implementation/PHASE-03-VISUAL.md:95:## 6. Homepage recipes, `/parents`, `/schools`, `/caterers`, `/how-it-works`, `/features` — status against the brief's per-page visual priorities
docs/evo-implementation/PHASE-03-VISUAL.md:106:- **`/caterers` order queue**: given a proper table header with the `.sample-tag` badge, making the "tangible kitchen" proof read as a distinct artifact rather than a plain table under some text.
docs/evo-implementation/PHASE-03-VISUAL.md:116:**Automated horizontal-overflow sweep** (`document.documentElement.scrollWidth > window.innerWidth`, plus enumerating any specific offending element) run across all 7 restructured public pages (`/`, `/parents`, `/schools`, `/caterers`, `/how-it-works`, `/features`, `/contact`) at four widths: **320, 390, 768, 1024px**. This found the one real bug documented in Section 5 (fixed and re-verified). One page (`/schools`, and separately `/caterers`) intermittently reported an inflated `window.innerWidth` reading (382px when 320 was requested) that did not correspond to any actual overflowing content (`scrollWidth` always equaled the reported `innerWidth`, and a fresh, isolated browser tab reproduced the same reading) and produced no visible defect in a corresponding screenshot. This was traced as far as an oversized closed `.site-links-mobile` drawer element in the DOM measurement, but the root cause was not fully isolated within this pass — see Section 8's honest accounting. It does not appear to affect real users, since the site's existing global `overflow-x:hidden` safety net (a deliberate, pre-existing choice documented in the Phase 1 audit) prevents any visible consequence, and no horizontal scrollbar or clipped content was ever observed.
docs/evo-implementation/PHASE-03-VISUAL.md:121:- **`/caterers`**: hero and order-queue table inspected at 1440×900, confirming the new table header and `.sample-tag` badge render correctly.
docs/evo-implementation/PHASE-03-VISUAL.md:152:**Full route smoke test** (after all Phase 3 edits, against a locally running server): every public page (`/`, `/schools`, `/parents`, `/caterers`, `/how-it-works`, `/features`, `/about`, `/privacy`, `/terms`, `/contact`, `/login`, `/register`, `/forgot-password`, `/school-admin/login`, `/sitemap.xml`, `/robots.txt`, `/health`) returns 200; every protected page (`/dashboard`, `/students`, `/booking`, `/menu`, `/history`, `/profile`, `/staff`, `/school-admin/dashboard`) correctly redirects (302) when logged out; an unknown path returns 404.
docs/evo-implementation/PHASE-03-VISUAL.md:166:- The `/schools`/`/caterers` `dw`/`innerWidth` measurement anomaly noted in Section 7 is worth a quick look early in Phase 4 or a dedicated follow-up — it produced no visible defect in this session's testing, but wasn't fully root-caused.
docs/evo-implementation/PHASE-04-COMPLETION-PASS.md:3:This is an addendum to [PHASE-04-LOCALIZATION-RESPONSIVE.md](PHASE-04-LOCALIZATION-RESPONSIVE.md), covering the second pass requested after the Phase 04 architecture checkpoint (commit `2b8de6d`, "feat: implement bilingual localization and RTL foundation") was approved. That checkpoint explicitly left Phase 04 **not** release-complete; this pass closes most of the gaps it documented, in the priority order given: `/caterers`/`/about`/`/contact`, the remaining authenticated pages, a hardcoded-string audit, notification/JS-message localization, a menu-data strategy decision, and a re-run of switcher/RTL/responsive/accessibility QA.
docs/evo-implementation/PHASE-04-COMPLETION-PASS.md:12:- `/caterers` (+ `/caterers/inquiry` POST, including field-level validation errors)
docs/evo-implementation/PHASE-04-COMPLETION-PASS.md:16:`sitemap.xml` and `robots.txt` updated to reflect these as real bilingual pages (hreflang alternates, `Allow: /ar/caterers` etc.) — the same honesty rule from Phase 04 applies: no page gets a `/ar/...` URL or hreflang entry unless it's genuinely translated.
docs/evo-implementation/PHASE-04-COMPLETION-PASS.md:35:- **`server.js`**: caterer/contact/school-admin-login validation and error strings — now `t()`-driven (`caterers.form.err*`, `contact.form.errRequired`, `schoolAdminLogin.errInvalid`).
docs/evo-implementation/PHASE-04-COMPLETION-PASS.md:37:- **The CSRF error handler** — was returning a hardcoded English string on every rejected token, in *every* language. Fixed by moving the locale-resolution middleware to run **before** CSRF protection is registered (previously it ran after), so `res.locals.t` is already populated by the time a CSRF failure reaches the error handler. Verified directly: hitting `/ar/caterers/inquiry` with a stale/missing token now returns "انتهت جلسة النموذج..." instead of English.
docs/evo-implementation/PHASE-04-COMPLETION-PASS.md:67:1. **Add `name_ar`/`tag_ar`/`ingredients_ar` columns to `menu_items`** — the "real" long-term answer, but it's a schema change to a table that's also read by `db.js`'s `mapMenuItem()` and would need seed data for all 5 items in both languages, real nutrition-label-accurate Arabic ingredient text (not machine-translated food terminology, which is exactly the kind of "awkward literal Arabic" this phase's own instructions warn against), and a decision about how caterers (who don't yet have any admin UI at all) would ever populate `name_ar` for a *new* dish. That's real product-team + translator work, not a mechanical addition.
docs/evo-implementation/PHASE-04-COMPLETION-PASS.md:71:Option 3 was kept because it's the only one of the three that doesn't either (a) require inventing Arabic nutrition-label text under this pass's own explicit instruction against inventing content without a verified source, or (b) introduce a new data-consistency risk for a five-row demo dataset. This is a demo/illustrative dataset, not a live catalog a caterer edits — the honest scope boundary drawn in Phase 04 (`menu.ejs`'s inline comment: *"dish names/tags/ingredients remain untranslated — real product data, not UI copy"*) still holds, and is repeated verbatim in `staff.ejs`'s meal `<option>` list and `caterers.ejs`'s illustrative order-queue table for the same reason. This is listed again in §7 as a real follow-up, now with the three concrete options above on record instead of a bare "not done."
docs/evo-implementation/PHASE-04-COMPLETION-PASS.md:91:**Visual RTL check** (built-in browser, real render, not just markup inspection): `/ar/caterers` (hero, order-queue table with translated headers/badges and English dish/school-name product data, RTL-mirrored hamburger/logo header), `/students` (RTL-mirrored student rows — avatar+name on the reading-start side, Edit button on the far side, allergy-flag icon in place), `/history` (RTL-mirrored booking cards, correctly-escaped Arabic confirm-dialog text), `/dashboard` (full notification feed rendering three live-tested notification types plus legacy-English fallback rows, side-by-side, with no layout break), `/school-admin/login` and `/school-admin/dashboard` (RTL-mirrored admin header, stat-card accent border flipped to the correct edge).
docs/evo-implementation/PHASE-04-COMPLETION-PASS.md:95:**Responsive overflow sweep**, both languages, at the required 320/390/768/1024/1440px widths, using `document.documentElement.scrollWidth > window.innerWidth` (the same method as Phase 04): `/ar/caterers`, `/ar/about`, `/ar/contact`, `/students`, `/history`, `/staff`, `/profile`, `/school-admin/dashboard` — **zero overflow at any tested width**.
docs/evo-implementation/PHASE-04-COMPLETION-PASS.md:97:**One pre-existing, not-introduced-by-this-pass issue found and left as-is**: `caterers.ejs`'s order-queue table uses only a `.data-table-view` (no `.data-card-view` fallback, unlike `history.ejs` and `school-admin-dashboard.ejs`, which have both). That component's own CSS hides `.data-table-view` below a tablet-ish breakpoint with nothing to replace it — meaning the illustrative order table disappears rather than reflowing, in **both languages, identically**, and predates this phase entirely (the original English template had the same structure). Since it isn't a translation regression and touching it would mean changing a page's structure beyond what a localization pass was asked to do, it's flagged here rather than silently fixed or silently ignored.
docs/evo-implementation/PHASE-04-COMPLETION-PASS.md:103:Superseded/closed by this pass: items 2 ("caterers/about/contact"), 3 ("students/history/profile/staff"), 4 ("school-admin"), and 6 ("notification message bodies", now solved architecturally) from the original remaining-items list.
docs/evo-implementation/PHASE-04-COMPLETION-PASS.md:129:- CSRF rejection deliberately triggered on `/ar/caterers/inquiry` (mismatched cookie/token) to confirm its 403 response is Arabic.
docs/evo-implementation/PHASE-04-LOCALIZATION-RESPONSIVE.md:41:**Deliberately not mirrored:** `/caterers`, `/about`, `/contact`, `/privacy`, `/terms` have no `/ar/...` route at all — see Section 3.
docs/evo-implementation/PHASE-04-LOCALIZATION-RESPONSIVE.md:58:- **`/caterers`, `/about`, `/contact`** — genuinely out of scope; no `/ar/...` route exists for them at all (see Section 6/16 for why this matters for SEO). Session-locale doesn't apply to these either since they're plain public pages.
docs/evo-implementation/PHASE-04-LOCALIZATION-RESPONSIVE.md:162:**No duplicate-content trap**: pages without a real Arabic translation (`/caterers`, `/about`, `/contact`, `/privacy`, `/terms`) get **no** `/ar/...` URL and **no** hreflang alternate at all, rather than a fake bilingual entry pointing at untranslated content — this was a deliberate architectural choice (Section 3), not an oversight, and directly follows this phase's own instruction: *"If the architecture cannot safely support this in the current phase, do not fake it; document the limitation."*
docs/evo-implementation/PHASE-04-LOCALIZATION-RESPONSIVE.md:184:2. **`/caterers`, `/about`, `/contact`** — not translated this phase (Section 3); straightforward to add in a follow-up using the same architecture (add the route mirror, translate the strings, no new infrastructure needed).
docs/evo-implementation/PHASE-05-FINAL-QA.md:23:Public: `/`, `/schools` (+`/schools/inquiry`), `/parents`, `/caterers` (+`/caterers/inquiry`), `/how-it-works`, `/features`, `/about`, `/privacy`, `/terms`, `/contact` (+POST), `/login` (+POST), `/register` (+POST), `/forgot-password` (+POST), `/school-admin/login` (+POST), `/sitemap.xml`, `/robots.txt`, `/health`, `/favicon.ico` — each also at its `/ar/...` counterpart where Phase 4 built one.
docs/evo-implementation/PHASE-05-FINAL-QA.md:126:- **Public pages** (`/`, `/ar`, `/parents`, `/ar/parents`, `/schools`, `/ar/schools`, `/caterers`, `/ar/caterers`, `/how-it-works`, `/ar/how-it-works`, `/features`, `/ar/features`, `/about`, `/ar/about`, `/contact`, `/ar/contact`, `/privacy`, `/terms`, `/login`, `/ar/login`, `/register`, `/ar/register`, `/forgot-password`, `/ar/forgot-password`, `/school-admin/login`, `/sitemap.xml`, `/robots.txt`, `/health`): **all 200**.
docs/evo-implementation/PHASE-05-FINAL-QA.md:143:- **Forms**: `/contact`, `/schools/inquiry`, and `/caterers/inquiry` all submitted successfully (302) with valid CSRF tokens; a `/profile` POST with a missing CSRF token was correctly rejected (403, friendly message).
docs/evo-implementation/PHASE-05-FINAL-QA.md:175:- The `inquiries` table (school/caterer partnership leads) still has no admin-facing view anywhere in the system — leads are captured but not operationally actionable without direct database access (unchanged from Phase 1).
docs/evo-implementation/PHASE-05-FINAL-QA.md:186:| `views/home.ejs`, `parents.ejs`, `schools.ejs`, `caterers.ejs`, `how-it-works.ejs`, `features.ejs`, `about.ejs`, `contact.ejs`, `privacy.ejs`, `terms.ejs`, `login.ejs`, `register.ejs`, `forgot-password.ejs` | Each now passes `description` into the `partials/head` include; the 10 that had a separate, duplicate `<meta name="description">` line had it removed (now emitted once, by head.ejs) |
docs/evo-implementation/PHASE-05-FINAL-QA.md:203:3. There is no admin-facing way to read the `inquiries` table that `/schools/inquiry` and `/caterers/inquiry` do successfully write to — those leads are captured but not actionable without direct database access.
docs/evo-phase-1-audit.md:16:2. **The public capability claim exceeds this repository.** There is no caterer login/queue endpoint, collection-reader endpoint, payment gateway integration, push transport, general administrator workspace or revenue-reporting route. Notifications are stored records rendered on page requests. Calendars are generated illustrative schedules. Features says everything listed is live; that is not supported here.
docs/evo-phase-1-audit.md:17:3. **There are reproducible rendering failures.** Parents exposes four raw translation keys and overflows by 424px at a 390px viewport. Caterer order rows disappear at widths up to 640px. Product navigation clips at 912px. Menu crops square imagery into 70px strips below 561px. Global horizontal clipping can conceal these failures.
docs/evo-phase-1-audit.md:89:| Caterers | `/caterers`, `/ar/caterers`; POST matching `/caterers/inquiry` paths | `views/caterers.ejs`; hardcoded illustrative queue, persisted inquiry |
docs/evo-phase-1-audit.md:114:No separate student portal, caterer portal, central administrator console, actual meal-tap endpoint or report export route exists in this source.
docs/evo-phase-1-audit.md:128:| Journeys | `views/partials/how-it-works-section.ejs`, inline Parents/Schools/Caterers steps, How It Works role journeys; `.steps`, `.step`, `.role-journey-*`, `.flow-caption`, `.app-steps` |
docs/evo-phase-1-audit.md:131:| Tables | History/admin duplicate table and mobile-card markup; caterers only has table markup; shared `.data-table-view` hides at 640px |
docs/evo-phase-1-audit.md:147:- **KEEP** the existing Book → Pay → Tap → Notified vocabulary and separate school/caterer inquiry paths. Refine the truth and order of the explanation.
docs/evo-phase-1-audit.md:161:| Capability truth | Live KNET, caterer queue, reader, push, analytics/reporting overclaims | REFINE | Critical | locales, features, schools, caterers, about, head | Misrepresentation of working demo | Phase 2 |
docs/evo-phase-1-audit.md:163:| Caterer mobile proof | Table hidden without alternate content | REFINE | High | caterers.ejs, data-table-view | Entire operational example lost | Phase 2 |
docs/evo-phase-1-audit.md:168:| Landmarks | Broken skip targets on five public pages | ADD | High | caterers/about/contact/privacy/terms | Navigation barrier | Phase 2 |
docs/evo-phase-1-audit.md:204:| Caterers | Orders → demand → preparation → fulfilment | Labeled example grouped by school/meal | Onboarding and inquiry detail | Repeated queue promises; queue vanishes on mobile; preparation quantities not actually implemented |
docs/evo-phase-1-audit.md:206:| How It Works | Book → Pay → Tap → Notified | School: Set up/Monitor/Report; caterer: Receive/Prepare/Deliver | Full inter-role handoffs | Six-role platform explanation first, then repeated role flows |
docs/evo-phase-1-audit.md:208:| Contact | How to reach support | Form or school/caterer destination | Contact channel details | Role cards and large hero before form; actual delivery limitation too obscure |
docs/evo-phase-1-audit.md:247:| 8 `b2b-pathways` | Route schools and caterers | Two cards/CTAs | Stacks | Translated copy, shared cards. KEEP secondary; avoid duplicate final institutional CTAs |
docs/evo-phase-1-audit.md:267:### Caterers — `/caterers`, `/ar/caterers` — REFINE
docs/evo-phase-1-audit.md:269:**Audience / question / purpose:** catering operator; “Which orders, quantities and schools must I prepare for?” Partnership lead capture. **Strengths:** tangible illustrative queue, demand/fulfilment concepts, persisted inquiry. **Communication/redundancy:** queue, demand and manual-processing copy repeat; no real caterer capability in routes; prepared/paid/settled language overstates this demo. **Under-emphasized:** quantities and preparation handoff; current example lists students and collected/upcoming status, not a kitchen preparation workflow. **CTA:** one form destination is appropriate; inquiry intro renders awkward “responds . within one business day”. **Visual/imagery:** interface example appropriate; no need for decorative kitchen stock images. **Responsive:** all queue rows hidden ≤640px, no card fallback. **Motion:** reveal is unnecessary for orders. **RTL:** mixed-language school/meal values, physical table heading alignment; Arabic form still posts to English `/caterers/inquiry`, losing locale on validation/success. **Accessibility/technical:** missing main/skip target; hardcoded illustrative rows, not a working queue.
docs/evo-phase-1-audit.md:281:**Audience / question / purpose:** parent first, then school/caterer; understand handoffs. **Strengths:** six-stage shared partial and concise role journeys already exist; logical connectors and responsive treatment. **Communication/redundancy:** large hero, full platform process and role flows explain similar steps at three levels. Allergy notes “passed along” and caterer live orders lack an implemented interface/transport. **Under-emphasized:** parent's four concrete actions first. **CTA:** parent Create Account alone despite multi-role close. **Visual/imagery:** meaningful steps beat generic photos; repeated numbers/labels increase visual syntax. **Motion:** global reveals delay comprehension; generated numbering appears redundantly in accessibility text. **Responsive/RTL:** rails collapse and arrow mirroring exists; ensure reading order, don't mirror numerals/card text. **Accessibility/technical:** native section headings retained, shared drawer and font repairs apply.
docs/evo-phase-1-audit.md:283:**Plan:** parent Book → Pay → Tap → Notified first; school Set up → Monitor → Report; caterer Receive → Prepare → Deliver next; optional full connection diagram only for information not already conveyed. State demo/verified boundaries. Reuse these labels throughout; no new animation library.
docs/evo-phase-1-audit.md:287:**Audience / question / purpose:** parent or partner seeking legitimacy; why Evo exists and whom it connects. **Strengths:** emotional “Did they eat?” anchor, approach/focus/standard, clear Contact path. **Communication/redundancy:** repeated real-time platform claim; unverified “wasn't built in a boardroom” and “real feedback” origin story; healthy/nutritious wording lacks external substantiation. **Under-emphasized:** honest scope of platform vs caterer and confirmed story. **Visual:** oversized dark text-only hero leaves broad empty desktop area; substantial lede before concise connection cards. **Imagery:** none; do not invent a team/founding photograph. **CTA:** Contact works. **Motion:** reveal has no explanatory role. **Responsive/RTL:** layout fits tested widths; body font fallback and mixed product wording remain. **Accessibility/technical:** missing main landmark and skip target.
docs/evo-phase-1-audit.md:293:**Audience / question / purpose:** parent needing help, partner needing correct team. **Strengths:** clear labels, short form, role destinations, direct footer contact links. **Communication/redundancy:** pathway choice followed by another role selector; “Handled securely — never shared beyond our team” needs policy alignment. **Under-emphasized:** actual submission limitation and direct contact alternatives. **CTA:** Send Message appears actionable, but POST discards message content and merely logs name/email/role then redirects to success. **Visual/imagery:** form is appropriately plain; large hero and three cards delay it; no decorative imagery needed. **Motion:** reveal should not hide support form. **Responsive:** no page overflow in sweep; direct channels could be closer to the form. **RTL/accessibility:** Arabic body font, missing main/skip target, unlinked errors; Arabic form posts to English `/contact`, losing locale. **Technical:** unlike school/caterer inquiries, contact does not persist messages.
docs/evo-phase-1-audit.md:455:| Connected platform | **REFINE EXISTING** | Existing six-step partial and About role grouping can become a concise shared relationship diagram. Preserve distinct parent/school/caterer responsibilities and label nonimplemented flows; do not build a fake live network dashboard |
docs/evo-phase-1-audit.md:480:| Caterer queue lost | `.data-table-view{display:none}` ≤640; no `.data-card-view` in Caterers | Scope hide behavior to components that actually supply a mobile alternative; one consistent data rendering contract |
docs/evo-phase-1-audit.md:492:2. **Locale continuity:** Add quiet language controls to parent Login/Register/Forgot Password. Preserve language through login/logout, auth-required redirects and 404 recovery where intended; currently `/logout`, `requireAuth` and 404 links return English destinations. Fix Home supported-school Contact link to `/ar/contact` in Arabic. Contact and Caterers form actions are hardcoded English despite registered Arabic POST routes; make them locale-aware as Schools already is, so errors/success stay in Arabic.
docs/evo-phase-1-audit.md:510:| Broken skip links | Add `<main id="main-content">` to Caterers, About, Contact, Privacy, Terms; verify focus/scroll destination. Auth shells have main but no skip-link dependency |
docs/evo-phase-1-audit.md:566:| Home: `home.confidence.item1`, `home.menuProof.intro`, `.footnote`, `home.faq.q3/a3`; `meta.parents.description` | Per-dish information; expressly not blanket guarantee; “real” data despite seed provenance. No actual allergens rendered | Client/caterer approve global scope and dish data; product implement display; legal align qualifications |
docs/evo-phase-1-audit.md:571:| Shared process: `howItWorksSection.step3Body` | Allergy notes passed with routed order | Notes persist on student; no caterer transport/queue verified. Operations must confirm any external handoff |
docs/evo-phase-1-audit.md:577:| Terms `views/terms.ejs:41–45` | Caterer prepares/delivers; Evo does not independently verify ingredients/claims; special dietary standards described outside Regular Meal; no guarantees | Direct scope conflict with client statement + all Regular Meal seed exclusions. Stakeholder/legal confirmation required; do not decide legal meaning here |
docs/evo-phase-1-audit.md:578:| Privacy `views/privacy.ejs` | References caterer data sharing, security safeguards and inability to guarantee absolute security; no four-allergen meal statement | No direct food-scope promise found; align sharing/contact language with actual operations, not allergy guarantees |
docs/evo-phase-1-audit.md:581:**Resolution needed:** Who is the speaker of “our meals”; which menu/programme/caterer/time period is covered; what approved source supports the statement and production dish data; how should the exact statement coexist with Terms; what is the approved Arabic wording? These are unanswered scope questions, not reasons to invent an interpretation. Independent unblocked component fixes can proceed while these are resolved. Do not publish stronger safety copy or contradictory disclaimers as a temporary compromise.
docs/evo-phase-1-audit.md:588:| “Freshly made” / fresh hot lunch | UNSUPPORTED | `home.hero.headlinePre/imgAlt`, Arabic equivalents; image and existing copy are not preparation evidence. Confirm caterer process before retaining as factual promise |
docs/evo-phase-1-audit.md:590:| Caterer prepares/packages/delivers; Evo connects | AMBIGUOUS | Consistent described service model in Terms/footer/process, but no verified kitchen/dispatch integration or operational evidence in repo. Can describe platform intent with approved wording; don't claim observed fulfilment |
docs/evo-phase-1-audit.md:592:| Exact demand preparation | UNSUPPORTED as live capability here | Caterer page/process asserts actual orders reach kitchen; no caterer route/transport found |
docs/evo-phase-1-audit.md:611:| Inquiry response SLA | School/caterer copy promises one business day; DB stores inquiry only | Confirm staffed owner/SLA; no operational evidence in this repository |
docs/evo-phase-1-audit.md:632:8. **Repair shared record presentation.** Scope table-to-card hiding, restore Caterers queue on mobile, align table/card status rendering and RTL headings. Verify actual content survives at 640/667px.
docs/evo-phase-1-audit.md:636:12. **Refine Schools and Caterers.** Show implemented operational concepts, visible examples at all widths, concise responsibility flow and one inquiry path. Replace fictional preview metrics and unsupported queue/reporting assertions. Confirm SLA separately.
docs/evo-phase-1-audit.md:655:10. **Apply deployment hardening appropriate to agreed environment.** Session persistence/rotation, cookie/proxy configuration, log redaction, abuse limits, CSP-compatible inline-code strategy and safe production error handling. Live KNET, reader, email/push/CRM and caterer integrations are separate scoped work requiring credentials/contracts; do not silently build them as visual refinement.
docs/evo-phase-2-report.md:27:| Caterers | No live queue/portal claim. The order example is illustrative and does not transmit orders to kitchens. |
docs/evo-phase-2-report.md:28:| Features | Removed claims of a working caterer queue, revenue reporting and central administrator workspace. Role descriptions distinguish working parent/school functions from service concepts. |
docs/evo-phase-2-report.md:55:- Added actual main/skip destinations to About, Caterers, Contact, legal pages and admin login. Plain skip destinations are focusable.
docs/evo-phase-2-report.md:107:## 9. Schools / Caterers
docs/evo-phase-2-report.md:111:Caterers: Orders → Demand Visibility → Preparation → Fulfilment, followed by the clearly illustrative queue and one inquiry form. Desktop table and mobile semantic records derive from the same example array and status partial. Mobile no longer removes the operational example. No external fulfilment integration was added.
docs/evo-phase-2-report.md:116:- Parent/school capabilities reflect implemented account and record behavior. Caterer, student physical-tap and central-administrator limitations are explicit.
docs/evo-phase-2-report.md:117:- How It Works prioritizes the shared four-step parent journey, then School Set up → Monitor → Report and Caterer Receive → Prepare → Deliver with scope qualification.
docs/evo-phase-2-report.md:159:Parents was checked at the requested acceptance widths before applying shared components to Home. Visual inspection included Parents desktop/Arabic mobile, Home desktop, Menu mobile, Schools desktop, Features tablet, Booking tablet RTL and School Admin at 320px Arabic. Caterer mobile semantic records remained present. These geometry sweeps do not substitute for testing every browser/device.
docs/evo-phase-2-report.md:165:Checked Arabic public routes for Home, Parents, Schools, Caterers, Features, How It Works, About, Contact, Login, Register and Forgot Password; session-Arabic Dashboard, Students, Menu, Booking, History, Profile, Staff and School Admin.
docs/evo-phase-2-report.md:212:1. **Allergen/Terms scope:** client statement covers Nuts, Shellfish, Sesame and Soy. Terms section discussing meals outside “Regular Meal” describes caterer dietary claims (including other exclusions) that Evo does not independently investigate/verify and includes liability wording. Stakeholders/legal must reconcile programme scope, caterer responsibility and disclaimer meaning. Phase 2 does not silently rewrite this clause.
docs/evo-phase-2-report.md:218:7. **External contact/reset:** repository email/WhatsApp/app links retained, but ownership, staffing and response SLA were not independently confirmed. General Contact does not deliver/save messages; school/caterer inquiries save locally without external notification; reset has no token/email implementation.
docs/evo-phase-2-report.md:230:5. Scope genuine staff/caterer/central-admin authorization and operational surfaces only after role/business approval. Do not infer them from the public examples.
docs/evo-phase3-part1-report.md:323:8. **Caterer, central-administrator and genuine staff authorization scope.** Staff is a meal booked
lib/validate.js:24:// Organization/school/caterer name: not digits-only, contains at least
locales/ar.json:45:    "caterers": {
locales/ar.json:117:    "forCaterers": "لشركاء التموين",
locales/ar.json:140:    "caterersHeading": "شركاء التموين",
locales/ar.json:141:    "forCaterers": "لشركاء التموين",
locales/ar.json:229:      "caterersTitle": "لشركاء التموين",
locales/ar.json:230:      "caterersBody": "ناقش الطلبات والتحضير وتوفير الوجبات للمدارس.",
locales/ar.json:231:      "caterersCta": "انضم كشريك تموين",
locales/ar.json:269:      "catererTitle": "شريك التموين",
locales/ar.json:270:      "catererBody": "ناقش دور مطبخك في برنامج الوجبات المدرسية.",
locales/ar.json:271:      "catererCta": "انضم كشريك تموين"
locales/ar.json:304:    "caterersTitle": "شركاء التموين",
locales/ar.json:305:    "caterersChip1": "مسار التحضير — توضيحي",
locales/ar.json:306:    "caterersChip2": "لا توجد بوابة متصلة لمقدّم الطعام",
locales/ar.json:667:  "caterers": {
locales/ar.json:740:      "caterersTitle": "شركاء التموين",
locales/ar.json:741:      "caterersBody": "مناقشة التحضير وتوفير الوجبات؛ مسار تقديم الطعام هنا توضيحي."
locales/ar.json:780:      "catererTitle": "شراكة التموين",
locales/ar.json:781:      "catererBody": "اربط مطبخك ببرنامج وجبات إحدى المدارس.",
locales/ar.json:782:      "catererCta": "الانتقال إلى نموذج التموين"
locales/ar.json:793:      "optCaterer": "شريك تموين",
locales/en.json:45:    "caterers": {
locales/en.json:46:      "title": "For Caterers — Evo Meals School Meal Management Platform",
locales/en.json:117:    "forCaterers": "For Caterers",
locales/en.json:140:    "caterersHeading": "Caterers",
locales/en.json:141:    "forCaterers": "For Caterers",
locales/en.json:229:      "caterersTitle": "For Caterers",
locales/en.json:230:      "caterersBody": "Discuss orders, preparation and school fulfilment.",
locales/en.json:231:      "caterersCta": "Become a Catering Partner",
locales/en.json:269:      "catererTitle": "Caterer",
locales/en.json:270:      "catererBody": "Discuss your kitchen’s role in a school meal programme.",
locales/en.json:271:      "catererCta": "Become a Catering Partner"
locales/en.json:304:    "caterersTitle": "Caterers",
locales/en.json:305:    "caterersChip1": "Preparation flow — illustrative",
locales/en.json:306:    "caterersChip2": "No connected caterer portal",
locales/en.json:318:      "lede": "Organized by who uses it — parents, schools, caterers, students, and administrators."
locales/en.json:323:      "body": "Whether you're a parent, a school, or a caterer, there's a dedicated page with the details."
locales/en.json:465:      "optInformal": "Informal caterer arrangement",
locales/en.json:667:  "caterers": {
locales/en.json:669:      "eyebrow": "For Caterers",
locales/en.json:671:      "lede": "Explore the catering workflow around school meals: understand demand, prepare and fulfil. The example is illustrative; this demo has no connected caterer portal.",
locales/en.json:735:      "intro": "Parents, schools and caterers have different responsibilities around the same meal.",
locales/en.json:740:      "caterersTitle": "Caterers",
locales/en.json:741:      "caterersBody": "Discuss preparation and fulfilment; the catering flow here is illustrative."
locales/en.json:750:      "pillar2Body": "Deliver a seamless experience for parents, schools, and caterers.",
locales/en.json:756:      "heading": "Whether you're a parent, a school, or a caterer —",
locales/en.json:764:      "paragraph2": "What began as a way to give a parent visibility into what their child eats at school has grown into something bigger — a single, real-time system connecting an entire school community: parents, students, schools, and caterers."
locales/en.json:780:      "catererTitle": "Catering partnership",
locales/en.json:781:      "catererBody": "Connect your kitchen to a school's meal programme.",
locales/en.json:782:      "catererCta": "Go to catering form"
locales/en.json:793:      "optCaterer": "Caterer",
migrations/003_admin_inquiries_notifications.sql:4:-- no plaintext secrets), real storage for the Schools/Caterers lead-capture
migrations/003_admin_inquiries_notifications.sql:18:  type                 TEXT NOT NULL, -- 'school' | 'caterer'
migrations/003_admin_inquiries_notifications.sql:24:  scale_info           TEXT NOT NULL DEFAULT '', -- student count range, or caterer capacity
public/css/style.css:124:     parent journey. Process rails and the caterer flow run on fractions
public/css/style.css:1236:   /parents, /schools, and /caterers rather than each page inventing its
public/css/style.css:1381:     empty gap under Schools before Caterers/Company start. Reordering so
public/css/style.css:1383:     (Schools, Caterers) each share a row balances it out instead. */
public/css/style.css:1442:/* ---------- teaser sections (Schools / Caterers) ---------- */
public/css/style.css:1465:   a translated heading (Arabic, School/Caterer titles) wraps to a
public/css/style.css:1500:   site (notif-badge, check-badge). School's "Report" and Caterer's
public/css/style.css:1606:/* ---------- inner-page hero (Schools / Caterers / Parents / About) ---------- */
public/css/style.css:1618:/* ---------- Caterers page: benefit cards ---------- */
public/css/style.css:1637:   Caterer) never leaves its CTA sitting at a different height than its
public/css/style.css:1656:/* ---------- partner contact forms (Schools / Caterers) ----------
public/css/style.css:2130:  /* The caterer flow shares the component but is an operational hand-off,
public/js/motion.js:180:  // Used by the Schools and Caterers lead-capture forms: real inline
server.js:468:app.get(['/caterers', '/ar/caterers'], (req, res) => res.redirect(301, (req.path.startsWith('/ar') ? '/ar' : '') + '/corporate-meals'));
tests/subscription-flow.test.js:116: for(const [old,target] of [['features','how-it-works#features'],['caterers','corporate-meals']])for(const prefix of ['','/ar']){const r=await request(`${prefix}/${old}`);assert.equal(r.status,301);assert.equal(r.location,`${prefix}/${target}`);}
tests/subscription-flow.test.js:117: const sitemap=await request('/sitemap.xml');assert.doesNotMatch(sitemap.body,/\/features|\/caterers/);assert.match(sitemap.body,/\/ar\/corporate-meals/);
tests/subscription-flow.test.js:118: assert.doesNotMatch((await request('/robots.txt')).body,/Allow: .*\/(features|caterers)/);
tests/subscription-flow.test.js:119: assert.equal((await request('/caterers/inquiry',{})).status,404);
views/about.ejs:48:        <h3><%= t('about.connects.caterersTitle') %></h3>
views/about.ejs:49:        <p><%= t('about.connects.caterersBody') %></p>
views/contact.ejs:59:              <option value="Caterer" <%= cv.role === 'Caterer' ? 'selected' : '' %>><%= t('contact.form.optCaterer') %></option>
views/corporate-meals.ejs:4:<%- include('partials/head', { title: t('meta.caterers.title'), description: t('meta.caterers.description') }) %>
views/partials/example-status.ejs:1:<% if (status !== 'Collected' || features.showCollection) { %><span class="badge badge-<%= status.toLowerCase() %>"><span aria-hidden="true"><%= status === 'Collected' ? '✓' : '◷' %></span> <%= t('caterers.orderQueue.status'+status) %></span>
views/partials/example-status.ejs:2:<% } else { %><span class="badge badge-upcoming"><%= t('caterers.orderQueue.statusUpcoming') %></span><% } %>
views/partials/features-section.ejs:4:    <% [['parents','parents'],['schools','schools'],['caterers','corporate-meals'],['students','parents'],['admins','schools']].forEach(([role,path]) => { %>
views/partials/terms-content.ejs:19:          <p>Evo Meals lets registered members book meals online. We provide the way for you to communicate your order to the meal producer and distributor — referred to throughout as the Catering Company, Food Producer, Distributor, Caterer, or Kitchen.</p>
views/partials/terms-content.ejs:20:          <p>Our site exists to connect you simply and conveniently with a caterer who prepares, packages, and delivers meals — interactive menus let you build and submit an order in a few clicks.</p>
views/partials/terms-content.ejs:22:          <p>It's important to understand that Evo Meals doesn't independently verify a caterer's credentials, claims, ingredients, or kitchen compliance with applicable laws. We'd encourage you to review the information a caterer provides, or reach out to them directly, if you'd like more detail on the quality and reliability of their meals. We don't guarantee that any meal matches exactly what's shown on the site, or that it meets every expectation — our role is the platform connecting you to the people who prepare and deliver your child's food.</p>
views/partials/terms-content.ejs:23:          <p>Some caterers may describe a meal outside our "Regular Meal" range as meeting a specific dietary standard — for example, nut-free, egg-free, soya-free, sesame-free, gluten-free, or lactose-free. We don't independently investigate or verify these claims, and we're not liable for any meal or service that doesn't meet your expectations or causes harm.</p>
views/partials/terms-content.ejs:33:          <p>Once you've chosen your order, you'll confirm it by selecting Checkout / Proceed to Pay. Please check your order carefully before this step — once submitted, we're not able to correct input errors. When we receive your order, we'll begin processing it and confirm on-screen that it's been sent successfully to the caterer. If a payment isn't authorized, you'll be returned to the previous page and we won't be able to provide the service for that order.</p>
views/schools.ejs:35:      <div><dt><%= t('caterers.orderQueue.colStudent') %></dt><dd><bdi>Ahmed A.</bdi></dd></div>
views/schools.ejs:36:      <div><dt><%= t('caterers.orderQueue.colMeal') %></dt><dd><bdi>Arabiatta Chicken Pasta</bdi></dd></div>
views/schools.ejs:37:      <div><dt><%= t('caterers.orderQueue.colStatus') %></dt><dd><%- include('partials/example-status',{status:'Upcoming'}) %></dd></div>
views/schools.ejs:99:                <option value="Informal caterer arrangement" <%= fd.currentArrangement === 'Informal caterer arrangement' ? 'selected' : '' %>><%= t('schools.partnerForm.optInformal') %></option>
tests/localization.test.js:21: for(const role of ['parents','schools','caterers','students','admins'])for(const suffix of ['Title','Chip1','Chip2'])required.push('featuresSection.'+role+suffix);
tests/localization.test.js:27: add('nav.',['forParents','forSchools','corporate']);add('caterers.orderQueue.status',['Collected','Upcoming']);
```

## Arabic strings requiring native review

Every added or changed Arabic string below is **needs native review**. Unchanged legal English text is not translated.

| Key | Change | Arabic — needs native review |
|---|---|---|
| `nav.corporate` | Added | وجبات الشركات |
| `footer.taglineWithoutCollection` | Added | وجبات المدارس في الكويت: معلومات الطعام وحجوزات أولياء الأمور في مكان واحد. |
| `footer.corporateHeading` | Added | وجبات الشركات |
| `footer.corporate` | Added | وجبات الشركات |
| `home.hero.ledeWithoutCollection` | Added | استكشف الطعام ورتّب وجبات طفلك من حساب واحد لولي الأمر. |
| `home.b2b.corporateTitle` | Added | وجبات الشركات |
| `home.b2b.corporateBody` | Added | وجبات يومية طازجة لفرق العمل. |
| `home.b2b.corporateCta` | Added | رتّب وجبات مكان العمل |
| `home.faq.a2` | Changed | راجع الإجمالي المحسوب بالدينار الكويتي قبل التأكيد. الدفع في هذه النسخة التجريبية محاكاة؛ ولا تتم أي معاملة عبر كي نت. |
| `home.faq.q4` | Changed | هل يمكنني تغيير وجباتي اليومية؟ |
| `home.faq.a4` | Changed | افتح عرض الوجبات وتغييرها من صفحة التأكيد. يمكن تغيير وجبات الاشتراك المدفوع حتى 48 ساعة قبل يوم الوجبة بتوقيت الكويت. |
| `howItWorks.hero.eyebrow` | Changed | كيف يعمل |
| `howItWorks.hero.heading` | Changed | احجز شهرًا من الوجبات في ثلاث خطوات. |
| `howItWorks.hero.lede` | Changed | تنطبق الخطوات نفسها سواء كنت تحجز وجبات مدرسية أو وجبات في العمل. |
| `howItWorks.cta.body` | Changed | استكشف الوجبات المدرسية أو وجبات مكان العمل. |
| `howItWorks.steps.title1` | Added | اختر عدد الأشهر |
| `howItWorks.steps.body1` | Added | حدّد عدد الأشهر التي تريد الاشتراك فيها. تُحتسب رسوم كل شهر لأيام العمل فقط. |
| `howItWorks.steps.title2` | Added | اختر وجباتك اليومية |
| `howItWorks.steps.body2` | Added | راجع كل شهر ثم اختر وجبة لكل يوم. تُملأ قائمة افتراضية لك مسبقًا، ويمكنك تغييرها لاحقًا. |
| `howItWorks.steps.title3` | Added | ادفع لتأكيد الاشتراك |
| `howItWorks.steps.body3` | Added | وافق على شروط الدفع وادفع عبر كي نت. تبدأ خدمة الوجبات بعد 7 أيام من إتمام الدفع بنجاح. |
| `parents.hero.ledeWithoutCollection` | Added | تعرّف على الطعام أولًا، واختر وجباتك، وراجع الإجمالي. |
| `parents.journey.step1Title` | Changed | اختر عدد الأشهر |
| `parents.journey.step1Body` | Changed | اختر طفلك وعدد الأشهر والوجبات اليومية. |
| `parents.journey.headingWithoutCollection` | Added | من الحجز إلى الدفع. |
| `parents.journey.introWithoutCollection` | Added | اختر وجباتك وأكّد الدفع التجريبي. لا تُنقل أي أموال في هذه النسخة التجريبية. |
| `parents.pricing.subscriptionTitle` | Changed | اشتراك شهري |
| `parents.pricing.subscriptionBody` | Changed | اختر عدد الأشهر. تُحتسب رسوم كل شهر لأيام العمل فقط. |
| `register.hintCivilId` | Changed | رقمك المدني الحكومي المكوّن من 12 رقمًا. |
| `dashboard.historyBody` | Changed | اعرض اشتراكاتك المدفوعة ونزّل الفواتير. |
| `dashboard.statusPendingWithoutCollection` | Added | محجوزة |
| `dashboard.emptyNoStudentsBodyWithoutCollection` | Added | أضف طفلك الأول لتبدأ حجز الوجبات. |
| `dashboard.emptyNotificationsBodyWithoutCollection` | Added | ستظهر تأكيدات الحجز والتذكيرات هنا. |
| `notifications.subscriptionConfirmed` | Added | {student} — تم تأكيد الاشتراك: {months} شهر، {total}. الدفع تجريبي. |
| `about.ourStory.eyebrow` | Added | قصتنا |
| `about.ourStory.heading` | Added | قصتنا |
| `about.ourStory.paragraph1` | Added | لم تنشأ Evo Meals في قاعة اجتماعات. بل تشكّلت من ملاحظات حقيقية من أولياء الأمور والمدارس، وتطوّرت حتى حقّقت أمرين: وجبات يستمتع بها الطلاب، وراحة بال لأولياء الأمور بشأن ما يأكله أبناؤهم. |
| `about.ourStory.paragraph2` | Added | ما بدأ وسيلة تتيح لولي الأمر معرفة ما يأكله طفله في المدرسة، نما ليصبح شيئًا أكبر — نظامًا واحدًا يربط المجتمع المدرسي بأكمله في الوقت الفعلي: أولياء الأمور والطلاب والمدارس ومقدّمي الطعام. |
| `students.errClass` | Changed | اختر صفًا من القائمة. |
| `students.addButton` | Added | + إضافة طالب |
| `students.reselect` | Added | يرجى إعادة الاختيار |
| `students.errSection` | Added | اختر شعبة من القائمة. |
| `students.classes.KG1` | Added | الروضة 1 |
| `students.classes.KG2` | Added | الروضة 2 |
| `students.classes.Grade 1` | Added | الصف 1 |
| `students.classes.Grade 2` | Added | الصف 2 |
| `students.classes.Grade 3` | Added | الصف 3 |
| `students.classes.Grade 4` | Added | الصف 4 |
| `students.classes.Grade 5` | Added | الصف 5 |
| `students.classes.Grade 6` | Added | الصف 6 |
| `students.classes.Grade 7` | Added | الصف 7 |
| `students.classes.Grade 8` | Added | الصف 8 |
| `students.classes.Grade 9` | Added | الصف 9 |
| `students.classes.Grade 10` | Added | الصف 10 |
| `students.classes.Grade 11` | Added | الصف 11 |
| `students.classes.Grade 12` | Added | الصف 12 |
| `students.sections.A` | Added | A |
| `students.sections.B` | Added | B |
| `students.sections.C` | Added | C |
| `students.sections.D` | Added | D |
| `students.sections.E` | Added | E |
| `students.sections.F` | Added | F |
| `history.heading` | Changed | سجل الحجوزات |
| `history.intro` | Changed | اعرض اشتراكاتك السابقة ونزّل فواتيرها. |
| `history.emptyBody` | Changed | ستظهر اشتراكاتك المدفوعة وفواتيرها هنا. |
| `history.colStudent` | Changed | الطفل |
| `history.colSchool` | Added | المدرسة |
| `history.colMonths` | Added | الأشهر المشمولة |
| `history.colMealDays` | Added | أيام الوجبات |
| `history.colPaid` | Added | تاريخ الدفع |
| `history.colInvoice` | Added | الفاتورة |
| `schoolAdminDashboard.statActiveSubs` | Changed | اشتراكات تشمل هذا الشهر |
| `schoolAdminDashboard.statTodaysMeals` | Changed | وجبات اليوم |
| `schoolAdminDashboard.trendHeading` | Changed | الوجبات خلال آخر 14 يومًا |
| `schoolAdminDashboard.trendIntro` | Changed | يمثل كل عمود عدد الوجبات المجدولة في ذلك اليوم. |
| `schoolAdminDashboard.trendTableCaption` | Changed | الوجبات المجدولة لكل يوم، آخر 14 يومًا |
| `schoolAdminDashboard.trendColDate` | Changed | تاريخ الوجبة |
| `schoolAdminDashboard.trendColCount` | Changed | الوجبات |
| `schoolAdminDashboard.statPendingWithoutCollection` | Added | وجبات الأيام السبعة القادمة |
| `schoolAdminDashboard.colMonths` | Added | الأشهر المشمولة |
| `schoolAdminDashboard.colMealDays` | Added | أيام الوجبات |
| `schoolAdminDashboard.colPaid` | Added | تاريخ الدفع |
| `notFound.headingWithoutCollection` | Added | تعذّر العثور على هذه الصفحة. |
| `notFound.bodyWithoutCollection` | Added | قد يكون الرابط قديمًا أو العنوان غير صحيح. ارجع إلى لوحة التحكم أو الصفحة الرئيسية. |
| `termsDialog.title` | Added | شروط الاستخدام |
| `termsDialog.close` | Added | إغلاق |
| `termsDialog.englishNote` | Added | شروط الاستخدام متاحة حاليًا باللغة الإنجليزية. |
| `termsDialog.accept` | Added | أوافق |
| `termsDialog.decline` | Added | لا أوافق |
| `corporate.hero.eyebrow` | Added | وجبات الشركات |
| `corporate.hero.heading` | Added | وجبات يومية طازجة لفرق العمل. |
| `corporate.hero.lede` | Added | احجز شهرًا من وجبات أيام العمل، واختر ما تأكله كل يوم، وادفع مرة واحدة — بنفس خطوات الحجز البسيطة المستخدمة في مدارسنا. |
| `corporate.hero.cta` | Added | رتّب وجبات مكان العمل |
| `corporate.point1` | Added | اشتراك شهري تُحتسب رسومه لأيام العمل فقط |
| `corporate.point2` | Added | اختر وجبتك لكل يوم وغيّرها لاحقًا |
| `corporate.point3` | Added | دفع آمن عبر كي نت |
| `corporate.howBookingWorks` | Added | كيف يتم الحجز |
| `corporate.simulated` | Added | المدفوعات في هذه النسخة التجريبية محاكاة. لا تتم معالجة أي دفعة حقيقية. |
| `corporate.form.eyebrow` | Added | وجبات الشركات |
| `corporate.form.heading` | Added | رتّب وجبات مكان العمل. |
| `corporate.form.intro` | Added | تحفظ هذه النسخة التجريبية استفسار شركتك، لكنها لا تُشعر فريقًا خارجيًا. |
| `corporate.form.successMsg` | Added | تم حفظ استفسار الشركة في النسخة التجريبية. تواصل مباشرة مع الفريق لمناقشة وجبات مكان العمل. |
| `corporate.form.labelOrgName` | Added | اسم الشركة |
| `corporate.form.labelContactName` | Added | اسم جهة الاتصال |
| `corporate.form.labelEmail` | Added | البريد الإلكتروني للعمل |
| `corporate.form.labelPhone` | Added | الهاتف |
| `corporate.form.labelScale` | Added | عدد الموظفين |
| `corporate.form.labelMessage` | Added | الرسالة |
| `corporate.form.placeholderMessage` | Added | أخبرنا عن احتياجات الوجبات في مكان عملك. |
| `corporate.form.submit` | Added | حفظ استفسار الشركة |
| `corporate.form.errOrgName` | Added | أدخل اسم الشركة (وليس أرقامًا فقط). |
| `corporate.form.errContactName` | Added | أدخل اسم جهة الاتصال (حروف فقط، حرفان على الأقل). |
| `corporate.form.errEmail` | Added | يلزم إدخال بريد إلكتروني صحيح. |
| `corporate.form.errPhone` | Added | أدخل رقم هاتف صحيح (من 8 إلى 15 رقمًا). |
| `corporate.form.errMessage` | Added | أخبرنا بمزيد من التفاصيل — بين 10 و2000 حرف. |
| `corporate.form.errScale` | Added | اختر نطاق عدد الموظفين من القائمة. |
| `corporate.form.range0` | Added | 1–25 |
| `corporate.form.range1` | Added | 26–100 |
| `corporate.form.range2` | Added | 101–250 |
| `corporate.form.range3` | Added | 250+ |
| `subscription.titles.list` | Added | حجز وجبات الطلاب |
| `subscription.titles.new` | Added | اختر عدد الأشهر |
| `subscription.titles.review` | Added | مراجعة الاشتراك |
| `subscription.titles.meals` | Added | اختر وجباتك اليومية |
| `subscription.titles.terms` | Added | شروط الدفع |
| `subscription.titles.payment` | Added | ملخص الدفع |
| `subscription.titles.knet` | Added | الدفع عبر كي نت |
| `subscription.titles.confirmation` | Added | تم تأكيد الاشتراك |
| `subscription.calendarNote` | Added | تتبع مواعيد الوجبات التقويم الدراسي لمدرستك. تُحتسب الرسوم وتُقدّم الوجبات في أيام العمل فقط. تستخدم هذه النسخة التجريبية تقويمًا توضيحيًا مؤقتًا. |
| `subscription.bookNow` | Added | احجز الآن |
| `subscription.leadBanner` | Added | ستبدأ خدمة الوجبات بعد 7 أيام من إتمام الدفع بنجاح. |
| `subscription.bookingDate` | Added | تاريخ الحجز |
| `subscription.numberMonths` | Added | عدد الأشهر |
| `subscription.monthPreview` | Added | الأشهر المشمولة |
| `subscription.preview` | Added | معاينة الأشهر |
| `subscription.next` | Added | التالي |
| `subscription.startAgain` | Added | اختر الأشهر مجددًا |
| `subscription.paymentMethod` | Added | طريقة الدفع |
| `subscription.knet` | Added | كي نت |
| `subscription.payable` | Added | المبلغ المستحق |
| `subscription.simulated` | Added | دفع تجريبي — لا تتم معالجة أي دفعة حقيقية |
| `subscription.continuePayment` | Added | المتابعة إلى الدفع |
| `subscription.pay` | Added | ادفع |
| `subscription.confirmed` | Added | تم تأكيد اشتراكك وحفظ الوجبات التي اخترتها. |
| `subscription.invoice` | Added | تنزيل الفاتورة |
| `subscription.changeMeals` | Added | عرض الوجبات وتغييرها |
| `subscription.totalDays` | Added | إجمالي الأيام |
| `subscription.holidayDays` | Added | أيام العطل |
| `subscription.mealDays` | Added | أيام الوجبات |
| `subscription.rate` | Added | السعر اليومي |
| `subscription.amount` | Added | المبلغ |
| `subscription.total` | Added | الإجمالي الكلي |
| `subscription.month` | Added | الشهر |
| `subscription.showMonth` | Added | عرض الشهر |
| `subscription.changeNote` | Added | يمكنك تغيير هذه الوجبات لاحقًا. |
| `subscription.cutoffNote` | Added | يمكن تغيير الوجبات حتى 48 ساعة قبل يوم الوجبة، محسوبة من منتصف الليل بتوقيت الكويت. |
| `subscription.locked` | Added | انتهت مهلة التغيير |
| `subscription.saveMeals` | Added | حفظ الوجبات |
| `subscription.saved` | Added | تم حفظ اختيارات الوجبات. |
| `subscription.proceed` | Added | المتابعة للدفع |
| `subscription.saveBeforeProceed` | Added | احفظ تغييرات الوجبات قبل المتابعة للدفع أو الانتقال إلى شهر آخر. |
| `subscription.bookMore` | Added | احجز أشهرًا إضافية |
| `subscription.errors.invalidDate` | Added | التاريخ غير صحيح. يرجى اختيار الأشهر مجددًا. |
| `subscription.errors.invalidMonths` | Added | اختر من شهر واحد إلى 6 أشهر. |
| `subscription.errors.invalidPrice` | Added | السعر اليومي الصحيح غير متاح. يرجى المحاولة لاحقًا. |
| `subscription.errors.invalidStudent` | Added | اختر أحد طلابك. |
| `subscription.errors.overlap` | Added | لدى هذا الطالب اشتراك يشمل شهرًا أو أكثر من الأشهر المختارة. لم تتم معالجة أي دفعة. |
| `subscription.errors.incompleteCalendar` | Added | التقويم الكامل غير متاح بعد لكل شهر مختار. لم تتم معالجة أي دفعة. |
| `subscription.errors.zeroTotal` | Added | لا توجد أيام وجبات في هذه الأشهر. يرجى اختيار اشتراك آخر. |
| `subscription.errors.noMenu` | Added | لا توجد وجبات افتراضية متاحة. يرجى المحاولة لاحقًا. |
| `subscription.errors.stepOrder` | Added | أكمل خطوات الحجز السابقة ووافق على الشروط أولًا. |
| `subscription.errors.expired` | Added | لم يعد شهر البداية متاحًا ضمن مهلة بدء الخدمة. يرجى اختيار الأشهر مجددًا. |
| `subscription.errors.priceChanged` | Added | تغيّر التقويم أو المدرسة أو السعر. راجع الاشتراك المحدّث ووافق على الشروط مجددًا. لم تتم معالجة أي دفعة. |
| `subscription.errors.invalidMeals` | Added | اختر وجبة صحيحة لكل يوم وجبة في الشهر المختار. |
| `subscription.errors.cutoff` | Added | انتهت مهلة التغيير البالغة 48 ساعة ليوم أو أكثر. لم تُحفظ أي تغييرات. |
| `subscription.errors.staleDraft` | Added | تم استبدال مسودة الحجز هذه. ارجع إلى حجز الوجبات للمتابعة. |
| `invoice.heading` | Added | فاتورة |
| `invoice.number` | Added | رقم الفاتورة |
| `invoice.date` | Added | تاريخ الفاتورة |
| `invoice.parent` | Added | ولي الأمر |
| `invoice.civilId` | Added | الرقم المدني (مموّه) |
| `invoice.child` | Added | الطفل |
| `invoice.school` | Added | المدرسة |
| `invoice.class` | Added | الصف |
| `invoice.month` | Added | الشهر |
| `invoice.mealDays` | Added | أيام الوجبات |
| `invoice.rate` | Added | السعر (د.ك) |
| `invoice.amount` | Added | المبلغ (د.ك) |
| `invoice.total` | Added | الإجمالي |
| `invoice.payment` | Added | طريقة الدفع: كي نت (محاكاة — لم تتم معالجة أي دفعة حقيقية) |

## Final delivery verification

All ten phases are committed directly on `main`, with no feature branch or pull request. The final commit is titled `Phase 10: tests and QA`. `origin main` is the authorized push target; the final chat response records the verified push result and commit ID.
