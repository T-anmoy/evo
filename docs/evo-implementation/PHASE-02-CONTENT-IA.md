# Phase 2 — Public Information Architecture, Content Refinement & Conversion Clarity

Status: **complete** (public-website content/IA restructuring only — no route changes, no business-logic changes, no visual redesign).

Read before this phase (per the execution prompt): [PHASE-01-AUDIT.md](PHASE-01-AUDIT.md), [PAGE-CONTRACT.md](PAGE-CONTRACT.md), [CLAIMS-REGISTRY.md](CLAIMS-REGISTRY.md), [BLOCKERS.md](BLOCKERS.md).

---

## 1. Summary of what changed

Every existing public route still exists, still renders, and still points at the same server-side logic. This phase only changed **what each public page says and how its sections are organized** — plus one small, additive CSS rule (`.steps-6`) needed to lay out a 6-item flow that used to be 5. No route was added, removed, or renamed; no `server.js` logic changed; no migration, `db.js` function, or `lib/pricing.js`/`lib/mask.js` logic changed.

**Files touched:**

| File | What changed |
|---|---|
| `views/home.ejs` | Full content/structure rewrite — from a 15-section mega-page duplicating `/parents`, `/schools`, `/caterers`, and `/features` content, down to the ~10 purposeful moments specified in this phase (hero, supported schools, trust row, menu proof, core journey, collection proof, multiple children, B2B pathways, app, short FAQ, final CTA) |
| `views/parents.ejs` | Reordered to the spec's 9-part structure; added three sections that didn't exist before (tap-to-collect + notification, multiple children, app); added a short FAQ pointer instead of duplicating the homepage's FAQ; pricing copy reworded; removed the unverified "Most parents choose this" badge |
| `views/schools.ejs` | Restructured from 3 sections into the spec's 9-part structure (hero, current problem, connected programme model, parent experience, operational visibility, student-level identification, dashboard/product proof, onboarding, enquiry); the dashboard-preview mockup was **moved here from the homepage** (not duplicated — removed from `/`, added here) |
| `views/caterers.ejs` | Restructured from 3 sections into the spec's structure (hero, digital order queue, demand visibility, school-specific fulfilment, reduced manual processing, onboarding, enquiry); added a new illustrative order-queue table to make the kitchen experience tangible, per the brief's explicit request |
| `views/contact.ejs` | Restructured into three intent pathways (parent support / school partnership / catering partnership); the two B2B pathways link to the existing, already-working `/schools#partner-form` and `/caterers#caterer-form` forms instead of duplicating them; the parent-support form is unchanged functionally, with softer, non-SLA copy |
| `views/how-it-works.ejs` | Added the three short role-flow summaries (Parent: Book→Pay→Tap→Notified; School: Set up→Monitor→Report; Caterer: Receive→Prepare→Deliver) below the canonical 6-step sequence |
| `views/partials/how-it-works-section.ejs` | Extended from 5 steps to the spec's 6-step canonical sequence (added "Parent — Gets notified"); this partial is shared by `/` and `/how-it-works`, so both stayed in sync automatically, by construction |
| `views/partials/sitefoot.ejs` | Fixed the "Menu" footer link, which pointed at a homepage anchor (`/#nutrition`) that no longer exists after the homepage restructure — now points to `/parents#menu`, the real, complete menu section |
| `public/css/style.css` | Added `.steps-6` (and its two responsive breakpoints), mirroring the existing `.steps-5` pattern exactly, so the new 6-step flow lays out correctly. No other CSS changed — this was not a visual redesign. |
| `docs/evo-implementation/CLAIMS-REGISTRY.md` | Updated 2 existing entries to "resolved," added 2 new entries for claims found/introduced in this phase |
| `docs/evo-implementation/BLOCKERS.md` | Updated blocker #3 with its Phase 2 partial resolution; added new blocker #6 |

**`/features` and `/about` were reviewed and left unchanged** — both were already compliant with this phase's claim-discipline rules when audited in Phase 1 (see Section 5 below).

---

## 2. Section movement — where content went, not just what disappeared

Per the acceptance criteria, nothing was deleted outright; everything was either relocated, condensed with a link to its full version, or removed because it was an already-flagged unverified claim (a claim-discipline removal, tracked in the Claims Registry, is different from an information deletion — see Section 5).

| Content that was on the old homepage | Where it is now |
|---|---|
| Full "For Parents" journey (4-step cards, tap demo, journey pills, pricing grid) | **`/parents`** — this was a near-verbatim duplicate flagged in the Phase 1 audit (Section H); the homepage now shows only a condensed 6-step core journey (shared with `/how-it-works`) plus a standalone collection-proof and multiple-children moment, and links out to `/parents` for the full detail |
| Full "Features" grid (5 role groups) | **`/features`** only — this canonical page already existed from Phase 1; the homepage no longer repeats it (it wasn't one of this phase's 8–10 target homepage moments) |
| School-admin dashboard preview mockup (stats: today's meals, active subscriptions, meals delivered, pending orders, parent engagement %) | **`/schools`** — moved verbatim (same "product preview, not live data" framing) into the new "Dashboard / product proof" section, since it's specifically a school-administrator artifact and section 6 of the brief calls for it there |
| "For Schools" 6-bullet teaser + "For Caterers" 4-bullet teaser (the entire mini sales pitch for each) | **`/schools`** and **`/caterers`** respectively — the homepage now shows only the two concise panels specified in section 4.7 ("Run your school meal programme with less manual coordination" / "Prepare from clear digital demand and school-specific orders"), each linking to the full page |
| "Why Evo Meals" 6-card generic-SaaS-benefit grid (Digital First, Parent Friendly, Operationally Efficient, Transparent, Scalable, Data Driven) | **Not relocated — removed.** This wasn't one of the 8–10 target homepage moments, it wasn't referenced by name anywhere in the brief's target structure for any other page, and its content (parent-friendliness, operational efficiency, transparency) is already carried by the new Trust Row, B2B panels, and Core Journey. Nothing here was a specific, checkable fact — it was generic positioning language, which is exactly what the "trusted service, not a SaaS pitch" strategic model asks to de-emphasize. |
| "What is Evo Meals?" 3-pillar section (Plan/Run/Report) | **Not relocated — removed**, same reasoning as above: generic framing, not one of the 8–10 moments, superseded by the Core Journey section. |
| 11-question, 5-category mega-FAQ | **Condensed to 4 conversion-relevant questions** (tap mechanics, payment safety, allergy handling, cancellation) directly on the homepage, with a link to `/parents` (booking/pricing detail) and `/features` (platform-wide capability detail). The "Schools & Caterers" FAQ category was dropped from the homepage FAQ specifically because that content is now properly owned by the dedicated `/schools` and `/caterers` pages (onboarding sections) rather than a homepage footnote. |
| `SHOW_TESTIMONIALS` gated section (always rendered nothing — the flag was `false`) | **Removed as dead template code.** This never displayed any content in the live site (the flag was off), so removing the inert markup deleted no actual information. The underlying principle it encoded — never publish an invented testimonial — is preserved and restated in the Claims Registry; there's nothing stopping a later phase from re-adding a real-testimonials section once real quotes exist. |
| `SHOW_TRUST_STATS` gated section (schools/students/meals figures, also always off) | **Kept, unchanged**, still gated behind the same flag, still with the same "do not fill with invented numbers" comment. This one was kept (rather than removed like testimonials) because it's directly referenced by name in the Phase 1 Claims Registry as "the correct pattern," and section 4.2 of this phase's brief explicitly lists trust/confidence signals as a required homepage moment — keeping the honest, off-by-default version ready to flip on is more useful here than removing it. |

---

## 3. Claim decisions made this phase

Full detail in [CLAIMS-REGISTRY.md](CLAIMS-REGISTRY.md) (items 9, 11, 21, 22 were touched or added). Summary:

1. **"Most parents choose this"** (subscription plan badge) — removed from `/` and `/parents`. This was explicitly named as prohibited-without-evidence in this phase's brief (section 13) and had already been flagged as unverified in Phase 1. Left unchanged on the authenticated `/booking` page, which is outside this phase's public-website scope.
2. **"Portioned for your child's age... portion size and protein content are matched to their age group"** — removed from `/` and `/parents`. This claim was already flagged in Phase 1's BLOCKERS.md #3 as outrunning what the data model actually does (menu items have one fixed nutrition value each, no per-grade variant exists in the schema). Per the claim-discipline rule ("if unverified, do not publish it as fact"), it was removed from the public marketing pages rather than carried forward. It still exists as an in-product hint on the authenticated `/booking` page — left alone, both because that's out of this phase's scope and because an in-product hint carries lower stakes than a public marketing claim.
3. **"Not a pilot, not a pitch deck — live at real schools today, booked by real parents, tapped in by real students every school day"** — this was a genuine finding made *during* this phase, not something flagged in Phase 1. It's a stronger real-time-activity claim than the codebase can verify (see `db.js`'s own comment about placeholder school calendars, quoted in the audit). **Resolved by rewording, not deletion**: the three school names are kept (school names as plain text were already deemed acceptable in Phase 1), but the surrounding copy now reads "Currently set up for these schools" — a factual, calendar/configuration claim rather than a daily-activity claim. Added to BLOCKERS.md as item 6, recommending client confirmation of the schools' actual current partnership status.
4. **New caterer order-queue table** (added this phase, `/caterers`) — explicitly labeled "Illustrative example... not a live feed" in its own section intro, per the guardrail against presenting demo/sample records as live customer activity.
5. **No new unverified claims were introduced anywhere else** — every new sentence written this phase was checked against what section 6/7's guardrails explicitly prohibit (no guaranteed revenue, adoption, volume, or savings language was added to `/schools` or `/caterers`; no caterer partnership/revenue-share model was described, since none is verified — see the explicit "skipped" comment in `caterers.ejs` above the onboarding section).

---

## 4. CTA map

Per the brief's explicit instruction not to send every CTA to `/register`:

| Page | CTAs and destinations |
|---|---|
| `/` | Check Your School → `#supported-schools` (same page) · See How It Works → `/how-it-works` · Download App → `#app` (same page) · Explore the menu experience → `/parents#menu` · For Schools panel → `/schools` · For Caterers panel → `/caterers` · App Store / Google Play → external store links · Final CTA: Parent → `/register` + `/login`, School → `/schools`, Caterer → `/caterers` |
| `/parents` | Create your account → `/register` (×2) · Log in → `/login` (×2) · Start booking / Start a subscription → `/register` (these are appropriately register-CTAs, since this is the parent conversion page itself) |
| `/schools` | Partner with us → `#partner-form` (×2) · See how the platform works → `/how-it-works` · See the full parent experience → `/parents` · form submit → `POST /schools/inquiry` — **zero `/register` CTAs**, appropriate for a B2B page |
| `/caterers` | Partner with us → `#caterer-form` · form submit → `POST /caterers/inquiry` — **zero `/register` CTAs** |
| `/how-it-works` | Create your account → `/register` (single CTA) · in-copy links to `/parents`, `/schools`, `/caterers` |
| `/contact` | Use the form below → `#parent-support` (same page) · Go to School partnership form → `/schools#partner-form` · Go to Catering partnership form → `/caterers#caterer-form` · form submit → `POST /contact` — **zero `/register` CTAs** |
| `/features` | Unchanged from Phase 1 (single "Create your account" CTA) |

Across all seven public marketing pages, only two (`/parents`, `/how-it-works`) send any CTA to `/register`, and both do so alongside at least one non-register alternative (`/login`, or the audience-specific pages). `/schools`, `/caterers`, and `/contact` send zero CTAs to `/register`.

---

## 5. `/features` and `/about` — reviewed, not changed

- **`/features`**: already grouped by Parents/Students/Schools/Caterers/Administrators exactly as section 9 of this phase's brief specifies, and every listed capability was independently verified against actual routes/DB tables in the Phase 1 audit. No enterprise features, integrations, or analytics beyond what's real were present. No change needed.
- **`/about`**: already makes no falsifiable factual claims (no founding date, headcount, funding, or awards) — it's values-level language only, which is exactly what section 10's "keep it simple and credible rather than inventing one" instructs when the repository doesn't contain a richer verified story. No change needed.

---

## 6. Tests

**Before this phase's edits:** `npm test` → 21/21 passing (unchanged from Phase 1 baseline).
**After this phase's edits:** `npm test` → 21/21 passing, 0 failures, 3 suites (`pricing.test.js`, `mask.test.js`, `civil-id-masking.test.js`).

No test was added, removed, or modified — this phase touched only public-marketing view templates, one shared partial, and one CSS rule; none of the tested business logic (`lib/pricing.js`, `lib/mask.js`, the CSRF/masking integration test) was in the edited-files list.

---

## 7. Route smoke tests

All performed against a locally running `node server.js` instance, then the server was stopped.

**Public pages — all render 200:**
`/`, `/schools`, `/parents`, `/caterers`, `/how-it-works`, `/features`, `/about`, `/privacy`, `/terms`, `/contact`, `/login`, `/register`, `/forgot-password`, `/school-admin/login`, `/sitemap.xml`, `/robots.txt`, `/health`.

**Protected pages — still correctly redirect (302) when logged out:**
`/dashboard`, `/students`, `/booking`, `/menu`, `/history`, `/profile`, `/staff`, `/school-admin/dashboard`.

**404 handling:** confirmed still returns 404 for an unknown path.

**Full login flow:** logged in as the seeded demo parent (Civil ID `111111111111` / `demo1234`) and confirmed all seven authenticated pages return 200 post-login.

**Forms — end-to-end POST test with real CSRF tokens, against the restructured pages:**
- `POST /contact` (from the new three-pathway `/contact` page) → 302 (success)
- `POST /schools/inquiry` (from the restructured `/schools` page) → 302 (success)
- `POST /caterers/inquiry` (from the restructured `/caterers` page) → 302 (success)

**Navigation-target audit:** extracted every `href` from every restructured public page and confirmed each resolves to a route that returns 200, or to an in-page/cross-page anchor (`#id` or `/page#id`) whose target `id` was confirmed to exist in the destination page's HTML. This specifically caught and fixed one regression: the footer's "Menu" link pointed at `/#nutrition`, an anchor that no longer exists after the homepage restructure — corrected to `/parents#menu`.

**Visual verification (browser, not just HTTP status):** loaded `/` in the built-in browser and scrolled through every new section (hero, supported schools, trust row, menu proof, 6-step journey, collection proof, multiple children, B2B panels, app, FAQ, final CTA). This caught and fixed one real visual defect: the "Supported schools" list initially used `.proof-name` styling (white text, `color:#fff`) inside a light `on-cream` section, making the school names invisible — fixed by moving the content into the original dark `.proof-section`/`.proof-wrap` structure those CSS classes were actually designed for. Also spot-checked `/schools`, `/caterers`, `/contact`, `/parents`, and `/how-it-works` via rendered page text extraction to confirm section order and copy matched what was written.

---

## 8. Acceptance criteria check

- ✅ All existing public pages still exist (verified via route smoke test above)
- ✅ Standalone `/how-it-works` and `/features` are real pages (added Phase 1, retained and extended this phase)
- ✅ Home is no longer a mega-page carrying every business narrative (cut from ~15 sections duplicating three other pages down to the ~10 specified moments; see Section 2's movement table)
- ✅ No important business information was simply deleted — relocated (dashboard preview → `/schools`, teaser content → `/schools`/`/caterers`) or represented elsewhere (FAQ → link to full detail on `/parents`/`/features`), except for two already-flagged unverified claims that were removed per claim discipline (see Section 3, items 1–2) and two generic-positioning sections that were dead weight, not information (Section 2's last two rows)
- ✅ Parent, school, and caterer intents are clearly separated (`/contact`'s three pathways; `/schools` and `/caterers` now carry zero parent-facing CTAs; the homepage's Final CTA separates all three explicitly)
- ✅ Unsupported claims are removed/qualified (Section 3)
- ✅ CTAs lead to context-appropriate destinations, and not every CTA goes to `/register` (Section 4)
- ✅ Legal content (`/privacy`, `/terms`) was not touched at all this phase — substantively and literally intact
- ✅ Tests pass: 21/21, no failures to document

---

## 9. Client-dependent blockers (see BLOCKERS.md for full detail)

1. **(Carried over, partially resolved)** Grade-based portion sizing — removed from public pages, still needs a client decision on whether the underlying claim is true of the real catering process.
2. **(New this phase)** Actual live/partnership status of the three named schools (American Creativity Academy, Kuwait English School, The English School) — the homepage claim was softened from a "live... every school day" activity claim to a "currently set up for" configuration claim, but client confirmation of the real partnership status would allow this to be tightened with confidence in either direction.
3. All Phase 1 blockers (`/contact` form has no destination, no admin view for the `inquiries` table, localization/RTL scope, unverified contact details) remain open and unaffected by this phase — `/contact`'s underlying POST behavior was deliberately left unchanged (still logs only, doesn't persist) since fixing that is a data/backend decision, not a content/IA one; the page now at least makes it clearer that the two B2B pathways go through the two forms that *do* persist (`/schools/inquiry`, `/caterers/inquiry`).

---

## 10. Recommended Phase 3 visual priorities

This phase deliberately did not touch visual design (per section 15's explicit instruction). Candidates for Phase 3, informed by what this content pass surfaced:

1. **The new order-queue table on `/caterers`** reuses the existing `.data-table-view`/`.badge` components from the authenticated app (history/school-admin views) — it works and is legible, but wasn't designed as a marketing artifact; a Phase 3 pass could give it a more deliberate "proof" visual treatment.
2. **The "Multiple children" card** (used on both `/` and `/parents`) reuses the authenticated dashboard's `.student-row`/`.avatar`/`.status-line` components directly — functional and consistent with the product's real UI (arguably a feature, not a bug, since it's genuinely showing the product's own components) — but Phase 3 could consider a more marketing-tuned presentation if the plain app-component look reads as too utilitarian.
3. **13 distinct CSS breakpoints** (flagged in Phase 1's responsive-risk audit) still haven't been consolidated — the one new breakpoint addition this phase (`.steps-6`) followed the existing scattered pattern rather than fixing it, which was the right call for a content-only phase, but Phase 3's design-token work should address this.
4. **The homepage's Final CTA section** repurposes `.benefit-card` styling inside a `.cta-band` (dark background) for the first time — visually functional (verified in-browser) but not a purpose-built component; Phase 3 could give the three-path final CTA its own dedicated visual treatment.
5. **The "Sample menu experience" and "illustrative example" labels** introduced this phase are plain inline text appended to existing copy (e.g. "· illustrative example") rather than a distinct visual badge/tag treatment — functionally honest, but a Phase 3 pass could design a consistent small "sample/illustrative" tag component (similar to the existing "Product preview" tag already used on the dashboard mockup) and apply it uniformly everywhere demo data appears across the site.
6. **Mobile/responsive testing beyond the single-viewport spot check** done in this phase (375×812 for the homepage during Phase 1's `/how-it-works`/`/features` additions) — a full device-matrix pass across the newly restructured `/schools`, `/caterers`, and `/contact` pages was not performed and should not be assumed complete.
