# Accordion motion correction

Removed the previous accordion's explicit `window.scrollBy` and dialog `scrollTop` adjustment, which could drag the entire page when a policy above the selected heading collapsed.

Answers now expand/collapse over 220ms. Only panel height animates; the accordion never commands page or dialog scrolling. Browser scroll anchoring is disabled inside the list. Interrupted animations cancel safely and restart from the rendered height, so rapid switching does not queue transitions. Closed answers become inert and leave the accessibility tree immediately, then become hidden when the transition finishes. Reduced motion and browsers without the animation API switch immediately.

Policy text, single-open behavior, keyboard controls and independent Terms dialogs are retained. This supersedes the scrolling approach in `ACCORDION-QA-REPORT.md`.

## Verification

- 70 automated tests pass.
- Frame-by-frame browser checks at 320, 768 and 1440px confirm a smoothly changing panel height and unchanged page scroll position when switching Privacy sections. Evidence: [scroll frames](accordion-qa/scroll-frames.json).
- The complete bilingual accordion recheck covers Privacy, Terms, English/Arabic FAQs and registration Terms dialogs at mobile, tablet and desktop widths, with normal and reduced motion. It checks single-open state after transitions, keyboard focus, rapid switching, dialog restoration, horizontal overflow and zero accordion scroll calls. Evidence: [motion results](accordion-qa/smooth-results.json).
