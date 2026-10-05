# School menus and weekly subscriptions

Delivery date: 5 October 2026. This report covers the six-phase request supplied in this session.

## Preflight

The working tree was clean on `main`. `npm install` completed without dependency-file changes. The baseline suite passed **70 tests**, with no failures or skips.

The five commits present before this work were:

- `c0e84d2` Remove accordion scroll dragging and animate panel transitions safely
- `93c1b0f` Make policy and FAQ accordions single-open with stable scrolling
- `5ae79d1` Refine parent dashboard booking cards and bilingual header layout
- `852016a` Refine pricing and booking guide layouts and corporate terminology
- `734b158` Align homepage school and corporate pathway cards

## Changes by phase

| Phase | Client request and resulting behavior | Files changed |
|---|---|---|
| 1 | Schools, their rates and menu assignments now live in SQLite. Migration 008 adds the tables and category column; only the authorized category backfill changes existing menu fields. School names and existing student rows remain intact. Validation and the student selector use the school records. | `migrations/008_school_menus.sql`, `db/schools.js`, `db.js`, `lib/validate.js`, `seed.json`, `server.js`, `views/partials/student-form.ejs` |
| 2 | Parents has the requested hero copy, a shared school dialog, remembered selection, first-child fallback, and one categorized school menu. The featured dish, redundant supporting menu block and public pricing section are removed. Empty categories stay hidden. Full ingredients, nutrition and recorded-exclusion qualifiers remain available. Both languages have the new strings. | `views/parents.ejs`, `views/home.ejs`, `views/partials/sitenav.ejs`, `views/partials/sitefoot.ejs`, `views/partials/school-selector.ejs`, `views/partials/school-menu.ejs`, `public/js/school-menu.js`, `public/css/style.css`, `server.js`, `locales/en.json`, `locales/ar.json` |
| 3 | Booking options, server validation and Main-only default rotation follow each student's school. Quotes and payment recalculation use that school's rate. Paid amounts remain stored. The account Menu page shows one categorized block per distinct child school. | `db/subscriptions.js`, `lib/subscription-routes.js`, `lib/subscription.js`, `server.js`, `views/menu.ejs`, `tests/subscription-flow.test.js`, `tests/subscription.test.js` |
| 4 | Thursday's Kuwait cutoff determines the next service Sunday. The first month bills only its remaining calendar window; later months are full. An empty first window rolls forward. Payment rechecks dates and prices, and expired drafts require fresh review and terms acceptance. Meal changes enforce the same weekly boundary. Review and dashboard periods show the actual service window. Demo seed payments follow the new rule. | `lib/subscription.js`, `lib/subscription-routes.js`, `db/subscriptions.js`, `server.js`, `views/booking.ejs`, `views/partials/subscription-review.ejs`, `locales/en.json`, `locales/ar.json`, `tests/subscription.test.js`, `tests/subscription-flow.test.js` |
| 5 | All three How It Works bodies use the exact supplied English wording, with Arabic translations. Titles and the existing layout/motion remain unchanged. | `locales/en.json`, `locales/ar.json` |
| 6 | Added behavioral coverage and browser QA. Fixed the mobile-menu dialog's focus return, corrected the Home/footer menu anchors, hid the selector's redundant visible legend while preserving its accessible label, and applied fixed-ratio cover images only to school menu cards. The booking month preview now follows the empty-window rollover. | `tests/subscription-flow.test.js`, `tests/localization.test.js`, `lib/subscription-routes.js`, `public/js/school-menu.js`, `public/css/style.css`, `views/home.ejs`, `views/partials/sitefoot.ejs`, this report, and `docs/evo-implementation/school-menus-qa/` |

The food-card, food-details, dish-image, food-confidence and parent-journey partials remain because other pages or the replacement menu still use them. No shared partial became unused. Removed locale families are `parents.menu.*`, `parents.pricing.*` and `parents.hero.ledeWithoutCollection`; no source references remain.

Registration/authentication behavior, legal text, the Terms dialog, Corporate Meals content, Staff booking, Contact, metadata, the collection flag, palette, logo, deployment configuration and the existing motion system were not changed. School selectors consume the new school source as explicitly required collateral.

## Authorized assumptions

| # | Assumption applied |
|---|---|
| 1 | The weekly rule is real business logic. Thursday 23:59:59 Kuwait time replaces the old seven-day lead and 48-hour change rules. Sunday through Thursday qualifies for the next Sunday; Friday and Saturday qualify for the Sunday after that. |
| 2 | The first month is partial, beginning at the service-start Sunday. The following months are full. `PARTIAL_FIRST_MONTH` in `lib/subscription.js` isolates the alternative: setting it to `false` uses full months beginning after the eligible service month. |
| 3 | Menus and rates belong to schools. All three seeded schools retain **KWD 2.000** per working day. Existing paid rates and amounts are not recalculated. |
| 4 | Menu assignments are illustrative placeholders using only the five existing dishes. Public and account school menus label them accordingly. No screenshot dishes, nutrition, ingredients or certifications were invented. |
| 5 | Dessert-tagged Seasonal Fruit Cup is Snack. The other four dishes are Main. Side and Drinks remain empty and are hidden until actual data exists. |

Additional reversible choices:

- The inline school form remains available alongside the enhanced dialog, including with JavaScript enabled. Without JavaScript, all nonempty category panels are shown in order.
- Unknown slugs leave the current valid session selection intact. Only a valid explicit selection updates the session. A parent without one sees their first child's active school.
- The shared grid uses three desktop columns, two tablet columns and one mobile column. Existing dish images use a 4:3 frame, `object-fit: cover` and lazy loading.
- Demo seed subscriptions use an illustrative Thursday payment before the current month's first Sunday. Existing deployed subscriptions are neither rewritten nor recreated.
- Browser QA creates additional children in a disposable database because the demo children already have paid current-month subscriptions. The existing unique student/month rule correctly blocks a second booking for that month.

## Illustrative menu assignments

These assignments are **placeholder demo data**, not confirmed school menus. Existing ingredient and nutrition records remain unchanged.

| School | Main dishes | Snack | Daily rate |
|---|---|---|---|
| Kuwait English School | #1 Arabiatta Chicken Pasta; #2 Balsamic Chicken & Beans; #4 BBQ Chicken & Sweet Potato | #5 Seasonal Fruit Cup | KWD 2.000 |
| American Creativity Academy | #2 Balsamic Chicken & Beans; #3 BBQ Beef Burger; #4 BBQ Chicken & Sweet Potato | None; Snack is hidden | KWD 2.000 |
| The English School | #1 Arabiatta Chicken Pasta; #3 BBQ Beef Burger | #5 Seasonal Fruit Cup | KWD 2.000 |

All three schools have no Side or Drinks entries. No empty tabs appear.

## Arabic review

Every new or changed Arabic string below **needs native review**. Existing school and dish record names remain in their supplied English form.

| Key | Arabic text | Status |
|---|---|---|
| `nav.checkMySchool` | اختر مدرستك | needs native review |
| `home.hero.ctaCheckSchool` | اختر مدرستك | needs native review |
| `home.faq.a4` | احجز وعدّل اختيار الوجبات بحلول يوم الخميس من الأسبوع الحالي لتبدأ خدمة الوجبات يوم الأحد من الأسبوع المقبل. | needs native review |
| `howItWorks.steps.body1` | حدّد عدد الأشهر التي تريد الاشتراك فيها. (تُحتسب الرسوم لأيام العمل فقط) | needs native review |
| `howItWorks.steps.body2` | اختر وجبتك المفضلة لكل يوم. (يمكن تعديل اختيار الوجبات لاحقًا أيضًا) | needs native review |
| `howItWorks.steps.body3` | وافق على شروط الدفع وادفع عبر كي نت. احجز وعدّل اختيار الوجبات بحلول يوم الخميس من الأسبوع الحالي لتبدأ خدمة الوجبات يوم الأحد من الأسبوع المقبل. | needs native review |
| `parents.hero.lede` | اعرف المكونات. واختر ما يناسبك. | needs native review |
| `subscription.leadBanner` | احجز وعدّل اختيار الوجبات بحلول يوم الخميس من الأسبوع الحالي لتبدأ خدمة الوجبات يوم الأحد من الأسبوع المقبل. | needs native review |
| `subscription.cutoffNote` | احجز وعدّل اختيار الوجبات بحلول يوم الخميس من الأسبوع الحالي لتبدأ خدمة الوجبات يوم الأحد من الأسبوع المقبل. | needs native review |
| `subscription.errors.cutoff` | يوم أو أكثر من أيام الوجبات يسبق أسبوع الخدمة المتاح التالي. لم تُحفظ أي تغييرات. | needs native review |
| `schoolMenu.selectTitle` | اختر مدرستك | needs native review |
| `schoolMenu.confirm` | تأكيد | needs native review |
| `schoolMenu.cancel` | إلغاء | needs native review |
| `schoolMenu.eyebrow` | قوائم المدارس | needs native review |
| `schoolMenu.heading` | استكشف قائمة مدرستك. | needs native review |
| `schoolMenu.intro` | توزيع توضيحي للوجبات التجريبية الحالية على المدارس؛ لم تُقدّم القوائم المعتمدة بعد. | needs native review |
| `schoolMenu.change` | تغيير المدرسة | needs native review |
| `schoolMenu.prompt` | اختر مدرستك لعرض قائمة وجباتها | needs native review |
| `schoolMenu.show` | عرض القائمة | needs native review |
| `schoolMenu.empty` | لا توجد وجبات لهذه المدرسة حاليًا. | needs native review |
| `schoolMenu.categoriesLabel` | فئات الوجبات | needs native review |
| `schoolMenu.categories.main` | رئيسية | needs native review |
| `schoolMenu.categories.side` | جانبية | needs native review |
| `schoolMenu.categories.drink` | مشروبات | needs native review |
| `schoolMenu.categories.snack` | وجبة خفيفة | needs native review |

## Tests and browser QA

| Stage | Passing tests | Failures / skipped |
|---|---:|---|
| Baseline | 70 | 0 / 0 |
| Phase 1 | 70 | 0 / 0 |
| Phase 2 | 70 | 0 / 0 |
| Phase 3 | 70 | 0 / 0 |
| Phase 4 | 72 | 0 / 0 |
| Phase 5 | 72 | 0 / 0 |
| Phase 6 | 80 | 0 / 0 |

The full suite ran before each phase commit. Coverage includes fixed category ordering, school filtering, hidden empty categories, unknown slugs, session persistence, first-child selection, off-menu rejection at booking/payment/later changes, Main-only defaults, rate changes at payment, preserved paid amounts, localization integrity and removed marketing content.

Weekly tests include all four October 2026 examples, the exact Thursday/Friday boundary, year rollover, partial-month arithmetic, complete-calendar validation, positive totals, overlap protection, empty-window rollover, meal locking, expired drafts returning to review, and renewed terms/payment review.

Browser-driven QA used headless Chromium and disposable SQLite databases. Representative screenshots were visually inspected. [Detailed results](school-menus-qa/results.json) record **158 checks**, with zero console errors, page errors or CSP violations in the completed run.

| Check | Result |
|---|---|
| Parents in English and Arabic, no school and each of the three schools | Passed at all eight widths; correct school dishes and nonempty tabs |
| Keyboard selector | Passed: radio selection, Confirm, Escape, focus restoration and background scroll lock |
| Mobile navigation selector | Passed in both languages; closing returns focus to the visible menu toggle |
| Category keyboard interaction | Passed: LTR/RTL arrow direction, Home, End, selected state and hidden inactive panels |
| JavaScript disabled | Public inline GET selection works in both languages at 320px; all nonempty panels remain visible |
| Two-school complete booking | Passed with JavaScript enabled: month selection, review, changed meal, saved choices, Terms, simulated KNET, confirmation, stored amounts and paid-meal page |
| School price separation | Disposable QA fixtures: Kuwait English School at KWD 2.000 × 13 working days = KWD 26.000; American Creativity Academy temporarily at KWD 2.500 × 13 = KWD 32.500. Both review and stored payment matched. No production/seed rate was changed for this check. |
| Booking menu separation | Kuwait English School offered IDs 1, 2, 4, 5; American Creativity Academy offered IDs 2, 3, 4. Defaults omitted Snack. |
| How It Works | English and Arabic copy and layout checked at all eight widths |
| Responsive widths | **320, 344, 375, 390, 430, 768, 1024 and 1440px**; zero document horizontal overflow on Parents, How It Works, account Menu, booking list, history and paid meal selection in both languages |
| Motion preferences | Public layout matrix used reduced motion; selector/tab keyboard checks also ran with normal motion |

Evidence is under `school-menus-qa/`: Parents, selector, How It Works, review, payment and paid-meal screenshots in both languages; `results.json`; and `run-qa.cjs`. Run the browser script from the repository root with Playwright/Chromium installed, or set `PLAYWRIGHT_MODULE` to an existing installation. The script creates and removes its own temporary database.

## Scope conflicts and observations

The new instruction overrides these statements in `docs/evo-implementation/CLIENT-EDITS-REPORT.md`:

- Line 77: “Earliest month whose first day is at least seven days after the Kuwait payment/booking date.” Replaced by the weekly Sunday rule and partial first month.
- Line 79: “Allowed strictly before 48 hours before midnight at the start of the meal day in Kuwait; locked at the exact boundary.” Replaced by the next-service-Sunday boundary.
- Line 87: “Each demo child has a paid current-month subscription, simulated as purchased seven days before its first day.” New fresh-database seed payments use the Thursday before the month's first Sunday. Existing rows remain intact.

Items observed and left outside scope:

- `npm install` reported five existing dependency advisories: four moderate and one high. No dependency or deployment changes were made.
- School calendars, menu assignments and dish imagery remain illustrative. Actual school-approved data was not supplied.
- An additional no-JavaScript checkout probe hit native page-transition/click timeouts in headless Chromium, including on the existing login/payment pages. This is not counted as a passing full no-JavaScript checkout. The requested public school-menu fallback passed; full booking was verified with JavaScript enabled. The scope fence keeps the existing authentication and motion system unchanged.
- The school-admin label “Meals in the next 7 days” remains: it describes a dashboard reporting interval, not the replaced service-start rule.
- Existing legal text and page metadata remain unchanged as requested; this work makes no new legal or privacy claims.

## Commit and delivery record

| Phase | Commit | Subject |
|---|---|---|
| 1 | `1f7c56a` | Phase 1: schools, menu categories and school menu assignments |
| 2 | `ee75546` | Phase 2: Parents page school selector, categorized school menu, pricing removed |
| 3 | `9daa6c9` | Phase 3: school-specific menus and rates in booking and menu |
| 4 | `f6117ed` | Phase 4: weekly Thursday cut-off and Sunday service start |
| 5 | `6d8f5da` | Phase 5: How It Works step copy |
| 6 | Commit containing this report | Phase 6: tests and QA |

The delivery message records the final commit SHA and the verified `origin/main` push result. The report cannot embed its own commit hash; resolve that exact commit with `git log -1 --format=%H -- docs/evo-implementation/SCHOOL-MENUS-REPORT.md`.
