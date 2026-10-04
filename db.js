// db.js — SQLite-backed data layer (via better-sqlite3).
//
// This replaced the original JSON-file datastore. Every function here keeps
// the exact name and signature it had before, so server.js did not need to
// change for the swap itself — only the two spots that needed real
// transactional safety (booking + notification, cancellation + refund)
// gained new atomic functions (see bookAndCharge / cancelAndRefund below),
// and the two spots that needed live pricing gained getPlans().

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { migrate } = require('./db/migrate');
const { todayInKuwait } = require('./lib/subscription');
const { SCHOOLS } = require('./lib/validate');
const { FEATURES } = require('./lib/features');

const DB_FILE = process.env.DATABASE_FILE || path.join(__dirname, 'evo360.db');
const SEED_FILE = path.join(__dirname, 'seed.json');

const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------- School calendar (illustrative placeholder) ----------
// Real, school-confirmed calendars aren't available yet — Evo Meals is
// currently calibrating this system with The English School specifically,
// as the reference school. Until that real calendar lands, every school
// gets the same generated placeholder: the standard Kuwait school week
// (Sunday–Thursday, Friday/Saturday weekend) plus a couple of illustrative
// example holidays. Generated relative to the seeding date (like the
// __TODAY__ tokens below) rather than hardcoded, so the demo always has
// real day-level data to price against, regardless of when it's reseeded.
// The one real daily/per-meal rate — prices both the single-day plan and,
// multiplied by real school days, the monthly subscription (see
// lib/pricing.js). Single source of truth: seeded into the `plans` table
// below and reused here at seed time so demo totals match production math.
const DAILY_RATE_KWD = 2.000;

const CALENDAR_SCHOOLS = SCHOOLS;
const CALENDAR_WINDOW_DAYS_BACK = 45;

const CALENDAR_HOLIDAY_OFFSETS = [9, 10, 38]; // illustrative example holidays, relative to seeding day

function generateCalendarDays(today) {
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - CALENDAR_WINDOW_DAYS_BACK);
  const end = new Date(today);
  end.setUTCMonth(end.getUTCMonth() + 9, 0);

  const holidayISODates = new Set(CALENDAR_HOLIDAY_OFFSETS.map(offset => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().split('T')[0];
  }));

  const days = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().split('T')[0];
    const dayOfWeek = d.getUTCDay(); // 0 = Sun ... 6 = Sat
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Kuwait weekend: Fri/Sat
    const isSchoolDay = !isWeekend && !holidayISODates.has(iso);
    days.push({ date: iso, isSchoolDay });
  }
  return days;
}

// Fill missing placeholder calendar rows at startup; never overwrite school-supplied rows.
function ensureCalendarCoverage() {
  const days = generateCalendarDays(new Date(todayInKuwait() + 'T00:00:00Z'));
  const insert = db.prepare('INSERT OR IGNORE INTO school_calendar_days(school,date,is_school_day) VALUES(?,?,?)');
  db.transaction(() => { CALENDAR_SCHOOLS.forEach(school => days.forEach(d => insert.run(school, d.date, d.isSchoolDay ? 1 : 0))); })();
}

migrate(db);
seedIfEmpty();
ensureCalendarCoverage();
const subscriptions = require('./db/subscriptions')(db);
subscriptions.seedDemoSubscriptions(JSON.parse(fs.readFileSync(SEED_FILE, 'utf8')));

// ---------- row <-> object mapping ----------
function mapParent(r) {
  if (!r) return undefined;
  return {
    id: r.id, civilId: r.civil_id, name: r.name, email: r.email, phone: r.phone,
    passwordHash: r.password_hash, createdAt: r.created_at
  };
}
function mapStudent(r) {
  if (!r) return undefined;
  return {
    id: r.id, parentId: r.parent_id, name: r.name, civilId: r.civil_id,
    school: r.school, class: r.class, section: r.section, gender: r.gender,
    mealType: r.meal_type, allergies: r.allergies
  };
}
function mapMenuItem(r) {
  if (!r) return undefined;
  return {
    id: r.id, name: r.name, tag: r.tag, calories: r.calories, protein: r.protein,
    carbs: r.carbs, fat: r.fat, ingredients: r.ingredients,
    allergenFree: JSON.parse(r.allergen_free || '[]')
  };
}
function mapBooking(r) {
  if (!r) return undefined;
  return {
    id: r.id, studentId: r.student_id, menuItemId: r.menu_item_id, planType: r.plan_type,
    startDate: r.start_date, days: r.days, totalKWD: r.total_kwd,
    status: r.status, collectedAt: r.collected_at
  };
}
function mapStaffBooking(r) {
  if (!r) return undefined;
  return {
    id: r.id, staffId: r.staff_id, menuItemId: r.menu_item_id,
    startDate: r.start_date, totalKWD: r.total_kwd, status: r.status
  };
}

// ---------- seeding (first run only) ----------
function seedIfEmpty() {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM parents').get();
  if (count > 0) return;

  const seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
  const calendarDays = generateCalendarDays(new Date(todayInKuwait() + 'T00:00:00Z'));

  const insertAll = db.transaction(() => {
    const insertParent = db.prepare(`
      INSERT INTO parents (id, civil_id, name, email, phone, password_hash, created_at)
      VALUES (@id, @civilId, @name, @email, @phone, @passwordHash, @createdAt)
    `);
    seed.parents.forEach(p => insertParent.run(p));

    const insertStudent = db.prepare(`
      INSERT INTO students (id, parent_id, name, civil_id, school, class, section, gender, meal_type, allergies)
      VALUES (@id, @parentId, @name, @civilId, @school, @class, @section, @gender, @mealType, @allergies)
    `);
    seed.students.forEach(s => insertStudent.run(s));

    const insertMenuItem = db.prepare(`
      INSERT INTO menu_items (id, name, tag, calories, protein, carbs, fat, ingredients, allergen_free)
      VALUES (@id, @name, @tag, @calories, @protein, @carbs, @fat, @ingredients, @allergenFree)
    `);
    seed.menuItems.forEach(m => insertMenuItem.run({ ...m, allergenFree: JSON.stringify(m.allergenFree || []) }));

    // Placeholder school calendar — see generateCalendarDays() above.
    const insertCalendarDay = db.prepare(`
      INSERT INTO school_calendar_days (school, date, is_school_day) VALUES (?, ?, ?)
    `);
    CALENDAR_SCHOOLS.forEach(school => {
      calendarDays.forEach(d => insertCalendarDay.run(school, d.date, d.isSchoolDay ? 1 : 0));
    });

    const insertStaffBooking = db.prepare(`
      INSERT INTO staff_bookings (id, staff_id, menu_item_id, start_date, total_kwd, status)
      VALUES (@id, @staffId, @menuItemId, @startDate, @totalKWD, @status)
    `);
    (seed.staffBookings || []).forEach(b => insertStaffBooking.run(b));

    // Plan pricing lives in the database, not hardcoded in route logic.
    // `single.rate_kwd` is the one real daily rate — it also prices the
    // `monthly` (subscription) plan now, multiplied by the actual school
    // days in range (see lib/pricing.js). The `monthly` row's own
    // rate_kwd/monthly_days are unused by the calculation and kept only so
    // the row has somewhere to hold its label; a flat monthly figure no
    // longer means anything under calendar-accurate billing.
    db.prepare('INSERT OR REPLACE INTO plans (code, label, rate_kwd, monthly_days) VALUES (?, ?, ?, ?)')
      .run('single', 'Single Day', DAILY_RATE_KWD, 1);
    db.prepare('INSERT OR REPLACE INTO plans (code, label, rate_kwd, monthly_days) VALUES (?, ?, ?, ?)')
      .run('monthly', 'Monthly Plan', 0, 0);

    const insertSchoolAdmin = db.prepare(`
      INSERT INTO school_admins (id, school, name, email, password_hash, created_at)
      VALUES (@id, @school, @name, @email, @passwordHash, @createdAt)
    `);
    (seed.schoolAdmins || []).forEach(a => insertSchoolAdmin.run(a));

    const insertNotification = db.prepare(`
      INSERT INTO notifications (id, parent_id, type, message, related_id, read, created_at)
      VALUES (@id, @parentId, @type, @message, @relatedId, @read, @createdAt)
    `);
    (seed.notifications || []).forEach(n => insertNotification.run(n));
  });
  insertAll();
}

function resetToSeed() {
  const wipe = db.transaction(() => {
    db.exec(`
      DELETE FROM bookings;
      DELETE FROM staff_bookings;
      DELETE FROM students;
      DELETE FROM parents;
      DELETE FROM menu_items;
      DELETE FROM plans;
      DELETE FROM school_admins;
      DELETE FROM notifications;
      DELETE FROM inquiries;
      DELETE FROM school_calendar_days;
    `);
  });
  wipe();
  seedIfEmpty();
}

// ---------- Parents ----------
function findParentByCivilId(civilId) {
  return mapParent(db.prepare('SELECT * FROM parents WHERE civil_id = ?').get(civilId));
}
function findParentById(id) {
  return mapParent(db.prepare('SELECT * FROM parents WHERE id = ?').get(id));
}
function createParent(parent) {
  const createdAt = new Date().toISOString();
  const info = db.prepare(`
    INSERT INTO parents (civil_id, name, email, phone, password_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(parent.civilId, parent.name, parent.email, parent.phone, parent.passwordHash, createdAt);
  return findParentById(info.lastInsertRowid);
}
function updateParent(id, fields) {
  const existing = findParentById(id);
  if (!existing) return null;
  const merged = { ...existing, ...fields };
  db.prepare(`
    UPDATE parents SET civil_id = ?, name = ?, email = ?, phone = ?, password_hash = ? WHERE id = ?
  `).run(merged.civilId, merged.name, merged.email, merged.phone, merged.passwordHash, id);
  return findParentById(id);
}

// ---------- Students ----------
function getStudentsByParent(parentId) {
  return db.prepare('SELECT * FROM students WHERE parent_id = ?').all(parentId).map(mapStudent);
}
function findStudentById(id) {
  return mapStudent(db.prepare('SELECT * FROM students WHERE id = ?').get(id));
}
function createStudent(student) {
  const info = db.prepare(`
    INSERT INTO students (parent_id, name, civil_id, school, class, section, gender, meal_type, allergies)
    VALUES (@parentId, @name, @civilId, @school, @class, @section, @gender, @mealType, @allergies)
  `).run(student);
  return findStudentById(info.lastInsertRowid);
}
function updateStudent(id, fields) {
  const existing = findStudentById(id);
  if (!existing) return null;
  const merged = { ...existing, ...fields };
  db.prepare(`
    UPDATE students SET name = @name, civil_id = @civilId, school = @school, class = @class,
      section = @section, gender = @gender, meal_type = @mealType, allergies = @allergies
    WHERE id = @id
  `).run(merged);
  return findStudentById(id);
}

// ---------- Menu ----------
function getMenuItems() {
  return db.prepare('SELECT * FROM menu_items ORDER BY id').all().map(mapMenuItem);
}
function findMenuItem(id) {
  return mapMenuItem(db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id));
}

// ---------- Pricing ----------
// Returns { single: { rateKWD, monthlyDays }, monthly: { rateKWD, monthlyDays } }
function getPlans() {
  const rows = db.prepare('SELECT * FROM plans').all();
  const plans = {};
  rows.forEach(r => {
    plans[r.code] = { code: r.code, label: r.label, rateKWD: r.rate_kwd, monthlyDays: r.monthly_days };
  });
  return plans;
}

// ---------- School calendar ----------
// Real school-day dates for one school in a date range, used to price a
// monthly subscription (see lib/pricing.js) and to show a parent exactly
// which days they're paying for before they confirm.
function getSchoolDaysInRange(school, startISO, endISO) {
  return db.prepare(`
    SELECT date FROM school_calendar_days
    WHERE school = ? AND date >= ? AND date <= ? AND is_school_day = 1
    ORDER BY date
  `).all(school, startISO, endISO).map(r => r.date);
}

// ---------- Bookings ----------
function getBookingsForParent(parentId) {
  return db.prepare(`
    SELECT b.* FROM bookings b
    JOIN students s ON s.id = b.student_id
    WHERE s.parent_id = ?
    ORDER BY b.start_date DESC
  `).all(parentId).map(mapBooking);
}
function createBooking(booking) {
  const info = db.prepare(`
    INSERT INTO bookings (student_id, menu_item_id, plan_type, start_date, days, total_kwd, status, collected_at)
    VALUES (@studentId, @menuItemId, @planType, @startDate, @days, @totalKWD, 'upcoming', NULL)
  `).run(booking);
  return mapBooking(db.prepare('SELECT * FROM bookings WHERE id = ?').get(info.lastInsertRowid));
}
function updateBooking(id, fields) {
  const existing = mapBooking(db.prepare('SELECT * FROM bookings WHERE id = ?').get(id));
  if (!existing) return null;
  const merged = { ...existing, ...fields };
  db.prepare(`
    UPDATE bookings SET student_id = @studentId, menu_item_id = @menuItemId, plan_type = @planType,
      start_date = @startDate, days = @days, total_kwd = @totalKWD, status = @status, collected_at = @collectedAt
    WHERE id = @id
  `).run(merged);
  return mapBooking(db.prepare('SELECT * FROM bookings WHERE id = ?').get(id));
}
function findBookingById(id) {
  return mapBooking(db.prepare('SELECT * FROM bookings WHERE id = ?').get(id));
}

function insertNotification({ parentId, type, message, params, relatedId }) {
  db.prepare(`
    INSERT INTO notifications (parent_id, type, message, params, related_id, read, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `).run(parentId, type, message, params ? JSON.stringify(params) : null, relatedId || null, new Date().toISOString());
}

// Atomic: create the booking and log the confirmation notification in one
// transaction. Payment is a direct simulated charge per period (no wallet
// to debit) — same "demo only, no real payment processed" simulation the
// old wallet top-up used, just without a stored balance in between.
//
// `message` is always composed in English and stored as a fallback (for
// legacy display paths and any consumer that isn't locale-aware); `params`
// carries the structured data so server.js can re-render the same
// notification in the viewer's current locale (see app.locals.notifMessage).
function bookAndCharge({ studentId, menuItemId, planType, startDate, days, totalKWD, parentId, detailType }) {
  return db.transaction(() => {
    const booking = createBooking({ studentId, menuItemId, planType, startDate, days, totalKWD });
    const student = findStudentById(studentId);
    const menuItem = findMenuItem(menuItemId);
    const studentName = student ? student.name : 'Your child';
    const mealName = menuItem ? menuItem.name : 'Meal plan';
    const resolvedDetailType = detailType || (planType === 'monthly' ? 'monthly' : 'single');
    const detailText = resolvedDetailType === 'renewed'
      ? 'renewed subscription'
      : `${days} ${resolvedDetailType === 'monthly' ? 'real school day(s) this month' : 'day(s)'}`;
    insertNotification({
      parentId, type: 'booking_confirmed', relatedId: booking.id,
      message: `${studentName} — Booking confirmed: ${mealName}, ${detailText}, KWD ${totalKWD.toFixed(3)} charged.`,
      params: { studentName, mealName, detailType: resolvedDetailType, days, amountKWD: totalKWD }
    });
    return booking;
  })();
}

// ---------- Notifications ----------
function getNotificationsForParent(parentId, limit) {
  const rows = db.prepare("SELECT * FROM notifications WHERE parent_id = ? AND (? OR type != 'collected') ORDER BY created_at DESC, id DESC LIMIT ?")
    .all(parentId, FEATURES.showCollection ? 1 : 0, limit || 20);
  return rows.map(r => ({
    id: r.id, parentId: r.parent_id, type: r.type, message: r.message,
    params: r.params ? JSON.parse(r.params) : null,
    relatedId: r.related_id, read: !!r.read, createdAt: r.created_at
  }));
}
function getUnreadNotificationCount(parentId) {
  return db.prepare("SELECT COUNT(*) AS c FROM notifications WHERE parent_id = ? AND read = 0 AND (? OR type != 'collected')").get(parentId, FEATURES.showCollection ? 1 : 0).c;
}
function markNotificationRead(id, parentId) {
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND parent_id = ?').run(id, parentId);
}
function markAllNotificationsRead(parentId) {
  db.prepare('UPDATE notifications SET read = 1 WHERE parent_id = ?').run(parentId);
}
// Ensures exactly one unread renewal reminder exists per booking — called
// on dashboard load so re-visiting the page doesn't spam duplicate reminders.
function ensureRenewalNotification({ parentId, bookingId, studentName, daysLeft }) {
  const existing = db.prepare('SELECT id FROM notifications WHERE related_id = ? AND type = ?').get(bookingId, 'renewal_due');
  if (existing) return;
  const message = `${studentName} — Subscription ending in ${daysLeft} day${daysLeft === 1 ? '' : 's'}: renew to keep meals booked without a gap.`;
  insertNotification({ parentId, type: 'renewal_due', relatedId: bookingId, message, params: { studentName, daysLeft } });
}

// ---------- Staff bookings (separate section, mirrors real app's Staff area) ----------
function getStaffBookingsByParent(staffId) {
  return db.prepare('SELECT * FROM staff_bookings WHERE staff_id = ?').all(staffId).map(mapStaffBooking);
}
function createStaffBooking(booking) {
  const info = db.prepare(`
    INSERT INTO staff_bookings (staff_id, menu_item_id, start_date, total_kwd, status)
    VALUES (@staffId, @menuItemId, @startDate, @totalKWD, 'upcoming')
  `).run(booking);
  return mapStaffBooking(db.prepare('SELECT * FROM staff_bookings WHERE id = ?').get(info.lastInsertRowid));
}

// ---------- School admins ----------
function findSchoolAdminByEmail(email) {
  const r = db.prepare('SELECT * FROM school_admins WHERE email = ?').get(email);
  if (!r) return undefined;
  return { id: r.id, school: r.school, name: r.name, email: r.email, passwordHash: r.password_hash, createdAt: r.created_at };
}
function findSchoolAdminById(id) {
  const r = db.prepare('SELECT * FROM school_admins WHERE id = ?').get(id);
  if (!r) return undefined;
  return { id: r.id, school: r.school, name: r.name, email: r.email, passwordHash: r.password_hash, createdAt: r.created_at };
}

// ---------- School dashboard (real data, scoped to one school) ----------
function getStudentsBySchool(school) {
  return db.prepare('SELECT * FROM students WHERE school = ?').all(school).map(mapStudent);
}
function getBookingsForSchool(school) {
  return db.prepare(`
    SELECT b.* FROM bookings b
    JOIN students s ON s.id = b.student_id
    WHERE s.school = ?
    ORDER BY b.start_date DESC, b.id DESC
  `).all(school).map(mapBooking);
}

// ---------- Inquiries (Schools / Caterers lead capture) ----------
function createInquiry(inquiry) {
  const info = db.prepare(`
    INSERT INTO inquiries (type, organization_name, contact_name, contact_role, email, phone, scale_info, current_arrangement, message)
    VALUES (@type, @organizationName, @contactName, @contactRole, @email, @phone, @scaleInfo, @currentArrangement, @message)
  `).run(inquiry);
  return info.lastInsertRowid;
}

module.exports = {
  ...subscriptions, ensureCalendarCoverage,
  resetToSeed,
  findParentByCivilId, findParentById, createParent, updateParent,
  getStudentsByParent, findStudentById, createStudent, updateStudent,
  getMenuItems, findMenuItem,
  getPlans,
  getSchoolDaysInRange,
  getBookingsForParent, createBooking, updateBooking, findBookingById,
  bookAndCharge,
  getStaffBookingsByParent, createStaffBooking,
  getNotificationsForParent, getUnreadNotificationCount, markNotificationRead, markAllNotificationsRead, ensureRenewalNotification,
  findSchoolAdminByEmail, findSchoolAdminById, getStudentsBySchool, getBookingsForSchool,
  createInquiry
};
