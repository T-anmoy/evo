require('dotenv').config();

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const pino = require('pino');
const pinoHttp = require('pino-http');
const { csrfSync } = require('csrf-sync');
const db = require('./db');
const { calculateBookingTotal, endOfMonthISO } = require('./lib/pricing');
const { maskCivilId } = require('./lib/mask');
const {
  isValidName, isValidEmail, isValidCivilId, isValidPhone, isValidOrgName, isValidClassSection,
  isStrongPassword, isValidSchool, isValidAllergies
} = require('./lib/validate');
const { t: translate, SUPPORTED_LOCALES } = require('./lib/i18n');

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is not set — copy .env.example to .env and set one before starting the server.');
}

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(helmet({
  // Inline styles/scripts are used in a couple of views; keep CSP from
  // breaking the demo while still getting the rest of helmet's headers.
  contentSecurityPolicy: false
}));
app.use(compression()); // gzip text responses — real weight on a throttled mobile connection
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'), {
  // Static assets are unversioned file paths, so we can't send far-future
  // immutable caching without risking stale CSS/JS after a deploy — a
  // day-long max-age plus revalidation balances repeat-visit speed against
  // that risk. Content still updates within a day, or instantly on a
  // conditional GET once the browser revalidates.
  maxAge: '1d',
  etag: true,
  lastModified: true
}));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  // A parent checking on lunch bookings isn't a same-session, one-sitting
  // user — 30 days keeps a returning visitor logged in without forcing a
  // re-login on every visit, the way this kind of everyday consumer app
  // is expected to behave.
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 30, httpOnly: true, sameSite: 'lax' }
}));

// ---------- localization ----------
// Two locale mechanisms, matched to how each route group is reached:
//  - Public marketing pages + pre-auth forms (home, parents, schools,
//    login, register, ...) are reachable with no session, are meant to be
//    indexed and shared per-language, and so use a real URL prefix
//    (/ar/...). The unprefixed URL is always English — never silently
//    swapped by a stored preference — so a crawler or a shared link always
//    gets the same content for the same URL.
//  - The authenticated app and school-admin area have no per-language URL
//    (adding one would mean either duplicating every route or rewriting
//    the auth/session layer — out of scope for a localization pass) and
//    are always visited with a session already in place, so they use a
//    session-stored preference instead, switched via GET /locale/:lang.
const AR_PREFIX = '/ar';
const SESSION_LOCALE_PATH_PREFIXES = [
  '/dashboard', '/students', '/booking', '/menu', '/history', '/profile',
  '/staff', '/notifications', '/school-admin'
];
// Pages with a real, translated /ar/... counterpart — used both by the
// locale middleware below (to decide whether a canonical/hreflang alt-locale
// link is even meaningful for the current path) and by /sitemap.xml further
// down. Kept as a single list so the two can never drift out of sync: a
// crawler must never be pointed at an hreflang alternate that 404s (e.g.
// /ar/privacy, which doesn't exist), and a page-with-no-Arabic-route must
// never claim to have a canonical link to a language variant it doesn't have.
const BILINGUAL_PAGES = ['/', '/schools', '/parents', '/how-it-works', '/features', '/login', '/register', '/forgot-password', '/caterers', '/about', '/contact'];

app.use((req, res, next) => {
  const p = req.path;
  const isArabicUrl = p === AR_PREFIX || p.startsWith(AR_PREFIX + '/');
  const isSessionLocaleRoute = SESSION_LOCALE_PATH_PREFIXES.some(prefix => p === prefix || p.startsWith(prefix + '/'));

  let locale;
  if (isArabicUrl) {
    locale = 'ar';
  } else if (isSessionLocaleRoute) {
    locale = (req.session && req.session.locale === 'ar') ? 'ar' : 'en';
  } else {
    locale = 'en'; // unprefixed public/pre-auth pages are always English
  }

  res.locals.locale = locale;
  res.locals.lang = locale;
  res.locals.dir = locale === 'ar' ? 'rtl' : 'ltr';
  res.locals.t = (key, vars) => translate(locale, key, vars);
  res.locals.currentPath = req.originalUrl;
  res.locals.origin = `${req.protocol}://${req.get('host')}`;

  // Alt-locale link for the public language switcher (query string kept
  // intact); session-locale pages don't need this — they switch via
  // /locale/:lang instead, since there's no second URL to link to.
  const qsIndex = req.originalUrl.indexOf('?');
  const qs = qsIndex === -1 ? '' : req.originalUrl.slice(qsIndex);
  if (isArabicUrl) {
    const rest = p === AR_PREFIX ? '/' : p.slice(AR_PREFIX.length);
    res.locals.altLocalePath = BILINGUAL_PAGES.includes(rest) ? rest + qs : null;
  } else if (!isSessionLocaleRoute && BILINGUAL_PAGES.includes(p)) {
    res.locals.altLocalePath = (p === '/' ? AR_PREFIX : AR_PREFIX + p) + qs;
  } else {
    res.locals.altLocalePath = null;
  }

  next();
});

// CSRF protection is registered after locale resolution (rather than
// before, as in earlier revisions) so that res.locals.t is already set on
// this same request/response by the time a CSRF failure reaches the error
// handler at the bottom of this file — otherwise a rejected token would
// always fall back to English regardless of the page's actual language.
const { csrfSynchronisedProtection } = csrfSync({
  getTokenFromRequest: (req) => req.body && req.body._csrf
});
app.use(csrfSynchronisedProtection);
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// Session-locale switch: only for the authenticated app / school-admin
// area (see SESSION_LOCALE_PATH_PREFIXES above). A plain GET so it works
// as a real, keyboard-reachable <a href> with no JS required; it only
// ever changes a same-origin display preference, nothing sensitive, so it
// doesn't need CSRF protection the way a data-mutating POST would.
app.get('/locale/:lang', (req, res) => {
  const lang = req.params.lang;
  if (SUPPORTED_LOCALES.includes(lang)) {
    req.session.locale = lang;
  }
  const returnTo = req.query.returnTo;
  // Open-redirect guard: only a same-site relative path is honored.
  const safeReturnTo = (typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//'))
    ? returnTo
    : '/dashboard';
  res.redirect(safeReturnTo);
});

// express-rate-limit's `message` can be a function of (req, res) — used
// here instead of a fixed string so the response is localized using the
// same res.locals.t the rest of this request would have had (the locale
// middleware above already ran by the time this fires).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: (req, res) => res.locals.t('common.tooManyAttempts')
});

// ---------- helpers ----------
app.locals.maskCivilId = maskCivilId;
// Notifications are stored as "Student Name — rest of the message" —
// split so the template can bold the name (the fact a parent scans for)
// and keep the rest secondary, without ever rendering raw HTML.
app.locals.splitNotif = (message) => {
  const idx = message.indexOf(' — ');
  if (idx === -1) return { lead: '', rest: message };
  return { lead: message.slice(0, idx), rest: message.slice(idx + 3) };
};
app.locals.fmtKWD = (n) => `KWD ${Number(n).toFixed(3)}`;
app.locals.fmtDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
app.locals.fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
// Takes `t` explicitly (rather than reading res.locals itself) since it's
// called from templates, where the request's own `t` is already in scope.
app.locals.timeAgo = (iso, t) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t('common.justNow');
  if (mins < 60) return t('common.timeAgo', { count: mins, unit: t(mins === 1 ? 'common.minUnitOne' : 'common.minUnitOther') });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('common.timeAgo', { count: hours, unit: t(hours === 1 ? 'common.hourUnitOne' : 'common.hourUnitOther') });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('common.timeAgo', { count: days, unit: t(days === 1 ? 'dashboard.dayUnitOne' : 'dashboard.dayUnitOther') });
  return app.locals.fmtDate(iso);
};
// Re-renders a notification's stored `type` + `params` (see db.js) in the
// viewer's current locale. Falls back to the notification's stored English
// `message` for legacy/seed rows that predate the `params` column, or for
// any type this switch doesn't recognize — never a blank body.
//
// The final string is always rendered with the template's escaped `<%=`,
// never `<%-` — studentName is user-entered (a parent's own child's name),
// so it can't safely be mixed into an unescaped render even alongside
// trusted numeric data, the way dashboard.ejs's <bdi>-wrapped amounts are.
app.locals.notifMessage = (n, t, fmtKWD) => {
  if (!n.params) return n.message;
  const p = n.params;
  if (n.type === 'booking_confirmed') {
    const amount = fmtKWD(p.amountKWD);
    if (p.detailType === 'renewed') {
      return t('notifications.bookingConfirmedRenewed', { student: p.studentName, meal: p.mealName, amount });
    }
    const unitKey = p.detailType === 'monthly'
      ? (p.days === 1 ? 'booking.realSchoolDayUnitOne' : 'booking.realSchoolDayUnitOther')
      : (p.days === 1 ? 'dashboard.dayUnitOne' : 'dashboard.dayUnitOther');
    return t('notifications.bookingConfirmedCount', { student: p.studentName, meal: p.mealName, count: p.days, unit: t(unitKey), amount });
  }
  if (n.type === 'booking_cancelled') {
    return t('notifications.bookingCancelled', { student: p.studentName, amount: fmtKWD(p.amountKWD) });
  }
  if (n.type === 'renewal_due') {
    const unit = t(p.daysLeft === 1 ? 'dashboard.dayUnitOne' : 'dashboard.dayUnitOther');
    return t('notifications.renewalDue', { student: p.studentName, days: p.daysLeft, unit });
  }
  return n.message;
};

// Placeholder dish illustrations (public/images/menu/) — matched by exact
// menu item name, pending real food photography for these five dishes.
// Falls back to `null` (the old generic icon) for any name that doesn't
// exactly match, rather than guessing or mismatching a dish to the wrong
// picture.
const DISH_IMAGE_SLUGS = {
  'Arabiatta Chicken Pasta': 'dish-arabiatta-pasta',
  'Balsamic Chicken & Beans': 'dish-balsamic-chicken-beans',
  'BBQ Beef Burger': 'dish-bbq-beef-burger',
  'BBQ Chicken & Sweet Potato': 'dish-bbq-chicken-sweet-potato',
  'Seasonal Fruit Cup': 'dish-seasonal-fruit-cup'
};
app.locals.dishImageSlug = (name) => DISH_IMAGE_SLUGS[name] || null;

function requireAuth(req, res, next) {
  if (!req.session.parentId) return res.redirect('/login');
  res.locals.headerNotifications = db.getNotificationsForParent(req.session.parentId, 6);
  res.locals.unreadNotificationCount = db.getUnreadNotificationCount(req.session.parentId);
  next();
}

function currentParent(req) {
  return db.findParentById(req.session.parentId);
}

// Browsers probe this regardless of the data-URI <link rel="icon"> in
// <head> — a silent 204 avoids console noise and a wasted 404-page render.
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ---------- health check ----------
app.get('/health', (req, res) => {
  try {
    db.getPlans();
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});

// ---------- public pages ----------
// Every public/pre-auth route below is mounted at both its plain English
// path and the matching /ar/... path (array of paths, same handler) — one
// template renders both languages via res.locals.t, so this never means a
// duplicated view or duplicated business logic, only a duplicated route
// registration. See the locale middleware above for how res.locals.locale
// is actually determined from the path.
app.get(['/', '/ar'], (req, res) => {
  res.render('home', {
    parentId: req.session.parentId,
    menuItems: db.getMenuItems(),
    plans: db.getPlans()
  });
});

app.get(['/schools', '/ar/schools'], (req, res) => {
  res.render('schools', { parentId: req.session.parentId, success: req.query.success || null, errors: null, formData: null });
});

app.post(['/schools/inquiry', '/ar/schools/inquiry'], (req, res) => {
  const { organizationName, contactName, contactRole, email, phone, scaleInfo, currentArrangement, message } = req.body;
  const t = res.locals.t;
  const errors = {};
  if (!isValidOrgName(organizationName)) errors.organizationName = t('schools.partnerForm.errSchoolName');
  if (!isValidName(contactName)) errors.contactName = t('schools.partnerForm.errContactName');
  if (!isValidEmail(email)) errors.email = t('schools.partnerForm.errEmail');
  if (phone && !isValidPhone(phone)) errors.phone = t('schools.partnerForm.errPhone');
  if (!message || message.trim().length < 10 || message.trim().length > 2000) errors.message = t('schools.partnerForm.errMessage');

  if (Object.keys(errors).length) {
    return res.render('schools', { parentId: req.session.parentId, success: null, errors, formData: req.body });
  }

  db.createInquiry({
    type: 'school', organizationName: organizationName.trim(), contactName: contactName.trim(),
    contactRole: (contactRole || '').trim(), email: email.trim(), phone: (phone || '').trim(),
    scaleInfo: (scaleInfo || '').trim(), currentArrangement: (currentArrangement || '').trim(), message: message.trim()
  });
  logger.info({ organizationName }, 'school partnership inquiry received');
  res.redirect((req.path.startsWith('/ar') ? '/ar/schools' : '/schools') + '?success=1');
});

app.get(['/parents', '/ar/parents'], (req, res) => {
  res.render('parents', {
    parentId: req.session.parentId,
    menuItems: db.getMenuItems(),
    plans: db.getPlans()
  });
});

app.get(['/caterers', '/ar/caterers'], (req, res) => {
  res.render('caterers', { parentId: req.session.parentId, success: req.query.success || null, errors: null, formData: null });
});

app.post(['/caterers/inquiry', '/ar/caterers/inquiry'], (req, res) => {
  const { organizationName, contactName, email, phone, scaleInfo, message } = req.body;
  const t = res.locals.t;
  const errors = {};
  if (!isValidOrgName(organizationName)) errors.organizationName = t('caterers.form.errOrgName');
  if (!isValidName(contactName)) errors.contactName = t('caterers.form.errContactName');
  if (!isValidEmail(email)) errors.email = t('caterers.form.errEmail');
  if (phone && !isValidPhone(phone)) errors.phone = t('caterers.form.errPhone');
  if (!message || message.trim().length < 10 || message.trim().length > 2000) errors.message = t('caterers.form.errMessage');

  if (Object.keys(errors).length) {
    return res.render('caterers', { parentId: req.session.parentId, success: null, errors, formData: req.body });
  }

  db.createInquiry({
    type: 'caterer', organizationName: organizationName.trim(), contactName: contactName.trim(),
    contactRole: '', email: email.trim(), phone: (phone || '').trim(),
    scaleInfo: (scaleInfo || '').trim(), currentArrangement: '', message: message.trim()
  });
  logger.info({ organizationName }, 'caterer application received');
  res.redirect((req.path.startsWith('/ar') ? '/ar/caterers' : '/caterers') + '?success=1');
});

app.get(['/how-it-works', '/ar/how-it-works'], (req, res) => {
  res.render('how-it-works', { parentId: req.session.parentId });
});

app.get(['/features', '/ar/features'], (req, res) => {
  res.render('features', { parentId: req.session.parentId });
});

app.get(['/about', '/ar/about'], (req, res) => {
  res.render('about', { parentId: req.session.parentId });
});

// /privacy and /terms have no Arabic translation — per this phase's own
// instruction not to invent legal Arabic without a professional/legal
// review, so no /ar/privacy or /ar/terms route is registered.
app.get('/privacy', (req, res) => {
  res.render('privacy', { parentId: req.session.parentId });
});

app.get('/terms', (req, res) => {
  res.render('terms', { parentId: req.session.parentId });
});

app.get(['/contact', '/ar/contact'], (req, res) => {
  res.render('contact', { parentId: req.session.parentId, success: req.query.success || null, error: null, errors: {}, values: null });
});

app.post(['/contact', '/ar/contact'], (req, res) => {
  const { name, email, role, message } = req.body;
  const t = res.locals.t;
  const values = { name: (name || '').trim(), email: (email || '').trim(), role: (role || '').trim(), message: (message || '').trim() };
  const rerender = (error, errors) => res.render('contact', { parentId: req.session.parentId, success: null, error: error || null, errors: errors || {}, values });
  if (!name || !email || !message) {
    return rerender(t('contact.form.errRequired'));
  }
  if (!isValidName(name)) {
    return rerender(null, { name: t('contact.form.errName') });
  }
  if (!isValidEmail(email)) {
    return rerender(null, { email: t('contact.form.errEmail') });
  }
  if (message.trim().length < 10 || message.trim().length > 2000) {
    return rerender(null, { message: t('contact.form.errMessage') });
  }
  // Demo only — no email/CRM integration wired up yet. In production this
  // would notify the partnerships team (see the note in views/contact.ejs).
  logger.info({ name, email, role }, 'contact form submission (demo — not sent anywhere)');
  res.redirect((req.path.startsWith('/ar') ? '/ar/contact' : '/contact') + '?success=1');
});

// /privacy and /terms have no Arabic route registered at all (see
// BILINGUAL_PAGES above), so they get exactly one <url> entry and no
// hreflang alternates — no fake bilingual claim to a crawler for a page
// that isn't actually translated.
const ENGLISH_ONLY_PAGES = ['/privacy', '/terms'];

app.get('/sitemap.xml', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const arPath = (p) => (p === '/' ? '/ar' : `/ar${p}`);

  const bilingualEntries = BILINGUAL_PAGES.map(p => `  <url>
    <loc>${base}${p}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${base}${p}"/>
    <xhtml:link rel="alternate" hreflang="ar" href="${base}${arPath(p)}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${base}${p}"/>
  </url>
  <url>
    <loc>${base}${arPath(p)}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${base}${p}"/>
    <xhtml:link rel="alternate" hreflang="ar" href="${base}${arPath(p)}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${base}${p}"/>
  </url>`).join('\n');

  const englishOnlyEntries = ENGLISH_ONLY_PAGES.map(p => `  <url><loc>${base}${p}</loc></url>`).join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${bilingualEntries}\n${englishOnlyEntries}\n</urlset>`;
  res.type('application/xml').send(body);
});

app.get('/robots.txt', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  res.type('text/plain').send(
`User-agent: *
Allow: /
Allow: /ar
Allow: /schools
Allow: /ar/schools
Allow: /parents
Allow: /ar/parents
Allow: /caterers
Allow: /ar/caterers
Allow: /how-it-works
Allow: /ar/how-it-works
Allow: /features
Allow: /ar/features
Allow: /about
Allow: /ar/about
Allow: /contact
Allow: /ar/contact
Allow: /privacy
Allow: /terms
Disallow: /dashboard
Disallow: /students
Disallow: /booking
Disallow: /history
Disallow: /profile
Disallow: /staff
Disallow: /menu
Disallow: /school-admin/
Disallow: /notifications
Disallow: /locale/

Sitemap: ${base}/sitemap.xml
`);
});

app.get(['/login', '/ar/login'], (req, res) => {
  res.render('login', { error: null, errors: {}, parentId: req.session.parentId });
});

app.post(['/login', '/ar/login'], loginLimiter, (req, res) => {
  const { civilId, password } = req.body;
  // Reject an obviously malformed Civil ID before ever touching the
  // database — the client-side check on this field can always be
  // bypassed by posting directly, so this is the one that actually holds.
  if (!isValidCivilId(civilId)) {
    return res.render('login', { error: null, errors: { civilId: res.locals.t('login.errCivilIdFormat') }, parentId: null });
  }
  const parent = db.findParentByCivilId((civilId || '').trim());
  if (!parent || !bcrypt.compareSync(password || '', parent.passwordHash)) {
    // Deliberately not attributed to one field — confirming which of the
    // two was wrong would help an attacker enumerate valid Civil IDs.
    return res.render('login', { error: res.locals.t('login.errInvalid'), errors: {}, parentId: null });
  }
  req.session.parentId = parent.id;
  // Carry the language they logged in with into the authenticated app,
  // which has no URL-based locale of its own (see the locale middleware).
  if (req.path.startsWith('/ar')) req.session.locale = 'ar';
  res.redirect('/dashboard');
});

app.get(['/forgot-password', '/ar/forgot-password'], (req, res) => {
  res.render('forgot-password', { submitted: false, error: null, errors: {}, identifier: '', parentId: req.session.parentId });
});

app.post(['/forgot-password', '/ar/forgot-password'], (req, res) => {
  const { identifier } = req.body;
  const t = res.locals.t;
  const trimmed = (identifier || '').trim();
  // Same shape check the client already does (civilid-or-email) — re-run
  // here since a direct POST skips the client entirely. Format only: this
  // never reveals whether the value matches a real account either way.
  if (!isValidCivilId(trimmed) && !isValidEmail(trimmed)) {
    return res.render('forgot-password', { submitted: false, error: null, errors: { identifier: t('forgotPassword.errIdentifier') }, identifier: trimmed, parentId: req.session.parentId });
  }
  // Demo only — no email is actually sent. Never reveal whether the
  // identifier matches an account, same reasoning as any real reset flow.
  logger.info({ identifier }, 'forgot-password request (demo — no email sent)');
  res.render('forgot-password', { submitted: true, error: null, errors: {}, identifier: '', parentId: req.session.parentId });
});

app.get(['/register', '/ar/register'], (req, res) => {
  res.render('register', { error: null, errors: {}, parentId: req.session.parentId, values: null });
});

app.post(['/register', '/ar/register'], (req, res) => {
  const { name, civilId, email, phone, password, confirmPassword, agreeTerms } = req.body;
  const t = res.locals.t;
  // Re-rendered on every failure below with the non-sensitive fields the
  // parent already typed (never the password) so a validation error never
  // means retyping the whole form — spec requirement: preserve valid
  // entered values on validation failure.
  const values = { name: (name || '').trim(), civilId: (civilId || '').trim(), email: (email || '').trim(), phone: (phone || '').trim() };
  const rerender = (error, errors) => res.render('register', { error: error || null, errors: errors || {}, parentId: null, values });
  if (!name || !civilId || !email || !phone || !password || !confirmPassword) {
    return rerender(t('register.errAllFields'));
  }
  if (!isValidName(name)) {
    return rerender(null, { name: t('register.errName') });
  }
  if (!isValidCivilId(civilId)) {
    return rerender(null, { civilId: t('register.errCivilId') });
  }
  if (!isValidEmail(email)) {
    return rerender(null, { email: t('register.errEmail') });
  }
  if (!isValidPhone(phone)) {
    return rerender(null, { phone: t('register.errPhone') });
  }
  if (!isStrongPassword(password)) {
    return rerender(null, { password: t('register.errPassword') });
  }
  if (password !== confirmPassword) {
    return rerender(null, { confirmPassword: t('register.errConfirmPassword') });
  }
  // The Terms checkbox is client-side `required`, which a direct POST
  // skips entirely — re-check it's actually present here too.
  if (!agreeTerms) {
    return rerender(null, { agreeTerms: t('register.errAgreeTerms') });
  }
  if (db.findParentByCivilId(civilId.trim())) {
    return rerender(null, { civilId: t('register.errDuplicateCivilId') });
  }
  const parent = db.createParent({
    name: name.trim(),
    civilId: civilId.trim(),
    email: (email || '').trim(),
    phone: (phone || '').trim(),
    passwordHash: bcrypt.hashSync(password, 10)
  });
  req.session.parentId = parent.id;
  if (req.path.startsWith('/ar')) req.session.locale = 'ar';
  res.redirect('/dashboard');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// ---------- school admin auth (separate, lightweight login) ----------
function requireSchoolAdmin(req, res, next) {
  if (!req.session.schoolAdminId) return res.redirect('/school-admin/login');
  next();
}
function currentSchoolAdmin(req) {
  return db.findSchoolAdminById(req.session.schoolAdminId);
}

app.get('/school-admin/login', (req, res) => {
  res.render('school-admin-login', { error: null, errors: {}, parentId: req.session.parentId });
});

app.post('/school-admin/login', loginLimiter, (req, res) => {
  const { email, password } = req.body;
  // Same principle as the parent login's Civil ID check — reject an
  // obviously malformed email before ever querying the database.
  if (!isValidEmail(email)) {
    return res.render('school-admin-login', { error: null, errors: { email: res.locals.t('schoolAdminLogin.errEmailFormat') }, parentId: req.session.parentId });
  }
  const admin = db.findSchoolAdminByEmail((email || '').trim().toLowerCase());
  if (!admin || !bcrypt.compareSync(password || '', admin.passwordHash)) {
    // Not attributed to one field, same reasoning as parent login.
    return res.render('school-admin-login', { error: res.locals.t('schoolAdminLogin.errInvalid'), errors: {}, parentId: req.session.parentId });
  }
  req.session.schoolAdminId = admin.id;
  res.redirect('/school-admin/dashboard');
});

app.get('/school-admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/school-admin/login'));
});

app.get('/school-admin/dashboard', requireSchoolAdmin, (req, res) => {
  const admin = currentSchoolAdmin(req);
  const students = db.getStudentsBySchool(admin.school);
  const bookings = db.getBookingsForSchool(admin.school);
  const todayISO = new Date().toISOString().split('T')[0];

  const isActiveToday = (b) => {
    if (b.status === 'cancelled') return false;
    if (b.planType === 'monthly') {
      // A monthly subscription's coverage runs through the end of the
      // calendar month it started in — not 30 raw days, which could bleed
      // into the next month regardless of the school's real calendar.
      return b.startDate <= todayISO && todayISO <= endOfMonthISO(b.startDate);
    }
    return b.startDate === todayISO;
  };

  const activeSubscriptions = bookings.filter(b => b.planType === 'monthly' && b.status !== 'cancelled' && isActiveToday(b)).length;
  const todaysMeals = bookings.filter(isActiveToday).length;
  const pendingOrders = bookings.filter(b => b.status === 'upcoming').length;

  // 14-day trend: bookings grouped by start date, real counts from real rows.
  const TREND_DAYS = 14;
  const trend = [];
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    const count = bookings.filter(b => b.startDate === iso && b.status !== 'cancelled').length;
    trend.push({ date: iso, count });
  }
  const trendMax = Math.max(1, ...trend.map(t => t.count));

  const recentActivity = bookings.slice(0, 10).map(b => ({
    ...b,
    student: students.find(s => s.id === b.studentId),
    menuItem: db.findMenuItem(b.menuItemId)
  }));

  res.render('school-admin-dashboard', {
    admin, students, bookings, activeSubscriptions, todaysMeals, pendingOrders,
    recentActivity, trend, trendMax, parentId: req.session.parentId
  });
});

// ---------- protected pages ----------
app.get('/dashboard', requireAuth, (req, res) => {
  const parent = currentParent(req);
  const students = db.getStudentsByParent(parent.id);
  const bookings = db.getBookingsForParent(parent.id);
  const todayISO = new Date().toISOString().split('T')[0];

  const isActiveToday = (b) => {
    if (b.status === 'cancelled') return false;
    if (b.planType === 'monthly') {
      // A monthly subscription's coverage runs through the end of the
      // calendar month it started in — not 30 raw days.
      return b.startDate <= todayISO && todayISO <= endOfMonthISO(b.startDate);
    }
    // single-day plan: only counts as "today" if it's actually dated today
    return b.startDate === todayISO;
  };

  const studentStatus = students.map(s => {
    const todaysBooking = bookings.find(b => b.studentId === s.id && isActiveToday(b));
    return { student: s, booking: todaysBooking || null };
  });

  const activeBookingCount = bookings.filter(b => b.status !== 'cancelled').length;

  // Quick rebook: offer to repeat the most recent non-cancelled booking
  // without going through the full flow again.
  const lastBooking = bookings.find(b => b.status !== 'cancelled') || null;
  const lastBookingView = lastBooking ? {
    id: lastBooking.id,
    studentName: (students.find(s => s.id === lastBooking.studentId) || {}).name || 'that student',
    mealName: (db.findMenuItem(lastBooking.menuItemId) || {}).name || 'that meal'
  } : null;

  // Active subscription periods: replaces the old wallet-balance stat — with
  // exact per-period charging, what a parent needs to see is which period
  // is currently covering their child, how many real school days it spans,
  // and what was actually paid for it.
  const activeSubscriptionPeriods = bookings
    .filter(b => b.planType === 'monthly' && b.status !== 'cancelled' && isActiveToday(b))
    .map(b => {
      const student = students.find(s => s.id === b.studentId);
      const menuItem = db.findMenuItem(b.menuItemId);
      return {
        studentName: student ? student.name : 'Your child',
        mealName: menuItem ? menuItem.name : 'Meal plan',
        startDate: b.startDate,
        endDate: endOfMonthISO(b.startDate),
        days: b.days,
        totalKWD: b.totalKWD
      };
    });

  // Renewal: a monthly plan within 7 days of the end of its calendar-month
  // coverage gets a real one-tap "Renew" action instead of sending the
  // parent through the booking flow again from scratch.
  const RENEWAL_WINDOW_DAYS = 7;
  const renewalCandidates = bookings
    .filter(b => b.planType === 'monthly' && b.status !== 'cancelled')
    // Skip a plan once it's already been renewed — a newer monthly booking
    // for the same student means this one has been superseded, even though
    // its own row is still technically "upcoming"/"collected".
    .filter(b => !bookings.some(other =>
      other.studentId === b.studentId && other.planType === 'monthly' &&
      other.status !== 'cancelled' && other.startDate > b.startDate
    ))
    .map(b => {
      const windowEnd = new Date(`${endOfMonthISO(b.startDate)}T00:00:00Z`);
      const daysLeft = Math.ceil((windowEnd - new Date()) / (1000 * 60 * 60 * 24));
      return { booking: b, daysLeft };
    })
    .filter(({ daysLeft }) => daysLeft >= 0 && daysLeft <= RENEWAL_WINDOW_DAYS)
    .map(({ booking, daysLeft }) => {
      const student = students.find(s => s.id === booking.studentId);
      const menuItem = db.findMenuItem(booking.menuItemId);
      db.ensureRenewalNotification({
        parentId: parent.id, bookingId: booking.id,
        studentName: student ? student.name : 'Your child', daysLeft
      });
      return {
        bookingId: booking.id, daysLeft,
        studentName: student ? student.name : 'your child',
        mealName: menuItem ? menuItem.name : 'their meal plan'
      };
    });

  const notifications = db.getNotificationsForParent(parent.id, 12);
  const unreadNotificationCount = db.getUnreadNotificationCount(parent.id);

  res.render('dashboard', {
    parent, students, studentStatus, activeBookingCount, lastBooking: lastBookingView,
    activeSubscriptionPeriods, renewalCandidates, notifications, unreadNotificationCount, parentId: parent.id,
    renewed: req.query.renewed === '1', norenewaldays: req.query.norenewaldays === '1'
  });
});

app.post('/notifications/:id/read', requireAuth, (req, res) => {
  const parent = currentParent(req);
  db.markNotificationRead(Number(req.params.id), parent.id);
  res.redirect('/dashboard');
});

app.post('/notifications/read-all', requireAuth, (req, res) => {
  const parent = currentParent(req);
  db.markAllNotificationsRead(parent.id);
  res.redirect('/dashboard');
});

app.post('/booking/:id/renew', requireAuth, (req, res) => {
  const parent = currentParent(req);
  const original = db.findBookingById(Number(req.params.id));
  const student = original ? db.findStudentById(original.studentId) : null;
  if (!original || !student || student.parentId !== parent.id) return res.redirect('/dashboard');

  // Recalculated fresh against the NEW month's real calendar — never a
  // repeat of the previous period's amount, since a different month can
  // have a different number of real school days.
  const plans = db.getPlans();
  const newStartDate = new Date().toISOString().split('T')[0];
  const monthEndISO = endOfMonthISO(newStartDate);
  const schoolDays = db.getSchoolDaysInRange(student.school, newStartDate, monthEndISO);
  const { total, days } = calculateBookingTotal({ planType: original.planType, plans, schoolDays });

  if (days === 0) {
    return res.redirect('/dashboard?norenewaldays=1');
  }

  db.bookAndCharge({
    studentId: student.id, menuItemId: original.menuItemId, planType: original.planType,
    startDate: newStartDate, days, totalKWD: total, parentId: parent.id,
    detailType: 'renewed'
  });
  res.redirect('/dashboard?renewed=1');
});

app.get('/students', requireAuth, (req, res) => {
  const parent = currentParent(req);
  const students = db.getStudentsByParent(parent.id);
  res.render('students', { students, parent, parentId: parent.id, editing: null, error: null, errors: {} });
});

app.get('/students/:id/edit', requireAuth, (req, res) => {
  const parent = currentParent(req);
  const students = db.getStudentsByParent(parent.id);
  const editing = db.findStudentById(Number(req.params.id));
  if (!editing || editing.parentId !== parent.id) return res.redirect('/students');
  res.render('students', { students, parent, parentId: parent.id, editing, error: null, errors: {} });
});

app.post('/students', requireAuth, (req, res) => {
  const parent = currentParent(req);
  const t = res.locals.t;
  const { id, name, civilId, school, class: klass, section, gender, allergies } = req.body;
  const fields = {
    name: (name || '').trim(),
    school, class: (klass || '').trim(), section: (section || '').trim(),
    gender, allergies: (allergies || '').trim()
  };

  // Never trust the client's data-validate hints alone — re-check name,
  // Civil ID format, and class/section here, since this is the actual
  // write path. On failure, re-render with everything the parent already
  // typed (as a synthetic "editing" record) rather than bouncing them
  // back to a blank form.
  const students = db.getStudentsByParent(parent.id);
  const rerenderWithError = (errors) => res.render('students', {
    students, parent, parentId: parent.id, error: null, errors,
    editing: id ? { id: Number(id), ...fields, civilId: db.findStudentById(Number(id)) ? db.findStudentById(Number(id)).civilId : '' } : { ...fields, civilId }
  });

  if (!isValidName(name)) return rerenderWithError({ name: t('students.errName') });
  // school is a <select> offering only the known set — re-check the
  // posted value is actually one of them, since a direct POST can send
  // anything regardless of what the dropdown offered.
  if (!isValidSchool(school)) return rerenderWithError({ school: t('students.errSchool') });
  if (!isValidClassSection(klass) || !isValidClassSection(section)) return rerenderWithError({ class: t('students.errClass') });
  if (!isValidAllergies(allergies)) return rerenderWithError({ allergies: t('students.errAllergies') });
  if (!id && !isValidCivilId(civilId)) return rerenderWithError({ civilId: t('students.errCivilId') });

  if (id) {
    // Civil ID is masked and read-only in the edit form (see students.ejs) —
    // it's never accepted from this branch, so an existing record's Civil ID
    // can't be overwritten via the edit flow.
    const existing = db.findStudentById(Number(id));
    if (existing && existing.parentId === parent.id) db.updateStudent(Number(id), fields);
  } else {
    db.createStudent({ parentId: parent.id, mealType: 'Regular Meal', civilId: (civilId || '').trim(), ...fields });
  }
  res.redirect('/students');
});

app.get('/menu', requireAuth, (req, res) => {
  res.render('menu', { menuItems: db.getMenuItems(), parentId: req.session.parentId });
});

// Real school-day dates for every school one of this parent's students
// attends, over the next ~120 days — embedded into the booking page so the
// client-side total can be computed live (exact charge for a chosen start
// date) without a server round-trip on every date change.
function schoolCalendarForStudents(students) {
  const todayISO = new Date().toISOString().split('T')[0];
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 120);
  const horizonISO = horizon.toISOString().split('T')[0];
  const schools = [...new Set(students.map(s => s.school))];
  const schoolCalendar = {};
  schools.forEach(school => {
    schoolCalendar[school] = db.getSchoolDaysInRange(school, todayISO, horizonISO);
  });
  return schoolCalendar;
}

app.get('/booking', requireAuth, (req, res) => {
  const parent = currentParent(req);
  const students = db.getStudentsByParent(parent.id);
  const menuItems = db.getMenuItems();
  const plans = db.getPlans();
  const studentIds = students.map(s => s.id);
  const rebookRaw = req.query.rebook ? db.findBookingById(Number(req.query.rebook)) : null;
  const rebook = (rebookRaw && studentIds.includes(rebookRaw.studentId)) ? rebookRaw : null;

  // Smart defaults for a fresh (non-rebook) booking: the student picked
  // most recently, and whichever meal this parent books most often — a
  // returning parent shouldn't have to reselect from scratch every time.
  const pastBookings = db.getBookingsForParent(parent.id);
  const mostRecentStudentId = pastBookings.length ? pastBookings.reduce((a, b) => (b.id > a.id ? b : a)).studentId : null;
  const menuCounts = {};
  pastBookings.forEach(b => { menuCounts[b.menuItemId] = (menuCounts[b.menuItemId] || 0) + 1; });
  const mostBookedMenuId = Object.keys(menuCounts).length
    ? Number(Object.keys(menuCounts).reduce((a, b) => (menuCounts[b] > menuCounts[a] ? b : a)))
    : null;

  res.render('booking', {
    students, menuItems, plans, error: null, success: null,
    parentId: parent.id, rebook,
    defaultStudentId: mostRecentStudentId, defaultMenuId: mostBookedMenuId,
    schoolCalendar: schoolCalendarForStudents(students),
    dailyRateKWD: plans.single ? plans.single.rateKWD : 2
  });
});

app.post('/booking', requireAuth, (req, res) => {
  const parent = currentParent(req);
  const students = db.getStudentsByParent(parent.id);
  const menuItems = db.getMenuItems();
  const { studentId, menuItemId, planType, startDate, days } = req.body;

  const plans = db.getPlans();
  const schoolCalendar = schoolCalendarForStudents(students);
  const dailyRateKWD = plans.single ? plans.single.rateKWD : 2;
  const renderArgs = { students, menuItems, plans, parentId: parent.id, rebook: null, schoolCalendar, dailyRateKWD };

  const t = res.locals.t;
  const student = students.find(s => s.id === Number(studentId));
  if (!student) {
    return res.render('booking', { ...renderArgs, error: t('booking.errInvalidStudent'), success: null });
  }

  // Real, always-correct total calculation — the direct fix for the
  // KWD 0.00 bug found in the live system audit. A monthly plan is priced
  // against the real school days between the chosen start date and the end
  // of that calendar month — never a flat rate.
  let total, resolvedDays;
  if (planType === 'monthly') {
    const monthEndISO = endOfMonthISO(startDate);
    const schoolDays = db.getSchoolDaysInRange(student.school, startDate, monthEndISO);
    ({ total, days: resolvedDays } = calculateBookingTotal({ planType, plans, schoolDays }));
    if (resolvedDays === 0) {
      return res.render('booking', {
        ...renderArgs, success: null,
        error: t('booking.errNoSchoolDaysServer', { school: student.school, startDate })
      });
    }
  } else {
    ({ total, days: resolvedDays } = calculateBookingTotal({ planType, days, plans }));
  }

  db.bookAndCharge({
    studentId: student.id,
    menuItemId: Number(menuItemId),
    planType,
    startDate,
    days: resolvedDays,
    totalKWD: total,
    parentId: parent.id,
    detailType: planType === 'monthly' ? 'monthly' : 'single'
  });

  res.render('booking', {
    ...renderArgs, error: null,
    success: t('booking.successMsg', { name: student.name, amount: app.locals.fmtKWD(total) })
  });
});

app.get('/history', requireAuth, (req, res) => {
  const parent = currentParent(req);
  const students = db.getStudentsByParent(parent.id);
  const bookings = db.getBookingsForParent(parent.id).map(b => ({
    ...b,
    student: students.find(s => s.id === b.studentId),
    menuItem: db.findMenuItem(b.menuItemId)
  }));
  res.render('history', { bookings, parentId: parent.id });
});

app.post('/history/:id/cancel', requireAuth, (req, res) => {
  const parent = currentParent(req);
  const booking = db.findBookingById(Number(req.params.id));
  const student = booking ? db.findStudentById(booking.studentId) : null;
  if (booking && student && student.parentId === parent.id && booking.status === 'upcoming') {
    // Cancellation and refund happen in a single database transaction.
    db.cancelAndRefund({ bookingId: booking.id, parentId: parent.id });
  }
  res.redirect('/history');
});

app.get('/profile', requireAuth, (req, res) => {
  const parent = currentParent(req);
  res.render('profile', { parent, parentId: parent.id, success: req.query.success || null, error: null, errors: {} });
});

app.post('/profile', requireAuth, (req, res) => {
  const parent = currentParent(req);
  const t = res.locals.t;
  const { name, email, phone } = req.body;
  const values = { name: (name || '').trim(), email: (email || '').trim(), phone: (phone || '').trim() };
  const rerender = (errors) => res.render('profile', { parent: { ...parent, ...values }, parentId: parent.id, success: null, error: null, errors });
  if (!isValidName(name)) {
    return rerender({ name: t('profile.errName') });
  }
  if (email && !isValidEmail(email)) {
    return rerender({ email: t('profile.errEmail') });
  }
  if (phone && !isValidPhone(phone)) {
    return rerender({ phone: t('profile.errPhone') });
  }
  db.updateParent(parent.id, values);
  res.redirect('/profile?success=1');
});

// ---------- staff section (mirrors the real app's separate Staff area) ----------
app.get('/staff', requireAuth, (req, res) => {
  const parent = currentParent(req);
  const bookings = db.getStaffBookingsByParent(parent.id);
  const plans = db.getPlans();
  res.render('staff', { bookings, parentId: parent.id, success: null, dailyRateKWD: plans.single ? plans.single.rateKWD : 2 });
});

app.post('/staff', requireAuth, (req, res) => {
  const parent = currentParent(req);
  const { menuItemId, startDate } = req.body;
  const plans = db.getPlans();
  db.createStaffBooking({
    staffId: parent.id,
    menuItemId: Number(menuItemId),
    startDate,
    totalKWD: plans.single ? plans.single.rateKWD : 2
  });
  res.redirect('/staff');
});

// ---------- 404 + error handling ----------
app.use((req, res) => {
  res.status(404).render('404', { parentId: req.session.parentId });
});

app.use((err, req, res, next) => {
  if (err && err.code === 'EBADCSRFTOKEN') {
    logger.warn({ url: req.originalUrl }, 'rejected request with invalid/missing CSRF token');
    const t = res.locals.t || ((key) => translate('en', key));
    return res.status(403).send(t('common.formSessionExpired'));
  }
  next(err);
});

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Evo Meals demo system running: http://localhost:${PORT}`);
    logger.info(`Demo login — Civil ID: 111111111111   Password: demo1234`);
  });
}

module.exports = app;
