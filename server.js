require('dotenv').config();

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { createHash, randomBytes } = require('crypto');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const pino = require('pino');
const pinoHttp = require('pino-http');
const { csrfSync } = require('csrf-sync');
const db = require('./db');
const { FEATURES } = require('./lib/features');
const { endOfMonthISO } = require('./lib/pricing');
const { todayInKuwait, addDays } = require('./lib/subscription');
const { validateMealInput, bookingWindow } = require('./lib/booking-input');
const { maskCivilId } = require('./lib/mask');
const {
  isValidName, isValidEmail, isValidCivilId, isValidPhone, isValidOrgName, isValidClass, isValidSection, CLASSES, SECTIONS,
  isStrongPassword, isValidSchool, isValidAllergies
} = require('./lib/validate');
const { t: translate, SUPPORTED_LOCALES } = require('./lib/i18n');

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is not set — copy .env.example to .env and set one before starting the server.');
}

// Request logging carries whatever the HTTP serializers are given. The
// default set logs the entire header block, which means the signed
// session cookie — a live credential — lands in plain text in every log
// line, along with any Authorization header. Redact those, and keep only
// the request fields that are actually useful for debugging.
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.cookie', 'req.headers.authorization',
      'res.headers["set-cookie"]', 'req.body.password', 'req.body.confirmPassword',
      'req.body.civilId', 'req.body.identifier'
    ],
    censor: '[redacted]'
  }
});

const app = express();
app.locals.getSchools = db.getSchools;
const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// A per-request nonce for the three inline <script> blocks this app
// actually has (the i18n bundle in head.ejs, the booking calculator, and
// home.ejs's JSON-LD). Generated before helmet so the directive below can
// read it.
app.use((req, res, next) => {
  res.locals.cspNonce = randomBytes(16).toString('base64');
  next();
});
app.use(helmet({
  // Inspected rather than assumed: every script this app loads is either
  // same-origin or one of three inline blocks, so script-src can be
  // locked down with nonces and no 'unsafe-inline'. Styles are a
  // different matter — there are ~100 inline style attributes plus
  // dynamically generated ones (the admin trend bars' --pct), so
  // style-src still needs 'unsafe-inline'. Removing that is a real
  // production task, not a flag flip; it is recorded as a blocker rather
  // than pretended away.
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      upgradeInsecureRequests: IS_PRODUCTION ? [] : null
    }
  }
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
// Behind a TLS-terminating proxy, Express needs to be told before a
// `secure` cookie will ever be sent. Only in production: switching this on
// locally would mark cookies secure over plain HTTP and silently break
// development sign-in.
if (IS_PRODUCTION) app.set('trust proxy', 1);
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  // Default MemoryStore. It is deliberately left in place: choosing a
  // persistent store is a deployment-architecture decision that has not
  // been made, and inventing one here would imply infrastructure that
  // does not exist. See the final verification document — a production
  // session store is outstanding deployment work, and this process loses
  // every session on restart and cannot be scaled to more than one
  // instance as it stands.
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 30,
    httpOnly: true,
    sameSite: 'lax',
    // Production terminates TLS; local development is plain HTTP.
    secure: IS_PRODUCTION
  }
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
  '/staff', '/notifications', '/school-admin', '/subscriptions'
];
// Pages with a real, translated /ar/... counterpart — used both by the
// locale middleware below (to decide whether a canonical/hreflang alt-locale
// link is even meaningful for the current path) and by /sitemap.xml further
// down. Kept as a single list so the two can never drift out of sync: a
// crawler must never be pointed at an hreflang alternate that 404s (e.g.
// /ar/privacy, which doesn't exist), and a page-with-no-Arabic-route must
// never claim to have a canonical link to a language variant it doesn't have.
const BILINGUAL_PAGES = ['/', '/schools', '/parents', '/how-it-works', '/login', '/register', '/forgot-password', '/corporate-meals', '/about', '/contact'];

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

  const requestedSchool = db.getSchoolBySlug(req.query.school);
  if (requestedSchool) req.session.selectedSchool = requestedSchool.slug;
  let selectedSchool = db.getSchoolBySlug(req.session.selectedSchool);
  if (!selectedSchool && req.session.parentId) {
    selectedSchool = db.getSchoolByName(db.getStudentsByParent(req.session.parentId)[0]?.school);
  }
  res.locals.selectedSchool = selectedSchool || null;
  res.locals.features = FEATURES;
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

// Account-creation and reset endpoints are unauthenticated and write (or
// appear to write) records, so they get their own budget. Deliberately
// looser than the login limiter: these are not credential-guessing
// surfaces, and a parent who mistypes a form several times must not be
// locked out of registering. No CAPTCHA, no added friction for ordinary
// use.
const writeFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: (req, res) => res.locals.t('common.tooManyRequests')
});

// Sign-in, registration and any other privilege change must not continue
// on the session identifier the visitor arrived with — otherwise an
// identifier planted before sign-in stays valid afterwards (session
// fixation). express-session's regenerate() issues a new id and drops the
// old session, so anything worth carrying across has to be re-applied by
// hand; here that is the display locale and nothing else.
function startAuthenticatedSession(req, res, assign, destination) {
  const locale = req.session.locale;
  req.session.regenerate((regenerateErr) => {
    if (regenerateErr) {
      logger.error({ err: regenerateErr }, 'failed to regenerate session on authentication');
      return res.status(500).render('500', { parentId: null });
    }
    if (locale) req.session.locale = locale;
    assign(req.session);
    // Save before redirecting so the new identifier is definitely stored
    // before the browser follows the redirect with it.
    req.session.save((saveErr) => {
      if (saveErr) {
        logger.error({ err: saveErr }, 'failed to save regenerated session');
        return res.status(500).render('500', { parentId: null });
      }
      res.redirect(destination);
    });
  });
}

// ---------- helpers ----------
// Version local CSS/JS by content, so returning browsers receive refinements.
const assetVersions = new Map();
app.locals.assetVersion = (file) => {
  const location = path.join(__dirname, 'public', file);
  const modified = fs.statSync(location).mtimeMs;
  const cached = assetVersions.get(file);
  if (cached && cached.modified === modified) return cached.version;
  const version = createHash('sha256').update(fs.readFileSync(location)).digest('hex').slice(0, 12);
  assetVersions.set(file, { modified, version });
  return version;
};
app.locals.fmtMonth = (month, locale = 'en') => new Date(month + '-01T00:00:00Z').toLocaleDateString(locale === 'ar' ? 'ar-KW' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
app.locals.fmtMealDate = (date, locale = 'en') => new Date(date + 'T00:00:00Z').toLocaleDateString(locale === 'ar' ? 'ar-KW' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
app.locals.maskCivilId = maskCivilId;
app.locals.classes = CLASSES;
app.locals.sections = SECTIONS;
app.locals.bookingWindow = bookingWindow;
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
// Compact day/month for dense axes. Deliberately the same en-GB numerals
// as fmtDate: a Civil ID, a KWD amount and a date all stay in one
// readable numeric form inside an RTL page, isolated with <bdi> at the
// call site rather than mirrored.
app.locals.fmtDateShort = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
// Takes `t` explicitly (rather than reading res.locals itself) since it's
// called from templates, where the request's own `t` is already in scope.
app.locals.timeAgo = (iso, t) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  // A timestamp ahead of now is not "just now", and no amount of "ago"
  // phrasing describes it truthfully — fall back to the absolute date
  // rather than letting motion-free text state the wrong thing. Kuwait
  // business-day/timezone semantics remain an unresolved Phase 3B rule.
  if (diffMs < 0) return app.locals.fmtDate(iso);
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
  if (n.type === 'subscription_confirmed') return t('notifications.subscriptionConfirmed', { ...p, total: fmtKWD(p.total) });
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
// Asset identity is the menu item's stable database id, not its display
// name: a display name is presentation, and the moment one is translated
// or corrected the image silently disappears. The name map is retained
// only as a fallback for a record whose id isn't in the asset map (e.g. a
// row added outside the seed), so no existing dish image can break.
const DISH_IMAGE_SLUGS_BY_ID = {
  1: 'dish-arabiatta-pasta',
  2: 'dish-balsamic-chicken-beans',
  3: 'dish-bbq-beef-burger',
  4: 'dish-bbq-chicken-sweet-potato',
  5: 'dish-seasonal-fruit-cup'
};
const DISH_IMAGE_SLUGS_BY_NAME = {
  'Arabiatta Chicken Pasta': 'dish-arabiatta-pasta',
  'Balsamic Chicken & Beans': 'dish-balsamic-chicken-beans',
  'BBQ Beef Burger': 'dish-bbq-beef-burger',
  'BBQ Chicken & Sweet Potato': 'dish-bbq-chicken-sweet-potato',
  'Seasonal Fruit Cup': 'dish-seasonal-fruit-cup'
};
// Accepts a menu item (preferred) or a bare name (legacy callers).
app.locals.dishImageSlug = (item) => {
  if (!item) return null;
  if (typeof item === 'string') return DISH_IMAGE_SLUGS_BY_NAME[item] || null;
  return DISH_IMAGE_SLUGS_BY_ID[item.id] || DISH_IMAGE_SLUGS_BY_NAME[item.name] || null;
};

function requireAuth(req, res, next) {
  if (!req.session.parentId) return res.redirect(req.session.locale === 'ar' ? '/ar/login' : '/login');
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
    plans: db.getPlans(), dailyRateKWD: db.getDailyRate()
  });
});

app.get(['/schools', '/ar/schools'], (req, res) => {
  res.render('schools', { parentId: req.session.parentId, success: req.query.success || null, errors: null, formData: null });
});

app.post(['/schools/inquiry', '/ar/schools/inquiry'], writeFormLimiter, (req, res) => {
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
    groups: res.locals.selectedSchool ? db.getMenuForSchool(res.locals.selectedSchool.id) : []
  });
});

app.get(['/caterers', '/ar/caterers'], (req, res) => res.redirect(301, (req.path.startsWith('/ar') ? '/ar' : '') + '/corporate-meals'));

app.get(['/corporate-meals', '/ar/corporate-meals'], (req, res) => {
  res.render('corporate-meals', { parentId: req.session.parentId, success: req.query.success || null, errors: null, formData: null });
});

app.post(['/corporate-meals/inquiry', '/ar/corporate-meals/inquiry'], writeFormLimiter, (req, res) => {
  const { organizationName, contactName, email, phone, scaleInfo, message } = req.body;
  const t = res.locals.t;
  const errors = {};
  if (!isValidOrgName(organizationName)) errors.organizationName = t('corporate.form.errOrgName');
  if (!isValidName(contactName)) errors.contactName = t('corporate.form.errContactName');
  if (!isValidEmail(email)) errors.email = t('corporate.form.errEmail');
  if (phone && !isValidPhone(phone)) errors.phone = t('corporate.form.errPhone');
  if (typeof message !== 'string' || message.trim().length < 10 || message.trim().length > 2000) errors.message = t('corporate.form.errMessage');

  if (!['1–25','26–100','101–250','250+'].includes(scaleInfo)) errors.scaleInfo = t('corporate.form.errScale');

  if (Object.keys(errors).length) {
    return res.status(422).render('corporate-meals', { parentId: req.session.parentId, success: null, errors, formData: req.body });
  }

  db.createInquiry({
    type: 'corporate', organizationName: organizationName.trim(), contactName: contactName.trim(),
    contactRole: '', email: email.trim(), phone: (phone || '').trim(),
    scaleInfo: (scaleInfo || '').trim(), currentArrangement: '', message: message.trim()
  });
  logger.info({ organizationName }, 'corporate inquiry received');
  res.redirect((req.path.startsWith('/ar') ? '/ar/corporate-meals' : '/corporate-meals') + '?success=1');
});

app.get(['/how-it-works', '/ar/how-it-works'], (req, res) => {
  res.render('how-it-works', { parentId: req.session.parentId });
});

app.get(['/features', '/ar/features'], (req, res) => {
  res.redirect(301, (req.path.startsWith('/ar') ? '/ar' : '') + '/how-it-works#features');
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

app.post(['/contact', '/ar/contact'], writeFormLimiter, (req, res) => {
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
  logger.info('contact form checked (demo — not sent or saved)');
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
Allow: /corporate-meals
Allow: /ar/corporate-meals
Allow: /how-it-works
Allow: /ar/how-it-works
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
  // Carry the language they logged in with into the authenticated app,
  // which has no URL-based locale of its own (see the locale middleware).
  const locale = req.path.startsWith('/ar') ? 'ar' : 'en';
  startAuthenticatedSession(req, res, (session) => {
    session.parentId = parent.id;
    session.locale = locale;
  }, '/dashboard');
});

app.get(['/forgot-password', '/ar/forgot-password'], (req, res) => {
  res.render('forgot-password', { submitted: false, error: null, errors: {}, identifier: '', parentId: req.session.parentId });
});

app.post(['/forgot-password', '/ar/forgot-password'], writeFormLimiter, (req, res) => {
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
  logger.info('forgot-password demo completed; no email sent');
  res.render('forgot-password', { submitted: true, error: null, errors: {}, identifier: '', parentId: req.session.parentId });
});

app.get(['/register', '/ar/register'], (req, res) => {
  res.render('register', { error: null, errors: {}, parentId: req.session.parentId, values: null });
});

app.post(['/register', '/ar/register'], writeFormLimiter, (req, res) => {
  const { name, civilId, email, phone, password, confirmPassword, agreeTerms } = req.body;
  const t = res.locals.t;
  // Re-rendered on every failure below with the non-sensitive fields the
  // parent already typed (never the password) so a validation error never
  // means retyping the whole form — spec requirement: preserve valid
  // entered values on validation failure.
  const values = { name: (name || '').trim(), civilId: (civilId || '').trim(), email: (email || '').trim(), phone: (phone || '').trim(), agreeTerms: agreeTerms === 'on' };
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
  if (agreeTerms !== 'on') {
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
  const registeredLocale = req.path.startsWith('/ar') ? 'ar' : 'en';
  startAuthenticatedSession(req, res, (session) => {
    session.parentId = parent.id;
    session.locale = registeredLocale;
  }, '/dashboard');
});

// Signing out changes authentication state, so it is a POST carrying the
// CSRF token rather than a link any third-party page could trigger with
// an <img> or a redirect. Both callers (the parent nav and the admin nav)
// submit a real form, so it stays a single visible control and keeps
// working without JavaScript.
app.post('/logout', (req, res) => {
  const home = req.session.locale === 'ar' ? '/ar' : '/';
  req.session.destroy(() => res.redirect(home));
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
  startAuthenticatedSession(req, res, (session) => {
    session.schoolAdminId = admin.id;
  }, '/school-admin/dashboard');
});

app.post('/school-admin/logout', (req, res) => {
  const destination = req.session.locale === 'ar' ? '/locale/ar?returnTo=%2Fschool-admin%2Flogin' : '/school-admin/login';
  req.session.destroy(() => res.redirect(destination));
});

app.get('/school-admin/dashboard', requireSchoolAdmin, (req, res) => {
  const admin = currentSchoolAdmin(req);
  const students = db.getStudentsBySchool(admin.school);
  const subscriptions = [...new Set(students.map(s => s.parentId))].flatMap(id => db.getSubscriptions(id)).filter(s => s.school === admin.school);
  const today = todayInKuwait();
  const meals = subscriptions.flatMap(s => db.getSubscriptionMeals(s.id));
  const activeSubscriptions = subscriptions.filter(s => s.months.some(m => m.month === today.slice(0,7))).length;
  const todaysMeals = meals.filter(m => m.date === today).length;
  const pendingOrders = meals.filter(m => m.date > today && m.date <= addDays(today,7)).length;
  const trend = Array.from({ length:14 }, (_, i) => { const date=addDays(today,i-13); return { date, count:meals.filter(m=>m.date===date).length }; });
  const recentActivity = subscriptions.sort((a,b)=>b.created_at.localeCompare(a.created_at) || b.id-a.id).slice(0,10);
  res.render('school-admin-dashboard', { admin, students, activeSubscriptions, todaysMeals, pendingOrders,
    recentActivity, trend, trendMax:Math.max(1,...trend.map(t=>t.count)), parentId:req.session.parentId });
});

// ---------- protected pages ----------
app.get('/dashboard', requireAuth, (req, res) => {
  const parent = currentParent(req);
  const students = db.getStudentsByParent(parent.id);
  const subscriptions = db.getSubscriptions(parent.id);
  const today = todayInKuwait();
  const studentStatus = students.map(student => {
    const subscription = subscriptions.find(s => s.student_id===student.id && s.months.some(m=>m.month===today.slice(0,7)));
    const meal = subscription ? db.getSubscriptionMeals(subscription.id).find(m=>m.date===today) : null;
    return { student, booking:meal ? { status:'upcoming' } : null, menuItem:meal ? db.findMenuItem(meal.menu_item_id) : null };
  });
  const activeSubscriptionPeriods = subscriptions.flatMap(s=>s.months.filter(m=>m.month===today.slice(0,7)).map(m=>({
    studentName:s.student_name, startDate:m.startDate, endDate:m.endDate, days:m.meal_days, totalKWD:m.amount_kwd
  })));
  res.render('dashboard', { parent, students, studentStatus, activeSubscriptionPeriods, activeBookingCount:subscriptions.length,
    notifications:db.getNotificationsForParent(parent.id,12), unreadNotificationCount:db.getUnreadNotificationCount(parent.id), parentId:parent.id });
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
  if (id && db.findStudentById(Number(id))?.parentId !== parent.id) return res.status(404).render('404', { parentId: parent.id });
  const string = value => typeof value === 'string' ? value.trim() : '';
  const fields = {
    name: string(name),
    school, class: string(klass), section: string(section),
    gender, allergies: string(allergies)
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
  if (!isValidClass(klass)) return rerenderWithError({ class: t('students.errClass') });
  if (!isValidSection(section)) return rerenderWithError({ section: t('students.errSection') });
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
  res.render('menu', { schoolMenus: [...new Set(db.getStudentsByParent(req.session.parentId).map(s => s.school))].map(name => db.getSchoolByName(name)).filter(Boolean).map(school => ({ school, groups: db.getMenuForSchool(school.id) })), parentId: req.session.parentId });
});

require('./lib/subscription-routes')(app, db, requireAuth);

app.get('/history', requireAuth, (req, res) => {
  res.render('history', { subscriptions: db.getSubscriptions(req.session.parentId), parentId:req.session.parentId });
});
app.get('/history/:subscriptionId/invoice.pdf', requireAuth, (req, res, next) => {
  const subscription = db.getSubscription(Number(req.params.subscriptionId), req.session.parentId);
  if (!subscription) return res.status(404).render('404', { parentId:req.session.parentId });
  const doc = require('./lib/invoice').invoiceDocument(subscription, currentParent(req));
  res.type('application/pdf').attachment(subscription.invoice_number + '.pdf');
  doc.on('error', next); doc.pipe(res); doc.end();
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
function staffView(req, res, error = null, status = 200) {
  const parent = currentParent(req);
  // Staff rows already reference the same authoritative menu_items rows
  // the parent booking flow uses — resolve the meal so the record list
  // shows what was booked, not just a date and an amount.
  const bookings = db.getStaffBookingsByParent(parent.id).map(b => ({
    ...b, menuItem: db.findMenuItem(b.menuItemId)
  }));
  res.status(status).render('staff', {
    bookings, parentId: parent.id,
    success: req.query.success === '1', error, values: req.method === 'POST' ? req.body : {},
    menuItems: db.getMenuItems(), dailyRateKWD: db.getDailyRate()
  });
}
app.get('/staff', requireAuth, (req, res) => staffView(req, res));
app.post('/staff', requireAuth, (req, res) => {
  const error = validateMealInput(req.body, { menuItems: db.getMenuItems(), staff: true, ...bookingWindow() });
  if (error) return staffView(req, res, res.locals.t('booking.' + error), 422);
  const rate = db.getDailyRate();
  if (!Number.isFinite(rate) || rate <= 0) return staffView(req, res, res.locals.t('booking.errInvalidPrice'), 422);
  db.createStaffBooking({ staffId: currentParent(req).id, menuItemId: Number(req.body.menuItemId), startDate: req.body.startDate, totalKWD: rate });
  res.redirect('/staff?success=1');
});

// ---------- 404 + error handling ----------
app.use((req, res) => {
  res.status(404).render('404', { parentId: req.session.parentId });
});

// Named and exported so it can be exercised directly in tests: no
// ordinary request to this application produces an unhandled throw, and a
// safety net that is never tested is not a safety net.
// eslint-disable-next-line no-unused-vars -- Express identifies an error
// handler by its four-argument signature.
function errorHandler(err, req, res, next) {
  const t = res.locals.t || ((key) => translate('en', key));

  if (err && err.code === 'EBADCSRFTOKEN') {
    logger.warn({ url: req.originalUrl }, 'rejected request with invalid/missing CSRF token');
    return res.status(403).send(t('common.formSessionExpired'));
  }

  // The full error — message, stack, any driver detail — goes to the log,
  // where it is useful. It does not go to the client: Express's default
  // handler renders the stack trace into the response outside production,
  // which hands a visitor filesystem paths and internal error text for
  // nothing more than malformed input.
  logger.error({ err, url: req.originalUrl, method: req.method }, 'unhandled application error');

  if (res.headersSent) return next(err);

  res.status(err && err.status ? err.status : 500);
  res.render('500', { parentId: req.session && req.session.parentId }, (renderErr, html) => {
    // Never let the error page's own failure resurface as a stack trace.
    if (renderErr) {
      logger.error({ err: renderErr }, 'failed to render the error page');
      return res.type('text/plain').send(t('serverError.heading'));
    }
    res.send(html);
  });
}
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Evo Meals demo system running: http://localhost:${PORT}`);
    logger.info(`Demo login — Civil ID: 111111111111   Password: demo1234`);
  });
}

module.exports = app;
module.exports.errorHandler = errorHandler;
