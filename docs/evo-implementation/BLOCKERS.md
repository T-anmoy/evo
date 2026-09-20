# Blockers — require client decision before proceeding

None of these were guessed at or resolved unilaterally. Each is a real uncertainty found during the Phase 1 audit that needs a client decision before further structural or content work should touch it.

---

### 1. `/contact` form has no destination

- **Issue:** `POST /contact` (server.js:222) validates input and calls `logger.info(...)` with an explicit code comment: *"Demo only — no email/CRM integration wired up yet."* Nothing is persisted or sent anywhere. By contrast, `/schools/inquiry` and `/caterers/inquiry` both persist to a real `inquiries` table.
- **Why it matters:** The page tells the visitor "our team will get back to you shortly" and "Handled securely — never shared beyond our team" — both true in the narrow sense that nothing leaks, but misleading in that nothing is ever *acted on* either. Publishing this as-is on a real (non-demo) deployment would silently drop every parent/general inquiry.
- **Safest current behavior:** Left exactly as-is in Phase 1 — the copy already says "demo" nowhere on the page itself (unlike `/forgot-password`, which does disclose its simulated nature), so this is arguably the single spot in the public site where the honesty guardrail is weakest. No code was changed because doing so would mean choosing a real destination (email? CRM? the `inquiries` table?), which is a product decision, not a structural one.
- **Client decision required:** Should `/contact` (a) persist to the `inquiries` table like the other two forms, (b) send a real email once an email provider is chosen, or (c) get an explicit "demo only" disclosure added to match `/forgot-password`'s pattern, until a real integration exists?

---

### 2. No admin view for the `inquiries` table

- **Issue:** `/schools/inquiry` and `/caterers/inquiry` both write real rows to `inquiries` (migration 003), but no route or view anywhere reads that table back. There is no way to see submitted leads except direct database access.
- **Why it matters:** The lead-capture forms work end-to-end from the visitor's perspective ("we'll be in touch within one business day") but there is currently no operational path for that to actually happen without someone querying SQLite directly.
- **Safest current behavior:** Unchanged — the data is being captured safely (no data loss), just not surfaced.
- **Client decision required:** Is an admin-facing inquiries list in scope for a later phase, and if so, does it belong behind a new admin auth role, or the existing school-admin login (which is scoped per-school and wouldn't fit a cross-school/caterer inquiry list)?

---

### 3. Portion-by-grade claim outruns the implementation

- **Issue:** `home.ejs` states: *"Portioned for your child's age, not one-size-fits-all... portion size and protein content are matched to their age group."* The `booking.ejs` client-side hint similarly says "Portion and protein content matched to [class]." In the actual data model, `menu_items` has exactly one fixed `calories`/`protein`/`carbs`/`fat`/`ingredients` value per dish — there is no per-grade variant table or calculation anywhere in `db.js` or the schema.
- **Why it matters:** This is the one claim in the current content audit that reads as more specific/operational than what the code actually does. It's not a fabricated statistic (no invented number), but it does describe an automatic personalization that doesn't exist yet.
- **Safest current behavior:** Left as-is in Phase 1 — rewording marketing/product copy is outside the scope of a structural-safety pass, and the claim may reflect a real *catering-side* process (the kitchen physically portions by grade) that simply isn't represented in this demo's data model. Changing the words without knowing which is true risks being wrong in the other direction.
- **Client decision required:** Is grade-based portioning (a) an actual real-world catering process not yet modeled in this demo system, in which case the copy is accurate about the *program* even though the demo *database* doesn't compute it — or (b) an aspirational claim that should be softened until the demo can actually demonstrate it?

---

### 4. Localization / RTL scope is undefined

- **Issue:** Zero i18n infrastructure exists (see audit Section G) — every string is hardcoded English, `<html lang="en">` everywhere, no locale files, no RTL CSS. Kuwait is an Arabic-first market, which makes this a plausible near-term requirement, but nothing in the repo or the transformation brief specifies whether Arabic/RTL support is actually in scope.
- **Why it matters:** Any "safe prep" for localization (e.g., wrapping every string in a translation helper, restructuring CSS logical properties for RTL) is itself a large, invasive change if done speculatively — and would be wasted or wrong if the actual requirement turns out to be "English only for now" or "a specific different set of locales."
- **Safest current behavior:** No localization work started. Section G of the audit documents exactly what exists today (nothing) so a scoping conversation has a concrete starting point.
- **Client decision required:** Is Arabic/RTL support in scope for this transformation at all, and if so, for which phase? This determines whether Phase 2+ should budget any structural prep (e.g., a strings/translation layer) at all.

---

### 5. Contact details (address, phone, email, app-store links) are not independently verifiable from the codebase

- **Issue:** Farwaniya, Kuwait; `info@evo360.tech`; `+965 9957 0836`; Instagram `@evo360.tech`; App Store id `6738001343`; Google Play package `com.pmg.school` — all appear consistently across `sitefoot.ejs`/`appfoot.ejs`, but a code audit cannot confirm these are still the correct, currently-monitored contact points, or that the app-store listings are live and current.
- **Why it matters:** Wrong contact info or dead app-store links actively damage trust; this is exactly the kind of claim the audit brief says must not be assumed.
- **Safest current behavior:** Carried forward unchanged — these pre-date this audit and were not called out as wrong, and guessing a "fix" without client confirmation would risk introducing an actual error where none may exist.
- **Client decision required:** Confirm these are still the current, correct contact details and that the linked app-store listings are live, before any phase relies on them further (e.g., in new CTAs).
