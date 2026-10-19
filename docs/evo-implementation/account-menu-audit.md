# Account catalogue audit — 19 October 2026

## Cause and repair

The previous import mapped the source catalogue only to The English School. The existing demo parent's children belong to Kuwait English School and American Creativity Academy, whose school memberships still selected old sample dishes. This was a database mapping issue, not a browser cache problem.

`data/catalogue-assignments.json` explicitly maps all three redesign schools to source catalogue 3007. The import digest includes this configuration, so an existing database upgrades on application restart without resetting accounts. Import is transactional; source IDs remain stable. Old demo items are inactive for new choices but retained for historical bookings, invoices and notifications. A historical subscription whose dish is no longer selectable now shows an explicit replacement prompt rather than silently switching to the first current dish.

The account menu displays schools belonging to the parent's children. A newly registered parent without children can browse all configured school catalogues. Each school now has 58 distinct options: 53 mains, 2 sides and 3 drinks. Junior has 47 mains and Senior 50. The source has no snack entries. These are redesign assignments, not evidence that the original client has authorized this menu for additional schools.

## Motion

GSAP 3.15.0 is pinned and served locally under the existing self-only content security policy, through compression middleware. Menu transitions animate only opacity and transform for 220 ms. Switching tabs cancels prior tweens and clears temporary styles. Reduced-motion preference changes and page exit clear active animations. Tabs remain usable without GSAP. Existing keyboard navigation and RTL behavior remain intact.

## Verification

- `npm test`: 90 tests pass, 0 failures. Includes new registration, authenticated catalogue coverage, main selection for every configured school, all 53 imported mains through persisted monthly booking, payment simulation, authorization, pricing, date cutoffs, import consistency and per-portion nutrition validation.
- `git diff --check`: clean.
- Browser: demo login, authenticated KES catalogue counts 53/2/3/0, actual side and drink contents, Junior/Senior main counts 47/50.
- Account menu document width matches viewport at 320, 375, 768, 1024 and 1440 pixels.
- Dashboard, booking, students and history have no horizontal overflow at 375 pixels.
- Arabic menu checked visually at 375 pixels; correct RTL direction and no horizontal overflow.
- No browser console errors observed during the menu checks.
- Screenshots: `live-menu-qa/account-menu-fixed.jpg`, `live-menu-qa/account-menu-mobile.jpg`.

These checks cover the stated scenarios, not a guarantee that no undiscovered defect exists. Reduced-motion handling was reviewed in code; this pass did not emulate an OS preference change. Payment remains simulated and no production deployment was performed.

## Nutrition research and remaining inputs

The EVO360 public menu supplies names, images, categories and Junior/Senior membership, but no recipes, portion weights, ingredients or nutrient values. Exact macros cannot be derived from dish names or pictures.

USDA FoodData Central describes nutrient values and portion-weight conversion for identifiable foods: https://fdc.nal.usda.gov/Foundation_Foods_Documentation/
USDA's recipe guidance requires standardized ingredients, yields and servings: https://foodbuyingguide.fns.usda.gov/Appendix/ResourceAppendixA
These references explain a calculation method; they do not establish the composition or size of EVO360's meals.

For each recipe, obtain ingredient quantities and product labels, cooking method and final cooked yield, then Junior and Senior serving weights (including sauces, oil and accompaniments). Calculate batch nutrients from the matched ingredient records, divide by the documented cooked yield, and multiply by each actual serving weight. Have the caterer verify the calculation and recipe version. Do not assume a fixed Junior-to-Senior scaling factor or substitute a similarly named generic dish.

The existing `data/nutrition-input-template.json` covers all 107 dish/audience combinations. The validated transactional importer and database fields are ready for approved values, with serving weight, source, verifier and date. No fabricated macro values have been added. Missing values stay absent rather than showing zero.

Still required: caterer-approved nutrition or quantified recipes/servings; grade-to-Junior/Senior eligibility rules; side/drink inclusion and pricing rules. Current checkout books one main per day. Side/drink catalogue completeness does not imply their selection is implemented in checkout.
