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
const { calculateBookingTotal, canAfford } = require('./lib/pricing');
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

function requireAuth(req, res, next) {
  if (!req.session.parentId) return res.redirect('/login');
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

// ---------- protected pages ----------
app.get('/dashboard', requireAuth, (req, res) => {
  const parent = currentParent(req);
  const students = db.getStudentsByParent(parent.id);
  const wallet = db.getWallet(parent.id);
  const bookings = db.getBookingsForParent(parent.id);
  const todayISO = new Date().toISOString().split('T')[0];

  const studentStatus = students.map(s => {
    const todaysBooking = bookings.find(b => {
      if (b.studentId !== s.id) return false;
      if (b.status === 'cancelled') return false;
      if (b.planType === 'monthly') {
        const start = new Date(b.startDate);
        const windowEnd = new Date(start);
        windowEnd.setDate(windowEnd.getDate() + 30);
        return b.startDate <= todayISO && todayISO <= windowEnd.toISOString().split('T')[0];
      }
      // single-day plan: only counts as "today" if it's actually dated today
      return b.startDate === todayISO;
    });
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

  res.render('dashboard', { parent, students, wallet, studentStatus, activeBookingCount, lastBooking: lastBookingView, parentId: parent.id });
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

app.get('/booking', requireAuth, (req, res) => {
  const parent = currentParent(req);
  const students = db.getStudentsByParent(parent.id);
  const wallet = db.getWallet(parent.id);
  const menuItems = db.getMenuItems();
  const plans = db.getPlans();
  const studentIds = students.map(s => s.id);
  const rebookRaw = req.query.rebook ? db.findBookingById(Number(req.query.rebook)) : null;
  const rebook = (rebookRaw && studentIds.includes(rebookRaw.studentId)) ? rebookRaw : null;
  res.render('booking', {
    students, wallet, menuItems, plans, error: null, success: null,
    parentId: parent.id, rebook
  });
});

app.post('/booking', requireAuth, (req, res) => {
  const parent = currentParent(req);
  const students = db.getStudentsByParent(parent.id);
  const wallet = db.getWallet(parent.id);
  const menuItems = db.getMenuItems();
  const { studentId, menuItemId, planType, startDate, days } = req.body;

  const plans = db.getPlans();
  const student = students.find(s => s.id === Number(studentId));
  if (!student) {
    return res.render('booking', { students, wallet, menuItems, plans, error: 'Choose a valid student.', success: null, parentId: parent.id, rebook: null });
  }

  // Real, always-correct total calculation — this is the direct fix for the
  // KWD 0.00 bug found in the live system audit: the total is computed from
  // an actual selected plan and quantity (with pricing loaded from the
  // database, not hardcoded), never left unconfigured.
  const { total, days: resolvedDays } = calculateBookingTotal({ planType, days, plans });

  if (!canAfford(total, wallet.balanceKWD)) {
    return res.render('booking', {
      students, wallet, menuItems, plans, success: null,
      error: `Insufficient wallet balance. This booking costs ${app.locals.fmtKWD(total)}, but your wallet has ${app.locals.fmtKWD(wallet.balanceKWD)}. Top up your wallet first.`,
      parentId: parent.id, rebook: null
    });
  }

  const menuItem = db.findMenuItem(Number(menuItemId));
  // Booking creation and the wallet debit happen in a single database
  // transaction — if the process crashes partway through, neither write lands.
  db.bookAndCharge({
    studentId: student.id,
    menuItemId: Number(menuItemId),
    planType,
    startDate,
    days: resolvedDays,
    totalKWD: total,
    parentId: parent.id,
    note: `${student.name} — ${menuItem ? menuItem.name : 'Meal plan'}, ${planType === 'monthly' ? 'monthly plan' : resolvedDays + ' day(s)'}`
  });

  const freshWallet = db.getWallet(parent.id);
  res.render('booking', {
    students, wallet: freshWallet, menuItems, plans, error: null,
    success: `Booking confirmed for ${student.name} — ${app.locals.fmtKWD(total)} deducted from your wallet.`,
    parentId: parent.id, rebook: null
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

app.get('/wallet', requireAuth, (req, res) => {
  const parent = currentParent(req);
  const wallet = db.getWallet(parent.id);
  const transactions = db.getWalletTransactions(parent.id);
  res.render('wallet', { wallet, transactions, parentId: parent.id, success: req.query.success || null });
});

// Real KNET/Bookey integration slots in here once sandbox credentials are
// issued (see .env.example — KNET_MERCHANT_ID / KNET_API_KEY). Route and
// response shape are stable so the frontend never has to change; only the
// body of this function needs to become a real gateway call.
function processTopUp(parent, amountKWD) {
  if (process.env.KNET_MERCHANT_ID && process.env.KNET_API_KEY) {
    throw new Error('KNET/Bookey integration not yet implemented — credentials are configured but no gateway call exists yet.');
  }
  db.adjustWallet(parent.id, amountKWD, 'credit', 'Wallet top-up via KNET (demo — no real payment processed)');
}

app.post('/wallet/topup', requireAuth, (req, res) => {
  const parent = currentParent(req);
  const amount = Math.max(0, parseFloat(req.body.amount) || 0);
  if (amount > 0) {
    processTopUp(parent, amount);
  }
  res.redirect('/wallet?success=1');
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
  res.render('staff', { bookings, parentId: parent.id, success: null });
});

app.post('/staff', requireAuth, (req, res) => {
  const parent = currentParent(req);
  const { menuItemId, startDate } = req.body;
  db.createStaffBooking({
    staffId: parent.id,
    menuItemId: Number(menuItemId),
    startDate,
    totalKWD: 1.500
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
