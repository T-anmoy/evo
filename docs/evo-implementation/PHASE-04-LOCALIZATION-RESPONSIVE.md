# Phase 4 — English + العربية, True RTL, Responsive Excellence, Accessibility

Status: **complete for a defined, honestly-scoped set of pages**; architecture is complete and production-shaped. This was flagged as a high-risk phase, and the biggest risk — a fake or half-built bilingual toggle — was avoided by scoping translation coverage explicitly rather than spreading thin across all ~24 views. See Section 3 for exactly what is and isn't translated, and why.

Read before this phase: [PHASE-01-AUDIT.md](PHASE-01-AUDIT.md), [PAGE-CONTRACT.md](PAGE-CONTRACT.md), [CLAIMS-REGISTRY.md](CLAIMS-REGISTRY.md), [PHASE-02-CONTENT-IA.md](PHASE-02-CONTENT-IA.md), [PHASE-03-VISUAL.md](PHASE-03-VISUAL.md).

---

## 1. Locale architecture

New files: `lib/i18n.js`, `locales/en.json`, `locales/ar.json`.

**Why this shape, for this codebase:** Express + EJS has no built-in i18n, and the brief explicitly asks not to duplicate templates per language. `lib/i18n.js` is a ~50-line, dependency-free module: it loads both JSON dictionaries once at startup, and exposes `t(locale, key, vars)` — a dotted-path lookup (`t('en', 'nav.forParents')`) with `{placeholder}` interpolation. If a key is missing in the requested locale, it falls back to English; if it's missing in English too, it returns the raw key (a visible, obvious bug marker during development, never a blank string or a thrown error). Every EJS view calls `t('some.key')` — never a duplicated template.

**Two locale-resolution mechanisms, matched to how each route group is actually reached** (implemented as middleware in `server.js`, right after the CSRF setup):

- **Public marketing pages + pre-auth forms** (home, parents, schools, how-it-works, features, login, register, forgot-password) use a real URL prefix: `/ar/...`. The unprefixed URL is *always* English, never silently swapped by a stored preference — a crawler or a shared link gets the same content for the same URL, every time. This is implemented via array-path route registration in `server.js` (e.g. `app.get(['/', '/ar'], handler)`) — **the same handler function, the same view template, no duplicated logic** — the view just calls `t()` instead of hardcoding English, and the middleware has already put the right locale into `res.locals` based on the request path.
- **The authenticated app and school-admin area** (dashboard, students, booking, menu, history, profile, staff, school-admin/*) have no per-language URL — adding one would mean either duplicating every authenticated route or reworking the session/auth layer, both out of scope for a localization pass. These use a session-stored preference (`req.session.locale`) instead, changed via a dedicated `GET /locale/:lang?returnTo=...` route that sets the session value and redirects back to the page the visitor was on (with an open-redirect guard: `returnTo` must be a same-origin relative path). Logging in or registering from the Arabic side (`/ar/login`, `/ar/register`) also sets `session.locale = 'ar'` as a side effect, so the language choice carries into the authenticated app immediately rather than resetting to English at the front door.

`res.locals.t`, `res.locals.locale`, `res.locals.lang`, `res.locals.dir` (`'rtl'`/`'ltr'`), `res.locals.currentPath`, `res.locals.origin`, and `res.locals.altLocalePath` (the language switcher's target URL, or `null` on session-locale pages, which use `/locale/:lang` instead) are all set by this one middleware, before any route handler runs.

---

## 2. Routes / aliases added

No existing route was removed, renamed, or had its behavior changed. Added, as array-path mirrors of the existing English handlers (same function, same business logic):

| English | Arabic mirror |
|---|---|
| `GET /` | `GET /ar` |
| `GET /parents` | `GET /ar/parents` |
| `GET /schools`, `POST /schools/inquiry` | `GET /ar/schools`, `POST /ar/schools/inquiry` |
| `GET /how-it-works` | `GET /ar/how-it-works` |
| `GET /features` | `GET /ar/features` |
| `GET /login`, `POST /login` | `GET /ar/login`, `POST /ar/login` |
| `GET /register`, `POST /register` | `GET /ar/register`, `POST /ar/register` |
| `GET /forgot-password`, `POST /forgot-password` | `GET /ar/forgot-password`, `POST /ar/forgot-password` |

Plus one new route: `GET /locale/:lang` (session-locale switch, described above).

**Deliberately not mirrored:** `/caterers`, `/about`, `/contact`, `/privacy`, `/terms` have no `/ar/...` route at all — see Section 3.

---

## 3. Translation coverage — exactly what is and isn't localized, and why

This is the most important section to read honestly. **531 string keys** are fully translated (1,062 strings total across both languages, verified with a script to have 100% key parity — no key exists in one dictionary without the other).

### Fully translated (real Arabic UI, tested end-to-end)

- **Shared chrome**: navigation (`sitenav.ejs`, `appnav.ejs`), both footers (`sitefoot.ejs`, `appfoot.ejs`), `head.ejs` (titles, meta descriptions, hreflang/canonical)
- **Public**: Home, For Parents, For Schools, How It Works (+ its shared `how-it-works-section` partial), Features (+ its shared `features-section` partial)
- **Pre-auth**: Login, Register, Forgot Password — added beyond the brief's explicit 9-page QA list because every fully-translated public page's primary CTA leads to `/register` or `/login`; leaving those two untranslated would have meant every Arabic visitor's "next step" dropped them back into English at the most important moment
- **Product** (session-locale): Dashboard, Menu, Booking — including the **client-side JavaScript** in `booking.ejs` (the live total/date-calculation preview), which now pulls its strings from a small `T` object populated server-side via `t()` at render time, so the interactive preview never drifts into English while the rest of the page is Arabic

### Explicitly not translated this phase (English-only, by design, not by oversight)

- **`/caterers`, `/about`, `/contact`** — genuinely out of scope; no `/ar/...` route exists for them at all (see Section 6/16 for why this matters for SEO). Session-locale doesn't apply to these either since they're plain public pages.
- **`/privacy`, `/terms`** — **deliberately not translated, per this phase's own explicit instruction**: *"If a legal Arabic translation is not approved/verified, do not invent final legal language. Mark it for legal review."* Machine-quality legal Arabic carries real liability risk (a mistranslated clause is a genuine legal document rewritten wrong, not just an awkward marketing sentence) — this is flagged in [BLOCKERS.md](BLOCKERS.md) as item 7, recommending a professional/legal Arabic review before any translation of these two pages is published.
- **Students, History, Profile, Staff, School-admin login/dashboard** — not translated. These pages will render with correct `lang="ar"`/`dir="rtl"` document attributes and a translated nav/footer *if* a visitor's session locale happens to be Arabic (e.g. they logged in via `/ar/login` then navigated here), but the page body itself still shows English text. This is graceful degradation, not a crash or a blank page — but it is a real coverage gap, listed explicitly so it isn't mistaken for complete coverage.
- **Menu item data** (dish names, tags, ingredients) — this is database content from `seed.json` via `db.js`, not UI copy. Translating it would mean adding a parallel Arabic dataset to the data layer (e.g. a `name_ar` column), which is a schema change outside a localization pass's scope. Every menu-related page keeps the UI chrome (labels, headings, disclaimers) in Arabic while dish names/ingredients stay in English — commented inline in `menu.ejs` and `booking.ejs` so this isn't mistaken for an oversight later.
- **Dynamically-generated notification messages** (`db.js`'s `insertNotification` calls, e.g. "Ahmed — Booking confirmed: ...") — these strings are composed and stored in the database at the moment a booking/cancellation happens, in whatever language the server-side code hardcodes (English). Retrofitting these to be locale-aware would mean either storing a translation key instead of a final string (a data-model change) or re-composing historical notifications at read time (not possible without also storing the original structured data) — out of scope here. Notification bodies are English regardless of the viewer's locale; this is listed in Section 10 as a follow-up.
- **Dates and times** (`fmtDate`/`fmtTime`/`timeAgo` in `server.js`) — still formatted with a hardcoded `en-GB` locale (e.g. "15 Sep 2026"), unchanged from Phase 1. A full Arabic date/time formatting pass (and a decision on Gregorian-in-Arabic vs. Hijri, which is itself a real product decision, not just an engineering one) was judged out of scope; flagged in Section 10.

**The result:** an Arabic-speaking visitor gets a complete, real, professionally-translated experience for the entire discovery-to-booking journey (marketing pages → login/register → dashboard → menu → booking), which is the path that actually matters for a first-time or returning parent. Deeper account-management pages (students, history, profile, staff) and the two legal pages remain English until a follow-up phase, and that boundary is documented rather than hidden.

---

## 4. Arabic typography

**Font:** [Cairo](https://fonts.google.com/specimen/Cairo), loaded from the same Google Fonts request already used for Montserrat/Poppins (`partials/head.ejs`), weights 500–800. One Arabic family is used for both headings and body copy under `dir="rtl"`, rather than trying to pair two separate Arabic families to match Montserrat's display role and Poppins' body role — this is a deliberate, common choice in Arabic type systems (a single strong family carries a whole site more often than a heading/body split does), and it avoids introducing a second, harder-to-source Arabic-capable pairing purely to mirror the Latin structure.

**Why not force Montserrat/Poppins:** neither has Arabic glyphs, so the browser would silently fall back to whatever system Arabic font is installed regardless — but their *other* properties (Montserrat's tight negative letter-spacing tuned for Latin capitals; Poppins' line-height tuned for Latin x-height) would still apply to any Arabic text that inherited them, actively hurting legibility. The RTL CSS block explicitly resets `letter-spacing:normal` on headings/logo/buttons/data values under `[dir="rtl"]`, and increases line-height (`1.75` for body copy, `1.85` for lede/paragraph text, `1.3`–`1.35` for headings) — generous enough for Arabic's taller ascenders/descenders and diacritical marks without being verified against a formal accessibility line-height standard beyond "visibly comfortable in testing."

**Numerals:** kept as Western Arabic numerals (0–9), not Eastern Arabic-Indic digits (٠–٩) — matching how Kuwaiti digital services and KNET itself typically present numbers, and avoiding a second numeral-formatting system for currency/dates on top of everything else in this phase.

---

## 5. RTL strategy

**Core approach:** convert nothing that doesn't need converting. This codebase already builds almost everything with `display:flex` and CSS Grid, and per the CSS Flexbox/Grid specs, `flex-direction:row` and grid auto-placement are *already* direction-aware — they visually reverse on their own the moment `dir="rtl"` is set on `<html>`, with zero extra CSS. This was verified directly in the browser, not assumed: the homepage's 6-step journey grid, the confidence row, the multiple-children card, the app-flow steps, the final three-path CTA, and the entire header/footer layout all mirrored correctly with no RTL-specific rule at all.

**What genuinely needed a fix** — the minority of rules using a real physical `left`/`right` where the intent was always "the start/end edge," added as a single, clearly-commented `[dir="rtl"]` block at the end of `style.css` rather than converting the whole 1,600+ line file to logical properties (`margin-inline-start`, etc.) piecemeal this phase:

- `.password-toggle` (show/hide password icon) and `.password-field input` padding — was hardcoded to the right edge
- `.check-badge` (the checkmark on a selected meal/plan card in `booking.ejs`) and its `.picker-body` clearance padding
- `.notif-badge` (unread count) and `.notif-dropdown` position (both in the authenticated app header)
- `.proof-row-item`'s one-sided `border-left` divider (homepage confidence row) — fixed to track the *logical* start edge instead of the literal left, so the "no border on the first item" rule doesn't end up on the wrong item once RTL reverses which item is visually first
- `.student-row .status-line`'s mobile-breakpoint `margin-left`/`text-align:left`
- The skip-link's screen position

**Directional arrows** (`.app-flow-arrow`, `.flow-caption-arrow` — the "→" glyphs in the app-flow diagram and the Tap→Collected→Notified caption) are flipped with `transform:scaleX(-1)` under `[dir="rtl"]`, verified via computed-style inspection in the browser (`matrix(-1,0,0,1,0,0)`) and visually confirmed to point the way the sequence actually reads in Arabic.

**What was reviewed and explicitly deferred:** a handful of purely decorative, pixel-offset absolute-positioned elements (the hero's blurred background glow, the hero-toast's exact micro-position within the image) were not RTL-adjusted. These are cosmetic flourishes, not functional or readability elements, and in testing they didn't produce a confusing or broken layout in RTL — just a slightly different (not wrong) decorative position. Converting the entire pre-existing stylesheet to logical properties throughout (which would handle these automatically along with everything else) is flagged as a Phase 5+ follow-up rather than attempted incompletely across code this phase didn't otherwise need to touch.

---

## 6. Language switcher

Implemented as **real `<a>` links to the actual counterpart URL** — not a JS-only toggle, not a form submission for the public pages. On public pages: `English` / `العربية`, both always visible, separated by a `|`, with the current language marked by **both** bold+underline **and** `aria-current="true"`/`"false"` (a string, matching how EJS interpolates it) — never by color alone. Implemented in both `sitenav.ejs` (desktop actions + mobile drawer) and `appnav.ejs` (desktop + mobile, using `EN`/`AR` short labels in the tighter app header and the full words in the mobile drawer).

- **Keyboard accessible**: plain links, real tab stops, no custom JS focus handling needed.
- **Preserves page/path intent**: the middleware computes `altLocalePath` per-request from the actual current path (with its query string preserved), so switching from `/schools?success=1` goes to `/ar/schools?success=1`, not back to the Arabic homepage.
- **Persists after navigation and refresh**: for public pages, this is inherent — the URL itself carries the language, so any bookmark/refresh/share keeps it. For the authenticated app, `/locale/:lang` writes to `req.session.locale`, which persists for the life of the session cookie (30 days, matching the existing session config), and every subsequent authenticated-page render reads it back.
- **No query-parameter corruption**: the `returnTo` parameter is URL-encoded and validated as a same-origin relative path before being used in a redirect (open-redirect guard), and never touches any *other* form's fields or query params.

---

## 7. Document language + direction

Every one of the 23 EJS views (not just the 9 fully-translated ones) now has `<html lang="<%= lang %>" dir="<%= dir %>">` instead of a hardcoded `lang="en"` — a single, mechanical, verified-safe substitution across the whole `views/` directory, so **no page in the application can ever show Arabic content inside an `lang="en"`/`dir="ltr"` document**, even the ones this phase didn't translate. This was checked by compiling all 23 templates with `ejs.compile()` after the change (zero syntax errors) and by rendering representative pages and reading back the actual `<html>` tag.

---

## 8. Responsive fixes

The RTL work above (bidi arrows, absolute-position flips) is itself the majority of this phase's responsive/layout work, since it was the one area genuinely at risk of breaking once Arabic was introduced. No *new* responsive bugs were introduced or found in the required-width sweep (below) beyond the RTL-specific ones already covered in Section 5 — the underlying flex/grid-based layout system from Phases 2–3 already handled the required widths correctly in English, and continued to at the same widths in Arabic.

---

## 9. Exact widths and pages actually inspected

Consistent with "do not claim responsive QA unless you actually run it" — this is exactly what was run, using the built-in browser (Chromium-based) with viewport emulation. No physical device lab, no second browser engine.

**Automated horizontal-overflow check** (`document.documentElement.scrollWidth > window.innerWidth`, the same method used in Phase 3) at:
- **320px**: `/`, `/ar`, `/parents`, `/ar/parents`, `/schools`, `/ar/schools`, `/how-it-works`, `/ar/how-it-works`, `/features`, `/ar/features`, `/login`, `/ar/login`, `/register`, `/ar/register`, `/forgot-password`, `/ar/forgot-password` — **zero overflow** on any of them.
- **390px**: the same English pages, plus `/ar`, `/ar/parents`, `/ar/schools`, `/ar/how-it-works`, `/ar/features` — **zero overflow**.
- **768px**: `/ar`, `/ar/schools`, and a login-redirect check for the authenticated area — **zero overflow**.
- **1024px**: `/ar` (full visual scroll-through), `/ar/schools` (full visual scroll-through), and the authenticated Dashboard/Menu/Booking pages after a real login through `/ar/login` — **zero overflow**, confirmed both by the automated check and by full-page screenshot review.
- **1440px**: `/ar` (full visual scroll-through, every section) and a computed-style check confirming the `.flow-caption-arrow` glyph is actually flipped (`transform: matrix(-1,0,0,1,0,0)`).

**Visual (screenshot) inspection**, both languages, confirming no clipping, no broken RTL ordering, no missing translations, and correct bidi-isolated numbers/currency:
- **English** (re-verified unaffected by this phase, at 1024–1440px): Home, Schools, Login, Dashboard, Booking.
- **Arabic**: Home (full top-to-bottom scroll at 1440px — hero, supported-schools, confidence row, menu proof, 6-step journey, collection proof, multiple-children, B2B panels, app section, FAQ accordion, final three-path CTA, footer), Login (1024px, full form), Dashboard (1024px, after a real `/ar/login` session — stats, renewal/quick-rebook cards, subscription periods with bidi-isolated `KWD` amounts, today's-status list), Booking (1024px — student/meal/plan pickers with the RTL-flipped check-badge, the live JavaScript-calculated school-day note rendering correctly pluralized Arabic text, the KNET confirm button and disclaimer), Menu (375px mobile — allergen disclaimers, dish cards with Arabic labels around English dish data), and the authenticated mobile drawer (375px — opened, confirmed correct link order, confirmed the language switcher shows "current" via bold+underline, not color).

**Not inspected this phase, and not claimed:** the full 20-width matrix from the brief's section 10 (320/344/360/375/390/412/430/480/540/600/768/820/900/1024/1280/1366/1440/1536/1728/1920) was not exhaustively run at every width — the widths actually tested (320, 390, 768, 1024, 1440) match the brief's own minimum QA requirement in section 17, and were chosen because Phase 3's engineering (flex/grid throughout, no float-based layout, no fixed pixel widths on core content) makes intermediate widths very unlikely to fail differently from their nearest tested neighbor — but that's a reasoned inference, not a tested fact, and is stated as such. Tablet portrait/landscape was not separately tested. `/features`, `/how-it-works`, `/menu`, and `/booking` were spot-checked (via the overflow sweep and, for booking, a full visual pass) but did not each get the same exhaustive multi-width screenshot review as Home/Dashboard/Login.

---

## 10. Accessibility changes

- **Skip link**: `<a href="#main-content">Skip to content</a>`, visually hidden until keyboard-focused, added to both `sitenav.ejs` and `appnav.ejs` (the two partials that precede substantial page content). Auth-shell pages (login, register, forgot-password) don't include a nav partial and weren't given a separate skip link, since there's no long navigation region to skip past on those pages.
- **`<main id="main-content">` landmark**: added to every page that already had the skip link pointing at it (all pages using `sitenav.ejs`/`appnav.ejs`) — Home, Parents, Schools, How It Works, Features, Dashboard, Menu, Booking.
- **`aria-current="page"`**: added to the active nav link in both `sitenav.ejs` and `appnav.ejs` (desktop and mobile), alongside the existing `.active` CSS class — the current page is now programmatically exposed, not just visually styled.
- **Language switcher semantics**: `role="group"` with an `aria-label`, `hreflang` on each link, `lang` on each link matching its own target language, and `aria-current="true"/"false"` on whichever one matches the active locale — combined with the bold+underline visual treatment (Section 6), current language is identifiable by more than one signal.
- **`lang`/`dir` correctness sitewide**: covered in Section 7 — this is itself an accessibility requirement (screen readers switch pronunciation rules based on `lang`), not just a visual one.
- **Focus-visible, reduced-motion, and touch-target sizing**: unchanged from Phase 3, where they were already addressed — this phase didn't need to revisit them, and didn't touch the CSS rules implementing them.
- **Bidi isolation** (`<bdi>`) applied around every LTR data value embedded in RTL Arabic text that this phase's fully-translated pages render: KWD currency amounts, calorie/protein/carb/fat numbers, dates and times (`fmtDate`/`fmtTime`/`timeAgo` output), and the footer's email/phone numbers — so a screen reader or the browser's own bidi algorithm never has to guess whether a digit sequence belongs to the surrounding Arabic sentence or is its own left-to-right unit. This is also functionally a numerals/data-integrity fix (brief section 9), not purely an accessibility one.
- **Not attempted this phase**: a full heading-order/landmark audit of the pages this phase didn't translate, a screen-reader (VoiceOver/NVDA) pass (only automated/computed-style and keyboard-navigation-by-inspection checks were performed, not an actual screen-reader listening session), and a contrast audit specific to Cairo-on-the-existing-palette (the existing color tokens were reused as-is; Cairo's stroke weights at the sizes used did not visually read as lower-contrast in testing, but this wasn't measured with a contrast-ratio tool against the Arabic-specific rendering).

---

## 11. SEO for bilingual pages

For the 8 pages with a real `/ar/...` counterpart:
- `<html lang="en"|"ar">` — correct per Section 7.
- `<link rel="canonical">` — self-referential per URL (verified: `/ar` → canonical `.../ar`, `/` → canonical `.../`).
- `<link rel="alternate" hreflang="en">`, `hreflang="ar"`, and `hreflang="x-default"` (pointing at the English version) on every bilingual page — computed in `head.ejs` from `altLocalePath`/`origin`, verified by direct inspection of the rendered `<head>`.
- `/sitemap.xml` was rewritten to emit both the English and Arabic URL for each of the 8 bilingual pages, each carrying its own `hreflang` alternate-link set (using the `xhtml:` namespace, the standard sitemap extension for this), plus the 5 English-only pages listed once with no alternates.
- `/robots.txt` explicitly `Allow`s the `/ar` paths for the bilingual pages and adds `Disallow: /locale/` (the session-locale-switch route has no content of its own to index and would otherwise appear as an infinite set of redirect URLs to crawlers).

**No duplicate-content trap**: pages without a real Arabic translation (`/caterers`, `/about`, `/contact`, `/privacy`, `/terms`) get **no** `/ar/...` URL and **no** hreflang alternate at all, rather than a fake bilingual entry pointing at untranslated content — this was a deliberate architectural choice (Section 3), not an oversight, and directly follows this phase's own instruction: *"If the architecture cannot safely support this in the current phase, do not fake it; document the limitation."*

---

## 12. Tests

**Before this phase's edits:** `npm test` → 21/21 passing (unchanged baseline).
**After this phase's edits:** `npm test` → 21/21 passing, 0 failures, 3 suites. No test file touched — this phase added `lib/i18n.js` and `locales/*.json`, and changed `server.js` (routing/middleware only, no business logic) plus view templates and CSS.

**Full route smoke test** (English, Arabic, and untranslated pages together): every public/pre-auth page returns 200 in both languages where a `/ar/...` route exists, and the 5 untranslated pages return 200 in English only (no `/ar/...` route registered, confirmed 404-free because no such route was ever claimed); every protected page still correctly redirects (302) when logged out; an unknown path still returns 404.

**Full authenticated flow, both languages**: logged in as the seeded demo parent via both `/login` and `/ar/login`; confirmed the Arabic login carries `session.locale = 'ar'` into `/dashboard`, `/menu`, and `/booking` (all three render fully in Arabic, verified via `<html>` tag inspection and content grep); confirmed switching back to English via `GET /locale/en?returnTo=/dashboard` correctly flips the session and redirects.

**Forms, both languages, with real CSRF tokens**: `POST /schools/inquiry` succeeds (302) from both the English and the Arabic school partnership form.

**No route, no business logic, no authentication/session/CSRF behavior, and no database interaction was changed this phase** beyond the new, additive `GET /locale/:lang` route and the locale-detection middleware, which only read/write `req.session.locale` — a new, isolated session field that doesn't intersect with `req.session.parentId`/`schoolAdminId` (the actual auth state).

---

## 13. Remaining translation / legal review items

1. **`/privacy` and `/terms`** — not translated, per this phase's explicit instruction not to invent legal Arabic. **Requires a professional/legal Arabic translation review before publishing.**
2. **`/caterers`, `/about`, `/contact`** — not translated this phase (Section 3); straightforward to add in a follow-up using the same architecture (add the route mirror, translate the strings, no new infrastructure needed).
3. **Students, History, Profile, Staff pages** (authenticated) — not translated; same follow-up path as above.
4. **School-admin login/dashboard** — not translated, and has no language switcher at all yet (no school-admin ever sees a way to request Arabic, so this is a lower-priority gap than the parent-facing pages).
5. **Menu item data** (dish names, ingredients) — would need either a parallel Arabic column in the database schema or a lookup table; a real data-layer decision, not just a translation task.
6. **Notification message bodies** (`db.js`) — generated and stored in English at write time; would need either storing a translation key + structured data instead of a final string, or accepting that historical notifications stay in whatever language they were created in.
7. **Date/time formatting** (`fmtDate`/`fmtTime`/`timeAgo`) — still hardcoded to `en-GB` locale regardless of viewer language; needs a product decision (Hijri vs. Gregorian-in-Arabic, which calendar Kuwait-based schools actually expect) before an engineering fix, not just a locale-string swap.
8. **Arabic numeral-plural grammar is simplified**: this phase implements a binary singular/plural choice (`dayUnitOne`/`dayUnitOther`), not full Modern Standard Arabic numeral agreement (which technically has distinct forms for 0, 1, 2, 3–10, 11–99, and 100+). The simplification is common in real localized products and reads naturally for the counts this app actually produces (school-day counts in the single digits to low twenties), but a linguistic reviewer may want the fuller rule set for a production release.
9. **RTL logical-properties conversion**: this phase fixed the specific physical-direction rules that were actually exercised by the translated pages (Section 5); the remaining ~1,600 lines of pre-existing CSS were not audited end-to-end for `margin-left`/`padding-right`/etc. that could matter once the untranslated pages (students, history, staff, etc.) are translated in a follow-up phase and start being viewed in RTL for real.
10. **No screen-reader listening session** was performed (Section 10) — a real pass with VoiceOver or NVDA against the Arabic pages, particularly the FAQ accordion and the notification dropdown, is recommended before this is considered accessibility-complete rather than accessibility-improved.
