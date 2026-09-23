# Evo Meals — Phase 2 implementation report

Date: 23 September 2026. Scope: truthful parent-first public refinement and the minimum shared/product correctness work required to support it. This is a demo, not a production integration certification.

## 1. Baseline

- Branch: `main`; starting HEAD and fetched `origin/main`: `c1d3d7075fe8980105eccb98deb237b00822a1a4`. The real checkout initially had a clean working tree.
- Recovery source: `/Users/tan/Desktop/EVO/evo360-demo-system-AI`; Git/history container and all implementation edits: `/Users/tan/Desktop/EVO/evo360-demo-system`.
- Compared relevant source before copying: application files were already byte-identical. The only AI-only source was `docs/evo-phase-1-audit.md`, which was copied unchanged. No application work needed manual reconstruction or replacement. No Git metadata, dependencies, databases, environment files, logs or caches were copied.
- Read the complete Phase 1 audit before implementation. Its historical missing-Git finding is resolved by this recovery; its recommendation for initially unchecked Terms is explicitly overridden by the current user requirement.
- Rechecked the safety copy against the starting commit: 77 tracked application/reference files remained identical. The AI folder was not edited.
- Baseline: `npm test`, 21 passing tests. No configured lint or build script. The application is an Express/EJS multipage server with SQLite records, not a compiled frontend.
- Started the real checkout with `DATABASE_FILE=/tmp/evo-phase2.db PORT=3100 LOG_LEVEL=warn npm start`. Browser baseline reproduced the audited public system, including Parents missing locale keys. Disposable test databases were used; the repository database and local environment were not modified.

## 2. Truth / Claim Corrections

Implemented in both locale files and the templates that consume them:

| Area | Correction |
| --- | --- |
| Home hero, menu introduction and metadata | Removed unsupported preparation/freshness assertions; describe meal information, booking and recorded collection. |
| Home school check | Configured schools are explicitly the demo setup, not verified live partnerships. The check remains usable. |
| Home FAQ and parent journey | Payment/refunds are simulated; physical readers and push delivery are not connected. Allergy notes are reference notes, not automatic matching. |
| Parents plan copy | Calendar month / remaining configured school days replaces term-based wording. |
| Parents collection, About, notification example | Recorded collection does not establish that a child ate. About retains the emotional question as motivation and explains that distinction. |
| Schools | Removed fictional participation/performance metrics. Preview uses actual record fields, is labelled illustrative, and explains page-load visibility. Configuration is not presented as an existing admin control. |
| Caterers | No live queue/portal claim. The order example is illustrative and does not transmit orders to kitchens. |
| Features | Removed claims of a working caterer queue, revenue reporting and central administrator workspace. Role descriptions distinguish working parent/school functions from service concepts. |
| School dashboard | “Record snapshot” and “School booking records at page load” replace live-update implication. |
| Inquiries | Success means saved in the demo; no external notification or unverified response-time promise. |
| Contact | Successful form validation does not mean a message was sent or saved. Raw submitted contact details are no longer logged. |
| Forgot Password | Neutral demo result explicitly says no email was sent and no password changed. Raw identifier logging removed. |

No “no canned food”, independently verified nutrition, consumption confirmation, popularity, customer-count or certification claim was added. Some historical unused locale entries remain for untouched legacy structures; they are not evidence of implemented capabilities and must not be reused without verification.

## 3. Correctness Fixes

`lib/booking-input.js`, `server.js`, `views/booking.ejs`, `views/staff.ejs`, and `tests/booking-input.test.js`:

- Validate positive safe IDs, student ownership, menu existence, plan enum, real ISO calendar dates, date range, single-plan integer day count of 1–30 and configured single-plan start service day before writing.
- Monthly starts may fall on a non-service day; price uses remaining configured service days in that month. A month with none returns a localized 422 response.
- Reject non-finite/non-positive rates and totals. Staff validates existing menu, valid supported date and positive rate; no new staff authorization platform was introduced.
- Supported date window begins at the existing UTC “today”; it extends 120 days and completes that final month. Client calendar and server monthly calculation now cover the same window. Kuwait-local cutoff semantics remain Phase 3.
- Preserve submitted choices on invalid POST, provide localized 422 feedback, and avoid the audited malformed-date/missing-menu 500s.
- Staff success uses a redirect and visible status. Menu links can preselect a valid meal for booking.
- Disabled ignored day-count input for monthly selection. No-JS initial total says to review dates rather than showing a false zero; server pricing remains authoritative.
- Deep multi-day fulfilment, daily allocation, duplicate-submit protection and renewal semantics were not redesigned.

## 4. Localization / Accessibility Foundation

- Locale dictionaries have matching key sets. Static literal translation-reference audit found no missing keys; browser checks found no raw keys on affected routes.
- Shared font variables select Cairo for Arabic controls and content, with Poppins/Montserrat for English. Font loading selects the relevant locale families.
- Auth screens have quiet Home/language access. Parent login/register explicitly carry the selected locale; logout, Contact and inquiry paths retain language. Arabic school-admin logout returns through the session locale switch.
- School Admin retains its language switch at mobile widths.
- Added actual main/skip destinations to About, Caterers, Contact, legal pages and admin login. Plain skip destinations are focusable.
- Shared drawer lifecycle uses `hidden` and `inert`, labelled dialog semantics, focus entry, Tab trapping, Escape return, background inertness and body-lock cleanup on desktop resize/pageshow. Notifications use hidden/inert when closed and return focus on Escape.
- Connected labels, IDs, hint/error IDs and invalid state across Students, Staff, Register, Contact, Profile and inquiry forms. Booking meal/plan choices now use fieldsets and legends. Alerts/status regions identify errors and success.
- First invalid field is focused where field-level errors exist. Untouched empty fields no longer cause blur-validation layout shifts during a checkbox click.

## 5. Food System

Reusable EJS partials: `food-card.ejs`, `food-details.ejs`, `food-confidence.ejs`; existing `dish-image.ejs` remains the asset adapter.

- Featured, full and compact presentations share meal identity, ingredients, four nutrient fields and recorded exclusions.
- Parents leads with one detailed featured meal; four supporting meals use accessible native disclosures. Home shows two detailed dishes early. Authenticated Menu shows all five dishes with details. Booking exposes each dish's details beside its selection control.
- Existing square food imagery remains square, with `object-fit:contain`. Booking thumbnails also contain the image. No new/generated food images or nutrition values were introduced.
- Nutrients use definition lists and isolated number/unit values. Seeded English names/ingredients are explicitly marked as English/automatic direction within Arabic layouts; no invented Arabic ingredient translation.
- Detail provenance identifies demo/reference information. Unknown/missing recorded exclusion keys do not become inferred exclusions.
- Booking choices use intrinsic column capacity and flex card structure, so native disclosures occupy their own space instead of overlapping adjacent choices.

## 6. Allergen / Food Confidence Implementation

Exact English programme statement:

> Our meals are free from any kind of Nuts, Shellfish, Sesame & Soy.

Arabic presentation:

> وجباتنا خالية من جميع أنواع المكسرات والمحار والسمسم والصويا.

Locations: shared programme component on Home, Parents and authenticated Menu. Dish-level recorded exclusions appear through the shared details component on Home, Parents, Menu and Booking.

Programme copy is identified as the supplied programme statement. Dish values are explicitly reference/demo data. Four calm exclusion icons represent Nuts, Shellfish, Sesame and Soy; no shield/certification seal.

Not claimed: zero cross-contamination, medical safety, suitability for every allergy, automatic checking or profile matching, laboratory verification, complete allergen elimination, egg/gluten/dairy/lactose exclusion. The Arabic rendering preserves the supplied four-item scope; operational and legal approval remains necessary before production publication.

## 7. Parents Page

`views/parents.ejs` now answers the parent questions in sequence:

1. What the meal looks like and what information exists: featured meal, ingredients, nutrients, recorded exclusions.
2. Programme Food Confidence and supporting dishes.
3. One Book → Pay → Tap → Notified journey.
4. Quiet plan explanation matching calendar-month calculation.
5. Shared collection illustration with demo boundaries and held confirmation.
6. Multi-child account example, Menu → Subscription → Order app shorthand, FAQ path and one parent conversion close.

Removed the obsolete missing-key app-flow markup and repeated competing process explanations. Featured dish heading follows the page H1 with H2. Food and essential actions never wait for scroll reveals.

## 8. Homepage

- Retained warm child/meal photography and existing identity. Cream hero uses explicit bounded text/portrait grid tracks; portrait media remains intact rather than stretching a tablet row.
- One account CTA plus school-check link; returning Login remains in navigation. Mobile drawer order remains Login, Register, Check My School.
- Food comes before the configured-school list. Reuses the same details, programme confidence, parent journey and collection components as Parents.
- School check remains functional with truthful setup wording. Multi-child, B2B pathways, app and FAQ retain their distinct questions. Final conversion is parent-led instead of three equal audience cards.

## 9. Schools / Caterers

Schools: concise Programme Control, Visibility, Coordination, Reporting and Partnership entries; one illustrative record based on existing dashboard fields; existing admin login and one inquiry section. No invented operational controls or engagement figures.

Caterers: Orders → Demand Visibility → Preparation → Fulfilment, followed by the clearly illustrative queue and one inquiry form. Desktop table and mobile semantic records derive from the same example array and status partial. Mobile no longer removes the operational example. No external fulfilment integration was added.

## 10. Features / How It Works

- Features is a role-to-capability map with intrinsic comfortable columns, concise lists and links. No five-column squeeze, pill wall or informational hover lift.
- Parent/school capabilities reflect implemented account and record behavior. Caterer, student physical-tap and central-administrator limitations are explicit.
- How It Works prioritizes the shared four-step parent journey, then School Set up → Monitor → Report and Caterer Receive → Prepare → Deliver with scope qualification.
- Removed the verified unused old `how-it-works-section.ejs` after confirming no callers remained. No additional connected-platform diagram was necessary.

## 11. About / Contact / Auth

About preserves the emotional concern while distinguishing collection from consumption; unverified boardroom/origin history became a present-tense approach.

Contact leads with the repository's existing email/WhatsApp destinations, then concise role routes and the clearly labelled demo form. Those external channels were not contacted or independently operationally verified.

Login/Register use Parent Civil ID, visible 12-digit guidance and advance password rules. Invalid login remains generic. Registration Terms is initially **checked + required**, user-deselectable, and enforced server-side as `agreeTerms === 'on'`; invalid POST preserves checked/unchecked state. Arabic Terms links explicitly lead to English.

Forgot Password preserves equivalent known/unknown results and clearly describes the missing delivery/reset integration. Terms/Privacy substantive content was preserved; landmarks and entry clarity improved.

## 12. Design System

Forest anchors navigation, text and primary trust actions; cream supports family/food, mint quieter surfaces, restrained yellow marks the Home conversion and Tap/selection attention, leaf marks completion with dark legible text.

- Explicit light/outline-light buttons replace ancestor-based dark-surface inversion. Existing main button system retained.
- Shared font tokens prevent component English font overrides in Arabic.
- Food, operational records, capability maps and parent journeys have deliberate intrinsic layouts and logical spacing.
- Informational cards no longer rise/zoom on hover. Selection remains visibly different from success.
- Existing tokens and useful operational density were preserved. This phase does not claim all legacy inline styles and aliases are removed.

## 13. Motion

Removed JavaScript scroll reveals, count-up, hero parallax and magnetic pointer movement, plus decorative informational-card lift/image zoom. Actual numbers render immediately.

Preserved functional navigation, selection, price feedback, submit feedback, success and native page-transition behavior. FAQ buttons now control semantically hidden panels; with no JS the content remains visible in source/CSS.

Collection starts in a readable completed illustrative state; deliberate replay runs once for 3.2 seconds and holds final confirmation. Tap uses yellow; confirmation uses the existing success treatment. Reduced-motion CSS prevents playback, and a preference-change listener cancels active demonstration classes. Browser computed-style checks confirmed no animation before playback and exactly one iteration on card, reader and toast after playback. No animation library added.

## 14. Responsive QA

Browser viewport checks, not just static source inspection:

- Mobile: **320, 344, 360, 375, 390, 393, 402, 412, 428, 430, 440, 480, 540, 600, 640, 667, 720, 767**.
- Tablet: **768, 800, 810, 820, 834, 853, 900, 912, 960, 1024, 1080, 1114, 1180, 1194, 1199**.
- Desktop: **1200, 1279, 1280, 1366, 1440, 1600**.
- Landscape: **667×375 and 1024×768**.

Public sweep: 936 route/width checks across 24 public/localized contexts; product sweep: 546 across Dashboard, Students, Menu, Booking, History, Profile and Staff in both languages. Final admin sweep: 78 checks, no overflow/header-link clipping. Final booking sweep after disclosure sizing fix: 78, no overflow/disclosure overlap. Landscape: 76 page/locale/size checks, no overflow or missing main.

Parents was checked at the requested acceptance widths before applying shared components to Home. Visual inspection included Parents desktop/Arabic mobile, Home desktop, Menu mobile, Schools desktop, Features tablet, Booking tablet RTL and School Admin at 320px Arabic. Caterer mobile semantic records remained present. These geometry sweeps do not substitute for testing every browser/device.

Root fixes: bounded portrait tracks, intrinsic food/role/picker grids, logical spacing, product navigation switching before mid-width crowding, flexible narrow admin logo, and scoped table/card alternatives. No per-device width patch list was introduced.

## 15. RTL QA

Checked Arabic public routes for Home, Parents, Schools, Caterers, Features, How It Works, About, Contact, Login, Register and Forgot Password; session-Arabic Dashboard, Students, Menu, Booking, History, Profile, Staff and School Admin.

Verified Cairo typography, mobile language access, journey ordering, food layouts, four exclusions, numeric isolation, forms, record cards and table alignment. Auth/inquiry route continuity was exercised. English seed meal/school content remains English rather than being falsely translated. Legal pages remain English and are labelled accordingly at Arabic entry points. Native Arabic editorial/legal review remains outstanding.

## 16. Accessibility

Verified keyboard drawer entry/wrap/Escape return and desktop-resize cleanup; hidden menu/notification state; actual main targets; field labels and invalid semantics; Terms pointer deselection and client/server rejection; native food disclosure access. Notification read target increased to 44px. Featured meal heading hierarchy repaired.

Important information is visible without hover or animation. Existing visible-focus and reduced-motion rules remain. Dark text is used on leaf/yellow completion/attention surfaces rather than small white text on leaf.

Limits: no formal WCAG certification, screen-reader hardware pass or real-device touch testing. Reduced-motion behavior and no-JS fallback were inspected in source; browser preference emulation was not available through the testing interface. Some legacy footer/product heading levels and inline presentation remain for later systematic cleanup; they do not block the corrected navigation/forms. Booking summary errors announce via alert rather than per-field detail for every server guard.

## 17. Performance

No dependencies, framework migration or new image assets. Retained local WebP/PNG source alternatives, width/height metadata, eager important imagery and lazy supporting imagery. Food ratios reserve space. Locale-specific font requests avoid loading both language families unnecessarily.

Content-hashed CSS/JS URLs replace stale manual cache versions. Motion removal reduces observers, pointer listeners and scroll work. Booking recalculation no longer forces `offsetWidth` to restart animation.

Measured source sizes (bytes; local gzip estimate, not network performance scores):

| Asset | Baseline | Refined | Baseline gzip | Refined gzip |
| --- | ---: | ---: | ---: | ---: |
| style.css | 124219 | 124897 | 32063 | 31759 |
| motion.js | 20619 | 14818 | 6643 | 4591 |
| nav.js | 3149 | 3159 | 1220 | 1042 |
| notifications.js | 767 | 892 | 336 | 369 |

No Lighthouse/Core Web Vitals/CLS score is claimed. Existing large hero PNG fallback and long shared stylesheet remain candidates for measured production optimization.

## 18. Tests

- Baseline `npm test`: **21 pass**.
- Final `npm test`: **45 pass, 0 fail**, including existing pricing/masking and new validation/HTTP behavior tests.
- New tests cover malformed/rollover dates, invalid plan/menu/days, ownership, supported bounds, no invalid writes, valid booking, Staff boundaries, Arabic 422, required checked-but-deselectable Terms state and neutral reset/Arabic Contact outcomes.
- `node --check` on server and changed standalone JS: passed.
- Temporary HTTP smoke runner against disposable SQLite: **41 route/locale checks, all 200**, including student edit and authenticated pages.
- Literal translation references: **0 missing**; English/Arabic dictionary key parity holds.
- Local public asset request check: **17 unique referenced image/CSS/JS requests, no failures**.
- Browser warning/error log check: **empty** in the inspected session. Rendered eager food/hero image dimensions and source loading inspected; no failed eager food images in sweep.
- `git diff --check`: passed. Application diff reviewed, including server guards, consent preservation, shared navigation and booking fieldset/disclosure behavior.

No tests were removed, no snapshot/toolchain dependency was introduced, and runtime fixture credentials/databases were not added to Git.

## 19. Content / Legal Blockers

These are unresolved decisions, not legal interpretations:

1. **Allergen/Terms scope:** client statement covers Nuts, Shellfish, Sesame and Soy. Terms section discussing meals outside “Regular Meal” describes caterer dietary claims (including other exclusions) that Evo does not independently investigate/verify and includes liability wording. Stakeholders/legal must reconcile programme scope, caterer responsibility and disclaimer meaning. Phase 2 does not silently rewrite this clause.
2. **Arabic legal:** no approved Arabic Terms/Privacy supplied. English destination is explicit; obtain reviewed translations before claiming bilingual legal parity.
3. **Food provenance:** seed nutrition/ingredients/exclusions and photographs are reference material, not independent verification of current production recipes, preparation or cross-contact practices. Obtain approved source records and change ownership.
4. **School verification:** configured schools are not verified active partnerships/deployments. Confirm consent, availability and programme ownership before stronger public claims.
5. **Payment/refunds:** KNET flow is a demo. Legal descriptions of payment/refund responsibilities require review against eventual provider integration and actual business rules.
6. **Privacy/data:** current session storage, saved inquiry records, production retention/deletion, account settings and communications must be reconciled with Privacy policy language. Removing raw Contact/reset logs does not establish full compliance.
7. **External contact/reset:** repository email/WhatsApp/app links retained, but ownership, staffing and response SLA were not independently confirmed. General Contact does not deliver/save messages; school/caterer inquiries save locally without external notification; reset has no token/email implementation.
8. **Collection:** no connected reader or push transport. Notification/collection records do not establish consumption. Do not publish a stronger claim until integrations are implemented and tested.
9. **Freshness:** no evidence added for an absolute preparation or “no canned food” standard. Obtain explicit approved production material before introducing one.

## 20. Phase 3 Handoff

Order unresolved work by dependency:

1. Obtain business/legal decisions for daily service allocation, single/multi-day booking, subscription renewal, school calendar ownership/cutoffs and cancellation/refund responsibilities; resolve the content blockers above.
2. Model actual per-day fulfilment and collection separately from booking/payment records. Define timezone and Kuwait school-day boundaries before migration; preserve existing data and add behavioral migration tests.
3. Add idempotent payment/booking transitions, authoritative payment-provider integration, webhook verification, cancellation/refund states and reconciliation. Existing booking POST refresh/idempotency remains unresolved.
4. Specify reader identity/authentication and collection events, then notification delivery/retry/receipt behavior. Keep collection distinct from consumption.
5. Scope genuine staff/caterer/central-admin authorization and operational surfaces only after role/business approval. Do not infer them from the public examples.
6. Implement approved reset/contact delivery and retention/deletion processes, with privacy-safe logging and reviewed bilingual content.
7. Production session store, secrets, transport security, backup/restore, migrations, deployment observability and provider failure handling; audit existing access boundaries before release.
8. Run cross-browser, real-device and assistive-technology acceptance; measure performance with production assets/hosting. Complete remaining systematic typography/heading/CSS cleanup based on verified usage, without replaying this public redesign.

Phase 2 preserves the latest source and establishes the public/shared foundation. These unresolved production/data-model decisions must not be represented as completed integrations.
