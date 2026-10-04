# Single-open policy and FAQ accordions

Each FAQ list now permits at most one open answer. Opening another item closes the previous one immediately; selecting the open item closes it. Separate lists and Terms dialogs operate independently. Policy text and translations are unchanged.

The selected heading keeps its position when content above collapses. Terms dialogs adjust their own scroll container rather than scrolling the background page. Native button keyboard behavior, focus, `aria-expanded`, panel labels and hidden states remain synchronized. Without JavaScript, the policy text remains readable.

## Verification

- 70 automated tests pass.
- 60 browser combinations pass: Privacy, Terms, English/Arabic homepage FAQs, and English/Arabic registration Terms dialogs; widths 320, 375, 768, 1032 and 1440px; normal and reduced motion.
- Verified every accordion button with Enter/Space, rapid switching, exactly one visible answer when opening an item, keyboard focus, no horizontal overflow, and registration value/focus preservation on closing the dialog.
- Verified the Arabic payment Terms dialog at 320px: opening successive panels closes earlier ones, and Escape closes the dialog.
- No browser page errors recorded.

[Detailed results](accordion-qa/results.json)
