# Evo Meals — Phase 1 forensic audit and implementation blueprint

Audit date: 23 September 2026 (user timezone: Asia/Kolkata). Source: the current `evo360-demo-system-AI` folder. Scope: observation, verification, diagnosis and planning only. No application, content, database-schema, styling or dependency changes were made.

Evidence labels used here: **Rendered** = inspected in the running browser; **HTTP** = exercised against the running server; **Source** = verified in executable templates/code/data; **Unverified** = requires client, operational or legal evidence. A source string establishes that a claim exists, not that the claim is true in the real world. Recommendations are future work, not claims of completed implementation.

## 1. Executive Diagnosis

Evo Meals has a useful working parent-account and booking foundation. Its largest problems are a gap between public promises and implemented capabilities, incomplete food information, and shared components whose behavior changes unexpectedly across pages and breakpoints. A wholesale redesign would discard useful work without addressing these causes.

The parent mental sequence is only partially supported. Home shows a child and food, but sends attention to several competing actions before detailed food information. Parents leads with tracking and a reader animation; the food appears after a long hero and another process explanation. Menu puts substantial qualification text before the first image, then omits the allergen data that the text tells the parent to inspect. Collection status is presented as evidence of eating, although collecting a meal does not establish that it was eaten.

### Highest-impact findings

1. **Food confidence is not currently deliverable as described.** All five seeded dishes store `allergenFree: [nut, shellfish, sesame, soy]`, but no view renders `allergenFree`. Home, Parents, Menu and Features nevertheless advertise per-dish allergen information. The client's whole-menu statement conflicts in scope with current marketing/Menu/Terms wording. Resolve the content contract before adding a food-confidence badge or publishing stronger wording.
2. **The public capability claim exceeds this repository.** There is no caterer login/queue endpoint, collection-reader endpoint, payment gateway integration, push transport, general administrator workspace or revenue-reporting route. Notifications are stored records rendered on page requests. Calendars are generated illustrative schedules. Features says everything listed is live; that is not supported here.
3. **There are reproducible rendering failures.** Parents exposes four raw translation keys and overflows by 424px at a 390px viewport. Caterer order rows disappear at widths up to 640px. Product navigation clips at 912px. Menu crops square imagery into 70px strips below 561px. Global horizontal clipping can conceal these failures.
4. **Operational correctness needs work before visual polish.** HTTP probes accepted an invalid plan type and 31 days despite a 30-day form maximum; malformed monthly dates and nonexistent meals produced 500 responses. Single-plan bookings charge for multiple days but today's-status logic only recognizes their start date. Monthly collection is stored on the whole booking, not separately for each service day.
5. **Accessibility and Arabic parity are incomplete.** Closed mobile menus remain keyboard-focusable; several pages have broken skip links; student/staff labels are not associated with controls. Arabic body copy does not receive Cairo, food data and legacy notifications remain English, and the admin language switch disappears on mobile without a replacement.
6. **Existing refinement documentation is historical evidence, not a current certificate.** It claims per-dish allergen display, image dimensions and completed behavior that differ from today's files. This document supersedes those conclusions for this source snapshot.

### Repository verification and Git blocker

The first commands executed in the supplied workspace were:

```text
git branch --show-current
git status
git rev-parse HEAD
git rev-parse origin/main
```

All four failed with `fatal: not a git repository (or any of the parent directories): .git`.

| Required fact | Actual result |
| --- | --- |
| Workspace | `/Users/tan/Desktop/EVO/evo360-demo-system-AI` |
| Current branch | Unavailable; cannot assert `main` |
| HEAD | Unavailable |
| origin/main | Unavailable; no remote configuration available here |
| Working-tree status | Cannot establish with Git; existing files treated as user-owned |
| User decision | “Use current AI folder; document Git/push blocker” |
| Commit/push | Blocked by absent Git metadata; no repository initialized, branch created, sibling repo modified, worktree, PR or push attempted |

A sibling folder has `.git`, but the user explicitly selected this AI folder. Before any later Git operation, the user must supply/restore the intended repository metadata or select the correct checkout. Then re-run the four checks, establish `main`, review user changes, and commit only the audit if it is the only intentional change. Do not manufacture history or transplant a sibling `.git` directory.

Source fingerprints, SHA-256, make the inspected snapshot identifiable despite the Git blocker:

```text
server.js             216add881a035dcd663ab624b3af9cd4266108a1a7be791a2b40c4e65870caab
db.js                 457562f5ecc9ac20b886f4b3e63ccdf743426aeafe91fcc113695ec7bebed0cf
public/css/style.css  57432cfb039d33c47e5b139d6d6b2075827a247c580fec4a1c3b33c281ca760d
locales/en.json       4c40fa8af0f70a2d8ef72915e9fc8311830fe618444f1a9a49e10efff8314d3f
locales/ar.json       f1fd50fd2650df283b65e417438a2a120b4944a9cf0a5853f6d66407ca14693c
package-lock.json     eff0bdf3044e47a6f3dc09731979008edcd3891a1093cb996c1475d29047954a
```

### Baseline health and inspection method

| Check | Actual baseline |
| --- | --- |
| Runtime | Node v22.17.0; existing dependencies used |
| `npm test` | PASS: 21 tests, 3 suites, 0 failures/skips; pricing, date helper, masking and HTTP masking integration |
| Configured scripts | `start`, `dev`, `migrate`, `test`; start/dev both run `node server.js` |
| Lint/build | No configured lint, type-check or build script; none invented |
| Syntax checks | `node --check` passed for server.js, db.js and all three public JS files |
| Start | `DATABASE_FILE=/tmp/evo-phase1-audit.db PORT=3100 LOG_LEVEL=warn npm start` succeeded |
| Migration/start workflow | Fresh temporary database applied all five migrations automatically; existing `evo360.db` was not used for audit mutations |
| Health | `/health` returned HTTP 200 and `{"status":"ok"}` |
| Public route smoke | All 13 English pages and 11 Arabic counterparts returned 200; `/ar/privacy` and `/ar/terms` returned 404 as currently designed |
| Parent login | Seeded demo login redirected to `/dashboard`; all seven main parent routes and `/students/1/edit` returned 200 |
| School admin | Seeded school-admin credentials successfully rendered `/school-admin/dashboard` in browser |
| Responsive rendering | 42 page/locale contexts × 34 widths = 1,428 exact-width browser measurements; every measurement verified actual `innerWidth` |
| Additional range/landscape checks | All 42 EN/AR contexts checked at 667×375, 1024×768, 767×900, 1199×900, 1600×900 and 1920×1080: 252 additional exact-size measurements |
| Interactive checks | Parent/admin login, mobile menu open/Escape, closed-menu keyboard focus, registration empty-field feedback, plus HTTP negative inputs/reset behavior |
| Baseline limitation | Existing tests do not cover browser layouts, locale-key completeness, allergy presentation, daily fulfilment semantics or most invalid booking inputs |

Browser inspection used the available in-app browser, actual DOM/layout measurements and representative screenshots. Full-page stitched captures showed capture artifacts, so visual conclusions rely on ordinary viewport screenshots and DOM geometry, not stitched duplication. Width sweeps are layout checks, not a claim that every interaction was manually exercised at every width. No Lighthouse, Core Web Vitals, screen-reader certification, real-device Safari/Android, or production-integration performance result is claimed. Reduced-motion rules were inspected in source; the browser API used did not expose motion-preference emulation.

### Actual architecture inventory

**Runtime:** Express 4 + EJS server-rendered multipage app. No SPA router, frontend framework, bundler or component library. `server.js` owns routes, auth, locale resolution, rendering and most orchestration. `db.js` owns synchronous SQLite access, seeding and transactions. `lib/pricing.js`, `lib/validate.js`, `lib/mask.js` and `lib/i18n.js` are focused helpers.

| Public surface | Actual routes | Template/data |
| --- | --- | --- |
| Home | `/`, `/ar` | `views/home.ejs`; menu/plans from DB; school list hardcoded in view |
| Parents | `/parents`, `/ar/parents` | `views/parents.ejs`; DB menu/plans |
| Schools | `/schools`, `/ar/schools`; POST matching `/schools/inquiry` paths | `views/schools.ejs`; illustrative dashboard, persisted inquiry |
| Caterers | `/caterers`, `/ar/caterers`; POST matching `/caterers/inquiry` paths | `views/caterers.ejs`; hardcoded illustrative queue, persisted inquiry |
| How It Works | `/how-it-works`, `/ar/how-it-works` | `views/how-it-works.ejs`, shared six-step partial |
| Features | `/features`, `/ar/features` | `views/features.ejs`, shared role-capability partial |
| About | `/about`, `/ar/about` | `views/about.ejs` |
| Contact | GET/POST `/contact`, `/ar/contact` | `views/contact.ejs`; POST logs metadata, does not save/send message |
| Login | GET/POST `/login`, `/ar/login` | `views/login.ejs`; parent Civil ID + bcrypt password |
| Register | GET/POST `/register`, `/ar/register` | `views/register.ejs`; creates parent, starts session |
| Forgot Password | GET/POST `/forgot-password`, `/ar/forgot-password` | `views/forgot-password.ejs`; simulated, no reset token/email |
| Privacy | `/privacy` | `views/privacy.ejs`; English only |
| Terms | `/terms` | `views/terms.ejs`; English only |

| Product surface | Actual routes | Responsibility |
| --- | --- | --- |
| Dashboard | GET `/dashboard` | `views/dashboard.ejs`; children, booking status, periods, renewal prompts, notifications; GET may create deduplicated renewal notifications |
| Students | GET `/students`, `/students/:id/edit`; POST `/students` | `views/students.ejs`; add/edit child, ownership checks, masked existing ID, free-text allergy notes |
| Menu | GET `/menu` | `views/menu.ejs`; all menu rows, ingredients/macros; no school/day filter |
| Booking | GET/POST `/booking`; POST `/booking/:id/renew`; `?rebook=id` | `views/booking.ejs`; real DB write and price calculation, simulated payment |
| History | GET `/history`; POST `/history/:id/cancel` | `views/history.ejs`; booking history, ownership/status-checked simulated cancellation/refund |
| Profile | GET/POST `/profile` | `views/profile.ejs`; name/email/phone; ID masked; no password-change implementation |
| Staff | GET/POST `/staff` | `views/staff.ejs`; same parent auth; `staff_id` references parents, not separate staff identities |
| School Admin | GET/POST `/school-admin/login`, GET `/school-admin/dashboard`, GET `/school-admin/logout` | `views/school-admin-login.ejs`, `views/school-admin-dashboard.ejs`; school-filtered booking/student queries |
| Notifications | POST `/notifications/:id/read`, `/notifications/read-all` | Header + dashboard; records loaded on request, no streaming/polling/push integration |
| Locale/logout | GET `/locale/:lang?returnTo=…`, `/logout` | Session preference / session destruction |
| System | `/health`, `/robots.txt`, `/sitemap.xml`, `/favicon.ico`, catch-all 404 | server handlers and `views/404.ejs` |

No separate student portal, caterer portal, central administrator console, actual meal-tap endpoint or report export route exists in this source.

| Shared system | Current files / root responsibility |
| --- | --- |
| Layout | Repeated EJS document shells; no central layout template. `.wrap`, `.wrap-wide`, `.page`, `.section`, `.hero` in `public/css/style.css` |
| Head/fonts/meta | `views/partials/head.ejs`; all pages load global CSS, motion/validation JS, Montserrat/Poppins/Cairo from Google Fonts |
| Public header/mobile nav | `views/partials/sitenav.ejs`, `public/js/nav.js`; desktop and mobile links duplicated in markup |
| Parent header/notifications | `views/partials/appnav.ejs`, `public/js/nav.js`, `public/js/notifications.js` |
| Admin header | `views/partials/adminnav.ejs`; simpler header, no mobile drawer |
| Footers | `views/partials/sitefoot.ejs`, `views/partials/appfoot.ejs`; admin dashboard has its own inline footer |
| Buttons/CTA | `.btn` variants, `.hero-actions`, `.cta-band`, `.store-badge`; CTA markup repeated across pages |
| Forms/errors | Per-page EJS, `.field`/`.form-row`/`.field-error`; validation in `motion.js` and `lib/validate.js`; some route-specific rules |
| Cards/data | `.card`, `.benefit-card`, `.role-card`, `.menu-card`, `.picker-card`, `.data-card`, `.stat`, `.price-card`; different purposes, partially repeated styling |
| Food | `views/partials/dish-image.ejs`, `server.js` exact-name `DISH_IMAGE_SLUGS`, menu/parents/home/booking templates |
| Journeys | `views/partials/how-it-works-section.ejs`, inline Parents/Schools/Caterers steps, How It Works role journeys; `.steps`, `.step`, `.role-journey-*`, `.flow-caption`, `.app-steps` |
| Features | `views/partials/features-section.ejs`; five role cards, ten capability pills |
| Feedback | `views/partials/success-icon.ejs`, alert/status/badge styles, notification partial markup |
| Tables | History/admin duplicate table and mobile-card markup; caterers only has table markup; shared `.data-table-view` hides at 640px |
| Localization | `lib/i18n.js`, `locales/en.json`, `locales/ar.json`; 825 leaf keys each. Equal key sets do not prove template coverage: four referenced Parents keys are absent from both |
| Assets | `public/images/hero-{desktop,mobile}.{png,webp}`, five square dishes in `public/images/menu/`; inline SVG icons throughout views |
| Data | SQLite `evo360.db` default; `DATABASE_FILE` override; `seed.json`; generated school calendar and pricing seed in `db.js` |
| Migrations | `db/migrate.js`; 001 base tables, 002 nutrition/ingredients, 003 admin/inquiries/notifications, 004 calendar and wallet removal, 005 notification translation params |
| Active tables | parents, students, menu_items, plans, bookings, staff_bookings, school_admins, inquiries, notifications, school_calendar_days, schema_migrations; wallets were dropped |
| Tests | `tests/pricing.test.js` (15), `tests/mask.test.js` (3), `tests/civil-id-masking.test.js` (3 HTTP integration cases) |

Public language uses URL prefixes; product/admin language uses the session. Unprefixed public routes deliberately stay English. English fallback is implemented, and missing English keys print their key. Dish names, ingredients, schools/classes and legacy notifications are not a bilingual dataset. Session storage is express-session's default memory store; SQLite stores product data, **not sessions**. README wording suggesting database-backed sessions is inaccurate.

## 2. Strengths to Preserve

- **KEEP** the Express/EJS multipage architecture, focused pricing/masking helpers, migrations, parameterized SQL and transactional booking/notification and cancellation/notification writes. No framework migration is needed for this refinement.
- **KEEP** server-side student/booking ownership checks, masked existing Civil IDs, CSRF middleware and login rate limiting. These are useful controls, not proof of production readiness.
- **KEEP** explicit monetary totals with three-decimal KWD, the calendar-table pricing mechanism, empty states and editable non-sensitive profile fields. Replace unverified calendar content without discarding the calculation engine.
- **KEEP** parent-first Home imagery, warm cream/forest structure, clear food names, square source dish assets, ingredients/macros where present, sample-view labels and disabled trust-stat gate.
- **KEEP** the existing Book → Pay → Tap → Notified vocabulary and separate school/caterer inquiry paths. Refine the truth and order of the explanation.
- **KEEP** one translated EJS view per page, public Arabic URLs, product locale preference, intentional arrow mirroring, bidi isolation already present, reduced-motion rules and no-JS reveal fallback.
- **KEEP** real radio controls in booking, visible password-toggle names, existing focus styles, responsive History/admin card views, and server validation alongside browser feedback.

## 3. Priority Matrix

Priority expresses user harm/blocked comprehension, not visual prominence. Phase 2 includes minimum correctness and accessibility repairs needed for a truthful public/product foundation; Phase 3 completes operational refinement and broader hardening. Entries requiring outside verification remain explicitly gated.

| Area | Current Problem | Decision | Priority | Files/Components | Risk | Phase |
| ---- | --------------- | -------- | -------- | ---------------- | ---- | ----- |
| Allergen contract | Client whole-menu statement conflicts with existing scope/disclaimers | REFINE | Critical | locales, menu/parents/home, terms | Food/legal meaning; client + legal resolution required | Phase 2 |
| Dish information | Stored allergen fields never displayed | ADD | Critical | menu/parents/booking, dish component, db mapping | Do not convert seeded data into verified assurances | Phase 2 |
| Booking validation | Invalid plan/days accepted; malformed inputs 500 | REFINE | Critical | server.js, lib/validate.js, lib/pricing.js | Incorrect bookings/amounts | Phase 2 |
| Fulfilment model | One collected state for a whole multi-day booking | REFINE | Critical | bookings schema, db.js, dashboard/admin | Migration and historical meaning; agree daily model first | Phase 3 |
| Capability truth | Live KNET, caterer queue, reader, push, analytics/reporting overclaims | REFINE | Critical | locales, features, schools, caterers, about, head | Misrepresentation of working demo | Phase 2 |
| Parent app strip | Four missing keys; missing `.app-flow` layout | CONSOLIDATE | High | parents.ejs, locales, shared journey styles | Severe clipped content | Phase 2 |
| Caterer mobile proof | Table hidden without alternate content | REFINE | High | caterers.ejs, data-table-view | Entire operational example lost | Phase 2 |
| Product header | Overflow at 912px EN / 320px AR | REFINE | High | appnav.ejs, style.css | Hidden controls | Phase 2 |
| Mobile food | Square images become 70px crops | REFINE | High | `.menu-thumb-wide`, menu.ejs | Food recognition lost | Phase 2 |
| Menu tablet data | Nutrition min-content exceeds narrow card | REFINE | High | menu-nutri-grid, grid-2 | Text overlap despite mostly fitting page | Phase 2 |
| Keyboard navigation | Invisible closed menu receives focus | REFINE | High | nav.js, site/app nav, CSS | Keyboard/screen-reader obstruction | Phase 2 |
| Landmarks | Broken skip targets on five public pages | ADD | High | caterers/about/contact/privacy/terms | Navigation barrier | Phase 2 |
| Form semantics | Missing label associations and error linkage | REFINE | High | students/staff/all forms, validation JS | Inaccessible inputs/errors | Phase 2 |
| Parent food hierarchy | Tracking/process precede food proof | REFINE | High | parents.ejs, locale content | Weak parent understanding | Phase 2 |
| Home hierarchy | Hero height jump; several high-weight actions | REFINE | High | home.ejs, hero layout | Food/next step buried on tablet | Phase 2 |
| Supported schools | Hardcoded configuration presented as support | REFINE | High | home/students, db.js, validate.js | Implied partnerships; confirm operational list | Phase 2 |
| Features | Ten pills, unsupported capabilities, narrow five-column layout | CONSOLIDATE | High | features-section.ejs, role-card styles | Capability parity across roles | Phase 2 |
| Arabic font | Body selector overrides inherited Cairo | REFINE | High | style.css, head.ejs | Inconsistent Arabic readability | Phase 2 |
| Locale continuity | Parent auth lacks switch; admin mobile switch hidden | ADD | High | auth templates, adminnav | Arabic user stranded | Phase 2 |
| Reset/contact truth | Reset says sent; contact discards message | REFINE | High | server.js, forgot-password/contact, locales | False success / lost support request | Phase 2 |
| Unsupported stats | Booking popularity; fictional school metrics | REMOVE | High | locales, booking, schools preview | Unsupported social proof | Phase 2 |
| About story | Unverified founding/feedback narrative | REFINE | Medium | about.ejs, locales | Invented company history | Phase 2 |
| Parent dashboard | Rebook/stat cards outrank today's child status | REFINE | High | dashboard.ejs | Slower primary task | Phase 3 |
| Shared journeys | Multiple overlapping process implementations | CONSOLIDATE | Medium | partials, CSS, page templates | Must preserve distinct role semantics | Phase 2 |
| CTA semantics | Primary changes color by ancestor; strong app download | CONSOLIDATE | Medium | btn variants, header/CTA markup | Regression on dark/light surfaces | Phase 2 |
| Count-up | Real operational values initially render 0 | REMOVE | High | dashboard/admin, motion.js | Misleading values; broken without JS | Phase 3 |
| Decorative movement | Magnetic CTAs, parallax, glow compete with message | REMOVE | Medium | motion.js, hero CSS | Preserve functional feedback | Phase 2 |
| Food data localization | English-only dish metadata on Arabic pages | ADD | High | menu_items content model, views | Professional translation and image linkage | Phase 3 |
| Stable dish assets | Exact English-name-to-image mapping | REFINE | Medium | server.js, dish-image, data model | Rename/translation drops photography | Phase 3 |
| Production controls | Memory sessions, log identifiers, CSP off | REFINE | High | server.js, env/deployment config | Security/deployment contract required | Phase 3 |
| Tests | Narrow successful-path baseline | ADD | High | existing node:test suite | Add behavior tests, not styling snapshots of implementation | Phase 2 |
| CSS structure | 134 inline styles; dispersed breakpoints/context overrides | CONSOLIDATE | Medium | style.css, EJS partials | Refactor in verified component slices | Phase 2 |
| Assets/fonts | Large desktop hero; all fonts globally loaded | REFINE | Medium | images, head.ejs, dish-image | Avoid loss of food detail | Phase 3 |
| Legal Arabic | No reviewed Arabic legal text | ADD | High | privacy/terms routes/content | Legal translation and approval required | Phase 3 |
| Testimonial/stat gates | No substantiated evidence | KEEP | Low | home.ejs | Do not enable or fabricate | Phase 2 |

## 4. Public-Page Blueprint

### Information-speed contract

These are intended scan levels, not measured human comprehension times. Existing overload is noted in the last column.

| Page | Level 1 — ~3 seconds | Level 2 — ~15 seconds | Level 3 — optional depth | Current collision |
| --- | --- | --- | --- | --- |
| Home | School lunch for your child; food; next step | Meal information, Book/Pay/Tap/Notified, school availability | Whole-platform flow, app choice, FAQ, B2B paths | Four hero actions and long hero; school list precedes food detail; six-role explanation competes with parent journey |
| Parents | What my child eats and what I can check | Meal detail, price basis, collection status, register | Multiple-child example, detailed FAQ/app links | Reader illustration + four steps come before food; nutrition access requires login; repeated collection story |
| Schools | Control and visibility for a school programme | Actual booking/status interface; coordination; inquiry | Onboarding responsibilities and reporting definitions | Repeated abstract benefits before interface proof; fictional preview metrics |
| Caterers | Orders → demand → preparation → fulfilment | Labeled example grouped by school/meal | Onboarding and inquiry detail | Repeated queue promises; queue vanishes on mobile; preparation quantities not actually implemented |
| Features | Role → verified capability | Compare role responsibilities and next destinations | Links to dedicated pages | “Everything live” unsupported; pills replace capability explanations; global Register CTA mismatched |
| How It Works | Book → Pay → Tap → Notified | School: Set up/Monitor/Report; caterer: Receive/Prepare/Deliver | Full inter-role handoffs | Six-role platform explanation first, then repeated role flows |
| About | Why the platform exists and what it connects | Approach, focus, standard; collection visibility | Verified story/contact | Long hero lede and unsupported origin/health/realtime claims |
| Contact | How to reach support | Form or school/caterer destination | Contact channel details | Role cards and large hero before form; actual delivery limitation too obscure |
| Login | Parent Civil ID + password | 12-digit guidance, reset/register links | Errors/support | Generic Civil ID label; digits explained only on error; no locale/home link |
| Register | Parent account; fields required | Parent ID explanation, password rules, Terms choice | Validation/Terms | Strong password rule only revealed by error; Terms action may leave unsaved form |
| Forgot Password | Identifier and expected outcome | Honest demo status, return to login | Support alternative | Success removes demo caveat and claims instructions were sent |
| Privacy | What data is used and how to ask questions | Named topics, clear section navigation | Full approved policy | Long collapsed policy content, English only, no main landmark |
| Terms | Service roles and responsibilities | Ordering, identity, meal-claim scope | Full approved terms | Allergen scope and capabilities disagree with marketing/product |

### Parent-question assessment

| Question | Current answer quality | Decision |
| --- | --- | --- |
| What is Evo Meals? | Subtitle/footers describe school programme; headline alone does not name school lunch | REFINE: one direct parent-facing description adjacent to food |
| What will my child eat? | Attractive examples, five static seeded dishes; not a live school/day menu | REFINE: retain samples, label honestly, show food earlier |
| Important food information? | Ingredients/macros available, allergens advertised but absent | ADD: approved allergen information with provenance/scope; never infer safety |
| How arranged? | Booking flow exists; public term/month/daily descriptions conflict | REFINE: describe actual supported plan period consistently |
| Payment? | Real arithmetic; KNET charge/refund simulated | REFINE: preserve exact totals and truthful integration status |
| Collection? | Illustrative card reader; booking collection rows seeded | REFINE: distinguish demonstration from connected reader behavior |
| How will I know? | Stored notification and status views exist; no live push evidence | REFINE: describe record visibility; do not say eating is confirmed |
| Is school supported? | Three hardcoded school names and generated calendars | REFINE: configured-demo list vs approved supported-school list |
| Next action? | Login/register/school/app compete | REFINE: school check + one registration action, quiet returning-user login |

### Home — `/` and `/ar` — REFINE

**Audience / question / purpose:** new parents first; “What is this, what is the food, and can my child use it?” Public orientation and parent conversion with secondary institutional paths.

**Strengths:** warm hero, visible child/lunch, food photographs/illustrations, exact action destinations, sample labels, parent-oriented school check, no enabled trust-stat totals. **Communication weaknesses/redundancy:** six-step platform process, collection proof, multiple-child view, app sequence and final role CTAs repeat the same promise. “Notified when they've eaten” overstates collection. **Under-emphasized:** approved food information, limits of sample menu, actual school eligibility. **CTA:** Login appears first on mobile; Register, Check Your School and how-it-works link all precede food. Final B2B cards repeat earlier pathways. **Visual/imagery:** large portrait dominates tablet height; asset alt text claims fresh/hot food without provenance. **Motion:** hero reveal/parallax/glow/magnetism plus looping collection. **Responsive:** 320px overflow; 900/912px hero discontinuity. **RTL:** Arabic body font and `/ar` school-contact link to English `/contact`; reader text remains English. **Accessibility/technical:** closed drawer focus defect, pale focus ring on cream, duplicated CTA markup. Apply shared fixes in sections 6–10.

#### Current homepage sections, in actual order

| Order / section | Purpose and repetition | Weight / copy / CTA | Mobile and tablet behavior | RTL / motion / decision |
| --- | --- | --- | --- | --- |
| 1 Hero | Identify parent benefit; collection also repeated later | Highest; headline + lede + 3 buttons + quiet link | Stacked through 900px; portrait 3:4 yields excessive tablet height; buttons stack at 520px | Translated hero, some physical offsets; entrance + glow + parallax + magnetic Register. REFINE |
| Gate: trustbar | Placeholder counts, not rendered (`SHOW_TRUST_STATS=false`) | None currently | No runtime section to assess | KEEP disabled; not dead CSS merely because gated |
| 2 `supported-schools` | Answer eligibility; early reassurance | Dark/high; explanatory paragraph + three school names + contact | Names stacked; long school names; consumes substantial space before dishes | Hardcoded English names; contact href loses locale; reveal. REFINE |
| 3 `confidence` | Four reasons to trust/check | Short proof row; no CTA | Rows stack on small widths | Includes “eaten”; reveal. CONSOLIDATE food/payment/collection proof with evidence |
| 4 `menu-proof` | Two food examples | Food + title + calories/protein; menu-experience CTA | Square images retained; stacks on narrow screens | Dish names English; no actual allergen values; reveal/hover zoom. REFINE |
| 5 `how-it-works` | Six-role platform handoff | Six labeled explanatory items | Responsive process rail collapses; many reading stops | Logical connector work exists; generated numbering; reveal/stagger. CONSOLIDATE with brief parent flow, full handoff on dedicated page |
| 6 `collection-proof` | Tap/Collected/Notified demonstration | Animation and sample disclaimer | Reader is tall relative to information | English reader label; 3.2s looping CSS. REFINE |
| 7 `multiple-children` | Show one account, separate children/status | One paragraph + sample rows | Status wraps below identity on mobile | Some example names English; reveal. KEEP concept, integrate with collection proof if clearer |
| 8 `b2b-pathways` | Route schools and caterers | Two cards/CTAs | Stacks | Translated copy, shared cards. KEEP secondary; avoid duplicate final institutional CTAs |
| 9 `app` | App-store acquisition | Headline, 3-step strip, two store links | Store buttons stack below 520px | Home strip works; magnetic store links. REFINE; don't imply app parity is verified |
| 10 `faq` | Optional payment/tap/allergy/cancel detail | Four accordions, first open; crosslinks | Vertical, readable but long first answer | Translated; custom JS collapse. REFINE factual answers and hidden-state semantics |
| 11 Final CTA band | Routes all three audiences again | Three equal role cards with multiple actions | Single-column below 901px; adds long closing stack | Reveal; translated. CONSOLIDATE with parent-first close and existing B2B paths |
| 12 Footer | Deep navigation/contact/legal/app links | Dense but expected utility | Multiple stacked link groups | Legal English; physical text alignment in some components. KEEP structure, REFINE parity/focus |

**Future sequence:** concise child/food hero → visible meal example + approved information → compact parent booking/collection explanation → school eligibility/next action → multiple-child proof where useful → optional institutional/app/FAQ depth. Keep the school-check anchor accessible immediately. This is a hierarchy plan, not a mandated section count; preserve an existing section if it adds distinct understanding.

### Parents — `/parents`, `/ar/parents` — REFINE

**Audience / question / purpose:** most important dedicated parent page; understand food, arrange lunch and see collection. **Strengths:** featured dish, ingredients/protein, KWD pricing from DB, real four-step vocabulary, two-child example, sample labels. **Communication/redundancy:** hero tap animation, four steps, collection example and app flow repeat tracking; “Four steps, once a term” conflicts with calendar-month plans; “this week's menu” is not a weekly feed; “two minutes” has no measurement. **Under-emphasized:** food before reader technology; allergen content; eligibility before signup. **CTA:** repeated Create Account/Login plus two pricing CTAs and store buttons. **Visual/imagery:** featured dish becomes good full square on mobile, but desktop uses 180px image and prose-heavy body; secondary dishes expose calories only. **Motion:** reveal delays and infinite reader example. **Responsive/technical:** `.app-flow` has no layout rule, four keys missing, 814px scroll width at 390px; four-column nutrition grid even when featured card has only two values. **RTL/accessibility:** same missing keys; English reader/dish data; repeated H4 food titles; global drawer issues.

**Exact plan:** food/child promise → one fully inspectable meal (name, ingredients, nutrition, approved allergens) with compact other dishes → pricing and Book/Pay → collection/notification example that stops on confirmation → school/registration action → optional multi-child and FAQ/app detail. Use one shared journey component, not a second broken app sequence. Make all displayed food information available before commitment; do not hide it behind decorative hover/reveal. Preserve sample labeling until production menu provenance exists.

### Schools — `/schools`, `/ar/schools` — CONSOLIDATE

**Audience / question / purpose:** school administrator; “What control and visibility do we get, and how do we start?” Institutional inquiry. **Strengths:** partnership form persists, distinct onboarding steps, concrete dashboard preview. **Communication/redundancy:** problem/connected model/parent experience/operational visibility/student identification repeat coordination claims. “Revenue opportunities,” engagement uplift, automatic subscriptions and one-business-day response need evidence. **Under-emphasized:** actual available counts, status definitions and responsibilities. **CTA:** form anchor useful; post-form repeated CTA adds little. **Visual/imagery:** five large metric cards (312/648/6,140/14/87%) dominate despite being fictional; preview includes metrics absent from actual admin dashboard. **Motion:** generic reveal/stagger; no need to animate evidence. **Responsive:** small 320px overrun; preview becomes tall cards. **RTL:** English school name, body font, table/header alignment. **Accessibility/technical:** retain main/skip target; form error semantics need shared repair; sample data is hardcoded.

**Plan:** Programme Control / Visibility / Coordination / Reporting / Partnership as concise responsibilities paired with the actual dashboard fields. Replace fictional performance-looking metrics with a clearly labeled, minimal example derived from implemented fields. Consolidate repeated benefits into one operational workflow. Keep inquiry and onboarding, confirm response ownership/SLA before publishing it. Do not invent calendar/menu configuration controls: currently these are data/setup responsibilities, not admin UI features.

### Caterers — `/caterers`, `/ar/caterers` — REFINE

**Audience / question / purpose:** catering operator; “Which orders, quantities and schools must I prepare for?” Partnership lead capture. **Strengths:** tangible illustrative queue, demand/fulfilment concepts, persisted inquiry. **Communication/redundancy:** queue, demand and manual-processing copy repeat; no real caterer capability in routes; prepared/paid/settled language overstates this demo. **Under-emphasized:** quantities and preparation handoff; current example lists students and collected/upcoming status, not a kitchen preparation workflow. **CTA:** one form destination is appropriate; inquiry intro renders awkward “responds . within one business day”. **Visual/imagery:** interface example appropriate; no need for decorative kitchen stock images. **Responsive:** all queue rows hidden ≤640px, no card fallback. **Motion:** reveal is unnecessary for orders. **RTL:** mixed-language school/meal values, physical table heading alignment; Arabic form still posts to English `/caterers/inquiry`, losing locale on validation/success. **Accessibility/technical:** missing main/skip target; hardcoded illustrative rows, not a working queue.

**Plan:** Orders → Demand visibility → Preparation → Fulfilment, expressed as an explicitly illustrative responsibility flow unless operational integration is supplied. Preserve a visible example at every width; keep one inquiry path. Do not build invented operational controls or quantities for public proof.

### Features — `/features`, `/ar/features` — CONSOLIDATE

**Audience / question / purpose:** visitors comparing roles; “What can each role actually do?” **Strengths:** all five roles identified, concise list. **Communication/redundancy:** hero and section both say live/real; claims include absent queue/revenue reporting; student allergen capability not accessible in a student portal. **Under-emphasized:** capability scope and role-specific next action. **CTA:** final copy promises dedicated paths but offers only parent registration. **Visual:** five cards × two pill lists; at 1024px cards are ~182px wide, forcing repeated multi-line pills, large icon/padding overhead and unequal internal empty areas. No evidence of a catastrophic flex-stretch bug; density is primarily explicit column count, padding and pill min-content. **Imagery:** capability visuals should be actual UI/state examples, not food decoration. **Motion:** hover lift implies interactivity on noninteractive cards. **Responsive:** no page-level overflow in sweep, but cramped five-column layout starts at 1024px. **RTL/accessibility:** translated labels, shared font/drawer issues; role headings useful.

**Plan:** a readable role → capability map with a brief outcome and relevant destination, using only verified capabilities. Remove pill backgrounds where they add no state meaning. Allow content-based column capacity; avoid five columns until text fits. Keep student collection as a described journey, not an invented student account. Remove/qualify unsupported capabilities rather than adding an entire product to justify the page.

### How It Works — `/how-it-works`, `/ar/how-it-works` — CONSOLIDATE

**Audience / question / purpose:** parent first, then school/caterer; understand handoffs. **Strengths:** six-stage shared partial and concise role journeys already exist; logical connectors and responsive treatment. **Communication/redundancy:** large hero, full platform process and role flows explain similar steps at three levels. Allergy notes “passed along” and caterer live orders lack an implemented interface/transport. **Under-emphasized:** parent's four concrete actions first. **CTA:** parent Create Account alone despite multi-role close. **Visual/imagery:** meaningful steps beat generic photos; repeated numbers/labels increase visual syntax. **Motion:** global reveals delay comprehension; generated numbering appears redundantly in accessibility text. **Responsive/RTL:** rails collapse and arrow mirroring exists; ensure reading order, don't mirror numerals/card text. **Accessibility/technical:** native section headings retained, shared drawer and font repairs apply.

**Plan:** parent Book → Pay → Tap → Notified first; school Set up → Monitor → Report; caterer Receive → Prepare → Deliver next; optional full connection diagram only for information not already conveyed. State demo/verified boundaries. Reuse these labels throughout; no new animation library.

### About — `/about`, `/ar/about` — REFINE

**Audience / question / purpose:** parent or partner seeking legitimacy; why Evo exists and whom it connects. **Strengths:** emotional “Did they eat?” anchor, approach/focus/standard, clear Contact path. **Communication/redundancy:** repeated real-time platform claim; unverified “wasn't built in a boardroom” and “real feedback” origin story; healthy/nutritious wording lacks external substantiation. **Under-emphasized:** honest scope of platform vs caterer and confirmed story. **Visual:** oversized dark text-only hero leaves broad empty desktop area; substantial lede before concise connection cards. **Imagery:** none; do not invent a team/founding photograph. **CTA:** Contact works. **Motion:** reveal has no explanatory role. **Responsive/RTL:** layout fits tested widths; body font fallback and mixed product wording remain. **Accessibility/technical:** missing main landmark and skip target.

**Plan:** retain emotional concern as a motivation, explain collection visibility precisely, use one connection diagram and concise approach/focus/standard. A collection event cannot answer whether food was actually eaten. Publish origin history only after client confirmation; otherwise use values without a factual founding claim.

### Contact — `/contact`, `/ar/contact` — REFINE

**Audience / question / purpose:** parent needing help, partner needing correct team. **Strengths:** clear labels, short form, role destinations, direct footer contact links. **Communication/redundancy:** pathway choice followed by another role selector; “Handled securely — never shared beyond our team” needs policy alignment. **Under-emphasized:** actual submission limitation and direct contact alternatives. **CTA:** Send Message appears actionable, but POST discards message content and merely logs name/email/role then redirects to success. **Visual/imagery:** form is appropriately plain; large hero and three cards delay it; no decorative imagery needed. **Motion:** reveal should not hide support form. **Responsive:** no page overflow in sweep; direct channels could be closer to the form. **RTL/accessibility:** Arabic body font, missing main/skip target, unlinked errors; Arabic form posts to English `/contact`, losing locale. **Technical:** unlike school/caterer inquiries, contact does not persist messages.

**Plan:** concise support entry, direct verified channels, short form with truthful submission state. Either implement an explicitly agreed durable destination or label the simulated behavior clearly through success; no pretend delivery. Consolidate role routing without adding decorative sections.

### Authentication — REFINE

**Login:** parent audience; primary task sign in. Strength: numeric input mode, 12-character maximum/pattern, server validation, generic credential failure and rate limiting. Actual label is **Civil ID**, not **Parent Civil ID**; 12-digit explanation appears only in validation errors. Invalid-credential copy says “Try the demo login below” although no visible demo panel exists (both locales). No home link or language switch. Password field is native/labeled but lacks the Register reveal control. No page overflow measured; auth-card padding reduces usable width at 320px. No image needed. Global hero/reveal architecture does not justify login motion. Add consistent terminology, always-visible digit guidance, quiet home/locale controls and linked errors; preserve generic credential failure. Source uses a short-circuit bcrypt check for nonexistent users, so identical copy alone is not a timing-resistance guarantee.

**Register:** new parent; create account before adding child. Six fields required: full name, Parent Civil ID, email, phone, password, confirmation. Terms checkbox has `required`, starts **unchecked**, and server checks its presence. Do not auto-select it. Parent ID explanation is already present. Terms link points to English `/terms` in both locales. Non-password fields preserved on server validation failure; Terms choice is not preserved. Password placeholder says “At least 8 characters” but actual rule also requires a Latin letter, number and special character. Checkbox validation can block without a generated inline message in JS; other errors mostly lack `aria-describedby`/`aria-invalid`. Duplicate Civil ID response explicitly reveals existence, unlike login/reset; decide enumeration policy. No overflow observed, but field guidance and Terms row require keyboard/mobile review. Keep compact form, explain rules before error, keep consent explicit, preserve valid state without presuming consent, and add locale/home path. No imagery required.

**Forgot Password:** returning parent; recover access. Format check accepts 12-digit ID or email. Known and unknown valid IDs produced the same HTTP 200 generic success. No email, token or actual recovery exists. Form shows “simulated” caveat; success removes it and says instructions have been sent. Logging retains the submitted identifier. No locale switch/home path; no overflow measured. Keep enumeration-neutral response, make simulation persist on success, provide a real support path or implement recovery only under an approved integration scope. Add error/status announcements. Do not claim account-enumeration safety beyond the observed equivalent response; no timing/rate-abuse test was performed.

### Privacy and Terms — KEEP structure, REFINE conflicts

**Audience / question / purpose:** all users; data handling and service terms. **Strengths:** dedicated pages, topic accordions, actual contact path; no fabricated Arabic legal translation. **Communication/under-emphasis:** Privacy permits retaining encrypted card information while FAQ says none is stored. Terms describes username/password choice and password changes absent from current app; dietary wording excludes Regular Meal while all seeded meals carry the four free-from fields. **Redundancy:** legal detail belongs here rather than competing with food, but must not contradict public summaries. **Visual/imagery/CTA:** dense text is acceptable optional depth; no photos/marketing CTAs needed. **Motion/accessibility:** custom accordion state needs programmatic panel hiding and no-JS readability; both lack main/skip target. **Responsive/RTL:** measured English layouts fit; Arabic routes do not exist and English destination is not explained at the Arabic Terms link. **Technical:** English text lives directly in EJS, outside dictionaries. Record discrepancies for client/legal review; do not reinterpret liability or invent governing meaning. Add reviewed Arabic only after approval.

## 5. Product Blueprint

Operational pages should prioritize identity, task, amount and status. They should not inherit marketing section spacing, decorative reveals or oversized storytelling treatments. All product pages share the header defects and Arabic body/data limitations identified below; “fits” means no additional document-level overflow was found, not a complete accessibility pass.

### Dashboard — `/dashboard` — REFINE

- **Audience / question / purpose:** parent; “Which child is booked/collected today?” Daily status and next action.
- **Strengths:** child-specific rows, masked identity elsewhere, periods/amounts, actionable empty states, rebook and renewal paths, stored notifications.
- **Information/action/status priority:** renewal/rebook and three count cards precede today's status. Move today's child status first, then required action, then period details; retain rebook as secondary. Do not emphasize total historic bookings as “active” without a definition (`activeBookingCount` currently counts all noncancelled rows, including old collected bookings).
- **Communication/redundancy:** the same notification feed appears in header and body; useful views but share rendering semantics. Seeded Ahmed notification says pasta while related booking is a burger. “Just now” can appear for future seeded collection timestamps because `timeAgo` accepts negative differences.
- **Visual/food/forms:** consistent green surfaces; excessive statistical cards; no meal thumbnail in today's row. A small optional image may support meal identification after status correctness, not replace the status.
- **Responsive/RTL:** 912px EN header clipping; 320px AR header overrun; mobile status wraps intentionally. Legacy notifications/dates remain English. **Accessibility/motion:** H1 to H3 skips; numeric count-up briefly shows wrong values and leaves 0 without JS.
- **Technical risk:** monthly status treats a booking as collected for the rest of its month; no per-date collection ledger; weekend/holiday activity not excluded in `isActiveToday`. Define daily service records before claiming daily visibility. Preserve transactions/ownership checks.

### Students — `/students`, `/students/:id/edit` — REFINE

- **Audience/task:** parent managing each child's school/identity/reference notes. **Strengths:** existing Civil ID masked and disabled on edit, ownership checks, sibling-school default, clear form/list separation.
- **Priority/redundancy:** on narrow screens the add form precedes existing children; returning users must scroll to edit. Show registered children first with an explicit add action. Avoid duplicate school configuration lists across view, validator and calendar seed.
- **Communication/food:** allergy text correctly says notes are for reference, but shield/check icon can imply protection. Actual notes are in a `title` tooltip on a nonfocusable span; render relevant note text or an accessible disclosure. No allergy matching/filtering exists.
- **CTA/forms/accessibility:** name, school, class, section, gender and allergies have visual labels without `for` or wrapping association. Civil ID is associated. Group required vs optional fields and link errors; preserve values after invalid submissions. Class/section validation presentation is inconsistent.
- **Responsive/RTL:** shared header issue; two-column form/list collapses below 701px; English school/class/gender data remains. **Imagery/motion:** initials are appropriate, no stock-child imagery needed; avoid form reveals. **Technical:** create/edit share `editing` as value state; test validation rerenders as distinct from persisted edit identity. Use stable student/school IDs if later replacing hardcoded school names, with migration safeguards.

### Menu — `/menu` — REFINE

- **Audience/task:** parent deciding what to order and what food information exists. **Strengths:** five dish images, names, ingredients, four macros from database, shared image partial.
- **Hierarchy/communication:** at 390px the first dish begins around y=767 after two long centered qualification paragraphs. “Every dish here shows full nutrition information” overstates the completeness/provenance of four seeded macros. Render food/name first, then concise ingredients, structured nutrition and approved allergen statement/detail. Do not invent additional nutrient values.
- **Imagery/responsive:** source 800×800; at 390px image box is 348×70. At desktop it is 100×100 beside comparatively dense text. At 720px, two-column horizontal cards plus four nutrition columns produce measured overflow. A square thumbnail may stay compact on operational screens, but it must remain square; use content-based card stacking and a resilient two/four-column data grid.
- **Action/status:** no direct booking action or dish-detail route; avoid forcing memorization of dish name between Menu and Booking. A prefilled booking link is an **ADD** within existing booking semantics, with server validation; no invented ordering workflow.
- **RTL/accessibility:** meal data English; food alt names are present; unknown dishes fall back to an unnamed generic SVG. Allergen values absent from the entire view. **Motion:** hover zoom is decorative; no hover-only details currently exist. **Technical:** exact name lookup breaks imagery after renaming/translating dishes.

### Booking — `/booking` — REFINE

- **Audience/task:** parent selecting child, dish, plan and dates, reviewing total then confirming demo charge. **Strengths:** native radio cards, food thumbnails, clear checked state, server-calculated amounts, rebook defaults, no-school-day guard for monthly plan, explicit KNET demo qualifier.
- **Information/action:** keep child → dish → plan/date → total → confirm. Meal tiles show calories/protein but no ingredients/allergens, and no inline detail link. Provide a concise accessible detail path before confirmation; do not add more badges to each tile. Remove “Most parents choose this” in both dictionaries; no supporting analytics.
- **Visual/food:** `.picker-thumb` must be checked separately from Menu ratio changes; preserve square food where possible, avoid enlarging entire operational form. Monthly plan defaults selected, which must be transparent in summary; this is not consent to automatic renewal.
- **Responsive:** sticky confirm bar under 640px is useful but needs short-landscape keyboard and safe-area checks; do not cover fields/errors. Shared 912px nav failure. **RTL:** mixed English meals/ISO dates; recalculation replaces the total's `<bdi>` with plain text. **Accessibility:** meal/plan groups need fieldset/legend semantics; totals/errors need appropriate live status announcement, not animation alone.
- **Technical, HTTP verified:** `planType=invalid` accepted as single-style calculation; `days=31` accepted; nonexistent meal gives FK 500; malformed monthly date gives 500. A Friday single booking is accepted even though marketing says actual school days only. Ownership-invalid student returns an error correctly. Server needs enum, date, calendar/range, quantity, menu existence and finite-price validation before DB write. Validation errors do not preserve all selected booking values. POST success renders directly, enabling accidental refresh resubmission; add appropriate redirect/idempotency design.
- **Multi-day ambiguity:** single plan charges `rate × days` but dashboard/admin only count `startDate`; monthly uses one meal for the entire period and one status. Decide intended daily service allocation with product owner before migration. No new payment gateway is authorized by a visual refinement phase.

### History — `/history` — REFINE

- **Audience/task:** parent checking amount/status or cancelling an eligible booking. **Strengths:** real booking rows, clear status icons/text, desktop table/mobile cards, cancellation confirmation, ownership/status guard and transactional simulated refund.
- **Priority/communication:** preserve child + date + meal + amount + status; clarify period vs collection date, simulated refund and eligibility. No need for food photography to dominate a financial/status list. Current upcoming-status check is not a documented cutoff policy and can include past uncollected rows.
- **CTA/forms:** danger styling appropriately separates cancel; no success message confirms resulting refund on redirected History itself. Use one shared status/cancel row renderer to prevent table/card copy drift.
- **Responsive/RTL:** local table scrolling on tablet, cards ≤640px; header overflow shared. Table headers physically left-aligned, card values physically right-aligned; unisolated dates/KWD in some cells. **Accessibility/motion:** confirm dialog is functional; semantic column headers and a named scroll region need review; no need for reveal on records. **Technical:** full-booking cancellation vs partial monthly cancellation is unresolved business logic, not a styling decision.

### Profile — `/profile` — KEEP compact scope, REFINE feedback

- **Audience/task:** parent updating own contact details. **Strengths:** masked ID, narrow readable form, correctly associated name/email/phone labels, retained values on error and localized success.
- **Hierarchy/visual:** one action and modest form are appropriate; no food image, process narrative, large stats or additional sections needed. Keep optional email/phone behavior consistent with account requirements; register requires them but profile permits clearing them.
- **Responsive/RTL:** form fits measured widths apart from shared nav; email/telephone direction and input language need explicit treatment. **Accessibility:** add autocomplete and programmatic error/status references; reveal unnecessary. **Technical/content:** no password update despite Terms wording; do not add a security-sensitive feature solely to match unreviewed legal copy.

### Staff — `/staff` — REFINE

- **Audience/task:** staff meal booking represented under parent account credentials. **Strengths:** simple meal/date/price/action, empty booking state, DB-sourced daily rate.
- **Information/communication:** explain whose account is booking and what staff entitlement means; currently any logged-in parent can use it. No staff-role authorization or separate staff entity exists. Do not claim a separate employee system.
- **Food/forms:** hardcoded four meal options instead of DB list; no ingredient/allergen detail; labels for meal/date are unassociated. A modest shared dish selector/detail link is sufficient.
- **Status/CTA:** POST redirects to list; template's `success` is never meaningfully set; history shows date/price only, omitting meal/status. Add useful booking confirmation and meal identity.
- **Responsive/RTL:** shared nav; table has physical right alignment and English dish options. **Motion/accessibility:** no new imagery or marketing animation needed; labels and headers first. **Technical:** unvalidated menu/date at POST, global rate, no school-calendar association. Confirm scope and strengthen validation before enlarging UI.

### School Admin — `/school-admin/login`, `/school-admin/dashboard` — REFINE

- **Audience/task:** school operator inspecting their programme. **Strengths:** separate admin session identity, school-filtered data, actual counts/trend rows, responsive table/card view, bilingual strings.
- **Priority/communication:** keep today's meals, pending orders, active subscriptions and recent activity with explicit definitions. “Live data” means a current query at render, not auto-refresh. Trend counts booking start dates, not meals delivered or daily participation. No export, revenue reporting, setup control or operational collection control exists.
- **Visual/forms/food:** simple login and operational dashboard appropriate; avoid marketing imagery. Count-up starts at 0; remove. At ≤640px chart date labels disappear; 14 bars without visible dates are hard to interpret. Show range labels and accessible text/table summary.
- **Responsive/RTL:** no document overflow in measured sizes. At ≤480px shared `.app-user .lang-switch{display:none}` hides admin locale control, but admin has no drawer. Arabic dates, school and admin names remain English. **Accessibility:** H1→H3, chart tooltip-only dates, tiny chart counts; login errors need linking. **Technical:** same multi-day status/calendar semantics as parent dashboard; seeded examples are not evidence of school participation. Keep school scoping under regression tests.

## 6. Shared Design-System Blueprint

### Palette and “GREEN ANCHORS. YELLOW MOVES.”

The current tokens largely match the intended brand: forest `#163F31`, secondary forest `#1F604A`, cream `#FFFBF3`, mint `#EFF6F0`/`#E3F0E6`, leaf `#5E9D6E`, school yellow `#F2C94C`, ink `#18211D`. Excess yellow is not the dominant current problem. Repeated mint sections, pale green pills and uniformly weighted white cards make different content roles look alike.

| Semantic job | Exact application | Decision |
| --- | --- | --- |
| Forest anchors | Header/footer, trusted navigation, primary normal form actions, stable text and structure | KEEP |
| Cream / food-family warmth | Parent hero and food proof; avoid making every section mint | REFINE surface assignment, not a new palette |
| Mint supports | Group related background information and calm optional depth | REFINE; avoid a pale panel for every sentence |
| Yellow moves | One principal next step per context: registration after eligibility, selected plan/tap attention, possibly booking confirmation within its own task | REFINE selectively; never recolor all buttons or imply payment success |
| Leaf confirms | Collected/success state paired with icon and text | KEEP; booking scheduled and collection completed must not share indistinguishable state treatment |
| Error/warning | Error red and warning yellow status pairs | KEEP, with text/icon and sufficient contrast |

`btn-primary` is forest by default but becomes white in dark heroes/CTA contexts. Header Download App is white/high-weight while Login/Register are outlines. Standardize intent and surface variants explicitly so the same action's priority is not accidentally determined by ancestry. Retain `.btn-outline` consolidation already achieved; old `.btn-ghost` and `.btn-outline-lime` have no current view usage, so do not propose a redundant migration. Keep destructive actions visibly separate.

Measured token contrast (sRGB calculation, not an exhaustive rendered audit): white/forest 11.74:1; ink/yellow 10.39:1; muted/mint 5.55:1; secondary forest/white 7.42:1. Leaf/white is only 3.22:1, so it is not a general small-text pairing. Existing hero focus rule uses leaf-light on cream, ~1.60:1; add a light-hero focus variant. Color alone does not establish accessible states.

### Typography, spacing and component architecture

- **KEEP** Montserrat display/heading and Poppins English body pending no demonstrated reason to replace them. Use Cairo explicitly for Arabic body, controls and components, not merely on the root.
- Current base: body 16px/1.65; H1 32px, page mobile 25px; hero clamp 36–58px; H2 clamp 22–27px; H3 17px. Numerous local H3 overrides are 15px. Tags, metadata, nutrient labels and table headers often equal body size at 16px, so secondary content competes with primary names. Admin chart labels drop to 9.5px. Establish semantic type roles and readable hierarchy; do not make headings larger to simulate quality.
- Layout tokens exist: content 1120/1280px, gutter 24px, control height 44px, radii 10/16/24px. Section padding 76px drops to 56px ≤800px; many inner heroes add 64/76px and large text blocks. Use separate marketing/operational spacing rules and content-width constraints. Reduce perceived density by grouping meaning, not shrinking essential text.
- Only three small spacing tokens are actively introduced; **134 inline `style=` occurrences** remain in EJS. Extract repeated heading/card/action/form patterns into semantic classes as each component is touched. Retain dynamic chart `--pct` data styles; not every inline style is a defect.
- Keep distinct semantic cards (selectable meal, booking record, price choice) but consolidate shared border/radius/padding primitives. Generic benefit/role cards should become concise rows/maps where the content has no independent interaction.
- Use semantic status partials for Booked, Collected, Cancelled and action-required states; align table and card variants. Preserve icon + label, not badge proliferation.
- CSS is one 2,002-line file with 15 distinct width breakpoints and 11 `!important` occurrences. Most `!important` are reduced-motion protections; retain these. Two trustbar overrides relate to gated content, so removal requires a product decision and usage verification. Legacy aliases (`--ice-*`, `--cream-50`, `--ink-900`, `--red-*`) remain despite comments claiming canonical-only use. Consolidate aliases by actual call-site inventory, not a blind find/delete.
- Specificity/cascade examples: `.menu-featured .menu-thumb-wide` counteracts generic 70px mobile crop; `.hero-light .hero-inner` overrides lower-specificity generic 960px grid; dark hero button rules require light hero overrides. Replace these collisions with explicit component variants before adding further patches.
- `.app-flow` in Parents has no base layout styles; only arrow RTL selectors remain. Home uses `.app-steps`. Consolidate into a single intentional journey primitive and remove the obsolete Parents usage after migration. Do not declare unused-looking selectors dead from a text search alone; dynamic classes, pseudo-content and gated markup require runtime checks.

### Food assets, data and hierarchy

| Asset group | Verified dimensions / bytes | Current presentation | Plan |
| --- | --- | --- | --- |
| Hero desktop WebP/PNG | Both 1792×2400; 733,784 / 4,989,423 bytes | Desktop cover-fit portrait; source comments incorrectly say 2752×1536 landscape | Correct source documentation; define intended ratio/height, add appropriate renditions without destructive crop |
| Hero mobile WebP/PNG | Both 672×900; 51,804 / 963,562 bytes | Selected ≤900px; near 3:4 | KEEP aspect; constrain tablet composition rather than stretching portrait to full width |
| Five dish WebPs | All 800×800; 54,374–97,218 bytes | Home square; Parents feature square on mobile, 180px desktop; Menu 100px desktop / 70px-high mobile strip | Preserve 1:1; responsive square sizes; no evidence justifies wide strip cropping |
| Dish PNG fallbacks | All 800×800; 221,887–336,883 bytes | `<picture>` fallback | KEEP fallback if required; optimize via existing assets pipeline only |

Source image provenance is **unverified**. `dish-image.ejs` and `server.js` explicitly call dishes placeholder illustrations pending real food photography; CSS elsewhere calls images real photography. Do not publish “real customer photography,” or assume the image proves serving composition, freshness, portion or preparation. The client must identify approved dish/hero assets. Current image style is warm and food-centered; preserve that useful direction while validating authenticity.

Dish names, ingredients and macros come from `seed.json`/SQLite. All five have the same four `allergenFree` tokens. These are seeded values, not a verified allergen matrix or nutrition analysis. No `contains`/`may contain` model, approval timestamp, provenance or school/day availability model exists. Add only approved fields/content and scope; do not infer absent allergens from ingredient text. Source name “Arabiatta” should be corrected only with approved dish naming, and the exact-name image lookup must be decoupled before renaming.

Parent-facing food detail should use: image → meal name → concise ingredients → structured nutrition → approved allergen information, available without hover or mandatory animation. Compact operational variants must retain the same underlying data. Food-confidence communication must not be replaced by a long legal paragraph, but essential qualifications must stay adjacent and understandable.

### Kuwait and regional fit

Keep KWD precision, Kuwait school context, familiar Civil ID terminology, Friday/Saturday calendar logic as an explicitly illustrative seed, warm food lighting, cream surfaces and restrained yellow. Current imagery shows a generic school setting; it does not verify a Kuwaiti school/customer or represent the entire audience. Prefer approved local school/family/food material when supplied, without stereotyping or flag-themed decoration. Arabic typography, authentic translated dish content, bidi-safe IDs/phone/currency and equal action access are higher-value regional improvements than more motifs or colors.

## 7. Motion Blueprint

| Current system | Classification | Finding | Decision / intended behavior |
| --- | --- | --- | --- |
| `data-reveal` observer + grouped 70ms stagger (cap 350ms) | TRANSITIONAL | Adds delay to ordinary copy/forms; 1.2s safety timer forces everything visible, undermining later scroll sequencing | CONSOLIDATE: immediate critical food/forms/status; limited section transition where it helps orientation |
| Hero child choreography + parent reveal | TRANSITIONAL | Overlapping entrance systems can hide text initially and compound timing | CONSOLIDATE one optional entrance; never block first meaningful content |
| Hero parallax | AMBIENT | Passive/rAF-throttled, max 28px; still unnecessary scroll geometry work for food comprehension | REMOVE |
| Hero glow sweep | AMBIENT | Decoration across food image | REMOVE |
| Magnetic Register/store badges | AMBIENT | Fine-pointer-only and reduced-motion guarded, but moving action targets add no clarity; bounds read on each mousemove | REMOVE |
| Food/card/button hover lift/zoom | FEEDBACK | Useful for actual selectable controls; informational role cards appear clickable | REFINE to real actions; subtle static food remains understandable on touch |
| Tap card/ripple/toast/check loop, 3.2 seconds | FUNCTIONAL | Explains sequence, but completion vanishes/restarts; multiple ring animation rules compete (`pulse` overrides contact-scale) | REFINE once on deliberate reveal/play, hold confirmation, accessible replay optional |
| Success/check animation | FEEDBACK | Appropriate post-action confirmation | KEEP short one-shot with readable persistent text; verify SVG pathLength placement (currently some tap examples put it on SVG rather than path) |
| Booking total pulse | FEEDBACK | Connected to recalculation; uses forced `offsetWidth` to restart | KEEP meaning, REFINE announcement and avoid forced layout if easy; no new library |
| Submit disabling/spinner | FEEDBACK | Confirmation handlers run first; generic validation and generic submit listeners guard against duplicate disabling | KEEP, CONSOLIDATE form-state code; test back/forward cache restoring disabled buttons |
| Count-up stats | AMBIENT | Real counts render as 0 and animate for 900ms; watchdog doesn't fix no-JS output | REMOVE from operational data; server-render final number |
| Native MPA view-transition CSS | TRANSITIONAL | Progressive enhancement, not client router | KEEP only if quick/nonblocking; no new page-transition framework |
| FAQ grid-row expand | FUNCTIONAL | No scrollHeight loop; aria-expanded updated, but collapsed content semantics incomplete | REFINE keyboard/panel relationship/no-JS readability |
| Nav/dropdown opacity and movement | FUNCTIONAL | Closed opacity/pointer-events leaves elements focusable; body lock not released on desktop breakpoint changes | REFINE focus/state lifecycle before polishing animation |
| Admin live dot | AMBIENT | Pulsing suggests continuously updating data although values are request snapshots | REMOVE/replace with truthful last-updated or snapshot label |

Reduced-motion support is substantial: JS initial matchMedia guard, global CSS durations, specific static tap confirmation, disabled hover movement, no-JS reveal style. Gaps: JS preference is read once and not updated; runtime preference switching is not handled; essential values must be correct without JS; observed reduced-motion behavior still requires an emulated/real-device run. Do not add an animation dependency.

### Signature interaction decisions

| Candidate | Decision | Reason and boundary |
| --- | --- | --- |
| Meal reveal | **REFINE EXISTING** | Existing image/featured dish/detail/picker components supply most of it. Make information sequential and accessible, with optional disclosure only for depth; no hover gate, spinning carousel or new reveal engine |
| Food confidence: Nuts/Shellfish/Sesame/Soy | **BUILD** | Build one compact semantic component only after section 11 wording/scope resolution. Four labels/icons may support the exact client statement; no shield, medical-safe seal, cross-contamination claim or automatic matching |
| Tap → Notified | **REFINE EXISTING** | Existing CSS demo already communicates it. Hold final confirmation, identify it as illustrative, align all labels/timing/RTL and separate collection from eating |
| Connected platform | **REFINE EXISTING** | Existing six-step partial and About role grouping can become a concise shared relationship diagram. Preserve distinct parent/school/caterer responsibilities and label nonimplemented flows; do not build a fake live network dashboard |

## 8. Responsive Blueprint

### Verified coverage

All of these widths were measured on 22 English contexts and 20 Arabic contexts (Arabic excludes unavailable Terms/Privacy):

```text
Mobile:  320 344 360 375 390 393 402 412 428 430 440 480 540 600 640 667 720
Tablet:  768 800 810 820 834 853 900 912 960 1024 1080 1114 1180 1194
Desktop: 1280 1366 1440
```

Portrait sweep height was 900px; representative visual inspections also used 390×844 and 1024×768. A final 252-measurement sweep covered all 42 EN/AR contexts at landscape 667×375 and 1024×768, exact range edges 767×900 and 1199×900, and wide desktops 1600×900 and 1920×1080. Only English Parents overflowed in that additional sweep (160px at 667 and 110px at 767). Browser zoom/text enlargement, screen keyboards and real-device touch behavior remain final regression targets; ranges were sampled extensively, not continuously.

| Observed issue | Evidence / cause | Architecture change |
| --- | --- | --- |
| Parents app strip | EN overflow at every sampled width 320–960; 390 viewport has scrollWidth 814. Raw keys plus no `.app-flow` base layout create unbreakable inline run | Consolidate translated journey data and shared wrapping/stacking structure; do not mask with overflow hidden |
| Home tablet hero | ~1,622px tall at width 900; ~724px at 912. Full-width 3:4 image below 901px; more specific light-hero grid differs from generic 960px breakpoint | Give hero explicit content/image tracks with an intermediate tablet composition and bounded media size. Preserve source aspect; no separate device patches |
| Parent app navigation | EN product document overflow 35–36px at 912; screenshot clips Log out; `.app-user` right edge ~948. Drawer only through 900 | Determine compact-nav threshold from actual localized content width; stop squeezing six links + actions into insufficient track |
| AR compact header | ~3px document overflow at 320 across parent pages | Min-width/gap/padding budget and localized button widths; preserve accessible targets |
| Small public CTA width | At 320px Home “Explore the menu experience” ends at x322, Schools “See the full parent experience” ends at x324, both starting at x24 | `.btn` nowrap/flex-shrink:0 exceeds available content width; allow intentional label wrapping within available width, preserving target size |
| Menu mobile crop | At 390, each `.menu-thumb-wide` is 348×70; square source | Separate square media sizing from horizontal/stacked card layout; remove fixed 70px strip rule |
| Menu middle widths | +6px page overflow at 720; `.grid-2` becomes two columns above 700 while each horizontal card retains 100px image and 4-up macros | Content-based card composition; minmax(0,1fr), minimum readable data track, two-column macro fallback based on available card width |
| Caterer queue lost | `.data-table-view{display:none}` ≤640; no `.data-card-view` in Caterers | Scope hide behavior to components that actually supply a mobile alternative; one consistent data rendering contract |
| Feature cards cramped | Five columns begin at 1024; ~182px/card and 284px height; 10 pill backgrounds cause multiline chunks | Use intrinsic minimum readable role width or compact role rows; remove ornamental pills before inventing breakpoints |
| Admin language absent | `.app-user .lang-switch` hidden ≤480 for all app headers; admin has no drawer | Shared header variant must explicitly provide locale action at each size |
| Tables vs page overflow | History/admin correctly contain tablet scrolling and use cards ≤640 | KEEP; ensure named keyboard-scrollable region and synchronized content |

The exact-width sweep found no additional positive document scrollWidth overflow on other sampled public contexts or admin pages. This does **not** clear internal clipping, RTL negative-side overflow, hidden data or semantic failures. Arabic Parents still has raw English keys even when its punctuation/bidi wrapping avoids the English overflow metric. `html{overflow-x:hidden}` is a safety net that currently hides evidence; fix components first, then evaluate whether the root clip is needed.

Avoid a media query for every width. Establish component capacity and a small consistent set of composition changes: compact/full navigation, stacked/split hero, square food detail variants, readable role map, table/card record view. Test on both sides of every chosen breakpoint plus the supplied width set. When a selector is meant only for Home, scope it there; the current ≤900 `.hero-copy > …` rules reach other heroes.

## 9. RTL Blueprint

1. **Typography:** Rendered Arabic body and paragraph computed font is `Poppins, Arial, sans-serif`; `[dir=rtl]` root Cairo is overridden by explicit body font. Set Arabic body/control/component families consistently, including inline Montserrat call sites, metadata, food headings and store badges. Keep Arabic line-height/normal letter spacing work.
2. **Locale continuity:** Add quiet language controls to parent Login/Register/Forgot Password. Preserve language through login/logout, auth-required redirects and 404 recovery where intended; currently `/logout`, `requireAuth` and 404 links return English destinations. Fix Home supported-school Contact link to `/ar/contact` in Arabic. Contact and Caterers form actions are hardcoded English despite registered Arabic POST routes; make them locale-aware as Schools already is, so errors/success stay in Arabic.
3. **Admin mobile:** retain a visible locale action; there is no drawer fallback. School-admin Login already has a language switch and should retain it.
4. **Translated product data:** add approved Arabic dish name/ingredients/tag content independently of stable dish IDs/image IDs. Keep school proper names as client-approved; do not machine-invent food/allergen translations. Legacy notification fallback remains English; migrate params or provide an honest fallback strategy.
5. **Directional layout:** replace physical table header alignment, data-card value alignment, image corner radii, hero padding/toast offsets and store-badge label alignment with logical intent where applicable. Do not blindly mirror photographs, numerals, card text, checkmarks or phone numbers.
6. **Journeys:** preserve DOM reading sequence; mirror directional connectors only. Existing `.flow-caption-arrow` and `.app-flow-arrow` flips are good, but check mobile school-check/quiet-link chevrons and role-flow connectors independently. Reader labels `MEAL READER · GATE 2` and `Ahmed A.` are hardcoded in illustrative visual markup.
7. **Bidi data:** use isolated LTR treatment for Civil IDs, telephone, email, ISO dates and currency fragments; localized textual dates should use locale-aware formatters with an explicit intended timezone. Current `fmtDate`/`fmtTime` use en-GB and host timezone; date comparisons use UTC ISO days. Define Kuwait school-day/time behavior once.
8. **Forms/tables/notifications:** use associated labels/error descriptions in Arabic too; test long errors, select choices, statuses and names. Avoid title-only allergy notes. Preserve same required fields and consent behavior across locales.
9. **Legal:** Arabic links currently lead to English Terms/Privacy. Indicate language clearly until reviewed translations exist. Do not create translated liability language independently.
10. **Verification:** 825 matching dictionary keys are insufficient; add template-key resolution and rendered raw-key checks. The four missing Parents app keys are absent from both dictionaries. Compare wording meaning as well as key parity; e.g. Arabic Parents menu heading uses “موثّقة” (documented) for unverified seeded nutrition, and Parents FAQ pointer omits the English allergy/cancellation emphasis.

## 10. Accessibility / Performance Blueprint

### Accessibility: concrete repairs and acceptance

| Finding | Repair / acceptance |
| --- | --- |
| Closed mobile nav focusable | Keyboard test: Tab from closed Menu button focused invisible `siteLinksMobileClose` while panel opacity was 0. Use hidden/inert/visibility lifecycle; move focus into open menu, contain modal focus, return it on close, restore scroll on breakpoint change |
| Notification dropdown same opacity pattern | Apply appropriate hidden semantics and Escape/focus behavior without blindly treating every popover as a modal; bell needs a meaningful localized name, not just unread count |
| Broken skip links | Add `<main id="main-content">` to Caterers, About, Contact, Privacy, Terms; verify focus/scroll destination. Auth shells have main but no skip-link dependency |
| Unassociated student/staff labels | Add stable IDs/for; render useful optional/required indicators. Test with accessible-name inspection |
| Visual-only validation | Error IDs + `aria-describedby`, `aria-invalid`, error summary/focus where appropriate, status/live region for success and total updates. Civil ID hint association exists; preserve it |
| Consent feedback | Keep Terms unchecked and required; communicate missing consent visibly and programmatically; do not auto-accept or use color alone |
| Radio grouping | Add fieldsets/legends for meal/plan; preserve native radio keyboard behavior and clear selection |
| FAQ/legal collapse | Connect button/panel IDs, aria-controls and expanded state; remove collapsed content from focus/accessibility flow appropriately; retain no-JS access to all important text |
| Heading hierarchy | Correct dashboard/admin H1→H3 and food H4 use where not a real subsection; footer hierarchy should not imply unrelated document structure |
| Allergy tooltip | Replace shield/check and title-only note with truthful, visible/reference information accessible to touch and keyboard; no safety implication |
| Focus contrast | Light hero currently inherits pale ring (~1.6:1 against cream); use forest ring on light surfaces and light ring on dark surfaces |
| Touch targets | Main `.btn` min-height 44px and bell 44×44 are useful; notification mark-read button is only 10×10px in CSS with no enlarged hit area. Enlarge its interactive area while keeping the visual dot small; measure language/password controls too |
| Chart/data access | Keep actual numbers server-rendered; provide chart date/range summary when labels hide; text/table equivalent; useful column headers and scroll-region naming |
| Reduced motion/no JS | Final figures, food, forms and success content must be readable without animation or JS; reduced-motion static tap state retained |

No full automated WCAG score or screen-reader pass was performed. Source-level and rendered defects above are sufficient to plan repairs. Phase 3 must run keyboard traversal of every route, form errors and success, locale changes, 200% zoom/large text, reduced motion, and actual assistive technology where available.

### Performance evidence and plan

| Item | Measured/verified | Implication |
| --- | --- | --- |
| Shared CSS | 124,219 bytes raw; ~32,063 gzip bytes computed locally; one global file | Consolidate repeated patterns; no need for a new CSS build system solely for audit |
| `motion.js` | 20,619 raw / ~6,643 gzip; includes validation/forms as well as animation | Separate responsibilities for maintenance; conditionally initialize by elements, avoid breaking all forms when animation changes |
| nav / notifications JS | 3,149 / 767 raw bytes; ~1,220 / 336 gzip | Already small; correctness matters more than byte shaving |
| Hero image | Desktop WebP ~734KB, PNG ~4.99MB; mobile WebP ~52KB | Add suitable desktop/intermediate renditions; measure actual loading/LCP after layout stabilizes; keep high-priority hero |
| Dish images | Single 800px asset per dish; WebP + PNG picture, explicit 800×800 attributes, async decode, mostly lazy | Add `srcset`/`sizes` for compact thumbnails if justified; preserve aspect and useful detail |
| Hero layout reservation | Hero img lacks explicit dimensions; CSS provides some min-height/aspect behavior | Reserve intended geometry explicitly; measure CLS rather than assuming zero shift |
| Fonts | 3 families, 9 requested weight variants across all pages; preconnect + display=swap | Verify actual font files/weights per locale; request only necessary families; avoid late Arabic fallback changes |
| Cache/compression | compression middleware; static one-day max-age + ETag; CSS `?v=33`, JS unversioned | Preserve revalidation; adopt consistent version strategy if assets change, not stale long-lived immutable URLs |
| Motion work | One passive/rAF scroll parallax; pointer geometry reads; count-up RAFs; booking forced layout | Remove ambient work; isolate necessary recalculation; no evidence of an infinite JS polling loop |
| Network/live data | No notification push/polling transport | Don't optimize nonexistent realtime machinery or market it as connected |

These are source/asset measurements, not field performance scores. Before declaring performance improvement, record browser network, LCP/CLS/INP-relevant behavior under a documented throttle/device profile. Do not download new third-party media or add dependencies without a concrete need.

### JavaScript/system architecture follow-through

`motion.js` initializes once on DOMContentLoaded: confirm handlers, reveals, counts, FAQ, Civil ID validation, generic validation, submit feedback, parallax, magnets, password toggles and footer active links. `nav.js` shares one implementation across public/parent nav; `notifications.js` is a separate popover implementation. Booking embeds its calculation and translated fragments inline. This is an MPA, so there is no demonstrated accumulating SPA listener leak. Two submit listeners intentionally coordinate via `defaultPrevented`/disabled checks; consolidate carefully rather than claiming duplicate submissions solely from listener count.

Split form validation/state from decorative motion in the existing plain-JS style. Share disclosure lifecycle only where semantics match. Handle resize/locale/back-forward restoration and reduced-motion preference changes. Render correct initial values server-side. Keep server validation authoritative and add the booking guards proven missing. Avoid an unrequested frontend rewrite.

Production-readiness concerns, distinct from visual scope: default in-memory sessions and no configured secure cookie/proxy deployment contract; CSP disabled for inline scripts/styles; login session not regenerated after authentication; raw reset identifiers and request cookies can enter logging; register/reset/contact lack equivalent abuse limits; GET logout; default error handler may expose development details on invalid requests. Assess these in an agreed deployment context and apply targeted controls before a real launch. A passing masking suite does not establish complete privacy/security compliance.

## 11. Content / Legal / Allergen Conflicts

### Required statement and unresolved scope

Client-provided, verified as an instruction in this brief:

> Our meals are free from any kind of Nuts, Shellfish, Sesame & Soy.

Preserve that exact meaning. This statement does **not** establish zero cross-contamination, medical safety, suitability for every allergy, automated allergy matching, complete allergen elimination, certification or legal allocation of responsibility. None of those may be inferred. It is not currently displayed verbatim in the audited public/product views.

### Complete occurrence families inspected

The audit searched current views, EN/AR dictionaries, seed data, schema, helpers and route/data code for allergy/allergen/nut/shellfish/sesame/soy/safe/guarantee/dietary/fresh/preparation/delivery wording, and inspected corresponding Arabic strings. Database `prepare()` and words such as “minutes” are technical/search false positives, not food claims. Source comments and older docs were compared but not treated as proof.

| Location / source keys | Existing meaning / discrepancy | Required decision and owner |
| --- | --- | --- |
| Home: `home.confidence.item1`, `home.menuProof.intro`, `.footnote`, `home.faq.q3/a3`; `meta.parents.description` | Per-dish information; expressly not blanket guarantee; “real” data despite seed provenance. No actual allergens rendered | Client/caterer approve global scope and dish data; product implement display; legal align qualifications |
| Parents: `parents.menu.heading/intro/allergenPill/footnote`, `parents.faq.body` | Tells parent to check each dish before booking; full detail claimed after login. Food cards omit allergenFree | Same; do not send parent to nonexistent detail |
| Menu: `menu.heading/intro/allergenBanner/commitment1/commitment2`, `views/menu.ejs` | Seven special dietary examples, per-preparation disclaimer; not blanket claim; macros same base recipe for each child | Four supplied exclusions must not silently expand to egg/gluten/lactose; confirm source, recipe scope and presentation |
| Seed + schema: `seed.json.menuItems[*].allergenFree`, `menu_items.allergen_free`, `db.js.mapMenuItem` | Every dish, including Regular Meal, stores nut/shellfish/sesame/soy; field is mapped but unused in templates | Seed records corroborate configuration intent, not food safety; approve production dataset and unknown-data states |
| Features: `featuresSection.studentsChip1` | “Dish-Level Allergen Info”; all capabilities described as live | Correct capability/data claim and role assignment |
| Shared process: `howItWorksSection.step3Body` | Allergy notes passed with routed order | Notes persist on student; no caterer transport/queue verified. Operations must confirm any external handoff |
| Schools: `schools.problem.item1Body`, `studentIdentification.item3/body` | Reference notes and claim of information carried with each order | Retain reference-note capability; qualify handoff until verified |
| Students: `students.labelAllergies/placeholderAllergies/hintAllergies/allergiesTitle/hasAllergiesLabel`, errors | Optional free text, peanut/shellfish example, reference-only warning, title tooltip/shield | No automated matching; don't delete notes merely because four exclusions are supplied; improve truthful accessible display |
| Booking / Dashboard / History / Staff / Admin | No dish allergen detail; Booking has food selection without warning/matching logic; no separate staff allergy mechanism | Add approved food detail access; no automatic blocking rules without an explicitly designed/verified requirement |
| About: `about.hero.lede` | Managing dietary preferences; “healthy and nutritious”; real-time connection | Confirm factual scope; no health outcomes or nutrition certifications invented |
| Contact: `contact.pathways.parentBody` | Allergy support topic | KEEP topic; ensure actual contact path is truthful |
| Terms `views/terms.ejs:41–45` | Caterer prepares/delivers; Evo does not independently verify ingredients/claims; special dietary standards described outside Regular Meal; no guarantees | Direct scope conflict with client statement + all Regular Meal seed exclusions. Stakeholder/legal confirmation required; do not decide legal meaning here |
| Privacy `views/privacy.ejs` | References caterer data sharing, security safeguards and inability to guarantee absolute security; no four-allergen meal statement | No direct food-scope promise found; align sharing/contact language with actual operations, not allergy guarantees |
| Arabic corresponding strings | Same per-dish/nonblanket disclaimers; `menu.commitment1` also lists egg/gluten/lactose; client's exact four-item global statement absent. Separate Arabic keyword scan also finds Contact `بأمان تام` (complete security), stronger than the English “securely” | Qualified Arabic translator + client/legal confirm semantic parity, not literal English substitution; remove unjustified absolute security implication |

**Resolution needed:** Who is the speaker of “our meals”; which menu/programme/caterer/time period is covered; what approved source supports the statement and production dish data; how should the exact statement coexist with Terms; what is the approved Arabic wording? These are unanswered scope questions, not reasons to invent an interpretation. Independent unblocked component fixes can proceed while these are resolved. Do not publish stronger safety copy or contradictory disclaimers as a temporary compromise.

### Freshness and preparation claims

| Claim | Classification | Evidence and allowed treatment |
| --- | --- | --- |
| Client supplied four exclusions | VERIFIED | Verified as supplied client wording only; no extra safety meaning |
| “Freshly made” / fresh hot lunch | UNSUPPORTED | `home.hero.headlinePre/imgAlt`, Arabic equivalents; image and existing copy are not preparation evidence. Confirm caterer process before retaining as factual promise |
| “Freshly prepared” as a production standard | UNSUPPORTED | No operational sourcing/preparation record or supplied client statement found; no permission to introduce it |
| Caterer prepares/packages/delivers; Evo connects | AMBIGUOUS | Consistent described service model in Terms/footer/process, but no verified kitchen/dispatch integration or operational evidence in repo. Can describe platform intent with approved wording; don't claim observed fulfilment |
| Delivered at school | AMBIGUOUS | School association and Terms describe it; no delivery tracking/data confirms physical delivery |
| Exact demand preparation | UNSUPPORTED as live capability here | Caterer page/process asserts actual orders reach kitchen; no caterer route/transport found |
| “No canned food” | UNSUPPORTED | No explicit verified client/source evidence; do not add |
| Grade-matched portions/protein | UNSUPPORTED as functionality | One macro set per dish, no grade-based portion logic. Current `booking.agePortionHint` only says “Booking for {className}”; older docs claiming the old grade-portion statement remains are stale |
| Nutrient numbers shown in UI | VERIFIED as seeded values, not food facts | Five recipes/macros in seed/database; require approved nutritional source before calling real/verified/complete |

### Other conflicts requiring explicit treatment

| Conflict | Verified current evidence | Next step |
| --- | --- | --- |
| Collection vs eating | Home confidence item4 says notification when “they've eaten”; About anchor; only collection status exists | Use collected/collection consistently; emotional concern can remain without claiming consumption evidence |
| Payment/refund reality | Public FAQ/Parents says KNET and full refund; Booking/README say simulated; no gateway dependency/call | Demo qualifier consistent across promises and success; live integration separately scoped |
| Calendar reality | Marketing “actual calendar”; db.js generates common Sun–Thu calendar with offset holidays for three schools | Label demo configuration; obtain school-confirmed calendars and owners |
| Supported schools / partnerships | Three names repeated in Home, Students, validator, seed/calendar | Confirm approved school list; configuration alone is not partnership evidence |
| School preview stats | 312, 648, 6,140, 14 and 87% are hardcoded sample display, not analytics | Remove unsupported social-proof impression; show only clearly identified implemented-state examples |
| Popularity and setup speed | “Most parents choose this”; “Takes about two minutes” | Remove until measured evidence supplied |
| Term/month plan | Parents says once a term, backend monthly ends at calendar month | Use actual period terminology; confirm intended programme arrangement |
| Privacy/payment storage | FAQ says card details never stored; Privacy says parts may be encrypted/retained | Legal/product approve one accurate account of actual integration/data handling |
| Contact privacy | Form says never shared beyond team; Privacy describes service-provider sharing | Confirm actual destination/process; no independent legal conclusion |
| Contact delivery | POST logs metadata and discards message; success route suggests sent | Honest simulated outcome or implement agreed persistent/delivery mechanism |
| Inquiry response SLA | School/caterer copy promises one business day; DB stores inquiry only | Confirm staffed owner/SLA; no operational evidence in this repository |
| Reset | Same generic response for known/unknown valid ID, but “sent” despite no email | Preserve neutral response and demo limitation through success |
| Company story | Boardroom/feedback origin assertions; no source of founding story | Client verify or replace with nonhistorical mission/approach |
| Legal capabilities | Terms username choice/password change versus Civil ID login/no password-change route | Legal/product reconciliation; do not rewrite obligations unaided |
| Contact details/app listings | Footer mail/phone/location/store URLs exist | Existence in source verified; external accuracy, listing availability and feature parity not verified in this local audit |
| Session description | README suggests SQLite-backed login sessions | express-session MemoryStore actually used; correct technical documentation |
| Source commentary | CSS claims landscape desktop hero; actual file portrait; old claims registry says displayed allergens | Correct comments/docs with implementation; don't inherit stale “verified” labels |

No statistics, testimonials, customer/school counts, health outcomes, certifications, partnerships or legal interpretations were added by this audit.

## 12. Phase 2 Exact Implementation Order

This is the ordered next-phase plan, not authorization to perform it during Phase 1. Make changes in small reviewable slices on verified `main`; preserve user work. No branch/worktree/PR/force push.

1. **Restore source-control context and pin baseline.** Resolve the documented Git blocker, run branch/status/HEAD/origin checks, identify user changes. Run the existing suite and temporary-db start again. Do not assume this source fingerprint is still current.
2. **Resolve public truth contract.** Obtain client/food/legal decisions for section 11. Remove or qualify demonstrably unsupported live functionality, popularity, seed calendars/stats and sent-email claims. Preserve precise client statement without extending its scope. Block only dependent allergen/legal publication, not independent correctness fixes.
3. **Repair booking/staff input boundaries before visual work.** Validate menu IDs, ownership, plan enum, finite allowed days/date/price and intended calendar rules. Return useful localized 4xx/form errors instead of 500. Preserve input selections. Add node:test HTTP cases for invalid plan/date/menu/day and ownership; rerun pricing tests. Agree daily booking semantics before any migration.
4. **Fix locale regressions and route continuity.** Replace missing Parents app keys/obsolete flow, audit all referenced keys, repair Arabic Contact/return links. Add parent auth and mobile admin language access; correct body/control Cairo rule. Test both locales immediately.
5. **Repair shared navigation and landmarks.** Closed-menu inert/hidden state, focus entry/containment/return, Escape, body unlock on breakpoint crossing. Fix compact header capacity in EN/AR; add five missing main targets. Verify keyboard, 320px, 900/912/960px, and 1279/1280 boundary.
6. **Repair form feedback primitives.** Associate student/staff labels, add field/group/error IDs and consent message, clarify Civil ID/password guidance. Retain unchecked required consent and server enforcement. Keep reset/contact success truthful. Test invalid and successful states without sending external communications.
7. **Consolidate food component and data contract.** Stable approved display shape: square image/name/ingredients/macros/allergens/provenance state. Remove Menu 70px crop and narrow-grid overflow; preserve operational compactness. Use approved wording/data only; link meal information into booking without inventing safety logic.
8. **Repair shared record presentation.** Scope table-to-card hiding, restore Caterers queue on mobile, align table/card status rendering and RTL headings. Verify actual content survives at 640/667px.
9. **Consolidate tokens/type/CTA/surfaces by component.** Explicit surface-aware button variants, readable text hierarchy, logical spacing, light-surface focus. Extract repeated inline patterns as touched; no broad deletion based on age. No palette restart.
10. **Refine Parents first.** Apply section 4 sequence: food and approved food information → booking/payment → collection confirmation → action. Consolidate repeated collection/app stories and clarify plan period. Verify at mobile/tablet/desktop and Arabic before copying patterns elsewhere.
11. **Refine Home from those proven components.** Bound tablet portrait height, simplify hero action priority, make meal proof earlier, keep school check reachable, consolidate repeated B2B/closing CTAs. Preserve warm image/cream/forest identity and disabled stats gate.
12. **Refine Schools and Caterers.** Show implemented operational concepts, visible examples at all widths, concise responsibility flow and one inquiry path. Replace fictional preview metrics and unsupported queue/reporting assertions. Confirm SLA separately.
13. **Consolidate Features and How It Works.** Verified role-capability map, intrinsic readable layout, parent journey first, role-specific destinations and optional cross-role explanation. Remove redundant pill/card/number decoration.
14. **Refine About, Contact and legal entry points.** Truthful story/scope, shorter support path, honest outcome, reviewed conflict updates only. Clearly identify English legal destination until Arabic is approved.
15. **Reduce ambient motion and preserve functional feedback.** Remove magnets/parallax/glow; eliminate compounded reveals on critical information; refine Tap → Notified to a held completion. Keep submit/selection/price/collapse feedback and reduced-motion static state.
16. **Phase 2 acceptance pass.** Existing tests + targeted new behavior tests; exact width matrix in both locales, landscape, breakpoint neighbors, keyboard/closed drawer, form error/success, no raw keys, no hidden queue, square images, approved claims. Inspect browser console and asset requests. Record unresolved external content approvals explicitly; no false “complete” declaration for blocked dependent work.

**Phase 2 exit:** parent public journey is truthful and clear; known component regressions and minimum validation/accessibility faults are fixed; no speculative operational functionality added. The code still may be a demo—do not relabel it production-ready.

## 13. Phase 3 Exact Implementation Order

1. **Reverify current main and Phase 2 results.** Re-run baseline and inspect current source; use this blueprint as intent, not frozen line numbers. Resolve any remaining publication-blocking content decisions first.
2. **Define daily service/collection semantics with stakeholders.** Decide one-day/multi-day/monthly allocation, weekend/holiday behavior, collection per service date, cancellation/refund cutoff and partial-period behavior. Distinguish plan, booking, service day, collection event and notification without inventing behavior.
3. **Implement the agreed data correction with migrations and transactions.** Preserve historical rows; add daily records/events only as agreed. Test monthly rollover, holidays, repeat taps/requests, duplicate submissions, ownership and cancellation consistency. No destructive reseed of user data.
4. **Unify calendar/time/pricing and server/client summary.** Explicit Kuwait school-day/time interpretation, bounded calendar horizon, approved calendars, same calculation contract in UI and server. Correct active counts/single-day coverage. Use server-rendered valid initial totals and safe submit/idempotency behavior.
5. **Refine Dashboard around today's children.** Status first, action second, subscription details next; verify meal/status/notification consistency. Replace zero-count animation with actual values. Share notification presentation and truthful update timing.
6. **Refine Students, Menu and Booking together.** Existing-child management before add form, accessible reference notes, translated approved food detail, stable image IDs, prefilled menu-to-booking path and preserved selections. No allergy matching unless separately specified and verified.
7. **Refine History, Profile and Staff.** Clear cancellation/confirmation outcomes, linked errors, consistent contact requirements, staff role/scope validation, DB-backed meal choices and useful staff booking records. Keep operational density.
8. **Refine School Admin using actual supported tasks.** Correct daily metrics/trend semantics, static accurate counts, readable accessible chart/date summary, school scoping, mobile locale access. Add no revenue/export/configuration feature solely because old marketing promised it.
9. **Complete bilingual data and reviewed legal parity.** Approved Arabic food/allergen content, notification params/fallbacks, localized dates/units and bidi isolation; reviewed Terms/Privacy routes. Check meaning and actions, not only string count.
10. **Apply deployment hardening appropriate to agreed environment.** Session persistence/rotation, cookie/proxy configuration, log redaction, abuse limits, CSP-compatible inline-code strategy and safe production error handling. Live KNET, reader, email/push/CRM and caterer integrations are separate scoped work requiring credentials/contracts; do not silently build them as visual refinement.
11. **Optimize measured bottlenecks.** Right-size hero/dish assets, font loading by locale, explicit geometry and asset versioning; remove proven unused styles/listeners only after coverage. Measure network/rendering under a documented profile; compare results, never invent scores.
12. **Run final cross-system QA.** Pricing/masking + added business tests; happy/invalid/empty/success/cancel/renew flows; every audited page in EN/AR; supplied widths, 767/768, 1199/1200, 1279/1280, >1440, landscape, zoom, keyboard, reduced motion and representative real mobile engines. Confirm no unsupported claims or image crops. Review actual diff and document residual external blockers.
13. **Handoff and Git synchronization.** Only in a verified Git checkout on main: review intentional changes, commit clear scoped work, push normally to origin/main and compare local/remote hashes after fetching. If metadata/access is still absent, report the blocker instead of claiming synchronization.

### Phase 1 exit record

| Criterion | Status |
| --- | --- |
| Current architecture / actual routes mapped | Complete for selected source folder |
| Test/start baseline known | Complete; 21 existing tests pass; no configured lint/build |
| Pages rendered and source inspected | Complete for all requested existing routes/locales; external app/integrations not claimed |
| Responsive strategy inspected | Complete: exact 34-width EN/AR sweep + landscape and root-cause findings |
| RTL / design system / motion inspected | Complete; source vs rendered vs untested preference behavior distinguished |
| Food/allergen/freshness claims audited | Complete; unresolved factual/legal decisions explicitly listed |
| Priority matrix / Phase 2 / Phase 3 order | Complete in this document |
| Required `docs/evo-phase-1-audit.md` | Created |
| Phase 2 implementation | Not performed |
| Commit / push / sync | Blocked: selected AI folder has no Git metadata; user instructed to document this blocker |

Audit-only handoff. No application fix was necessary to enable inspection. The only intentional repository-content addition is this document; temporary inspection scripts/database stayed under `/tmp`. Existing application files and the original database were not edited by this audit.
