# Current client menu import — 19 October 2026

## Source and completeness

The public client site is https://evo360.tech/#goto_menu. Its `/lib/foodScripts/NG_Home.js` calls `POST /Default/GetData` with `GetSchool` and `GetStudentMealMenu`. `scripts/extract-live-menu.js` reproduces only these public read requests, including all four category types and all student/meal categories (the site's own `0` filters). No account, private API, or client database was modified.

The school lookup returned **The English School**, source school 3007, branch 1004. No other schools were returned. The timestamped, complete response data is in `data/live-menu.json`.

| Category | Source listings (Junior + Senior) | Distinct dishes |
|---|---:|---:|
| Main | 97 | 53 |
| Side | 4 | 2 |
| Drinks | 6 | 3 |
| Snack | 0 | 0 |
| Total | 107 | 58 |

Junior has 47 mains and Senior has 50. Shared dishes render once with both audience badges. No audience assignment is discarded. Exact dish names, including the source's spellings, are preserved. Sides are Assorted Fruit Cup and Assorted Veggie Sticks. Drinks are Fresh Juice, Laban and the explicit No Drink option. Snack remains a clearly labelled empty category.

The earlier browser-only inspection reported empty Side and Drink tabs prematurely. The source requests and the populated catalogue supersede that observation.

## Data and execution paths

- `migrations/009_live_menu.sql` adds stable source identity, provenance, local image path, audience metadata, availability and nutrition-availability flags, plus an import digest table.
- `db.js` runs migrations, existing demo seeding, then `db/import-menu.js` at startup. Import uses the bundled snapshot; production requests never depend on the old site being online.
- The importer matches the school by name, deduplicates by branch/item/meal-category identity, merges audiences and replaces only that school's menu membership inside one transaction. Existing menu and booking rows are retained; imported IDs remain stable. Repeating the same snapshot is a no-op. Removed source items are deactivated. Invalid source data rolls back the transaction.
- `db/schools.js` supplies school-specific active records to `/parents` and authenticated `/menu`. Both render the shared school-menu and food-card partials.
- Public filters operate on those same server-rendered records. Search and audience filters update counts across categories. Without JavaScript, all category sections remain readable. Tab roles, arrow/Home/End navigation and RTL direction are supported.
- `lib/subscription-routes.js` and `db/subscriptions.js` use the school catalogue for main-meal defaults, posted selections, final payment validation and subsequent changes. Side/drink IDs cannot be submitted as a daily main. Imported mains are available to the existing booking flow.
- Dish cards use the downloaded source photograph, audience and meal category. The source provides **no ingredients, nutrition or dish allergen data**. Imported dishes do not display the demo's invented values or a misleading zero-calorie label. Legacy SQLite numeric columns still contain default zeros, distinguished by `nutrition_known=0`; rendering honors that flag.
- Booking history keeps its original dish references. Other schools' existing demo menus are retained and explicitly described as illustrative.

## Interface changes

Exact heading: **Book Monthly Meals in Three Steps**. The old subtitle is removed. Step titles are **Select the month**, **Choose your meals**, and **Pay to confirm**. English and Arabic versions are updated, including shared booking titles.

Menu improvements: search, Junior/Senior filtering, counts, explicit no-results messages, actual source imagery, responsive cards, keyboard tabs, gentle panel transitions and hover elevation. Reduced-motion preferences disable those animations. Menu JavaScript is content-versioned to prevent stale cached behavior after deployment.

## Images and repeatable refresh

All 58 referenced source images were retrieved from `/CanteenImages/`. WebP copies preserve aspect ratio without cropping the downloaded source. Total image payload on disk decreased from approximately 106 MB to 5.9 MB; images load lazily. Source filenames remain recoverable from the snapshot.

Refresh intentionally happens at development/release time, not automatically against the client site:

```sh
node scripts/extract-live-menu.js
node scripts/download-menu-images.js
python3 scripts/optimize-menu-images.py
npm test
```

The optimizer needs Pillow. Review the new snapshot and images before releasing. Only WebP files are required by the running app; original PNG downloads can be archived outside `public/` after verification. Restart the application to apply the reviewed snapshot. No database reset is required.

## QA evidence

86 tests passed, including existing pricing, cutoff, payment, privacy, localization and HTTP booking coverage. Added checks cover all 107 source listings and 58 actual WebP files, exact names/categories/audiences, import idempotency, stable IDs, preserved history, transactional rollback, rejecting sides in main booking, absence of fabricated calories, and exact replacement headings.

Browser checks: actual Side and Drink contents; Junior main count 47; burger search; empty search result; English desktop layout at 1440 px; Arabic layout at 375 px with no horizontal overflow; RTL ArrowRight navigation from Drinks to Side. Screenshots are in `live-menu-qa/`.

## Boundaries requiring real business configuration

This is a catalogue import into the redesign, not a deployment to Render or a change to the existing client site. Existing payment remains simulated. School calendar and daily pricing remain existing demo configuration, not facts extracted from the menu source. The existing subscription schema books one main per day; this change does not invent a bundle price or add-on checkout rules for sides/drinks. Junior/Senior labels are preserved and filterable; automatic grade-to-audience eligibility cannot be inferred from the public catalogue. The source did not expose ingredient, nutrition, allergen, date-availability or add-on pricing information.

## Completeness recheck and card cleanup

Re-fetched all four public category responses and compared every field against the imported snapshot: identical, with no added or missing entries. Verified every one of the 58 distinct cards and image paths renders on both English and Arabic pages, representing all 107 audience listings. Removed the source/nutrition disclaimer sentence from the shared dish-card partial and deleted its English and Arabic translations. Browser inspection confirms the notice is absent and actual Side cards still render correctly; see `live-menu-qa/side-clean-desktop.jpg`.

## Booking and nutrition follow-up

All 53 imported main dishes were exercised through six months of daily selections, payment review, simulated payment, confirmation and persisted booking reload. The HTTP test verifies every imported main name in the review and confirmation and all selected IDs in SQLite. Browser inspection separately confirmed 53 options in each daily selector. The suite now passes 88 tests.

Payment review and confirmation now include the selected dated dishes. The school admin dashboard groups scheduled main dishes by date and quantity for today and the next seven days, scoped to that administrator's school. Staff meal selection and validation now restrict a daily main booking to main dishes, consistent with parent booking.

Migration 010 and `db/nutrition.js` add verified per-serving Junior/Senior nutrition records. The catalogue supplies no actual nutrient values, so none have been invented or published. `data/nutrition-input-template.json` contains all 107 source dish/audience combinations with empty inputs for cooked serving weight, calories, protein, carbohydrate, fat, source reference, verifier and date. Complete approved entries can be validated with:

```sh
node scripts/import-nutrition.js approved-portions.json
node scripts/import-nutrition.js approved-portions.json --apply
```

The first command is a dry run. Validation rejects unknown dishes/audiences, duplicate portions, missing or negative values, invalid dates, and macros whose combined weight exceeds serving weight. Writes are transactional. Imported portion values feed the same catalogue records used by the public and account menus. These checks validate data structure, not the scientific accuracy of a recipe; the caterer's verified data is still required.

Pending user inputs: approved nutrition data or quantified recipes and cooked serving weights for each audience; whether a main, side and drink are included in the daily price or charged separately. Side/drink checkout pricing and automatic grade-to-audience assignment have not been guessed. No changes were deployed to the client site or Render.
