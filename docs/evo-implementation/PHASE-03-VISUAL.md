# Phase 3 — Visual System, Product-Led Presentation & Premium Public Website Polish

Status: **complete**, scoped honestly (see Section 8 for what was explicitly *not* done and why).

Read before this phase: [PHASE-01-AUDIT.md](PHASE-01-AUDIT.md), [PAGE-CONTRACT.md](PAGE-CONTRACT.md), [CLAIMS-REGISTRY.md](CLAIMS-REGISTRY.md), [PHASE-02-CONTENT-IA.md](PHASE-02-CONTENT-IA.md).

This phase evolved the existing visual system rather than replacing it. The palette, type families, and most component patterns from Phases 1–2 were kept as-is; work focused on (1) consolidating scattered magic numbers into named tokens, (2) fixing a real navigation bug found during testing, (3) reducing repeated white-card patterns in three specific places, and (4) a genuine, tool-verified responsive QA pass that found and fixed two real bugs.

---

## 1. Files changed

| File | What changed |
|---|---|
| `public/css/style.css` | Design-token additions (layout/spacing/control-height/focus-ring tokens); `.wrap`/`.wrap-wide`/`h2`/focus-outline/`min-height:44px` refactored onto the new tokens; new `.proof-row` (slim anti-card-wall component), `.sample-tag` (+ `.on-dark` variant), `.flow-caption`, `.lang-switch` (+ mobile variant), `.role-rows`/`.role-row` components added; nav collapse breakpoint changed from `1400px` to `1279px` (see Section 3 — this was a real bug fix, not a preference); `.grid-2/3/4 > *{min-width:0}` added (fixes a real grid-overflow bug, see Section 5); `.steps-6` was already added in Phase 2, unchanged here |
| `views/partials/head.ejs` | Stylesheet link now carries a version query (`/css/style.css?v=5`) — cache-busting so a deploy's CSS changes reach browsers immediately instead of waiting out the existing 1-day `max-age`. This was a genuine, permanent engineering fix, not a testing-only hack (see Section 3) |
| `views/partials/sitenav.ejs` | Desktop nav reordered to the parent-first hierarchy the brief specifies (For Parents, For Schools, For Caterers, How It Works, Features, About, Contact); dropped the separate "Home" link from the desktop row (logo already serves that role — kept in the mobile drawer where a full-screen menu benefits from an explicit way back); added the inert language-switch placeholder (disabled button, both desktop and mobile) |
| `views/home.ejs` | Confidence-row rebuilt from 4 white `.trust-card`s into the slim `.proof-row`; "Supported schools" content moved into the correct dark `.proof-section` structure (fixing a contrast bug introduced mid-session, see Section 4); added `.flow-caption` + `.sample-tag` to the collection-proof section; added `.sample-tag` to the multiple-children card |
| `views/parents.ejs` | Same `.flow-caption`/`.sample-tag` additions as home, applied to the equivalent collection and multiple-children sections for visual consistency across the two pages |
| `views/schools.ejs` | Dashboard-preview's plain-text "Product preview" label replaced with the shared `.sample-tag.on-dark` component |
| `views/caterers.ejs` | Order-queue table given a header row with a `.sample-tag` "Illustrative example" badge (previously only a sentence in the section intro) |
| `views/partials/features-section.ejs` | Rebuilt from 5 identical white `.feature-role` cards into the `.role-rows` divided-list layout — the clearest anti-card-wall change in this phase (see Section 4) |

**Not touched this phase:** `server.js`, `db.js`, `lib/pricing.js`, `lib/mask.js`, any `migrations/*.sql`, `seed.json`, `views/about.ejs`, `views/how-it-works.ejs`, `views/partials/how-it-works-section.ejs` (the 6-step canonical sequence and its role-flow summaries were already built in Phase 2 and reviewed here as already compliant with this phase's "avoid six generic cards" concern — see Section 6), any authenticated app view (`dashboard.ejs`, `booking.ejs`, etc.), or any legal page.

---

## 2. Design-token pass

Rather than replace the existing palette (already the exact deep-teal/warm-coral identity the brief describes — `--navy-950:#1B5E56`, `--lime-500:#F2754A` — confirmed by reading the current `:root` block before changing anything, per the brief's explicit instruction to use audited current values), this phase added the missing *structural* tokens the color/type system already had but the layout system didn't:

```css
--content-max:1120px;       /* was hardcoded in .wrap */
--content-max-wide:1280px;  /* was hardcoded in .wrap-wide */
--gutter:24px;
--control-height:44px;      /* was hardcoded 13 separate times */
--focus-ring-color:var(--blue-600);
--space-1 … --space-6;      /* 8/12/16/24/32/48px, for new components only */
--h2-size:clamp(22px,3.2vw,27px);
```

`.wrap`, `.wrap-wide`, every `min-height:44px` declaration (13 occurrences, mechanically substituted), the base `h2` rule, and the focus-visible outline color were refactored onto these tokens. This was a **naming and consolidation pass, not a value change** — every one of those refactors preserves the exact pixel value that was already there, so it carries essentially zero visual-regression risk while making the next phase's job (Arabic/RTL, further theming) easier to reason about.

`h2` also became fluid (`clamp(22px, 3.2vw, 27px)`) so long section headings don't force an awkward mid-word wrap on narrow phones; `h1` and the hero heading already had their own `clamp()` rules from before this phase and were left alone.

No new color tokens were introduced, and no existing token's *value* changed.

---

## 3. Navigation — a real bug found and fixed

The brief specifically warns against "an oversized desktop nav that breaks at 1024px." Before touching anything, the actual desktop nav (7 links + logo + language switch + 3 action buttons, after Phase 2's route additions) was tested at real widths in the browser — not assumed.

**What was found:** the nav's existing collapse-to-hamburger breakpoint was `max-width:1400px`, meaning the *full inline desktop nav only ever rendered above 1400px wide* — a width almost no real laptop screen reports as its usable viewport once OS chrome is subtracted. Below that, every visitor saw the hamburger drawer regardless of device. Testing at the brief's own reference widths surfaced two additional, more serious problems once the desktop row was actually made visible for testing:
- At 1024px and 1150px, the "Download App" button was pushed off-screen entirely (invisible, unreachable) rather than wrapping.
- The new language-switch placeholder's "EN / ع" text wrapped vertically inside its own pill at those widths.

**What was fixed:**
1. `.lang-switch` got `white-space:nowrap`.
2. `.site-links a` padding was trimmed from `8px 7px` to `8px 6px` to create real margin (not just enough to pass one test width).
3. The collapse breakpoint moved from `1400px` to `1279px`, so the desktop nav now renders (correctly, without cramping) at 1280px and above — verified individually at 1279 (correctly shows hamburger), 1280, 1240, 1366, and 1440. Below 1280 (including 1024, one of this phase's required test widths), the nav correctly shows the mobile drawer rather than a cramped or broken row — a deliberate, tested decision, not a workaround.

This whole investigation depended on discovering, mid-session, that **the stylesheet's 1-day `Cache-Control: max-age`** (a documented, deliberate Phase 1 choice for real users) was serving a *stale* copy of `style.css` back to the same browser tab across edits, producing several confusing false readings before the cause was identified. The permanent fix — a version query string on the stylesheet `<link>` (`?v=5`, bumped each time the CSS changed further during this session) — is now in place so a real deploy's CSS reaches browsers immediately rather than only after each visitor's cache naturally expires. This is a genuine, permanent engineering improvement, not just a testing workaround.

**Language-switch placeholder:** implemented as a `disabled` `<button>` (not a decorative, non-interactive `<span>`) specifically so a screen reader announces it as an unavailable control rather than silently doing nothing if activated. It requires no JS wiring today; Phase 4 removes `disabled` and adds the actual switch logic without touching the header's layout.

---

## 4. Anti-card-wall changes

Three places were identified as genuine "icon + white card + heading (+ paragraph)" repetition and rebuilt:

1. **Homepage confidence row** (4 identical `.trust-card`s) → **`.proof-row`**, a single divided horizontal strip (icon + label, separated by thin rules, no card background/border/shadow per item). This is the exact "slim, elegant, easy to scan" treatment the brief asks for in this specific section.
2. **`/features`' five identical `.feature-role` cards** → **`.role-rows`**, one continuous divided list where each row pairs a role statement (icon + name) with its capability chips inline, rather than five separate boxes. This was the clearest match for the brief's explicit "avoid an endless matrix of tiny cards" instruction for this exact page.
3. **The "Product preview" / "Illustrative example" labels**, previously inconsistent plain text or a one-off `.dash-preview-tag`, were unified into one `.sample-tag` component (plus a `.on-dark` variant for dark surfaces) and applied consistently across the homepage, `/parents`, `/schools`, and `/caterers` wherever demo/seeded data is shown — directly serving the "label sample/demo values clearly... keep the visual language consistent" instruction.

**What was deliberately left as cards, and why:** the three-panel B2B routing on the homepage, the three-pathway intent panels on `/contact`, the three-audience final CTA, and the operational-visibility/caterer-benefit grids (2–3 items each) were *not* converted. A small, fixed number of parallel choices (2–3 audiences, 2–3 benefits) is a legitimate use of a card — the brief's concern is a *wall* of many identical cards standing in for what should be a statement, a list, or a visual, not any use of a card at all. Converting these would have meant inventing a different pattern for its own sake.

**What was considered and explicitly not done:** the six-step `/how-it-works` sequence (built in Phase 2) was re-examined against this phase's "avoid six generic cards" concern. It was found to already be substantially compliant — `.step` has no background, border, or shadow; it's a numbered content block, not a card, and each item already carries a trailing connector rule. A more elaborate connected-diagram treatment (arrows spanning the grid gaps, etc.) was considered and rejected for this pass specifically because implementing it safely would require the kind of fragile absolute-positioning geometry across breakpoints that Section 4 of the brief explicitly warns against; the numbered/ruled treatment already in place was judged the safer choice given the phase's own constraints.

---

## 5. A real bug found during QA: grid overflow on `/contact`

Automated overflow detection (see Section 7) at 1024px found `/contact`'s new three-pathway grid overflowing the viewport by 17px. Root cause: CSS Grid's `1fr` tracks default to an implicit `minmax(auto, 1fr)` — the "auto" minimum is the content's max-content width, so a button label ("Go to Catering partnership form") long enough to resist wrapping (`.btn` uses `white-space:nowrap`) can force its whole grid track wider than its fair 1/3 share, pushing the row past the container.

**Fix applied:**
- `.grid-2 > *, .grid-3 > *, .grid-4 > *{min-width:0;}` — a standard, low-risk fix for this exact class of bug, applied to all three grid utilities (not just the one that broke) since the same root cause could recur anywhere they're used.
- The two offending button labels were also shortened ("Go to school form" / "Go to catering form") for additional margin.

Re-tested and confirmed fixed at 1024px and re-verified across the full width sweep (Section 7).

---

## 6. Homepage recipes, `/parents`, `/schools`, `/caterers`, `/how-it-works`, `/features` — status against the brief's per-page visual priorities

Most of the structural work these sections ask for (hero composition, journey visual, collection-proof widget, B2B routing, app section, FAQ, final CTA) was already built during Phase 2 and reviewed here for visual coherence rather than rebuilt. This phase's additions layer on top of that structure:

- **Confidence row**: rebuilt (Section 4).
- **Food proof**: unchanged structurally (already real dish photography + product card treatment from Phase 2); the "Sample menu experience" labeling now uses consistent language ("seeded sample content"), no visual change to the imagery itself was needed since real photography was already in place.
- **Journey**: the shared 6-step sequence (Phase 2) reviewed and left as-is (Section 4).
- **Collection proof**: given the explicit "Tap → Collected → Notified" `.flow-caption`, making the sequence a named, scannable statement above the existing tap/reader/toast widget rather than only implied by prose.
- **Multi-child**: already showed real product UI (the dashboard's own `.student-row`/`.avatar`/`.status-line` components, not a generic icon card) from Phase 2; this phase added the `.sample-tag` label for honesty about it being a sample account view.
- **B2B routing / App / FAQ / Final CTA**: unchanged this phase; already matched the brief's recipes from Phase 2's restructuring.
- **`/schools` dashboard proof**: label upgraded to the shared `.sample-tag.on-dark` component; the dashboard mockup itself (already built in Phase 2, already clearly captioned "a preview of the interface, not live data") was otherwise untouched.
- **`/caterers` order queue**: given a proper table header with the `.sample-tag` badge, making the "tangible kitchen" proof read as a distinct artifact rather than a plain table under some text.
- **`/how-it-works`**: reviewed, found compliant, not changed (Section 4).
- **`/features`**: rebuilt (Section 4).

---

## 7. Visual QA actually performed

This section states exactly what was tested, using the built-in browser — nothing here is claimed without having actually run it in this session.

**Automated horizontal-overflow sweep** (`document.documentElement.scrollWidth > window.innerWidth`, plus enumerating any specific offending element) run across all 7 restructured public pages (`/`, `/parents`, `/schools`, `/caterers`, `/how-it-works`, `/features`, `/contact`) at four widths: **320, 390, 768, 1024px**. This found the one real bug documented in Section 5 (fixed and re-verified). One page (`/schools`, and separately `/caterers`) intermittently reported an inflated `window.innerWidth` reading (382px when 320 was requested) that did not correspond to any actual overflowing content (`scrollWidth` always equaled the reported `innerWidth`, and a fresh, isolated browser tab reproduced the same reading) and produced no visible defect in a corresponding screenshot. This was traced as far as an oversized closed `.site-links-mobile` drawer element in the DOM measurement, but the root cause was not fully isolated within this pass — see Section 8's honest accounting. It does not appear to affect real users, since the site's existing global `overflow-x:hidden` safety net (a deliberate, pre-existing choice documented in the Phase 1 audit) prevents any visible consequence, and no horizontal scrollbar or clipped content was ever observed.

**Visual (screenshot) inspection**, using the built-in browser, of:
- **Home**: full page, every section, at 1024×900 (during nav debugging), and 1280/1366/1440 (nav-focused), plus a full top-to-bottom scroll-through at desktop width confirming the hero, supported-schools band, confidence row, menu proof, 6-step journey, collection proof, multiple-children card, B2B panels, app section, FAQ, and final CTA all render correctly with the new components in place.
- **`/schools`**: full top-to-bottom scroll-through at 1440×900, confirming the problem/connected-model/parent-experience/operational-visibility/student-identification/dashboard-preview/onboarding sequence all render correctly, including the new `.sample-tag.on-dark` badge on a dark background (specifically re-checked after catching and fixing the same class of contrast bug once already on the homepage — see below).
- **`/caterers`**: hero and order-queue table inspected at 1440×900, confirming the new table header and `.sample-tag` badge render correctly.
- **`/parents`**: hero and the collection section (with the new `.flow-caption`) inspected at 1440×900.
- **`/features`**: the new `.role-rows` layout inspected at desktop width, including catching and fixing two real bugs before it rendered correctly (see below).
- **Mobile nav drawer**: opened and inspected at 1024px width, confirming the reordered links, the new language-switch placeholder (both a broken mid-transition capture and the settled correct state were captured, to be sure a real bug wasn't mistaken for a transition artifact), and the action buttons.

**Two real bugs were caught and fixed during this visual pass, beyond the automated sweep:**
1. **Contrast bug**: the "Supported schools" list was initially built with `on-cream` (light) section styling wrapping the `.proof-name`/`.proof-names` classes, which are hardcoded white text (`color:#fff`) designed for the dark `.proof-section` band they originally lived in pre-Phase-2. This produced invisible white-on-cream text. Fixed by moving the content into the correct dark `.proof-section` structure.
2. **Broken component rendering on `/features`**: the new `.role-row-icon svg` briefly rendered at ~976px (nearly full page width) instead of 19px, and shortly after that fix, the row content appeared to render as entirely blank. Both were real, once genuinely investigated: the first was traced to the CSS cache-staleness issue described in Section 3 (the browser was still running CSS from before the `.role-row` rules were added); the second was confirmed to be the existing scroll-reveal animation (`[data-reveal]`, opacity 0 until scrolled into view) simply not having triggered yet in a rapid-scroll screenshot, not a real defect — confirmed by waiting and re-checking.

**What was not performed, and should not be assumed complete:** a full 5-width × 8-page screenshot matrix (40 combinations) was not manually eyeballed one-by-one — the automated overflow sweep covered structural failure detection at that scale, while manual screenshot inspection was concentrated on the pages and widths most likely to reveal a real issue (the pages with the most Phase 3 changes, at desktop and the two narrowest required widths). `/about` was not re-screenshotted this phase since it received no changes. No testing was performed on real physical devices, only viewport emulation in the built-in browser. No cross-browser testing (Firefox, Safari) was performed — only the Chromium-based built-in browser pane was used.

---

## 8. Honest scope boundary — what this phase did not attempt

Consistent with "do not claim QA you did not perform" and the phase's own core rule to evolve rather than replace:

- **No RTL/logical-properties conversion** was done. The brief explicitly defers the Arabic stack decision to Phase 4 and asks only that nothing here block it; no new CSS in this phase hardcodes a `left`/`right` assumption that would be unusually hard to convert later (the new components use `flex`/`grid` with `gap`, which convert cleanly), but a systematic audit/conversion of the *existing* 1,475 lines of CSS to logical properties was out of scope and not attempted.
- **No CSS engineering pass on pre-existing code** beyond what this phase's own changes touched or broke. The file was not audited end-to-end for duplicate selectors, specificity wars, or stale variables predating this phase; the two real, verified bugs (Sections 3 and 5) were fixed, and the tokens consolidation (Section 2) was applied where new work intersected with old magic numbers, but a full independent audit of all 1,475 lines was not performed.
- **No new imagery** was sourced or generated. The existing real dish photography and hero photography (already present, already free of watermarks, already not implying fabricated customer photography per the Phase 1 audit) were reused as-is.
- **The `/how-it-works` connector treatment** was evaluated and deliberately left alone rather than risk a fragile new absolute-positioned diagram (Section 4).
- **No performance measurement tooling** (Lighthouse, WebPageTest, etc.) was run. A qualitative check confirmed: images already carry `width`/`height` attributes and appropriate `loading="lazy"`/`eager"` (from Phase 1), fonts load via `preconnect` + `display=swap` (pre-existing), no new client-side JS or animation library was added this phase (only CSS), and no new render-blocking resource was introduced. This is a code-reading confirmation of existing good practice, not a measured performance audit.
- **No device-lab or cross-browser testing.** All QA in Section 7 was performed in one Chromium-based browser via viewport emulation.

---

## 9. Tests

**Before this phase's edits:** `npm test` → 21/21 passing (unchanged baseline from Phases 1–2).
**After this phase's edits:** `npm test` → 21/21 passing, 0 failures, 3 suites. No test file was touched — this phase changed only CSS and view templates.

**Full route smoke test** (after all Phase 3 edits, against a locally running server): every public page (`/`, `/schools`, `/parents`, `/caterers`, `/how-it-works`, `/features`, `/about`, `/privacy`, `/terms`, `/contact`, `/login`, `/register`, `/forgot-password`, `/school-admin/login`, `/sitemap.xml`, `/robots.txt`, `/health`) returns 200; every protected page (`/dashboard`, `/students`, `/booking`, `/menu`, `/history`, `/profile`, `/staff`, `/school-admin/dashboard`) correctly redirects (302) when logged out; an unknown path returns 404.

**Full login flow**: logged in as the seeded demo parent (Civil ID `111111111111` / `demo1234`) and confirmed all seven authenticated pages return 200 post-login.

**Form submission**: `POST /contact` from the (visually restructured, but functionally unchanged) contact page succeeds (302) with a real CSRF token.

No route, no business logic, no authentication/session/CSRF behavior, and no database interaction was changed this phase.

---

## 10. Phase 4 handoff notes

- The language-switch placeholder (`sitenav.ejs`, both desktop and mobile) is ready for Phase 4 to wire up — remove `disabled`, add the actual language-switching behavior, no header layout changes needed.
- Phase 4's RTL work should start by reviewing which of the newly added components (`.proof-row`, `.role-rows`, `.flow-caption`, `.lang-switch`) already use logical, direction-agnostic layout (flex/grid + gap — all of them do) versus auditing the wider pre-existing stylesheet for hardcoded `margin-left`/`padding-right`/etc., which this phase did not do.
- The `/schools`/`/caterers` `dw`/`innerWidth` measurement anomaly noted in Section 7 is worth a quick look early in Phase 4 or a dedicated follow-up — it produced no visible defect in this session's testing, but wasn't fully root-caused.
- The stylesheet version query (`?v=5`) should be bumped again the next time `style.css` changes, the same way a cache-buster is bumped in any project without an asset-hashing build step.
