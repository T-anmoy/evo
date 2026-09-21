# Phase 04 — Completion Pass

This is an addendum to [PHASE-04-LOCALIZATION-RESPONSIVE.md](PHASE-04-LOCALIZATION-RESPONSIVE.md), covering the second pass requested after the Phase 04 architecture checkpoint (commit `2b8de6d`, "feat: implement bilingual localization and RTL foundation") was approved. That checkpoint explicitly left Phase 04 **not** release-complete; this pass closes most of the gaps it documented, in the priority order given: `/caterers`/`/about`/`/contact`, the remaining authenticated pages, a hardcoded-string audit, notification/JS-message localization, a menu-data strategy decision, and a re-run of switcher/RTL/responsive/accessibility QA.

Not attempted here, per the explicit instruction not to invent legal Arabic or alter business claims: `/privacy` and `/terms` remain English-only and unmirrored, exactly as before.

---

## 1. New Arabic coverage

**Public, URL-prefixed (`/ar/...`), added to `BILINGUAL_PAGES`:**
- `/caterers` (+ `/caterers/inquiry` POST, including field-level validation errors)
- `/about`
- `/contact` (+ `/contact` POST, including the required-fields error)

`sitemap.xml` and `robots.txt` updated to reflect these as real bilingual pages (hreflang alternates, `Allow: /ar/caterers` etc.) — the same honesty rule from Phase 04 applies: no page gets a `/ar/...` URL or hreflang entry unless it's genuinely translated.

**Authenticated, session-locale (no URL change, same as dashboard/menu/booking already were):**
- `/students` — add/edit form, civil ID masking hints, allergy flag tooltip
- `/history` — booking list, status badges, the cancel-confirmation dialog (see §4)
- `/profile`
- `/staff`
- `/school-admin/login` — pre-auth, so it needed its own visible language switcher (session-locale via `/locale/:lang?returnTo=...`), since there's no prior translated page to switch from and no `/ar/school-admin/login` URL
- `/school-admin/dashboard` (+ `partials/adminnav.ejs`)
- `404.ejs`

531 → **790 translated key-leaves**, still 100% EN↔AR parity (verified with the same key-diff script used in Phase 04).

---

## 2. Hardcoded-string audit — what was found and fixed

An Explore-agent audit of every remaining English string outside the original 531 keys turned up, beyond the untranslated views themselves:

- **`server.js`**: caterer/contact/school-admin-login validation and error strings — now `t()`-driven (`caterers.form.err*`, `contact.form.errRequired`, `schoolAdminLogin.errInvalid`).
- **`loginLimiter`'s rate-limit message** — `express-rate-limit`'s `message` option now a function of `(req, res)` returning `res.locals.t('common.tooManyAttempts')`, instead of a fixed English string.
- **The CSRF error handler** — was returning a hardcoded English string on every rejected token, in *every* language. Fixed by moving the locale-resolution middleware to run **before** CSRF protection is registered (previously it ran after), so `res.locals.t` is already populated by the time a CSRF failure reaches the error handler. Verified directly: hitting `/ar/caterers/inquiry` with a stale/missing token now returns "انتهت جلسة النموذج..." instead of English.
- **`app.locals.timeAgo`** — "just now" / "5m ago" / "3d ago" were hardcoded English string templates. Rewritten to accept `t` and build the string from `common.justNow` / `common.timeAgo` + `common.minUnitOne/Other` / `common.hourUnitOne/Other` (reusing the existing `dashboard.dayUnitOne/Other` for the day case) — verified live: "منذ 4 دقائق" / "منذ 23 ساعات" render correctly on the Arabic dashboard.
- **`public/js/nav.js`**: the mobile-drawer toggle's dynamic "Menu"/"Close" label swap was a hardcoded pair. Both nav partials' toggle buttons now carry `data-closed-label`/`data-open-label` (from `t('nav.menuToggle')`/`t('nav.closeLabel')`), and `nav.js` reads them with an English fallback.
- **`public/js/motion.js`**: "Sending…" and "Please wait…" (the two submit-button loading states) were hardcoded. `partials/head.ejs` now emits a small `window.EVO_I18N` object (`{ sending, pleaseWait }`) built server-side via `t()`, and `motion.js` reads it with an English fallback — the only practical way to localize a plain static JS file that has no `res.locals.t` of its own. The password show/hide toggle's aria-label swap (also hardcoded, and missed in the original Phase 04 pass despite `register.ejs` being "fully translated") got the same treatment via `data-show-label`/`data-hide-label`.
- **`register.ejs`**: added the missing `register.hidePassword` key (only `showPassword` existed before — the toggle's aria-label was silently staying "Show password" even while showing the hide icon).

---

## 3. Notification bodies and JS-generated messages

This required a real architecture change, not just string substitution, because a notification is written once (at booking/cancel/renewal time) but may be *read* later in a different locale than the one active when it was created.

**Schema**: additive migration [`005_notification_i18n_params.sql`](../../migrations/005_notification_i18n_params.sql) adds a nullable `params TEXT` column to `notifications`. The existing `message` column (`NOT NULL`) is still populated on every insert as an English fallback.

**`db.js`**: `insertNotification`, `bookAndCharge`, `cancelAndRefund`, and `ensureRenewalNotification` now compute and store structured `params` (e.g. `{ studentName, mealName, detailType, days, amountKWD }`) alongside the English `message`. `bookAndCharge` also now looks up the student/meal itself from the IDs it already receives, instead of `server.js` pre-composing an English sentence and passing it in as `note` — removing a duplicate "who is this booking for" computation and making it impossible for the stored notification to say something different from the booking it's attached to.

**`server.js`**: a new `app.locals.notifMessage(n, t, fmtKWD)` re-renders a notification's `type` + `params` into the *current viewer's* locale at render time, falling back to the stored English `message` when `params` is `null` — which is exactly the case for the seed-data notifications that predate this migration, and is the intended, documented behavior for that legacy content (menu/seed data was already established as out-of-scope for translation in Phase 04). `dashboard.ejs` and the notification dropdown in `appnav.ejs` now call `notifMessage(n, t, fmtKWD)` instead of reading `n.message` directly.

**Verified live** (via a real login → book → cancel → switch-to-Arabic → dashboard-reload sequence, then cleaned up and the database restored to its pre-test state afterward): a booking confirmed while the session was in English rendered correctly in Arabic after switching, for all three notification types (`booking_confirmed`, `booking_cancelled`, `renewal_due`), while an older seed-data notification with no `params` correctly stayed in English rather than breaking or going blank.

**Why the notification string is never rendered unescaped**: `studentName` inside a notification's `params` is a parent's own free-text input (a child's name), not trusted content — unlike the `<bdi>`-wrapped currency/date values dashboard.ejs already renders unescaped elsewhere. `notifMessage`'s output is always passed through the template's escaped `<%=`, never `<%-`, and `splitNotif()` (which bolds the leading name) operates on that already-escaped string.

**The `history.ejs` cancel-confirmation dialog** was a second, separate JS-message problem, and a latent bug in its own right (present before this pass, in English too): the confirmation text was built as a hand-escaped string spliced directly into an inline `onsubmit="return confirm('...')"` attribute. Because the interpolated student name only gets *HTML*-escaped (via EJS's `<%=`), a name containing an apostrophe would still break the JS string literal once the browser HTML-decodes the attribute value back before handing it to the JS parser — a real, if narrow, self-inflicted injection risk, not just a translation gap. Fixed by moving the message to a `data-confirm-message` attribute (a plain HTML attribute value, decoded once, never re-parsed as code) and adding a small handler in `motion.js` (`initConfirmForms`, registered first in the init sequence so it can veto the submit before the existing `initGenericValidation`/`initSubmitFeedback` handlers see it) that reads the attribute and calls `window.confirm()` directly. Verified the attribute's decoded value is correct, fully-Arabic, and properly formed for a real booking.

---

## 4. Menu/product data localization strategy

**Reviewed, decision: leave menu item data (dish names, `tag`, `ingredients`) in English, unchanged from Phase 04** — but as an explicit decision among considered options, not a default:

1. **Add `name_ar`/`tag_ar`/`ingredients_ar` columns to `menu_items`** — the "real" long-term answer, but it's a schema change to a table that's also read by `db.js`'s `mapMenuItem()` and would need seed data for all 5 items in both languages, real nutrition-label-accurate Arabic ingredient text (not machine-translated food terminology, which is exactly the kind of "awkward literal Arabic" this phase's own instructions warn against), and a decision about how caterers (who don't yet have any admin UI at all) would ever populate `name_ar` for a *new* dish. That's real product-team + translator work, not a mechanical addition.
2. **A code-level overlay/lookup table** (e.g. `locales/menu-ar.json` keyed by item id, merged onto `mapMenuItem()`'s output when locale is Arabic) — avoids a migration, but produces the same "who owns this data going forward" problem, and risks silently drifting out of sync with the real `menu_items` table (a renamed or added dish with no overlay entry falls back to English with no visible seam — a *worse* failure mode than what's already documented and visible today).
3. **Status quo: dish data stays English everywhere, UI chrome around it is Arabic** — what Phase 04 already shipped, and what this pass keeps.

Option 3 was kept because it's the only one of the three that doesn't either (a) require inventing Arabic nutrition-label text under this pass's own explicit instruction against inventing content without a verified source, or (b) introduce a new data-consistency risk for a five-row demo dataset. This is a demo/illustrative dataset, not a live catalog a caterer edits — the honest scope boundary drawn in Phase 04 (`menu.ejs`'s inline comment: *"dish names/tags/ingredients remain untranslated — real product data, not UI copy"*) still holds, and is repeated verbatim in `staff.ejs`'s meal `<option>` list and `caterers.ejs`'s illustrative order-queue table for the same reason. This is listed again in §7 as a real follow-up, now with the three concrete options above on record instead of a bare "not done."

---

## 5. Language-switcher verification (route + query, both directions)

Checked directly against the running server, not just read from the code:

- **Public, URL-prefixed pages**: `curl "/schools?success=1"` → the visible switcher link (not the `<head>` hreflang tag, which correctly strips the query per SEO convention) is `/ar/schools?success=1`; `curl "/ar/schools?success=1"` → the English link is `/schools?success=1`. Both directions preserve the query string.
- **Session-locale pages**: `appnav.ejs`'s switcher is `/locale/:lang?returnTo=<url-encoded current path+query>`; confirmed the `/locale/:lang` route's open-redirect guard accepts it and redirects back to the exact originating page.
- **`school-admin-login.ejs`'s new switcher** uses the same `/locale/:lang?returnTo=...` pattern (it has no URL-prefixed counterpart to link to), confirmed working pre-auth (no session state beyond `session.locale` is required).

No regressions found in either direction; this was already correct in the Phase 04 architecture and is now re-verified against the newly-added pages too.

---

## 6. RTL/LTR and responsive re-verification

**Document attributes**: `<html lang dir>` confirmed correct (`ar`/`rtl` and `en`/`ltr`) on every newly-localized page, both directly (via `curl` + grep) and via the browser.

**Visual RTL check** (built-in browser, real render, not just markup inspection): `/ar/caterers` (hero, order-queue table with translated headers/badges and English dish/school-name product data, RTL-mirrored hamburger/logo header), `/students` (RTL-mirrored student rows — avatar+name on the reading-start side, Edit button on the far side, allergy-flag icon in place), `/history` (RTL-mirrored booking cards, correctly-escaped Arabic confirm-dialog text), `/dashboard` (full notification feed rendering three live-tested notification types plus legacy-English fallback rows, side-by-side, with no layout break), `/school-admin/login` and `/school-admin/dashboard` (RTL-mirrored admin header, stat-card accent border flipped to the correct edge).

**One wording fix caught during RTL review**: `students.ejs`'s empty-state copy originally said "using the form on the left" (a literal directional reference) — in RTL, that same form is the first one in DOM order but renders on the visual *right*. Reworded to "the adjacent form" in both languages rather than translating a now-incorrect directional claim.

**Responsive overflow sweep**, both languages, at the required 320/390/768/1024/1440px widths, using `document.documentElement.scrollWidth > window.innerWidth` (the same method as Phase 04): `/ar/caterers`, `/ar/about`, `/ar/contact`, `/students`, `/history`, `/staff`, `/profile`, `/school-admin/dashboard` — **zero overflow at any tested width**.

**One pre-existing, not-introduced-by-this-pass issue found and left as-is**: `caterers.ejs`'s order-queue table uses only a `.data-table-view` (no `.data-card-view` fallback, unlike `history.ejs` and `school-admin-dashboard.ejs`, which have both). That component's own CSS hides `.data-table-view` below a tablet-ish breakpoint with nothing to replace it — meaning the illustrative order table disappears rather than reflowing, in **both languages, identically**, and predates this phase entirely (the original English template had the same structure). Since it isn't a translation regression and touching it would mean changing a page's structure beyond what a localization pass was asked to do, it's flagged here rather than silently fixed or silently ignored.

---

## 7. Remaining follow-up (updates §13 of the original Phase 04 doc)

Superseded/closed by this pass: items 2 ("caterers/about/contact"), 3 ("students/history/profile/staff"), 4 ("school-admin"), and 6 ("notification message bodies", now solved architecturally) from the original remaining-items list.

Still open:
1. **`/privacy` and `/terms`** — unchanged; still blocked on a professional/legal Arabic review, per explicit instruction.
2. **Menu item product data** — decision recorded in §4 above; a real implementation needs either a schema change + real translated content, or an accepted lookup-table drift risk — a product decision, not an engineering default.
3. **Date/time formatting** (`fmtDate`/`fmtTime`/`timeAgo`'s day-granularity fallback) — still `en-GB`-formatted regardless of locale; unchanged from Phase 04, same reasoning (a Hijri-vs-Gregorian-in-Arabic call is a product decision).
4. **Simplified Arabic plural grammar** — still the binary singular/other system (e.g. "2 طلاب" uses the general plural, not the grammatically distinct dual form "طالبان" MSA would use for exactly two) — unchanged, same reasoning as Phase 04 §13 item 8.
5. **No screen-reader listening session** was performed in this pass either — still automated/keyboard/computed-style checks only, not a real VoiceOver/NVDA pass.
6. **Full RTL logical-properties CSS conversion** — this pass added no new `[dir="rtl"]` overrides (none of the newly-translated pages needed one beyond the `.auth-card .lang-switch` contrast fix in §8), so the ~1,600-line stylesheet's conversion status is unchanged from Phase 04.

---

## 8. One new, minimal CSS addition

`.lang-switch`'s base color (`rgba(255,255,255,...)`, i.e. light text) assumes the dark-navy header/drawer background it was designed for in Phase 04. `school-admin-login.ejs` needed its own switcher on a white `.auth-card`, where that would have been invisible. Added a three-rule, narrowly-scoped override (`.auth-card .lang-switch a` / `:hover` / `[aria-current="true"]`) rather than touching the base component — bumped `head.ejs`'s `style.css?v=8` cache-buster accordingly.

---

## 9. Testing

- `npm test` → 21/21 passing, before and after, on a freshly-restarted server.
- Every `.ejs` file in `views/` (recursively) compiles cleanly via `ejs.compile()`.
- `style.css` brace-balance verified at 0.
- Full route sweep (EN + AR) on every public/pre-auth page → 200; every protected page while logged out → 302; unknown path → 404.
- Full authenticated flow exercised against the real running server and real SQLite database: login → book a meal → cancel a booking → directly invoke `ensureRenewalNotification` → switch session locale to Arabic → reload dashboard and confirm all three live-created notifications plus pre-existing legacy notifications render correctly (new ones fully localized, legacy ones correctly falling back to English) → **database restored from a pre-test backup afterward**, so none of this session's test bookings/cancellations/notifications persist in the demo dataset.
- Rate limiter (`loginLimiter`) deliberately triggered on `/ar/login` to confirm its 429 response is Arabic.
- CSRF rejection deliberately triggered on `/ar/caterers/inquiry` (mismatched cookie/token) to confirm its 403 response is Arabic.
