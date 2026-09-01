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
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 4, httpOnly: true, sameSite: 'lax' }
}));

const { csrfSynchronisedProtection } = csrfSync({
  getTokenFromRequest: (req) => req.body && req.body._csrf
});
app.use(csrfSynchronisedProtection);
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts. Please wait a few minutes and try again.'
});

// ---------- helpers ----------
app.locals.maskCivilId = maskCivilId;
app.locals.fmtKWD = (n) => `KWD ${Number(n).toFixed(3)}`;
app.locals.fmtDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
app.locals.fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
app.locals.timeAgo = (iso) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return app.locals.fmtDate(iso);
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
app.get('/', (req, res) => {
  res.render('home', {
    parentId: req.session.parentId,
    menuItems: db.getMenuItems(),
    plans: db.getPlans()
  });
});

app.get('/schools', (req, res) => {
  res.render('schools', { parentId: req.session.parentId, success: req.query.success || null, errors: null, formData: null });
});

app.post('/schools/inquiry', (req, res) => {
  const { organizationName, contactName, contactRole, email, phone, scaleInfo, currentArrangement, message } = req.body;
  const errors = {};
  if (!organizationName || !organizationName.trim()) errors.organizationName = 'School name is required.';
  if (!contactName || !contactName.trim()) errors.contactName = 'Contact person is required.';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'A valid email address is required.';
  if (!message || message.trim().length < 10) errors.message = 'Tell us a little more — at least 10 characters.';

  if (Object.keys(errors).length) {
    return res.render('schools', { parentId: req.session.parentId, success: null, errors, formData: req.body });
  }

  db.createInquiry({
    type: 'school', organizationName: organizationName.trim(), contactName: contactName.trim(),
    contactRole: (contactRole || '').trim(), email: email.trim(), phone: (phone || '').trim(),
    scaleInfo: (scaleInfo || '').trim(), currentArrangement: (currentArrangement || '').trim(), message: message.trim()
  });
  logger.info({ organizationName }, 'school partnership inquiry received');
  res.redirect('/schools?success=1');
});

app.get('/parents', (req, res) => {
  res.render('parents', {
    parentId: req.session.parentId,
    menuItems: db.getMenuItems(),
    plans: db.getPlans()
  });
});

app.get('/caterers', (req, res) => {
  res.render('caterers', { parentId: req.session.parentId, success: req.query.success || null, errors: null, formData: null });
});

app.post('/caterers/inquiry', (req, res) => {
  const { organizationName, contactName, email, phone, scaleInfo, message } = req.body;
  const errors = {};
  if (!organizationName || !organizationName.trim()) errors.organizationName = 'Company name is required.';
  if (!contactName || !contactName.trim()) errors.contactName = 'Contact person is required.';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'A valid email address is required.';
  if (!message || message.trim().length < 10) errors.message = 'Tell us a little more — at least 10 characters.';

  if (Object.keys(errors).length) {
    return res.render('caterers', { parentId: req.session.parentId, success: null, errors, formData: req.body });
  }

  db.createInquiry({
    type: 'caterer', organizationName: organizationName.trim(), contactName: contactName.trim(),
    contactRole: '', email: email.trim(), phone: (phone || '').trim(),
    scaleInfo: (scaleInfo || '').trim(), currentArrangement: '', message: message.trim()
  });
  logger.info({ organizationName }, 'caterer application received');
  res.redirect('/caterers?success=1');
});

app.get('/about', (req, res) => {
  res.render('about', { parentId: req.session.parentId });
});

app.get('/privacy', (req, res) => {
  res.render('privacy', { parentId: req.session.parentId });
});

app.get('/terms', (req, res) => {
  res.render('terms', { parentId: req.session.parentId });
});

app.get('/contact', (req, res) => {
  res.render('contact', { parentId: req.session.parentId, success: req.query.success || null, error: null });
});

app.post('/contact', (req, res) => {
  const { name, email, role, message } = req.body;
  if (!name || !email || !message) {
    return res.render('contact', {
      parentId: req.session.parentId, success: null,
      error: 'Name, email, and a short message are required.'
    });
  }
  // Demo only — no email/CRM integration wired up yet. In production this
  // would notify the partnerships team (see the note in views/contact.ejs).
  logger.info({ name, email, role }, 'contact form submission (demo — not sent anywhere)');
  res.redirect('/contact?success=1');
});

app.get('/sitemap.xml', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const pages = ['/', '/schools', '/parents', '/caterers', '/about', '/contact', '/privacy', '/terms', '/login', '/register'];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
    .map(p => `  <url><loc>${base}${p}</loc></url>`)
    .join('\n')}\n</urlset>`;
  res.type('application/xml').send(body);
});

app.get('/robots.txt', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  res.type('text/plain').send(
`User-agent: *
Allow: /
Allow: /schools
Allow: /parents
Allow: /caterers
Allow: /about
Allow: /contact
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

Sitemap: ${base}/sitemap.xml
`);
});

app.get('/login', (req, res) => {
  res.render('login', { error: null, parentId: req.session.parentId });
});

app.post('/login', loginLimiter, (req, res) => {
  const { civilId, password } = req.body;
  const parent = db.findParentByCivilId((civilId || '').trim());
  if (!parent || !bcrypt.compareSync(password || '', parent.passwordHash)) {
    return res.render('login', { error: 'Civil ID or password is incorrect. Try the demo login shown below.', parentId: null });
  }
  req.session.parentId = parent.id;
  res.redirect('/dashboard');
});

app.get('/register', (req, res) => {
  res.render('register', { error: null, parentId: req.session.parentId });
});

app.post('/register', (req, res) => {
  const { name, civilId, email, phone, password } = req.body;
  if (!name || !civilId || !password) {
    return res.render('register', { error: 'Name, Civil ID, and password are required.', parentId: null });
  }
  if (db.findParentByCivilId(civilId.trim())) {
    return res.render('register', { error: 'An account with that Civil ID already exists — try logging in instead.', parentId: null });
  }
  const parent = db.createParent({
    name: name.trim(),
    civilId: civilId.trim(),
    email: (email || '').trim(),
    phone: (phone || '').trim(),
    passwordHash: bcrypt.hashSync(password, 10)
  });
  req.session.parentId = parent.id;
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
  res.render('school-admin-login', { error: null, parentId: req.session.parentId });
});

app.post('/school-admin/login', loginLimiter, (req, res) => {
  const { email, password } = req.body;
  const admin = db.findSchoolAdminByEmail((email || '').trim().toLowerCase());
  if (!admin || !bcrypt.compareSync(password || '', admin.passwordHash)) {
    return res.render('school-admin-login', { error: 'Email or password is incorrect. Try the demo login shown below.', parentId: req.session.parentId });
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
        message: `${student ? student.name : 'Your child'}'s subscription period ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'} — renew to keep meals booked without a gap.`
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

  const menuItem = db.findMenuItem(original.menuItemId);
  db.bookAndCharge({
    studentId: student.id, menuItemId: original.menuItemId, planType: original.planType,
    startDate: newStartDate, days, totalKWD: total, parentId: parent.id,
    note: `${student.name} — ${menuItem ? menuItem.name : 'Meal plan'}, renewed subscription`
  });
  res.redirect('/dashboard?renewed=1');
});

app.get('/students', requireAuth, (req, res) => {
  const parent = currentParent(req);
  const students = db.getStudentsByParent(parent.id);
  res.render('students', { students, parent, parentId: parent.id, editing: null });
});

app.get('/students/:id/edit', requireAuth, (req, res) => {
  const parent = currentParent(req);
  const students = db.getStudentsByParent(parent.id);
  const editing = db.findStudentById(Number(req.params.id));
  if (!editing || editing.parentId !== parent.id) return res.redirect('/students');
  res.render('students', { students, parent, parentId: parent.id, editing });
});

app.post('/students', requireAuth, (req, res) => {
  const parent = currentParent(req);
  const { id, name, civilId, school, class: klass, section, gender, allergies } = req.body;
  const fields = {
    name: (name || '').trim(),
    school, class: klass, section: (section || '').trim(),
    gender, allergies: (allergies || '').trim()
  };
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
  res.render('booking', {
    students, menuItems, plans, error: null, success: null,
    parentId: parent.id, rebook,
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

  const student = students.find(s => s.id === Number(studentId));
  if (!student) {
    return res.render('booking', { ...renderArgs, error: 'Choose a valid student.', success: null });
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
        error: `${student.school} has no school days left between ${startDate} and the end of that month. Try a start date next month instead.`
      });
    }
  } else {
    ({ total, days: resolvedDays } = calculateBookingTotal({ planType, days, plans }));
  }

  const menuItem = db.findMenuItem(Number(menuItemId));
  db.bookAndCharge({
    studentId: student.id,
    menuItemId: Number(menuItemId),
    planType,
    startDate,
    days: resolvedDays,
    totalKWD: total,
    parentId: parent.id,
    note: `${student.name} — ${menuItem ? menuItem.name : 'Meal plan'}, ${planType === 'monthly' ? resolvedDays + ' real school day(s) this month' : resolvedDays + ' day(s)'}`
  });

  res.render('booking', {
    ...renderArgs, error: null,
    success: `Booking confirmed for ${student.name} — ${app.locals.fmtKWD(total)} charged via KNET (demo — no real payment processed).`
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
  res.render('profile', { parent, parentId: parent.id, success: req.query.success || null });
});

app.post('/profile', requireAuth, (req, res) => {
  const parent = currentParent(req);
  const { name, email, phone } = req.body;
  db.updateParent(parent.id, { name: (name || '').trim(), email: (email || '').trim(), phone: (phone || '').trim() });
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
    return res.status(403).send('Form session expired. Please go back, refresh the page, and try again.');
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
