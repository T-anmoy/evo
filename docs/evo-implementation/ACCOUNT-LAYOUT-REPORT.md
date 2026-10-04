# Parent account and footer layout QA

## Changes

- Centered footer copyright and provider disclosure on separate rows with a readable line length, consistent alignment and spacing in both languages.
- Expanded the account header's desktop container and kept navigation labels on one line. The accessible menu now takes over below 1400px, before English or Arabic links become crowded. Existing language switching, notification controls, profile and logout remain available.
- Placed today's meals and per-child booking actions in a balanced desktop grid; stacked them on smaller screens. Consolidated the oversized booking actions into compact rows. Corrected shortcut card margins.
- Grouped each child's name, meal, school, class and status consistently. Isolated mixed-direction text with `bdi` so English names and dishes align properly in Arabic layouts. Class labels use existing localized strings.
- Replaced the uneven student booking grid with equal-height responsive cards, consistent avatars, spacing and bottom-aligned full-width Book Now buttons. The calendar notice has its own readable panel.
- Added `subscription.regularMeal`: “Regular Meal” / “وجبة عادية”. The Arabic string needs native review. Student names, school names and nonstandard stored meal types remain the original account data.

## Verification

- **70 automated tests pass**, including booking validation, payment, ownership, localization and duplicate-payment protection.
- **170 browser checks** in each completed sweep: 168 page/viewport combinations and two functional sequences. Tested `/dashboard`, `/booking`, `/booking/new`, `/students`, `/history`, and `/contact` in English and Arabic at 320, 344, 360, 375, 390, 412, 430, 768, 820, 1024, 1032, 1280, 1440 and 1920px.
- No horizontal overflow, header overlap, or browser page errors recorded.
- Verified menu opening and Escape dismissal, notification opening, child selection, two-month review and navigation to meal selection in both languages.
- Ran the sweep with two demo children, then repeated with the screenshot's third-child scenario in a temporary QA database. No user account data was altered.
- Inspected screenshots for desktop, tablet and mobile, including Arabic header, dashboard, student cards and footer. Reduced-motion mode was used for repeatable layout captures.

[Browser results](account-layout-qa/results.json) and 18 screenshots are saved in `account-layout-qa/`. Representative captures: [Arabic dashboard](account-layout-qa/ar-dashboard-1440.png), [Arabic mobile booking](account-layout-qa/ar-booking-375.png), [tablet footer](account-layout-qa/en-footer-1032.png).
