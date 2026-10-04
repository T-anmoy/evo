# Pricing, booking guide and Corporate Meals refinement

The pricing section in the supplied screenshot is on `/parents`, not the home page. The change fixes that existing section without duplicating it elsewhere.

## Changes

- Centered the single subscription card in a 480px maximum-width column at all widths. Kept KWD 2.000 together and placed its unit on a separate readable line. Balanced padding, description spacing and the full-width action.
- Replaced the How It Works guide with three equal-height cards. Numbers, headings and descriptions align on desktop; cards stack below 961px. The existing motion system supplies the staggered reveal, with no animation under reduced motion and no hidden content when JavaScript is unavailable.
- Updated English and Arabic Corporate Meals wording across metadata, Contact role options, school form options, About, platform features, footer disclosures and supporting copy. Deleted unused caterer marketing/form translations and moved shared order labels into `mealQueue`.
- Following the latest request to replace the wording everywhere, Terms and Privacy now call the food supplier a **corporate meal provider**. These are terminology replacements; the food supplier retains its existing responsibilities. This supersedes the earlier instruction to retain caterer wording in legal content. Workplace customers are described separately as corporate teams.
- Historical documentation, stored data and the `/caterers` permanent redirects remain intact. No active page or locale value contains “caterer” or “catering”.

## QA

- All **70 tests pass**, including updated localization coverage.
- **48 layout checks**: two sections × two languages × 12 widths (320, 344, 360, 375, 390, 412, 430, 768, 820, 1024, 1280, 1440px). No horizontal overflow. Pricing card centers match viewport centers within one pixel; the amount stays on one line. Desktop guide descriptions align within one pixel.
- **19 page/form checks**: public pages in both locales, English legal pages, and preservation of the Corporate role after a Contact validation error.
- Normal-motion check: all three guide cards use `evo-reveal-up` with stagger indices 0, 1 and 2. Reduced-motion check: all cards visible with animation `none`.
- No browser page errors recorded during this run. Screenshots were inspected at 375px and 1440px in both languages.
- Evidence: [browser results](layout-refinement-qa/results.json), [desktop pricing](layout-refinement-qa/evo-refined-en-parents-1440.png), [desktop guide](layout-refinement-qa/evo-refined-en-how-it-works-1440.png). The evidence directory contains all eight screenshots.

## Arabic review

The following added or changed strings need native review. Shared order labels moved to `mealQueue` retain their earlier translations.

| Key | Arabic — needs native review |
|---|---|
| `meta.contact.description` | تواصل مع Evo Meals لدعم أولياء الأمور وشراكات المدارس ووجبات الشركات. |
| `meta.corporate.title` | وجبات الشركات — Evo Meals |
| `meta.corporate.description` | استكشف الوجبات اليومية لفرق العمل واستفسر عن توفير الوجبات في مكان عملك. |
| `footer.disclaimer` | تربط Evo Meals أولياء الأمور بشركة مستقلة لتوفير الوجبات — ولا تتولى تحضير الوجبات بنفسها. |
| `home.finalCta.corporateTitle` | وجبات الشركات |
| `home.finalCta.corporateBody` | ناقش توفير الوجبات اليومية في مكان عملك. |
| `home.finalCta.corporateCta` | رتّب وجبات مكان العمل |
| `featuresSection.corporateTitle` | وجبات الشركات |
| `featuresSection.corporateChip1` | استفسارات وجبات مكان العمل |
| `featuresSection.corporateChip2` | للاستفسار فقط — لا توجد بوابة لحجوزات الشركات |
| `features.hero.lede` | مرتّب حسب المستخدم — أولياء الأمور والمدارس وفرق الشركات والطلاب والإدارة. |
| `features.cta.body` | سواء كنت ولي أمر أو مدرسة أو فريق شركة، هناك صفحة مخصّصة لك بالتفاصيل. |
| `schools.partnerForm.optInformal` | ترتيب غير رسمي مع شركة لتوفير الوجبات |
| `about.connects.intro` | لأولياء الأمور والمدارس وفرق الشركات مكان في برنامج الوجبات. |
| `about.connects.corporateTitle` | وجبات الشركات |
| `about.connects.corporateBody` | ناقش الوجبات اليومية لفريق مكتبك عبر نموذج استفسارات الشركات. |
| `about.story.pillar2Body` | تقديم تجربة سلسة لأولياء الأمور والمدارس وفرق الشركات. |
| `about.cta.heading` | سواء كنت ولي أمر أو مدرسة أو فريق شركة — |
| `about.ourStory.paragraph2` | ما بدأ وسيلة تتيح لولي الأمر معرفة ما يأكله طفله في المدرسة، نما ليصبح شيئًا أكبر — نظامًا واحدًا يربط المجتمع المدرسي بأكمله في الوقت الفعلي: أولياء الأمور والطلاب والمدارس وشركات توفير الوجبات. |
| `contact.pathways.corporateTitle` | وجبات الشركات |
| `contact.pathways.corporateBody` | رتّب الوجبات اليومية في مكان عملك. |
| `contact.pathways.corporateCta` | الانتقال إلى نموذج استفسارات الشركات |
| `contact.form.optCorporate` | شركة |
| `staff.scopeNote` | يحجز هذا وجبة على حسابك أنت كوليّ أمر. ليس تسجيل دخول منفصلًا للموظفين، ولا يمنح أي صلاحية مدرسية أو خاصة بالشركات. |
