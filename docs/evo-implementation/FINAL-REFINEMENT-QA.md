# Evo Meals — Final Refinement QA

Controlled refinement pass on top of the completed Phase 01–05 implementation. This document records what was audited, what changed, and how it was verified, per `FINAL-REFINEMENT-PROMPT.md`.

**Starting SHA:** `7c60e95` (branch `evo-final-refinement`)
**Ending SHA:** not committed — working tree only (see Git status at the end of this document)

---

## 1. What was audited

- Full CSS grid/flex system in `public/css/style.css` (~106KB) for tablet composition (768–1180px)
- Public mobile header/drawer hierarchy (`views/partials/sitenav.ejs`, `public/js/nav.js`)
- Homepage (`views/home.ejs`) narrative order and mobile hero composition
- `/parents` page structure, copy, and claims against `CLAIMS-REGISTRY.md`
- Every public/authenticated form's client- and server-side validation (`server.js`, `public/js/motion.js`, `views/register.ejs`, `views/students.ejs`, `views/profile.ejs`, `views/contact.ejs`, `views/schools.ejs`, `views/caterers.ejs`)
- The full color token system in `:root` (`public/css/style.css`)
- Existing animation system (`public/js/motion.js`, CSS `@keyframes`) for reduced-motion coverage and missing "cause → effect" cues
- Arabic/RTL rendering of every page touched
- SEO metadata (titles, descriptions, canonical, hreflang, sitemap, robots) for regressions
- Copy across `locales/en.json` / `locales/ar.json` against the Claims Registry and the spec's explicit claim-check list (section 19)

## 2. Root cause of the tablet issue

`.grid-3`, `.grid-4`, `.trust-grid`, `.trust-grid-4`, `.benefit-icon-grid`, and `.what-is-pillars` all kept their full column count from desktop width down to a single low breakpoint (800px, or in `.benefit-icon-grid`'s case 900px), then collapsed straight to one column. Between roughly 900–1180px this produced 3–4 columns of icon+heading+paragraph content squeezed into ~260–330px tracks — no overflow, but visibly too compressed for the content, exactly matching the supplied 960px reference screenshot.

Separately, `.partner-form-wrap` (the Schools/Caterers lead-capture layout) and roughly 30 other grid declarations used bare `1fr` / `1fr 1fr` tracks. A CSS grid item's default `min-width` is `auto` (its own max-content size), so a track declared as plain `1fr` cannot shrink below its content's natural width — this is what caused the *actual* horizontal-overflow bug found during the responsive sweep (see section 15), on `/schools`, `/caterers`, and (more severely, since Arabic UI strings run longer) nearly every Arabic page at 320px.

**Fix:** introduced an intentional 2-column step at `max-width:1180px` for every 3/4-up grid, tightened the final single-column collapse to `max-width:700px` for text-bearing grids (was 800–900px), and converted every fixed-fraction grid track (`1fr`, `1fr 1fr`, `1.4fr 2.6fr`, `1fr 0.9fr`) to its `minmax(0, …)` equivalent site-wide (31 declarations) so content can never force a track wider than its column.

## 3. Mobile conversion changes

- **Header**: Login now stays visible in the compact mobile header (previously all three actions — Login/Register/Download App — were hidden behind the hamburger). Register and Download App moved into the drawer only, not duplicated.
- **Drawer hierarchy**, top to bottom: **Check My School** (new, primary) + **Log in** as a two-up priority row → **Register** → the full nav list (Home, For Parents, For Schools, For Caterers, How It Works, Features, About, Contact) → language switch, matching the spec's target order exactly.
- **New "Check My School" nav entry** (`nav.checkMySchool` / `تحقق من مدرستي`) links to `#supported-schools` on the homepage from any page — the existing honest school list, not a new live-search backend (per the spec's explicit instruction not to imply a live availability API).
- **Homepage mobile hero**: previously three visually equal full-width buttons (Check Your School / See How It Works / Download App). Now: one full-width primary (Check Your School), one compact secondary pill beside it (Log in), and "See how it works" demoted to a quiet underlined text link below — no longer a button at all. Download App was removed from the hero (it already has its own dedicated `#app` section further down; this was the one deliberate case of removing a duplicate CTA rather than relocating it).
- At the narrowest widths (≤360px), the hamburger's "Menu"/"Close" text label hides (icon-only), which is what actually fixed a real ~5px horizontal-overflow bug on Arabic pages at 320px (see section 15) caused by "تسجيل الدخول" being wider than "Log in" next to the header's other two flex-shrink:0 elements. `aria-label` (kept in sync by `nav.js`) preserves the accessible name.

## 4. Homepage changes

Audited the existing section order against the spec's desired narrative (proposition → check school/login → verified school context → food/menu proof → journey → collection confirmation → multiple children → school/caterer pathway → app → FAQ → final CTA). **The existing order already matched this exactly** (sections `4.1`–`4.10` in `home.ejs`) — no reordering was needed. Changes were limited to the hero CTA row (above) and are otherwise covered by the palette change (section 8).

## 5. For Parents changes

- **Hero headline** changed from *"Know they ate. Know what they ate."* (implies collection proves consumption — flagged by the spec's claim rule) to *"Know what they'll eat. Know when they collect it."* — the spec's own suggested truthful line.
- **Nine-pill "complete parent journey" list removed entirely** (`journey-block`/`journey-pills`) and replaced with a compact three-phase visual strip (`.mini-journey`): **Before School → Choose the meal**, **At School → Child collects**, **After Collection → You see the confirmation** — a numbered, connected line, not a wall of pills. The four real operational steps (Book/Pay/Tap/Notified) are kept below it, unchanged.
- **Menu section rebuilt** from a flat 4-up grid of identical cards into one **featured dish** (`.menu-featured`, reusing the same layout as the authenticated `/menu` page: image + name + tag + ingredients + calories/protein) plus a compact **4-up preview strip** (`.menu-preview-strip`) for the remaining dishes — per spec section 7C ("featured-detail composition communicates more information faster").
- **Claim fix**: `parents.menu.intro` changed from *"Every dish is checked against your child's allergy profile before it's ever offered as an option"* (implies automated allergy filtering the codebase does not perform) to *"See what's in every dish — ingredients, nutrition, and dish-specific allergen information — before you ever book it"* — describes the real, verified capability (per-dish allergen display) without the false safety-matching claim.
- Pricing, collection-proof, multiple-children, app, and FAQ sections were already in a visual, non-text-heavy form from prior phases and needed no structural change.

## 6. Form/data-entry changes

Created `lib/validate.js` — one shared, server-authoritative validation module (`isValidName`, `isValidEmail`, `isValidCivilId`, `isValidPhone`, `isValidOrgName`, `isValidClassSection`) — and wired it into every form's `POST` handler in `server.js`. Client-side rules in `public/js/motion.js` were rewritten to mirror the same logic (with a `try/catch`-guarded `RegExp` construction so a browser without Unicode property-escape support degrades gracefully instead of throwing).

**Key defect fixed:** `POST /register`'s name check was `^[A-Za-z\s]{2,60}$` — it rejected every legitimate Arabic name, and Latin names containing hyphens or apostrophes (e.g. `O'Connor`). Verified end-to-end: registering with the name `محمد العتيبي` now succeeds (redirects to `/dashboard`); registering with `12345` is rejected with a translated error and the (non-password) field values preserved.

Other fixes, all server-side authoritative with a matching client-side hint:
- `POST /register` now also validates Civil ID format (exactly 12 digits) — previously **not validated at all**, only checked for presence.
- `POST /students` (add/edit child) had **no server-side validation whatsoever** — name, Civil ID, and class/section were trimmed and inserted directly. Now validates name, Civil ID (12 digits, new students only), and class/section length/charset, and re-renders the form with the parent's entered values on failure.
- `POST /profile` had no validation at all. Now validates name/email/phone (email/phone optional but checked if provided) and preserves entered values on error.
- `POST /contact` only checked presence. Now validates name format and email format, checks message length (≥10 chars), and preserves entered values on failure (previously lost on any error).
- `POST /schools/inquiry` and `POST /caterers/inquiry`: organization-name and contact-name checks upgraded from "non-empty" to real format checks (`isValidOrgName` rejects digits-only, allows real names like "360 Foods"; `isValidName` for the contact person). Phone, if provided, is now validated (was previously accepted unchecked).
- Phone validation minimum lowered from 10 to 8 digits everywhere (client + server) — an 8-digit Kuwait local number with no country code was previously rejected as invalid, contradicting the spec's explicit Kuwait-plus-international requirement.
- Validation error copy is now localized: added `common.val*` keys to both locale files and `window.EVO_I18N` (`views/partials/head.ejs`) so client-side validation messages render in Arabic when the interface is Arabic (previously every client-side message was a hardcoded English string regardless of locale).
- **Two additional false-claim fixes found during this audit** (not originally form bugs, but caught while reviewing form copy against the Claims Registry): `students.hintAllergies` said *"Every meal is checked against this automatically"* — no such automated check exists anywhere in the codebase (the `allergies` column is stored, never read back by any route). Changed to describe it honestly as a reference field. `menu.commitment2` and `booking.agePortionHint` claimed portions/protein are "matched to their registered grade" — per `BLOCKERS.md` #3 / `CLAIMS-REGISTRY.md` #11, no per-grade portion variant exists in the data model (one fixed value per dish). Both reworded to stop asserting automatic grade-based personalization.

## 7. Validation rules introduced (`lib/validate.js`)

| Field | Rule |
|---|---|
| Name | ≥1 Unicode letter; letters, combining marks (diacritics), spaces, hyphens, apostrophes only; 2–60 chars |
| Email | one `@`, at least one `.` in the domain part, no whitespace |
| Civil ID | exactly 12 digits |
| Phone | optional `+`, digits/spaces/hyphens/parentheses for entry; 8–15 digits after stripping formatting |
| Organization name | ≥1 letter, not digits-only; letters/numbers/spaces/apostrophes/ampersands/basic punctuation; 2–80 chars |
| Class/section | letters/numbers/spaces/apostrophes/hyphens; 1–30 chars; optional |

## 8. Color system and final token values

Replaced the previous teal/coral identity with the spec's green/school-yellow system. Token **names** were kept (`--navy-*`, `--lime-*`) and their **values** changed — an explicitly sanctioned approach in the spec ("legacy aliases may temporarily point to the new semantic tokens") that re-themes every one of the ~150+ existing call sites without touching each one individually. A new, deliberately unaliased `--school-yellow` / `--school-yellow-soft` pair was added for the one sanctioned high-attention use (`.btn-school-yellow`, applied only to "Check My School" in the hero and the drawer).

| Token | Old value | New value | Role |
|---|---|---|---|
| `--navy-950` | `#1B5E56` (teal) | `#163F31` | Primary Forest — structural dark (header/footer/hero ground) |
| `--navy-800` | `#2A7A6F` | `#1F604A` | Secondary Forest |
| `--navy-700` | `#3B9184` | `#2C7259` | mid forest, dark-on-dark borders |
| `--lime-500` | `#F2754A` (coral) | `#5E9D6E` | Fresh Leaf — default button/link accent |
| `--lime-600` | `#DE6339` | `#5B966B` | hover state |
| `--lime-300` | `#FFC4AC` | `#A0D6AC` | on-dark-navy text/icon accent |
| `--lime-700` | `#B23D1F` | `#2E6B45` | text-safe accent (~40 live sites) |
| `--school-yellow` | *(new)* | `#F2C94C` | sparing high-attention accent only |
| `--school-yellow-soft` | *(new)* | `#FFF3C7` | |
| `--ice-50` / `--ice-100` | `#EFF4FA` / `#E4ECF7` (cool blue) | `#EFF6F0` / `#E3F0E6` | Soft Mint page background |
| `--cream-50` / `--cream-100` | `#FFF8ED` / `#FBEEDA` | `#FFFBF3` / `#FBF1DC` | Warm Cream, hero/food sections |
| `--ink-900` | `#2B2420` | `#18211D` | |
| `--muted` | `#4C5560` | `#58655F` | |
| `--red-500` / `--red-700` | `#D64545` / `#9B2C2C` | `#C24B44` / `#A52A24` | error |

All hardcoded `rgba()` tints referencing the old coral (`rgba(242,117,74,…)`, `rgba(178,61,31,…)`, `rgba(245,143,104,…)`) were converted to their new leaf-green equivalents (19 occurrences) — a stray pale-coral badge background (`.testimonial-role`) was also caught and fixed to a matching pale green.

**Contrast verified (WCAG AA, computed via relative-luminance formula, not eyeballed):**
- White text on `--navy-950`/`--navy-800`: 11.74:1 / 7.42:1
- Ink-900 text on `--lime-500` (every real button use pairs dark ink text with this background, not white — confirmed by auditing every `background:var(--lime-500)` call site first): 5.12:1; hover state `--lime-600`: 4.72:1
- `--lime-300` on `--navy-950` / `--navy-800`: 7.10:1 / 4.49:1
- `--lime-700` on white: 6.35:1
- Ink-900 on `--school-yellow`: 10.39:1 (yellow is never used as a text color itself — always dark text on top, since the tint alone is only 1.59:1 against white and unusable as foreground)
- `--muted` on white/cream-50/ice-50: 6.10:1 / 5.91:1 / ~5.8:1

One value was deliberately adjusted from the spec's own reference during this process: the spec's "Fresh Leaf" swatch (`#5E9D6E`) was initially assumed to need darkening for white-button-text safety; auditing actual usage showed every button pairs it with dark ink text instead, where the *lighter* reference value is the one that passes AA (a darker value would have failed at 3.53:1). The reference value was used as-is; the darker alternative was discarded rather than shipped with a broken contrast pairing.

**Distribution:** yellow appears in exactly two places (hero "Check Your School", drawer "Check My School") — not on any other button, card, icon, or heading, matching the spec's "sparing accent, never a background wash" requirement.

## 9. Animation system changes

The existing purposeful-motion system (`public/js/motion.js`, `[data-reveal]` + `IntersectionObserver`, hero entrance stagger, tap-to-collect pulse, `prefers-reduced-motion` guards throughout) was largely already compliant with the spec and was preserved, not rebuilt. Additions:
- New components (`.mini-journey`, `.menu-featured`, `.menu-preview-strip`) wired into the existing `[data-reveal]` system rather than inventing a parallel one.
- `.menu-preview-card` added to the shared card-hover treatment (lift + shadow), plus a new pointer-device-only (`@media (hover:hover) and (pointer:fine)`) subtle image zoom (scale 1.035) on menu cards — touch devices are untouched, since dish info was never hover-gated to begin with. Fully covered by the existing `prefers-reduced-motion` block.
- **Booking total transition** (spec section 13E, previously absent — the total was a silent `textContent` swap with no transition at all): added a `setTotal()` helper in `booking.ejs` that only re-triggers the CSS animation when the value actually changes, plus a `.total-updated` opacity/scale keyframe (`public/css/style.css`), both wrapped in the standard reduced-motion guard. Verified live via Playwright: switching to "pay as you go" and setting 5 days recalculates to `KWD 10.000` and applies the `.total-updated` class.

No animation library was added; every new transition uses the existing CSS custom-property duration/easing tokens (`--dur-standard`, `--ease-out`) already defined in the file.

## 10. RTL changes

No structural RTL changes were required — the existing `[dir="rtl"]` rules, logical-property usage, and `<bdi>` isolation (KWD amounts, dates, phone numbers) were preserved untouched. New components were built RTL-aware from the start:
- `.mini-journey`'s connecting line has an explicit `[dir="rtl"]` mirror rule.
- The mobile drawer's priority row, hero quiet-link, and `.btn-school-yellow` all inherit the existing flex/logical-property system with no hardcoded left/right.

Verified visually (Playwright screenshots) on `/ar`, `/ar/parents`, and the Arabic mobile drawer at 390px and 320px — correct mirroring, correct reading order, no leftover LTR artifacts, new copy (mini-journey, hero headline, Check My School) all present and correctly translated.

## 11. Accessibility changes

- Added `aria-label` to both mobile-drawer toggle buttons (`sitenav.ejs`, `appnav.ejs`), kept in sync with open/close state by `nav.js` — previously the accessible name came entirely from the visible "Menu"/"Close" text, which is now hidden at ≤360px for space reasons; `aria-label` preserves it regardless of visibility.
- All new interactive elements (mini-journey is decorative/non-interactive, hero quiet-link, school-yellow buttons) use the existing focus-visible and touch-target system with no new exceptions.
- No changes to skip-link, landmark structure, or heading hierarchy — verified present and unchanged.

## 12. SEO/content-honesty checks

- `robots.txt` and `sitemap.xml` (including hreflang alternates) verified unchanged and correctly generated after all edits.
- `/parents` meta description updated in step with its allergen-claim fix ("allergen-checked menus" → "dish-level allergen information" — the old wording implied a checking *process*, the new wording describes the actual displayed data).
- Full sweep of `locales/en.json`/`ar.json` against the spec's explicit claim checklist (section 19) found and fixed, beyond the ones already covered above: `home.howItWorks` step 3 body ("Matches each order to the right student and allergy profile" → "…with any allergy notes on file passed along" — the original implied automated safety matching against allergy data in order routing, which the codebase does not do anywhere).
- No new statistics, testimonials, school "live" status claims, or payment-processing claims were introduced. `SHOW_TRUST_STATS`/`SHOW_TESTIMONIALS` gates were left untouched (still off).

## 13. Tests run

```
npm test   (node --test tests/*.test.js)
```
Run after every slice (7 full runs across this session). Final result: **21/21 passing, 0 failures** (`tests/civil-id-masking.test.js`, `tests/mask.test.js`, `tests/pricing.test.js`) — unchanged from the pre-refinement baseline.

Additional manual/scripted verification (Playwright, headless Chromium, this session):
- End-to-end registration with an Arabic name (`محمد العتيبي`) → succeeds, redirects to `/dashboard`.
- End-to-end registration with a digits-only name (`12345`) → rejected with the correct localized error, non-sensitive field values preserved.
- End-to-end student creation with a digits-only name → rejected, form re-rendered with entered values.
- End-to-end student creation with an Arabic name (`سارة أحمد`) → succeeds.
- Booking page: switching plan type and entering days recalculates the total correctly and triggers the new pulse animation, with zero JS console errors.
- Full authenticated route smoke test (`/dashboard`, `/students`, `/menu`, `/booking`, `/history`, `/profile`, `/staff`) → all 200 after login.
- Full public route smoke test (all EN + AR public pages, `/school-admin/login`) → all 200; a deliberately invalid path → 404.

## 14. Routes checked

**Public (EN):** `/`, `/parents`, `/schools`, `/caterers`, `/how-it-works`, `/features`, `/about`, `/contact`, `/login`, `/register`, `/forgot-password`, `/privacy`, `/terms`, and a 404 path.
**Public (AR):** `/ar`, `/ar/parents`, `/ar/schools`, `/ar/caterers`, `/ar/how-it-works`, `/ar/features`, `/ar/about`, `/ar/contact`, `/ar/login`, `/ar/register`, `/ar/forgot-password`.
**Authenticated:** `/dashboard`, `/students`, `/students/:id/edit` (via form re-render on validation failure), `/menu`, `/booking`, `/history`, `/profile`, `/staff`.
**School admin:** `/school-admin/login` (renders; login itself not exercised — no plaintext demo password was available in the seed data, and this area was not touched by any edit in this pass).

## 15. Responsive widths actually checked

Automated (Playwright headless Chromium, scroll-width vs. client-width overflow check + console-error capture) across **all 24 routes above × 6 widths** (320, 375, 768, 960, 1280, 1920) — **150 checks total, 0 issues** on the final run.

Manually inspected via full-page and viewport screenshots at: **320, 375, 390, 768, 820, 900, 960, 1024, 1100, 1180, 1280** — covering the homepage, `/parents`, `/schools`, the mobile drawer (open state, EN + AR), and the hero at both English and Arabic.

Widths from the spec's full matrix that were **not** individually screenshotted (though covered by the 150-check automated sweep at their nearest neighbor): 344, 412, 430, 480, 540, 600, 1366, 1440, 1536, 1728. Not claiming manual visual inspection at those exact widths.

## 16. Performance checks

- No animation library was added; all new motion uses CSS transforms/opacity and the existing keyframe/transition token system.
- Hero mobile/desktop picture sources (`hero-mobile.webp`/`.png` vs `hero-desktop.webp`/`.png`) were not touched — still correctly conditioned on `(max-width:900px)`.
- No new render-blocking resources were added; the one new inline script (`window.EVO_I18N` additions in `head.ejs`) is a handful of extra string literals in an already-inlined block, not a new request.
- New CSS added (~150 lines across tokens, grid fixes, mini-journey, menu-featured/preview-strip, total-pulse) — no measurement of total stylesheet weight was performed, but no new external resources or fonts were introduced.

## 17. Known limitations

- The responsive matrix's 10 widths listed in section 15 were not individually screenshotted — covered only by the automated overflow sweep, not a human-equivalent visual check.
- `menu-preview-card` thumbnails intermittently appear as solid color blocks in full-page screenshots taken immediately after page load — this is `loading="lazy"` interacting with the screenshot tool's page-load timing, not a real rendering defect (confirmed: the same images render correctly once the reveal/lazy-load state settles, and the underlying image files exist and load correctly on request).
- School-admin login/dashboard was not functionally exercised (no known demo password), though it was not touched by this pass and is verified unmodified.
- The spec's Section 17 note about the whole stylesheet not yet being converted to logical properties (an existing, pre-dated-this-pass limitation, noted in the file's own RTL section comment) remains true — this pass did not attempt that broader conversion, matching the file's existing documented scope decision.

## 18. Remaining client-dependent blockers

Unchanged from `BLOCKERS.md` — none of this pass's changes resolve or require re-opening: (1) `/contact` has no real destination (still demo-only, logged not stored); (2) no admin view for the `inquiries` table; (3) actual real-world status of grade-based portioning as a genuine catering-side process is still an open question — the copy was reworded to stop claiming automatic personalization, but if grade-based portioning *is* real and just not modeled in this demo, the client can confirm that and the copy can be reinstated with real backing; (4) contact details (address/phone/email/app-store links) still not independently verifiable from the codebase; (5) actual current partnership status of the three named schools is still unconfirmed.

## 19. Files changed

```
lib/validate.js                    (new)
locales/ar.json
locales/en.json
public/css/style.css
public/js/motion.js
public/js/nav.js
server.js
views/booking.ejs
views/caterers.ejs
views/contact.ejs
views/home.ejs
views/parents.ejs
views/partials/appnav.ejs
views/partials/head.ejs
views/partials/sitenav.ejs
views/profile.ejs
views/register.ejs
views/schools.ejs
views/students.ejs
```
18 files changed, 1 new file — no pages removed, no routes removed, no business-logic files (`db.js`, `lib/pricing.js`, `lib/mask.js`, `lib/i18n.js`, migrations) touched.

## 20. Git SHA at completion

Starting SHA: `7c60e95`. This pass does not commit or push (per explicit instruction) — the above files remain as uncommitted working-tree changes on branch `evo-final-refinement`.
