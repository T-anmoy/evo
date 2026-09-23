# Evo Meals — Phase 3A implementation report

Authenticated product refinement and core system consistency. Date: 23 September 2026.

Scope: Dashboard, Students, Menu, Booking, History, Profile, Staff, School Admin, and the shared
product components those pages depend on. This is not a redesign, not a second public pass, and not
authorization for missing business functionality. Phase 3B still owns production hardening, the
whole-system QA sweep and the remote push.

## 1. Starting state

| Item | Value |
| --- | --- |
| Repository | `/Users/tan/Desktop/EVO/evo360-demo-system` |
| Branch | `main` |
| Starting HEAD | `f5d18498c2b646e9e062125d2e9f11ae6c6d9120` |
| `origin/main` at entry | `f5d18498c2b646e9e062125d2e9f11ae6c6d9120` (identical) |
| Working tree at entry | clean |
| Baseline `npm test` | **45 passing, 0 failing** |
| `node --check server.js` | passed |

The `-AI` safety copy was not read from, written to, or synchronized. All testing ran against a
disposable SQLite database (`$TMPDIR/evo-phase3a.db`, plus per-test temporary files). The
repository database `evo360.db` was not modified — its mtime is unchanged from before this phase.

A second launch configuration, `dev-disposable`, was added to `.claude/launch.json` so the demo can
be run against a throwaway database without touching the repository one. The original `dev` entry
is unchanged.

## 2. Dashboard

The page now answers, in order, the question a parent actually opens it with.

**Order before:** renewal prompts → quick rebook → three equal stat cards → subscription periods →
today's status → notifications → secondary links. The child's status was fifth, below two generic
account counts.

**Order now:** today's status (child → today's meal → collection status) → "Needs your attention"
(renewals, quick rebook) → current subscription periods → notifications → a single quiet account
line → secondary links.

- Today's meal is resolved server-side per child (`studentStatus` now carries `menuItem`) and shown
  under the child's name. Previously the dish was not on the page at all, only a status word.
- The three `.stat` cards (Active subscriptions / Children registered / Active bookings) are
  replaced by one muted sentence after the operational content. The counts are unchanged and still
  true; they simply no longer outrank the child.
- Section headings are real `<h2>`s (`.dash-section-title`), removing the `h1 → h3` outline gap.
- **Collection is not consumption.** `dashboard.emptyNoStudentsBody` promised visibility of when a
  child had *eaten*; no record in this system establishes that. Corrected in both languages to
  describe when a meal was recorded as collected.
- Values were already server-rendered with no count-up (Phase 2). Verified: no animation restores a
  wrong number before the right one.

### Relative time safety

`app.locals.timeAgo` computed `Date.now() - stored`, so any timestamp in the future produced a
negative difference, fell into the `mins < 1` branch, and rendered as **"just now"**. A future event
described in the past tense is not a rounding artefact, it is the wrong statement. The helper now
returns the absolute date for anything ahead of now. A Kuwait timezone / business-day model was
deliberately *not* invented — see blockers.

## 3. Students

- Registered children are rendered first; adding another child is a native `<details>` disclosure
  beneath them. The form stays fully expanded in the two cases where it *is* the task: no children
  yet, and an edit in progress. A returning parent no longer scrolls past a nine-field form to
  reach a child's Edit button.
- The add/edit form was extracted to `views/partials/student-form.ejs` — one definition used by both
  presentations, rather than duplicated markup that would drift.
- Allergy notes remain a keyboard-accessible `<details>` disclosure (Phase 2), not a `title=`
  attribute, and carry no shield, seal or medical-protection iconography. The hint continues to say
  these are reference notes and that each dish's own information should be checked. No new medical
  fields were added.
- Civil IDs in the list are wrapped in `<bdi>` so they stay readable in RTL.
- Label/hint/error association, required/optional clarity, state preservation on invalid POST and
  the masked read-only Civil ID on edit are all unchanged from Phase 2.

## 4. Menu

Hierarchy is unchanged and still food-first: food → meal name → ingredients → nutrition → recorded
allergen information, followed by the shared programme statement. No qualification copy was added
above the meals.

**Stable food asset identity.** Dish imagery was resolved by exact English display name
(`dishImageSlug(m.name)`). Any translation or correction of a name would have silently dropped the
image. Images are now addressed by the menu item's stable database id, with the name map retained
only as a fallback for a record whose id is not in the asset map — so nothing that renders today can
stop rendering. No migration, no schema change, no new image assets. Covered by four new tests.

**Localization honesty.** Seeded dish names and ingredients remain English, marked `lang="en"` with
`dir="auto"`, inside Arabic layouts. No Arabic dish facts were machine-generated.

Menu → Booking preselection (`/booking?meal=<id>`) works and is still server-validated against the
current menu; the query string is not trusted. The preselected meal now also appears by name in the
new booking summary, so the parent never has to remember the dish.

## 5. Booking

### POST → redirect → GET

A successful booking rendered the confirmation directly from the POST response. The booking was
therefore the browser's current request, and a refresh (or back-then-forward) re-submitted it and
charged a second booking. Success now redirects to `/booking?booked=<id>` and the confirmation is
rendered from the stored booking, with ownership re-checked — the id in the query string proves
nothing on its own.

This is **not** payment idempotency. A real provider integration still needs its own idempotency
key and reconciliation; this removes only the accidental browser-level resubmission. Covered by
tests that assert the redirect, that exactly one booking is written, that replaying the
confirmation URL writes nothing further, and that another parent's booking id shows no confirmation.

### Review summary

Before the Confirm button, the parent now sees child, meal, plan, start date, days charged and the
payment state, with the total unchanged and still prominent in the confirm bar. The summary is
server-rendered from the selections the server already knows, so it is correct on first paint and
with JavaScript disabled; the existing recalculation script keeps it in step. The day count and
total still say to review dates rather than showing a placeholder that is not the real charge.
Financial information is not hidden behind any interaction.

### Preserved

Phase 2 validation is untouched and still authoritative: positive safe ids, student ownership, menu
existence, plan enum, real ISO dates within the supported window, 1–30 whole days for single plans,
configured service day for single starts, remaining-service-day pricing for monthly, and localized
422s. Verified that an invalid submission still preserves child, meal, plan, date and day count —
and that the new summary reflects those preserved values rather than resetting.

Booking architecture was not rewritten. No daily allocation, multi-day ledger, partial cancellation
or renewal semantics were invented.

## 6. History

- Cancellation now states its outcome. A successful cancel redirects to `/history?cancelled=1` with
  a success message that describes the refund as simulated and explicitly says no real payment
  network was contacted; an ineligible attempt redirects to `?cancelfailed=1` with an explanation.
  Previously both outcomes landed on an identical page.
- Ownership and status checks are unchanged — only your own bookings, only while still booked.
- Status vocabulary unified to **Booked / Collected / Cancelled** across History, Dashboard, Staff
  and School Admin (`statusUpcoming` "Upcoming" → "Booked"; the Dashboard's "Booked — awaiting
  collection" → "Booked — not yet collected"). Every status carries an icon *and* text; none is
  communicated by colour alone. The public Home and Parents illustrations already used the same two
  words, so the whole system now speaks one status language.
- Desktop table and mobile card state the same truth, including the collection time.
- Dates, amounts and English dish names are bidi-isolated. There is no food photography on this
  screen; it remains an operational/financial list.

## 7. Profile

Left compact. `autocomplete="name" | "email" | "tel"` added; email and telephone inputs are
`dir="ltr"` so they stay readable inside the RTL layout; the masked Civil ID is `<bdi>`-wrapped.
Error/status association and the existing validation are unchanged.

No password-change functionality was added. That is a separate security-sensitive feature and is
not implied by legal copy mentioning it.

## 8. Staff

- The page now says what the feature is: a meal booked against the parent's own account, **not** a
  separate staff sign-in, and not a grant of any school or catering role.
- Staff already read the authoritative `menu_items` rows; confirmed there is no parallel hardcoded
  dish list. The route now resolves the booked meal so records identify themselves.
- Records gained a real header row and the meal and stored status columns — previously a date and
  an amount with no header. No staff eligibility rule was invented.
- Server validation (existing menu, supported date, positive rate) and the redirect-on-success are
  unchanged.

## 9. School Admin

Treated as operational software, not marketing proof.

- **No false live semantics.** The pulsing indicator is gone: the `.live-dot` element and its
  `live-pulse` keyframes were removed. (The keyframes were already dead code — the animation was set
  to `none` for every motion preference.) The truthful "Record snapshot" label remains.
- **Metric labels now match what the queries measure:**

  | Before | After | What the query actually counts |
  | --- | --- | --- |
  | Active subscriptions | Monthly subscriptions covering today | monthly, non-cancelled, covering today |
  | Today's meals | Bookings covering today | non-cancelled bookings whose coverage includes today |
  | Pending orders | Bookings not yet collected | all bookings with status `upcoming`, not only today's |

  Nothing was relabelled as "meals delivered" or "revenue", and no data was manufactured to make a
  number look better. The 14-day trend caption was already accurate and is unchanged.
- **Chart accessibility.** Bar values depended on a hover `title=` for their dates, and the axis
  labels were hidden entirely below 640px and set at 9.5px above it. The bars are now
  `aria-hidden` decoration over printed numbers; the same fourteen rows are also a real `<table>`
  with a caption and scope'd headers. Above 640px the table is available to assistive technology
  only; below it, where the axis stops fitting, the chart drops out and the table is what is shown.
  Axis label and count sizes were raised to 11px/12px. No chart library was added.
- Dates go through the shared `fmtDate` helper instead of an inline `en-GB` call, and are
  `<bdi>`-isolated; English dish names carry `lang`/`dir`.

## 10. Shared product components

- `views/partials/student-form.ejs` — **new.** One add/edit student form for both presentations.
- `views/partials/food-card.ejs` — dish heading level is now an optional caller parameter,
  defaulting to `h3`. Every public caller passes nothing and renders exactly as before; Menu passes
  `h2` because its grid sits directly under the page `h1`.
- `views/partials/dish-image.ejs` — now receives the menu item rather than its name.
- `app.locals.dishImageSlug` — accepts an item (preferred) or a bare name (legacy).
- `app.locals.fmtDateShort` — **new**, for dense axes.
- Status badges, tables, alerts, empty states and disclosures were reused, not rebuilt. Only genuine
  duplication was consolidated.

**Colour.** Forest anchors structure and primary action; leaf marks completion; yellow is used
sparingly and only for the attention state (a meal booked but not yet collected). Operational
screens gained no decorative colour.

## 11. RTL / bidi work

Every product page was checked in Arabic. `<bdi>` isolation or explicit direction was added for:
Civil IDs (Students list, Profile), KWD amounts and dates (History table and cards, School Admin
table and trend, Booking summary), English dish names (`lang="en" dir="auto"` on History, School
Admin, Dashboard, Booking summary, food cards), and email/telephone inputs (`dir="ltr"`).

Nothing was mirrored that should not be. Cairo typography, navigation, fieldsets, radios, selectors,
status components, tables and mobile cards were verified in Arabic. English seed food content
remains English rather than being falsely translated.

**Sweep:** 8 product pages × 8 widths (320, 360, 375, 414, 640, 768, 1024, 1280) × 2 locales =
**128 checks, 0 failing** for horizontal overflow and a present `<main>`.

Two real overflows were found and fixed during that sweep:

- Booking at 320/360px — the summary label "Remaining configured school days this month" could not
  shrink. The row now stacks below 420px rather than forcing a horizontal scroll on the screen
  where the parent is about to pay.
- Staff at 320px — the new four-column record table exceeded the page. Cell padding and the status
  badge tighten below 400px.

## 12. Accessibility work

- Heading hierarchy: **no `h1 → h3` skips remain on any product page**, and the public Home and
  Parents pages are verified unchanged.
- The School Admin chart no longer depends on hover for any value.
- The "Add another child" disclosure and the allergy-notes disclosure are native `<details>` —
  keyboard reachable, with a 44px minimum summary target.
- Every non-hidden form control on all eight product pages has an associated `<label>` (verified
  programmatically).
- Cancellation and booking outcomes are announced through `role="status"` / `role="alert"` regions
  rather than being silent.
- Notification controls keep their Phase 2 hidden/`inert`/focus-return behaviour; notification copy
  continues to describe stored page-load records and is never called push delivery.
- Status is always icon + text, never colour alone.

No WCAG certification is claimed. No screen-reader hardware or real-device touch pass was performed.

## 13. New and changed tests

`tests/booking-input.test.js` (changed — no test was removed):

- `HTTP valid booking calculates, records once, and redirects to its confirmation` — replaces the
  assertion that a successful POST returns 200, which the redirect intentionally changed. Now
  asserts the 302, the redirect target, that exactly one booking is written, that the followed GET
  shows the confirmation, and that replaying that URL writes nothing further.
- `a booking id this parent does not own shows no confirmation`
- `cancellation states its outcome, and an ineligible cancel changes nothing`
- `a cancel for a booking this parent does not own is refused`

`tests/product-display.test.js` (new, disposable database, cleaned up after):

- `a future timestamp is never rendered as elapsed past time`
- `a just-passed timestamp still reads as just now`
- `dish images resolve from the record id, independent of display name`
- `dish images still resolve by name for records outside the asset map`
- `an unknown dish falls back to no image rather than the wrong one`

## 14. Exact test results

| Check | Result |
| --- | --- |
| `npm test` baseline | 45 passing, 0 failing |
| `npm test` final | **53 passing, 0 failing** |
| `node --check` — server.js, db.js, lib/*.js, public/js/*.js, tests/*.js | all passed |
| `git diff --check` | clean |
| Locale key parity | en 899, ar 899, 0 missing either way |
| Route/locale smoke (status 200, no raw translation key, real `<main>`) | 16 checks, 0 failing |
| Functional pass (auth, students, menu→booking, profile, booking guards, staff, admin scoping) | **33 checks, 0 failing** |
| Responsive/RTL overflow sweep | **128 checks, 0 failing** |
| Browser console on product pages | empty |
| Asset requests (CSS, JS, five dish images) | all 200 |
| Heading-skip audit, 8 product + 2 public pages | 0 skips |

Terms-checkbox regression (initially checked, required, user-deselectable, retained on invalid
POST), login, and locale switching all still pass as part of the suite.

## 15. Public components potentially affected — regression-test in Phase 3B

1. **`views/partials/food-card.ejs`** — new optional `headingLevel` parameter. Home and Parents pass
   nothing and were verified to render identically, but re-check dish headings on Home, Parents and
   Menu.
2. **`views/partials/dish-image.ejs`** — now takes the item rather than the name. Used by Home,
   Parents, Menu and Booking. All five dish images were verified to load (200) on every caller.
3. **`public/css/style.css`** — shared stylesheet. Specifically: `.student-meta > span{display:block}`
   (also used by Home and Parents illustration rows — verified unchanged at 79px row height with no
   overflow), the removal of `.live-dot`/`live-pulse`, and `.trend-*` rules.
4. **`locales/*.json`** — `history.statusUpcoming` and `schoolAdminDashboard.statusUpcoming` changed
   from "Upcoming" to "Booked". Confirm no public surface quotes the old word.
5. **`app.locals.timeAgo`** — shared with any surface rendering relative times.

## 16. Unresolved business and integration blockers

None of these were guessed at; the safest current behaviour was preserved in each case.

1. **Daily service allocation and multi-day fulfilment.** A monthly booking is still one row with a
   day count and a total. There is no per-day allocation, no per-day collection ledger and no model
   of what "collected" means across a multi-day period. Not invented; no speculative schema or
   migration.
2. **Monthly collection semantics.** A monthly booking's single `status` is what the Dashboard and
   School Admin read for "today". Whether a month-long booking can be partly collected is undefined.
3. **Partial-period cancellation and definitive refund rules.** Cancellation remains all-or-nothing
   on a booking row, and the refund is simulated. Partial-month logic was not invented.
4. **Kuwait timezone and operational cutoff.** The booking window and "today" are still UTC-derived.
   `timeAgo` no longer *misstates* future timestamps, but a real business-day/cutoff model requires
   stakeholder rules and belongs to a later phase.
5. **Payment integration and idempotency.** POST→redirect→GET removes browser resubmission only.
   Provider integration, idempotency keys, webhook verification and reconciliation are outstanding.
6. **Reader integration and notification transport.** No connected reader, no push or email
   delivery. Notifications are stored records read at page load and are described as such.
7. **Collection ≠ consumption.** No record in this system establishes that a child ate a meal. Every
   surface now says so consistently. Do not publish a stronger claim before real integrations exist.
8. **Caterer, central-administrator and genuine staff authorization scope.** Staff is a meal booked
   on a parent account and now says so. No role system was introduced.
9. **Approved Arabic food data and legal translation.** No approved Arabic dish names, ingredients
   or nutrition exist; English values are preserved with correct bidi handling. Arabic legal content
   is still outstanding from Phase 2.
10. **Food provenance and school verification.** Unchanged from Phase 2 — seed nutrition, images and
    exclusions are reference data; configured schools are not verified partnerships.

The approved programme statement is untouched and unexpanded: *Our meals are free from any kind of
Nuts, Shellfish, Sesame & Soy.*

## 17. Files significantly changed

| File | Change |
| --- | --- |
| `server.js` | future-safe `timeAgo`; id-based `dishImageSlug`; `fmtDateShort`; today's meal on `studentStatus`; booking POST→redirect→GET and confirmation-from-record; history cancel outcome flags; staff meal resolution |
| `views/dashboard.ejs` | reordered child-status-first; today's meal; actions section; stat cards → account line; `h2` headings |
| `views/students.ejs` | children first; add-another disclosure; form extracted; bidi Civil ID |
| `views/partials/student-form.ejs` | **new** — single add/edit form definition |
| `views/booking.ejs` | review summary (server-rendered, script-synced); summary translations; meal-change listener |
| `views/history.ejs` | cancellation outcome alerts; bidi dates/amounts/dish names |
| `views/staff.ejs` | scope note; record table with meal and status; `h2` heading |
| `views/school-admin-dashboard.ejs` | live indicator removed; accessible trend table; shared date formatter; bidi; `h2` headings |
| `views/profile.ejs` | autocomplete; `dir="ltr"` email/phone; bidi Civil ID |
| `views/menu.ejs`, `views/partials/food-card.ejs` | caller-chosen dish heading level |
| `views/partials/dish-image.ejs` | resolves the asset from the record, not the name |
| `locales/en.json`, `locales/ar.json` | consumption wording corrected; unified status vocabulary; honest admin metric labels; new summary/scope/outcome/table keys (parity held at 899 each) |
| `public/css/style.css` | dashboard section rhythm and account line; students layout and disclosure; booking summary; staff records; trend table; live indicator removed; narrow-width fixes |
| `tests/booking-input.test.js` | updated for the redirect; four new behavioural tests |
| `tests/product-display.test.js` | **new** — five tests |
| `.claude/launch.json` | added a disposable-database dev configuration |

## 18. Recommendations for Phase 3B

Hardening, QA and delivery only:

1. Regression-test the five shared surfaces in section 15 across the public pages, in both
   languages, at the Phase 2 acceptance widths.
2. Re-run the Phase 2 public sweeps (responsive, RTL, asset, console) now that the shared stylesheet
   and two food partials have changed.
3. Cross-browser, real-device and assistive-technology acceptance, including a screen-reader pass on
   the new School Admin trend table and the two disclosures.
4. Production session store, secrets, transport security, backup/restore, migration and deployment
   observability review; audit existing access boundaries before release.
5. Measure performance with production assets and hosting. The large hero PNG fallback and the long
   shared stylesheet remain the candidates.
6. Final content and legal sign-off on every item in section 16 before any claim is strengthened.
7. Only after all of the above: the remote push. Nothing was pushed in this phase.

## 19. Git state at exit

A local checkpoint commit was made on `main`. **Nothing was pushed.** `origin/main` remains at
`f5d1849`, intentionally behind local `main`. No branch, worktree or PR was created; no force push
or destructive reset was run.
