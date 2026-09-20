# Page Contract

Source of truth for Phases 2–5. For each public page: purpose, primary audience, CTAs, what belongs here vs. must be deferred elsewhere, required trust/qualification notes (from the Claims Registry), and expected SEO intent (from what's already in each view's `<meta name="description">` and, where present, JSON-LD).

---

### `/` — Home

- **Purpose:** Top-of-funnel narrative for all four audiences at once; establish what Evo Meals is before routing to a dedicated page.
- **Primary audience:** Parents (per the required parent-first homepage strategy), with clear secondary routing to Schools/Caterers.
- **Primary CTA:** "Order Meals" / "Create your account" (parent registration).
- **Secondary CTA:** "Explore the School platform" / "Explore the Caterer platform" (routes to `/schools`, `/caterers`).
- **Belongs here:** Brand introduction, the 5-role how-it-works summary (via shared partial), a condensed for-schools/for-parents/for-caterers teaser, feature summary (via shared partial), nutrition/menu preview, dashboard preview (explicitly labeled as a non-live preview), FAQ.
- **Must defer elsewhere:** Full parent step-by-step detail belongs on `/parents` (currently duplicated — see audit Section H, a Phase 2+ decision); full school benefits belong on `/schools`; full caterer benefits belong on `/caterers`; full feature-by-role detail belongs on `/features`; full platform-flow detail belongs on `/how-it-works`.
- **Required trust/qualification notes:** Trust-stat and testimonial sections must remain off (`SHOW_TRUST_STATS`/`SHOW_TESTIMONIALS`) until real data/quotes exist (Claims #14, #15). Dashboard preview must keep its "preview... not live data" qualifier (Claim #13).
- **Expected SEO intent:** Brand + category query ("school meal management Kuwait", "Evo Meals") — already reflected in the existing meta description and `Organization` JSON-LD.

---

### `/schools` — For Schools

- **Purpose:** Convert a school administrator into a partnership conversation.
- **Primary audience:** School administrators/principals.
- **Primary CTA:** "Partner with us" (scrolls to `#partner-form`, a real lead-capture form → `POST /schools/inquiry` → `inquiries` table).
- **Secondary CTA:** "See how the platform works" (now routes to `/how-it-works`, fixed in Phase 1).
- **Belongs here:** The seven-benefit grid, "what a school actually does day to day" operational list, the partnership inquiry form.
- **Must defer elsewhere:** Parent-facing detail (booking flow, pricing) belongs on `/parents`; platform-wide feature list belongs on `/features`.
- **Required trust/qualification notes:** No case studies, school counts, or adoption numbers currently exist — do not add any without real, verifiable figures (same standard as Claims #14/#15).
- **Expected SEO intent:** "school meal program software Kuwait", "digitize school meal management" — reflected in the existing meta description.

---

### `/parents` — For Parents

- **Purpose:** Convert a parent into a registered account.
- **Primary audience:** Parents.
- **Primary CTA:** "Create your account" (`/register`).
- **Secondary CTA:** "Log in" (`/login`).
- **Belongs here:** Step-by-step parent journey, pricing cards (pay-as-you-go vs. subscription, both computed from the one real daily rate), a menu preview.
- **Must defer elsewhere:** Full nutrition/ingredient detail belongs on the authenticated `/menu` page; platform-wide (multi-role) explanation belongs on `/how-it-works`.
- **Required trust/qualification notes:** The "Most parents choose this" badge on the subscription card is an **unverified comparative claim** (Claims #9) — carry the flag forward; do not add further unverified comparative language here.
- **Expected SEO intent:** "school lunch app Kuwait", "school meal subscription for parents" — reflected in the existing meta description.

---

### `/caterers` — For Caterers

- **Purpose:** Convert a catering business into a partnership application.
- **Primary audience:** Catering companies / kitchen operators.
- **Primary CTA:** "Partner with us" (scrolls to `#caterer-form` → `POST /caterers/inquiry`).
- **Belongs here:** Operational benefits (predictable demand, reduced manual processing, ready-made customer base), the application form.
- **Must defer elsewhere:** School-side or parent-side detail.
- **Required trust/qualification notes:** No caterer count, order-volume, or revenue figures currently exist — do not add without verified numbers.
- **Expected SEO intent:** "school catering partner Kuwait", "school meal supplier platform" — reflected in the existing meta description.

---

### `/how-it-works` — How It Works *(new, added Phase 1)*

- **Purpose:** A single, linkable/shareable page explaining the 5-role platform flow, independent of which audience page a visitor arrived from.
- **Primary audience:** Any — this page is audience-neutral by design (it exists precisely so schools/parents/caterers pages, and external links/ads, have one canonical place to point to instead of a homepage anchor).
- **Primary CTA:** "Create your account" (parent-biased default, consistent with the parent-first strategy), with explicit links out to `/parents`, `/schools`, `/caterers` for audience-specific next steps.
- **Belongs here:** Exactly the 5-step platform-flow content (School → Parent → Evo Meals → Caterer → Student), reused via `partials/how-it-works-section.ejs` — the same content shown inline on `/`.
- **Must defer elsewhere:** Audience-specific benefits/pricing/forms — this page intentionally stays generic and links out rather than duplicating `/parents`/`/schools`/`/caterers` content.
- **Required trust/qualification notes:** None beyond what's already in the shared section (no claims made beyond describing the mechanical flow).
- **Expected SEO intent:** "how does Evo Meals work", "school meal ordering process Kuwait" — a good landing target for a query that doesn't map cleanly to one audience page. `<meta name="description">` added in Phase 1.

---

### `/features` — Features *(new, added Phase 1)*

- **Purpose:** A single, linkable/shareable page listing what's actually live in the platform, organized by role.
- **Primary audience:** Any — same rationale as `/how-it-works`.
- **Primary CTA:** "Create your account".
- **Belongs here:** The by-role feature chip list (Parents/Schools/Caterers/Students/Administrators), reused via `partials/features-section.ejs`.
- **Must defer elsewhere:** Detailed explanation of any one feature belongs on the relevant audience page or (eventually) a feature-detail page, if one is built later.
- **Required trust/qualification notes:** The section head already states "Everything below is live in the product today" — this is true of every listed capability as verified against `server.js`/`db.js` in this audit (booking/subscribe, notifications, dashboards, order queue, tap-to-collect are all real, working routes/tables). Do not add a feature to this list that isn't backed by an actual route or DB capability.
- **Expected SEO intent:** "school meal app features", "what does Evo Meals do" — `<meta name="description">` added in Phase 1.

---

### `/about` — About Evo Meals

- **Purpose:** Values/positioning statement — why the company exists.
- **Primary audience:** All (low-funnel-priority page).
- **Primary CTA:** "Contact us".
- **Belongs here:** Values-level narrative only (no falsifiable factual history claims currently exist — keep it that way, see Claims #16).
- **Must defer elsewhere:** Any future factual claim (founding date, team size, funding, awards) must be verified before being added here — none exists in the repo today to verify against.
- **Required trust/qualification notes:** Do not add unverifiable history/awards/leadership claims (explicit guardrail in the transformation brief).
- **Expected SEO intent:** "who is Evo Meals", brand/company queries.

---

### `/contact` — Contact

- **Purpose:** Generic inbound contact for any role.
- **Primary audience:** All.
- **Primary CTA:** "Send message".
- **Belongs here:** A simple contact form with a role selector.
- **Must defer elsewhere:** School/caterer partnership inquiries are better served by the dedicated `/schools`/`/caterers` forms (which actually persist to the `inquiries` table) — `/contact` submissions are currently **logged only, not stored or emailed anywhere** (see Blockers).
- **Required trust/qualification notes:** The "Handled securely — never shared beyond our team" hint should not be published/expanded further until the form actually has a real destination — currently it has none.
- **Expected SEO intent:** "contact Evo Meals" — low SEO priority, mainly a functional/utility page.

---

### `/privacy`, `/terms` — Legal

- **Purpose:** Real, specific legal disclosure — not boilerplate.
- **Primary audience:** All, referenced from registration/footer.
- **Primary CTA:** None (informational).
- **Belongs here:** Data collection/sharing/retention detail (`/privacy`); marketplace model, caterer-verification disclaimer, order/cancellation terms (`/terms`).
- **Must defer elsewhere:** N/A.
- **Required trust/qualification notes:** Both already contain the correct disclaimers (no independent caterer/allergen verification, no delivery-time guarantee, data shared with catering partner disclosed) — preserve these verbatim in any future copy pass; they are load-bearing legal qualifiers, not marketing copy to be "improved" away.
- **Expected SEO intent:** Low — compliance/trust pages, occasionally surfaced for "Evo Meals privacy policy" branded queries.

---

### `/login`, `/register`, `/forgot-password` — Parent auth

- **Purpose:** Account access.
- **Primary audience:** Returning / new parents.
- **Primary CTA:** "Log In" / "Create Account" / "Send instructions".
- **Belongs here:** Auth forms only.
- **Required trust/qualification notes:** `/forgot-password` must keep its "This is a simulated flow... no real email is sent yet" disclosure (Claim-adjacent — this is an honest limitation label already in place).
- **Expected SEO intent:** None — utility pages, should stay `noindex`-appropriate (currently excluded from `/sitemap.xml`'s public-page list is *not* the case for `/login`/`/register`, which *are* listed — appropriate, since these are legitimate entry points; `/forgot-password` is correctly excluded from the sitemap).

---

### `/school-admin/login` — School Admin auth

- **Purpose:** Separate, lightweight login for school-side staff.
- **Primary audience:** School administrators (distinct from the parent-facing `/login`).
- **Belongs here:** Auth form only.
- **Expected SEO intent:** None — the entire `/school-admin/` prefix (login included) is disallowed in `robots.txt` and absent from `/sitemap.xml`. This means `/school-admin/login` itself is currently non-discoverable via search, which is appropriate for an internal-staff login page.

---

## Product/admin routes (not marketing pages — excluded from the above contract)

`/dashboard`, `/students`, `/booking`, `/menu`, `/history`, `/profile`, `/staff`, `/school-admin/dashboard`, and all `POST` mutation routes are authenticated product surfaces, not marketing pages, and are out of scope for the Page Contract. They are fully covered by the Route Contract in [PHASE-01-AUDIT.md](PHASE-01-AUDIT.md).
