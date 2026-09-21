# EVO MEALS — FINAL REFINEMENT & EXPERIENCE-QUALITY PROMPT

## Target: tablet repair → faster mobile conversion → parent trust experience → data-entry quality → animation → refined green/yellow visual system

You are working on the EXISTING Evo Meals repository after completion of the controlled Phase 01–05 transformation.

This is a targeted refinement and quality-improvement pass.

THIS IS NOT A REBUILD.
THIS IS NOT A NEW PHASED ARCHITECTURE.
DO NOT RECREATE THE APPLICATION.
DO NOT THROW AWAY WORKING PAGES OR BUSINESS LOGIC.

The goal is to take the current stable system and make the experience materially better:

- faster to understand
- faster to reach Login / Check My School
- stronger on mobile
- correct on tablets
- more trustworthy
- more visually distinctive
- more informative without becoming text-heavy
- more polished in forms and data entry
- more useful through purposeful animation
- warmer and more appropriate for school + food + family context
- still professional for Kuwait's multicultural/international-school audience
- still fully English + Arabic / RTL
- still accessible and performant

============================================================
1. NON-NEGOTIABLE OPERATING RULES
============================================================

Before editing:

1. Run and inspect:
   - git status --short
   - git branch --show-current
   - git log --oneline -8
   - current HEAD
2. The current repository is expected to contain the completed Phase 01–05 work. Do not assume an exact SHA without checking it.
3. Read these documents completely before changing application behavior:
   - docs/evo-implementation/PHASE-01-AUDIT.md
   - docs/evo-implementation/PAGE-CONTRACT.md
   - docs/evo-implementation/CLAIMS-REGISTRY.md
   - docs/evo-implementation/PHASE-02-CONTENT-IA.md
   - docs/evo-implementation/PHASE-03-VISUAL.md
   - docs/evo-implementation/PHASE-04-LOCALIZATION-RESPONSIVE.md
   - docs/evo-implementation/PHASE-04-COMPLETION-PASS.md
   - docs/evo-implementation/PHASE-05-FINAL-QA.md
   - docs/evo-implementation/BLOCKERS.md if present
4. Inspect the actual current source as well. Documentation is guidance; the repository is the implementation truth.
5. Do not rely on another Claude conversation's memory.
6. Do not revert completed work merely because you would have designed it differently.
7. Do not rewrite the stack, database model, route architecture, authentication architecture, or business logic unless a narrowly scoped fix is genuinely required for an identified defect.
8. Do not remove existing pages.
9. Do not silently remove capabilities.
10. Do not introduce fake functionality that looks real.
11. Do not invent statistics, testimonials, certifications, operational guarantees, school status, nutritional guarantees, allergy guarantees, production credentials, or client facts.
12. Do not convert illustrative/demo content into implied production proof.
13. Do not invent Arabic legal text for Privacy or Terms.
14. Do not push to remote.
15. Do not commit during this refinement pass unless explicitly instructed after review.

The current product foundation is valuable. Preserve it.

============================================================
2. BUSINESS / UX NORTH STAR
============================================================

Treat Evo Meals as:

A school-meal service in Kuwait connecting parents, schools, catering partners and students through a controlled meal journey.

The user should understand this quickly:

SCHOOL PROGRAMME
→ PARENT CHOOSES
→ MEAL IS PREPARED/PROVIDED BY THE CATERING PARTNER
→ ORDER IS FULFILLED AT SCHOOL
→ CHILD COLLECTS
→ PARENT IS NOTIFIED

Do not turn the site into a generic SaaS pitch.
Do not turn it into a generic food-delivery site.
Do not make it childish.
Do not make it feel like a giant sales deck.

The experience should feel like:

REAL FOOD + REAL SCHOOL CONTEXT + CLEAR DIGITAL PROCESS + PARENT CONFIDENCE.

============================================================
3. MARKET CONTEXT — USE AS DESIGN/POSITIONING CONTEXT, NOT AS EVIDENCE
============================================================

Current Kuwait market research shows that another school-cafeteria platform already promotes many category-level features such as pre-ordering, nutrition/allergen information, digital payment, QR collection, parent notifications, school dashboards, English/Arabic support and child management.

Therefore DO NOT rely on generic claims such as:

- "we are digital"
- "we have an app"
- "cashless school meals"
- "parents get notifications"
- "schools get dashboards"

Those are category-level ideas.

Instead, make the actual Evo product story easy to understand through the verified capabilities already present in this repository, especially:

- calendar-aware booking/pricing logic
- school/day-aware booking flow
- child-specific booking context
- dish-level nutrition/ingredient information where actually present
- tap-to-collect flow
- collection notification
- multiple-child management
- connected school/parent/caterer flow

Do not claim competitive superiority unless supported by verified evidence.
Do not copy a competitor's language, layout, branding, content or visual identity.

============================================================
4. CURRENT SYSTEM-SPECIFIC ISSUES YOU MUST ADDRESS
============================================================

The current stable implementation has several issues that this refinement pass must explicitly audit and improve.

A. TABLET COMPOSITION

The public CSS currently keeps `.grid-3` at three columns until a much smaller breakpoint. At tablet widths around 960px this can produce overly narrow columns, especially in three-pathway sections and other three-column blocks.

The attached tablet screenshot demonstrates the problem: the content technically fits, but the composition is too compressed to feel like a quality tablet interface.

Do not solve this by simply shrinking the font.

Instead establish intentional tablet composition:

- approximately 1024–1200: 2-column layouts where 3-up content becomes too narrow
- approximately 768–1023: intentional 2-column or 1-column layouts depending on component density
- approximately <=680/700: single-column layouts for content that needs readable width
- all grid tracks must use minmax(0, 1fr) or equivalent safe sizing
- no text should become a narrow vertical ribbon
- no CTA should force a column wider than its allocated space
- no form control should cause horizontal overflow

Audit ALL multi-column patterns, not only `.grid-3`:

- grid-2
- grid-3
- grid-4
- steps
- role rows
- partner forms
- pricing
- dashboard previews
- benefit grids
- menu grids
- admin tables
- footer columns
- any custom display:grid/flex layouts

Use content density to determine breakpoints, not arbitrary device names.

B. MOBILE PRIORITY

The mobile experience must be faster.

The first objective is not "make everything fit."
The first objective is "help the parent do the next useful thing immediately."

Priority actions for public mobile:

1. Log in
2. Check My School
3. Create account / booking path

The mobile header must not force the user to open a menu before finding Login.

Recommended behavior, subject to actual-width testing:

- keep the Evo logo compact
- expose a compact Login action in the public mobile header
- keep the hamburger/menu available
- put `Check My School` as the first prominent action inside the mobile drawer
- put `Log in` immediately beside/near it as a high-priority action
- show the language switcher without hiding it behind an obscure control
- do not create a crowded header

The drawer should use a clear priority hierarchy:

[ Check My School ]
[ Log in ]

then:
Parents
Schools
Caterers
How It Works
Features
About
Contact

then:
English | العربية

Do not duplicate every CTA in multiple locations just because space exists.

C. HOMEPAGE MOBILE HERO

The current mobile hero stacks three full-width actions. This consumes vertical space and makes the important path slower.

Refine it so that:

- primary: Check My School
- secondary: Log in
- tertiary actions move lower or become a quieter text/link treatment
- do not show three visually equal full-width CTA buttons above the fold
- the hero headline remains strong
- the first screen should quickly reveal what Evo Meals is and what the user can do
- the hero image should remain attractive without making the first interaction appear far below the fold
- use the already-optimized mobile image asset
- do not reintroduce the earlier 5MB mobile image problem

Where useful, use a compact secondary link such as "See how it works" rather than another large button.

D. CHECK MY SCHOOL

The current homepage already uses the supported-schools section as the destination for the CTA.

Make this faster and more useful without inventing live school-search infrastructure.

A good implementation may use a lightweight client-side school finder/filter over the VERIFIED current school list already present in the repository, for example:

- search/select a school
- show whether it is present in the current configured list
- if not found, show a clear path to contact/request the school

IMPORTANT:

Do not say a school is "live", "active every school day", "currently accepting orders", or otherwise operational unless the Claims Registry / client verification explicitly supports that wording.

The user should never mistake a static supported-school list for a live production availability API.

If a finder would create misleading certainty, keep the existing honest list and improve its visual usability instead.

============================================================
5. HOMEPAGE — MAKE THE LANDING EXPERIENCE EXCELLENT
============================================================

Do not increase the homepage section count.
Do not recreate the architecture.

Improve the current homepage inside its existing structure.

The desired narrative order is:

1. Immediate proposition
2. Check school / login path
3. Verified school context
4. Food / menu proof
5. How the service moves from school to child
6. Collection confirmation / notification
7. Multiple-child management
8. concise school/caterer pathway
9. app
10. short FAQ / final action

The homepage should feel much more visual than textual.

Every section should pass this test:

"Can a busy parent understand the point in 3–5 seconds?"

If not, shorten, restructure or turn the content into a visual component.

Prefer:

- one strong headline
- one useful sentence
- one visual proof element
- one action

over:

- heading
- paragraph
- second paragraph
- six bullets
- four cards
- another explanatory paragraph

Do NOT remove important information merely to make the site look minimal.
Instead, represent important information visually.

Examples:

nutrition → numbers + ingredient row + allergen badge

booking → selected child + school days + total

collection → tap → collected → notified

school support → searchable/clear school list

multiple children → compact account preview

============================================================
6. HERO ART DIRECTION
============================================================

The hero is the first emotional judgment point.

Preserve the current real asset and existing image pipeline unless the repository contains an already-approved better asset.

Do not invent the asset's provenance.
Do not call generated/placeholder imagery "real customer photography" unless verified.

Improve composition around the existing asset:

DESKTOP:
- strong text/image contrast
- generous but controlled whitespace
- image should feel like the product's physical world
- use subtle depth rather than decorative noise

TABLET:
- maintain a balanced split while there is enough width
- gracefully switch to a stacked composition when the text/image split becomes cramped
- never allow the image or CTA group to create a squeezed half-column

MOBILE:
- text first
- one dominant action
- login immediately reachable
- image shortly after the action group
- image height controlled so content does not disappear into a huge visual wall

Do not let the image dominate to the point that the product explanation disappears.

============================================================
7. FOR PARENTS — THIS PAGE IS A PRIORITY
============================================================

This page is where the business must earn trust.

Current page contains useful information but still relies too heavily on:

- four text steps
- long explanatory text
- nine journey pills
- repeated cards
- generic feature-like patterns

Rework the PRESENTATION, not the underlying business model.

The parent should not feel like they are reading a brochure.

They should feel like they are quickly inspecting how lunch works.

Desired parent-page narrative:

A. HERO

Lead with the emotional + practical result:

"Know what they’ll eat. Know when they collect it."

Use the actual verified Evo flow.

CTA priority:
- Log in
- Create account

Keep the messaging concise.

B. THE REAL PARENT JOURNEY

Replace the current "text blocks + many pills" feeling with a compact visual journey:

BEFORE SCHOOL
Choose the meal

AT SCHOOL
Child collects

AFTER COLLECTION
You see the confirmation

Then show the four real operational steps as concise expandable/stacked items if needed.

Do not show nine separate journey pills unless they are converted into a useful interaction.

C. MENU TRANSPARENCY

This should be one of the strongest trust sections.

Show one featured meal prominently.

Example structure:

Meal photo
Meal name
Meal category
Calories
Protein
Ingredients
Dish-specific allergen information

Then a small secondary set of meal previews.

Avoid another four equal cards if a featured-detail composition communicates more information faster.

IMPORTANT CLAIM RULE:

Audit every sentence against CLAIMS-REGISTRY.md.

The current repository contains wording that implies dishes are checked against a child's allergy profile. The code/data audit does not currently establish an automated allergy-filtering process. If that claim is not supported by the current implementation, change the copy to a truthful statement such as showing/reviewing dish-specific allergen information before booking. Do not imply automated safety matching that does not exist.

D. PRICING EXPLANATION

Make the pricing logic visually obvious.

The underlying verified model is:

SCHOOL DAYS COVERED × CONFIGURED DAILY RATE = TOTAL

Show that concept visually if the Claims Registry permits the displayed rate.

If the current rate is still demo/reference data, explicitly qualify it appropriately rather than presenting it as a confirmed production rate.

Do not create a second pricing source in the template.
The server remains authoritative.

E. COLLECTION PROOF

Make this a signature Evo moment:

1. Card/tap
2. Reader interaction
3. Collected state
4. Parent notification

Use motion to teach the sequence.

IMPORTANT:

Collection is not proof the child ate the meal.
Do not use wording like "notification when they've eaten".
Use "meal collected", "collection confirmed", or equivalent truthful language.

F. MULTIPLE CHILDREN

Use a compact account preview showing:

Child A → school → meal status
Child B → school → meal status

No fake statistics.
No unnecessary paragraph.

G. APP

Show the journey rather than simply saying "download the app".

Menu → choose → book/pay → collect → notification

H. FAQ

Keep short.
Only include questions that remove meaningful uncertainty.

============================================================
8. FOR PARENTS — TRUST WITHOUT BOREDOM
============================================================

Every informational claim should be paired with a visible reason to believe it.

Examples:

"Nutrition information per dish" → show actual nutrition values.

"Clear pricing" → show the calculation structure.

"Collection confirmation" → show the notification UI.

"Multiple children" → show the account UI.

"School-specific experience" → show school context.

Do not add generic adjectives such as:

premium
best
safe
healthy
world-class
trusted
perfect

unless the adjective is merely stylistic and does not become a factual claim.

Use evidence instead of adjectives.

============================================================
9. FORM & DATA-ENTRY QUALITY — SITE-WIDE
============================================================

The current system already has meaningful custom validation, but this pass must audit it systematically and improve it where necessary.

Validation must exist at BOTH levels:

1. Client-side immediate feedback for usability.
2. Server-side authoritative validation for correctness/security.

Never rely on the browser alone.
Never trust HTML attributes alone.

Create a small reusable validation layer only if that improves consistency and testability; do not scatter new one-off regexes through templates.

FIELD RULES

A. PERSON NAME

Used for parent names, contact names, student names.

Requirements:
- 2–60 characters unless the existing business constraints require otherwise
- at least one Unicode letter
- allow spaces
- allow common apostrophes
- allow hyphens
- allow diacritics/Arabic letters
- reject digits-only values
- reject punctuation-only values
- do not reject legitimate Arabic names
- do not reject legitimate Latin names such as O'Connor

IMPORTANT:
The current server-side registration regex accepts only A–Z letters. That conflicts with the bilingual experience and MUST be reviewed/fixed so Arabic users are not rejected for valid names.

B. EMAIL

Requirements:
- use input type=email
- autocomplete=email where appropriate
- inputmode=email where useful
- trim before validation
- accept standard valid formats including plus-addresses
- reject malformed values
- server-side validate
- normalize casing only where safe and consistent with existing account behavior

C. PHONE

This is a Kuwait-facing product used by a multicultural/international population.

Accept sensible international phone entry without falsely assuming every parent must type one exact local format.

Requirements:
- support optional `+`
- support spaces, hyphens and parentheses for entry convenience
- validate the resulting digits sensibly (generally 8–15 digits for international use)
- do not accept arbitrary alphabetic garbage
- preserve a usable stored/display value unless a canonicalization change is explicitly safe
- show a clear example/hint appropriate for Kuwait, such as a +965 example, without implying foreign numbers are invalid
- server-side validation must match the UI

D. KUWAIT CIVIL ID

Requirements:
- exactly 12 digits
- numeric input mode
- no alphabetic characters
- no accidental whitespace if exact raw format is required
- preserve existing Civil ID masking everywhere it is displayed
- never expose the raw value in UI or debug output

E. ORGANIZATION / SCHOOL / CATERER NAME

Requirements:
- must not be digits-only
- must contain at least one letter
- allow numbers when legitimately part of a business name (e.g. `360 Foods`)
- allow standard punctuation, spaces and ampersands
- sensible maximum length

F. CONTACT ROLE

Where a free-text role field is not necessary, prefer a select with meaningful role options and an `Other` option.

School examples:
- School administrator
- Principal / leadership
- Canteen / operations
- Procurement
- Other

Caterer examples:
- Owner / director
- Operations
- Kitchen / production
- Business development
- Other

Do not add options that imply an Evo organisational structure that is not real.

G. CLASS / SECTION

Do not over-restrict legitimate international-school formats.
Examples may include:
- Grade 3
- Year 4
- KG2
- 8A
- Section B

Use sensible length/character constraints instead of assuming a single educational system.

H. ALLERGY FIELD

Do not turn a free text field into a fake automated safety system.

It is appropriate to make the field clearer and structured for data quality, but do not claim Evo automatically guarantees or filters meals based on the value unless the backend actually does so.

If implementing common-allergen options, retain an `Other` field and explicitly distinguish recorded information from verified allergy-safe preparation.

I. MESSAGE / NOTES

Requirements:
- required where appropriate
- trim whitespace
- minimum meaningful length
- sensible maximum length
- multiline support
- no silent truncation
- preserve data on validation failure

J. BOOKING DAYS

Requirements:
- integer
- min/max consistent with actual business logic
- `step=1`
- no decimal values
- server-side validation
- monthly calendar-derived days remain server-authoritative

K. DATES

Requirements:
- valid ISO date values
- prevent obviously invalid/past values where business rules require it
- respect existing calendar-aware pricing behavior
- do not introduce a client-only pricing rule

L. REQUIRED CHECKBOXES

Custom validation must correctly handle required checkboxes such as terms acceptance.

============================================================
10. FORM UX QUALITY
============================================================

Good validation is not only rejection.
It is guidance.

Every field should answer:

- what do you need?
- why do you need it, when useful?
- what format should I use?
- what is wrong?
- how do I fix it?

Use:
- correct input types
- autocomplete
- inputmode
- meaningful placeholders
- concise hints
- inline errors
- visible success state where useful
- focus on the first invalid field after submit
- preserve all valid entered values

Do not overvalidate.
Do not create hostile forms.
Do not shake fields aggressively.

For Arabic, validation text must appear in Arabic when the interface is Arabic.

Do not let custom validation make forms slower than native browser validation without a clear UX benefit.

============================================================
11. VISUAL SYSTEM — NEW GREEN / SCHOOL-YELLOW DIRECTION
============================================================

Explore and implement a refined green/yellow palette while preserving the current overall Evo Meals visual character.

Do NOT make the UI neon, childish, or environmentally themed.

The semantic intent is:

DEEP GREEN = trust / structure / school system
FRESH GREEN = food / freshness / positive state
SCHOOL YELLOW = school cue / attention / selected moments / key action
CREAM = warmth / food / family environment
NEUTRALS = clarity / readability

PREFERRED PALETTE TO TEST

Primary Forest:
#163F31

Secondary Forest:
#1F604A

Fresh Leaf:
#5E9D6E

School Yellow:
#F2C94C

Soft School Yellow:
#FFF3C7

Warm Cream:
#FFFBF3

Soft Mint:
#EFF6F0

Ink:
#18211D

Muted Text:
#58655F

Error:
#A52A24

These are the starting values, not an excuse to skip contrast testing.

Verify actual contrast in the rendered states.
If one value fails WCAG AA for its intended use, adjust the value rather than keeping the exact hex at the expense of accessibility.

COLOR DISTRIBUTION

Aim roughly for:

- cream/white: dominant canvas
- deep green: structural anchor
- fresh green: supporting accent
- yellow: sparse high-attention accent

Yellow must remain visually valuable.
Do not put yellow on every button, card, icon, heading and border.

PRIMARY ACTION LANGUAGE

Use deep green for most primary actions when strong contrast and a premium tone are appropriate.
Use school yellow for selected/high-attention actions such as `Check My School` or specific highlights where dark text gives strong contrast.
Use fresh green for positive/system states.

Avoid returning to the previous teal/coral/orange look.
Do not leave misleading token names such as `--navy-*` or `--lime-*` if the new system would make them conceptually wrong.

If renaming tokens is necessary, prefer semantic names such as:

--brand-950
--brand-800
--leaf-500
--school-yellow
--cream-50
--mint-50
--ink-900

To minimise risk, legacy aliases may temporarily point to the new semantic tokens.

Do not leave contradictory color documentation describing the old palette as the current brand system.

============================================================
12. VISUAL LANGUAGE — LESS CARD WALL, MORE EDITORIAL / PRODUCT STORY
============================================================

The site already moved away from the most repetitive card-wall patterns.
Continue that direction.

Prefer:

- continuous rows
- editorial split layouts
- feature/hero compositions
- product UI mockups
- visual timelines
- annotated interface pieces
- large food imagery
- subtle dividers
- strong whitespace
- asymmetry used deliberately

Use cards only when the content is genuinely object-like and benefits from containment.

Do not put every sentence inside a white rounded rectangle.

Every section should have a different visual rhythm from the previous one where practical:

example:
image-led
→ list/diagram
→ product UI
→ full-width proof strip
→ editorial split
→ compact CTA

This prevents scroll fatigue.

============================================================
13. ANIMATION SYSTEM — PURPOSEFUL, FAST, ACCESSIBLE
============================================================

Yes, animations should be improved.
But animation must explain the product, not show off.

Use the existing plain JS/CSS motion system.
Do not add a heavy animation library just for decoration.

ANIMATION RULES

1. Respect `prefers-reduced-motion`.
2. No important content may be hidden if JS fails.
3. No animation may delay access to primary actions.
4. Avoid large parallax on mobile.
5. Avoid continuous distracting loops.
6. Avoid animation that causes layout shift.
7. Keep animations short and directional.
8. Use one coherent easing system.
9. Motion should communicate cause → effect.

RECOMMENDED SIGNATURE MOTIONS

A. HERO

A subtle entrance sequence:
- eyebrow
- headline
- supporting copy
- primary actions
- hero image

Use a short stagger, not a theatrical cascade.

B. TAP-TO-COLLECT DEMO

Create a clear visual sequence when technically practical:

ID card / meal card approaches reader
→ reader pulse
→ confirmation appears
→ notification arrives

The sequence should run once on initial visibility or at a restrained interval.
Do not constantly replay it in an annoying manner.

If looping, use a long idle interval.

C. JOURNEY

Use a line/progress cue that visually connects the steps.
On scroll, the line can gently reveal.

On mobile, keep it compact.

D. MENU

On desktop pointer devices:
- image scale 1.02–1.04
- tiny elevation
- subtle reveal of nutrition/info if appropriate

On touch devices:
- do not depend on hover
- ensure information is visible without interaction

E. BOOKING

When the user changes:
- child
- meal
- plan
- start date
- days

the total/calculation region can update with a small opacity/number transition.

Do not animate every input.

F. FORMS

Validation should transition calmly:
- border/icon state
- optional short fade/height adjustment

Do not use aggressive shake animations.

G. SUCCESS STATES

Keep the existing successful confirmation animation idea, but ensure it is quick, meaningful and reduced-motion safe.

============================================================
14. MOBILE INFORMATION DENSITY
============================================================

The mobile experience must not simply stack the desktop page vertically.

For every public page:

- shorten section padding where useful
- reduce duplicate text
- move secondary actions lower
- use readable measure (roughly 32–42 characters per line for core copy where practical, without forced manual line breaks)
- prevent giant empty gaps
- avoid long sequences of similarly sized cards
- keep buttons thumb-friendly
- avoid three full-screen CTA blocks in a row

For `/parents` specifically:

mobile sequence should feel like:

Hero
→ quick action
→ what the child experiences
→ what the parent can verify
→ food proof
→ collection proof
→ multiple children
→ app
→ FAQ/CTA

Not:

Hero
→ paragraph
→ paragraph
→ four cards
→ paragraph
→ nine pills
→ pricing wall
→ paragraph
→ more cards

============================================================
15. TABLET SYSTEM
============================================================

Treat 768–1180px as a first-class composition range.

Do not treat it as "desktop but smaller".

Required outcomes:

- no three-card layouts becoming narrow slivers
- no hero columns becoming awkwardly cramped
- no desktop navigation overflow
- no footer collisions
- no form grid compression
- no tables becoming unreadable
- no CTA labels wrapping badly unless that is deliberately designed
- no image crops that destroy the subject
- no empty side columns created solely because desktop geometry was retained

Test especially:

768
820
900
960
1024
1100
1180
1280
1366
1440

The supplied 960px tablet screenshot is a known visual reference for the bug.
Reproduce the underlying width condition, fix the layout root cause, then verify at neighbouring widths.

============================================================
16. MOBILE BREAKPOINT / HEADER STRATEGY
============================================================

Do not use device-specific hacks.
Use content-fit breakpoints.

Public header:

DESKTOP:
logo + nav + login + register/check-school/app action hierarchy

TABLET:
compact navigation where necessary, without clipping

MOBILE:
logo + compact Login + Menu

Drawer:
Check My School
Log in
Create account where useful
then navigation
then language

The exact arrangement must be tested for 320px, 344px, 360px, 375px, 390px, 412px and 430px.

At the narrowest widths, do not let the header become a row of tiny icon buttons.

============================================================
17. ARABIC / RTL REGRESSION PROTECTION
============================================================

Do not break Phase 04.

Every visual change must be checked in both:

English LTR
Arabic RTL

Verify:
- header
- mobile drawer
- hero
- CTA rows
- school finder
- forms
- validation errors
- journey/timeline
- notification mockup
- menu data
- pricing
- footer

Use logical CSS properties when touching layout code where practical:

margin-inline
padding-inline
inset-inline-start/end
border-inline-start/end
text-align:start/end

Do not blindly mirror genuinely directional icons.

Keep `<bdi>` / bidi isolation for:
- KWD values
- dates
- times
- phone numbers
- emails
- Civil IDs
- IDs/reference values

Arabic should look like a native layout, not English turned right-to-left.

============================================================
18. ACCESSIBILITY
============================================================

Maintain and improve:

- heading hierarchy
- landmarks
- skip link
- focus visibility
- keyboard navigation
- menu/drawer keyboard behavior
- accessible language switcher
- accessible form errors
- labels linked to inputs
- aria-describedby where useful
- aria-live/status messaging only where appropriate
- reduced motion
- contrast
- 44px+ meaningful touch targets

The school finder must be keyboard accessible if introduced.

Animations must never be the only way to communicate state.

============================================================
19. SEO / CONTENT HONESTY
============================================================

Do not undo Phase 05 SEO work.

Verify:
- unique titles
- descriptions
- canonical
- hreflang only where bilingual route truly exists
- OG/Twitter metadata
- sitemap
- robots
- correct locale/lang attributes

Audit all modified public copy against CLAIMS-REGISTRY.md.

IMPORTANT CLAIMS TO CHECK IN THE CURRENT SOURCE

1. Any wording implying a child has eaten merely because the meal was collected.
2. Any wording implying automatic allergy filtering/matching that the code does not actually perform.
3. Any wording claiming meals are freshly prepared by Evo Meals itself.
4. Any wording claiming a specific school is live/active/currently ordering unless verified.
5. Any wording presenting demo/sample numbers as live business statistics.
6. Any wording implying live KNET/real payment processing when the current environment is simulated.
7. Any comparative wording such as "most parents choose this".
8. Any unsupported portion-by-grade or age-based automatic matching claim.

Fix the copy at the source rather than adding a warning far away from the claim.

============================================================
20. DO NOT REINTRODUCE OLD PROBLEMS
============================================================

Specifically preserve:

- no wallet behavior
- calendar-aware pricing
- server-side booking validation
- server-side price calculation
- authentication
- CSRF
- rate limiting
- password hashing
- Civil ID masking
- enumeration-safe forgot-password
- school-admin authorization/scoping
- notification localization
- English/Arabic parity
- legal-content honesty

Do not introduce a second calculation path for price.
Do not trust client-side price/date validation.

============================================================
21. TESTING REQUIREMENTS
============================================================

Before editing, capture a baseline where practical.

After each logical group, run:

npm test

Then perform affected route checks.

At minimum verify:

PUBLIC
- /
- /parents
- /schools
- /caterers
- /how-it-works
- /features
- /about
- /contact
- /login
- /register
- /forgot-password
- /privacy
- /terms
- 404

AR PUBLIC
- /ar
- /ar/parents
- /ar/schools
- /ar/caterers
- /ar/how-it-works
- /ar/features
- /ar/about
- /ar/contact
- /ar/login
- /ar/register
- /ar/forgot-password

AUTHENTICATED
- dashboard
- students
- student edit
- menu
- booking
- history
- profile
- staff
- notifications

SCHOOL ADMIN
- login
- dashboard

FORMS
- registration validation
- contact validation
- school inquiry validation
- caterer inquiry validation
- profile validation if changed
- student validation if changed

REGRESSION FLOWS
- login
- logout
- add student
- edit student
- booking
- cancellation
- notification rendering
- language switching
- school-admin auth/scoping

============================================================
22. RESPONSIVE QA MATRIX
============================================================

Do not claim exhaustive testing unless you actually test it.

Required widths to cover across the final QA pass:

320
344
360
375
390
412
430
480
540
600
768
820
900
960
1024
1100
1180
1280
1366
1440
1536
1728
1920

At minimum, manually inspect the most composition-sensitive widths.

The final report must list exactly which widths were actually inspected.

For each representative mobile/tablet/desktop width inspect:

- header
- navigation drawer
- hero
- primary CTA
- check-school path
- menu
- forms
- parent page
- footer
- Arabic RTL where applicable

And run an automated horizontal overflow check where available.

============================================================
23. PERFORMANCE
============================================================

The site already had a meaningful mobile-image performance fix.
Do not regress it.

Verify:
- mobile hero asset is actually the mobile asset
- WebP preferred where supported
- no duplicate 5MB download
- dimensions/aspect ratios are correct
- unnecessary images are lazy loaded
- hero remains prioritized
- no large animation library is added
- no layout thrashing from JS animations
- no unnecessary client-side re-render loop

Motion should use CSS transforms/opacity where possible.

============================================================
24. IMPLEMENTATION DISCIPLINE
============================================================

Work in logical slices.

Recommended sequence:

SLICE 1 — baseline audit + tablet root cause
SLICE 2 — responsive/header/mobile priority
SLICE 3 — homepage visual/interaction refinement
SLICE 4 — For Parents information architecture/presentation refinement
SLICE 5 — form/data validation quality
SLICE 6 — green/yellow token migration
SLICE 7 — purposeful animation refinement
SLICE 8 — RTL/accessibility/SEO regression
SLICE 9 — full QA

Do not blindly change everything at once.

After each slice:
- run tests
- inspect affected routes
- fix regressions
- continue only when stable

============================================================
25. IMPORTANT: DO NOT OVERDESIGN
============================================================

Avoid:

- excessive gradients
- giant glowing blobs
- floating glassmorphism cards
- excessive rounded containers
- 3D effects that add no information
- childish illustrations
- emoji as interface decoration
- endless scroll-triggered motion
- auto-playing audio/video
- huge text that forces awkward wrapping
- sticky elements that cover content
- multiple competing CTA colors

The desired aesthetic is:

warm + modern + trustworthy + editorial + product-led + restrained.

Think:

international school environment
+
real food service
+
modern digital product

not:

startup landing-page cliché.

============================================================
26. DEFINITION OF DONE
============================================================

Do NOT consider this pass complete merely because tests pass.

The following must all be true:

A. TABLET

At 960px and neighbouring tablet widths, the supplied layout problem is genuinely resolved at the root cause. No compressed 3-up content remains where the content is too dense for three columns.

B. MOBILE

A parent can reach Login immediately from the header and Check My School immediately from the header/drawer or hero without digging through the page.

C. HOMEPAGE

The first screen is visually strong, immediately understandable, and does not feel like three equal buttons plus a wall of text.

D. FOR PARENTS

The page explains the complete parent value journey with fewer words and stronger visual proof.

A parent can understand:
- what their child gets
- what information they can inspect
- how booking works
- how pricing is calculated
- how collection is confirmed
- how they manage multiple children

without reading a long brochure.

E. TRUST

All modified claims are supported by the Claims Registry or clearly qualified.

F. FORMS

Invalid data gets useful feedback.
Valid data is accepted.
Arabic names are not rejected solely because they are Arabic.
Email validation is useful.
Phone validation is sensible for Kuwait + international users.
Server-side validation remains authoritative.

G. COLORS

The palette feels intentionally connected to:

school + food + trust + warmth.

Yellow is an accent, not visual noise.

H. MOTION

Animations make the flow easier to understand and remain accessible.

I. RTL

No meaningful regression in Arabic.

J. RESPONSIVE

No horizontal overflow, clipping, broken grid, unreadable table, or CTA collision across tested representative widths.

K. FUNCTIONALITY

Existing functionality still works.

============================================================
27. FINAL DOCUMENTATION
============================================================

Create or update:

docs/evo-implementation/FINAL-REFINEMENT-QA.md

Include:

1. What was audited
2. Root cause of the tablet issue
3. Mobile conversion changes
4. Homepage changes
5. For Parents changes
6. Form/data-entry changes
7. Validation rules introduced
8. Color system and final token values
9. Animation system changes
10. RTL changes
11. Accessibility changes
12. SEO/content-honesty checks
13. Tests run
14. Routes checked
15. Responsive widths actually checked
16. Performance checks
17. Known limitations
18. Remaining client-dependent blockers
19. Files changed
20. Git SHA at completion

Never write "perfect", "100%", "world-class" or "production ready" unless objectively supported.

============================================================
28. FINAL RESPONSE TO ME
============================================================

At completion, report:

- current branch
- starting SHA
- ending SHA
- whether working tree is clean
- files changed
- key defects fixed
- homepage changes
- parent-page changes
- form-validation changes
- final color palette
- animation changes
- RTL/accessibility result
- exact tests run/result
- exact responsive widths actually checked
- any remaining blocker

DO NOT COMMIT.
DO NOT PUSH.

============================================================
29. MOST IMPORTANT PRINCIPLE
============================================================

Do not make Evo Meals "more impressive" by adding more things.

Make it more useful by removing friction and increasing clarity.

The parent should be able to do this quickly:

SEE WHAT EVO MEALS IS
→ CHECK THEIR SCHOOL
→ LOG IN / CREATE ACCOUNT
→ SEE THE FOOD
→ UNDERSTAND THE PRICE
→ BOOK
→ KNOW WHEN THE MEAL IS COLLECTED

The site should communicate trust through evidence, not adjectives.
The product should feel premium through restraint, not decoration.
The mobile experience should feel fast because the hierarchy is clear, not because information was hidden.

Preserve the reliable business logic.
Improve the human experience around it.
