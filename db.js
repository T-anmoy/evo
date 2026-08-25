// db.js — SQLite-backed data layer (via better-sqlite3).
//
// This replaced the original JSON-file datastore. Every function here keeps
// the exact name and signature it had before, so server.js did not need to
// change for the swap itself — only the two spots that needed real
// transactional safety (booking + wallet debit, cancellation + refund)
// gained new atomic functions (see bookAndCharge / cancelAndRefund below),
// and the two spots that needed live pricing gained getPlans().

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { migrate } = require('./db/migrate');

const DB_FILE = process.env.DATABASE_FILE || path.join(__dirname, 'evo360.db');
const SEED_FILE = path.join(__dirname, 'seed.json');

const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

migrate(db);
seedIfEmpty();

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
    allergenFree: JSON.parse(r.allergen_free || '[]')
  };
}
function mapWallet(r) {
  if (!r) return undefined;
  return { parentId: r.parent_id, balanceKWD: r.balance_kwd };
}
function mapWalletTx(r) {
  if (!r) return undefined;
  return {
    id: r.id, parentId: r.parent_id, type: r.type, amountKWD: r.amount_kwd,
    note: r.note, createdAt: r.created_at
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
  const today = new Date();
  const todayISODate = today.toISOString().split('T')[0];
  const todayCollected = new Date(today);
  todayCollected.setHours(12, 14, 0, 0);
  seed.bookings.forEach(b => {
    if (b.startDate === '__TODAY__') b.startDate = todayISODate;
    if (b.collectedAt === '__TODAY_1214__') b.collectedAt = todayCollected.toISOString();
  });

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
      INSERT INTO menu_items (id, name, tag, calories, protein, allergen_free)
      VALUES (@id, @name, @tag, @calories, @protein, @allergenFree)
    `);
    seed.menuItems.forEach(m => insertMenuItem.run({ ...m, allergenFree: JSON.stringify(m.allergenFree || []) }));

    const insertWallet = db.prepare('INSERT INTO wallets (parent_id, balance_kwd) VALUES (?, ?)');
    seed.wallets.forEach(w => insertWallet.run(w.parentId, w.balanceKWD));

    const insertTx = db.prepare(`
      INSERT INTO wallet_transactions (id, parent_id, type, amount_kwd, note, created_at)
      VALUES (@id, @parentId, @type, @amountKWD, @note, @createdAt)
    `);
    seed.walletTransactions.forEach(t => insertTx.run(t));

    const insertBooking = db.prepare(`
      INSERT INTO bookings (id, student_id, menu_item_id, plan_type, start_date, days, total_kwd, status, collected_at)
      VALUES (@id, @studentId, @menuItemId, @planType, @startDate, @days, @totalKWD, @status, @collectedAt)
    `);
    seed.bookings.forEach(b => insertBooking.run(b));

    const insertStaffBooking = db.prepare(`
      INSERT INTO staff_bookings (id, staff_id, menu_item_id, start_date, total_kwd, status)
      VALUES (@id, @staffId, @menuItemId, @startDate, @totalKWD, @status)
    `);
    (seed.staffBookings || []).forEach(b => insertStaffBooking.run(b));

    // Plan pricing lives in the database — same values the old hardcoded
    // `planType === 'monthly' ? 24.000 : ...` ternary in server.js used,
    // now editable without a code deploy.
    db.prepare('INSERT OR REPLACE INTO plans (code, label, rate_kwd, monthly_days) VALUES (?, ?, ?, ?)')
      .run('single', 'Single Day', 1.000, 1);
    db.prepare('INSERT OR REPLACE INTO plans (code, label, rate_kwd, monthly_days) VALUES (?, ?, ?, ?)')
      .run('monthly', 'Monthly Plan', 24.000, 22);
  });
  insertAll();
}

function resetToSeed() {
  const wipe = db.transaction(() => {
    db.exec(`
      DELETE FROM wallet_transactions;
      DELETE FROM bookings;
      DELETE FROM staff_bookings;
      DELETE FROM wallets;
      DELETE FROM students;
      DELETE FROM parents;
      DELETE FROM menu_items;
      DELETE FROM plans;
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
  const result = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO parents (civil_id, name, email, phone, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(parent.civilId, parent.name, parent.email, parent.phone, parent.passwordHash, createdAt);
    db.prepare('INSERT INTO wallets (parent_id, balance_kwd) VALUES (?, 0)').run(info.lastInsertRowid);
    return info.lastInsertRowid;
  })();
  return findParentById(result);
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

// ---------- Wallet ----------
function getWallet(parentId) {
  return mapWallet(db.prepare('SELECT * FROM wallets WHERE parent_id = ?').get(parentId))
    || { parentId, balanceKWD: 0 };
}
function adjustWallet(parentId, deltaKWD, type, note) {
  return db.transaction(() => {
    const existing = db.prepare('SELECT * FROM wallets WHERE parent_id = ?').get(parentId);
    const newBalance = Math.round(((existing ? existing.balance_kwd : 0) + deltaKWD) * 1000) / 1000;
    if (existing) {
      db.prepare('UPDATE wallets SET balance_kwd = ? WHERE parent_id = ?').run(newBalance, parentId);
    } else {
      db.prepare('INSERT INTO wallets (parent_id, balance_kwd) VALUES (?, ?)').run(parentId, newBalance);
    }
    db.prepare(`
      INSERT INTO wallet_transactions (parent_id, type, amount_kwd, note, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(parentId, type, deltaKWD, note, new Date().toISOString());
    return getWallet(parentId);
  })();
}
function getWalletTransactions(parentId) {
  return db.prepare('SELECT * FROM wallet_transactions WHERE parent_id = ? ORDER BY created_at DESC, id DESC')
    .all(parentId).map(mapWalletTx);
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

// Atomic: create the booking and debit the wallet in one transaction, so a
// crash between the two writes can never leave a charge with no booking (or
// a booking with no charge).
function bookAndCharge({ studentId, menuItemId, planType, startDate, days, totalKWD, parentId, note }) {
  return db.transaction(() => {
    const booking = createBooking({ studentId, menuItemId, planType, startDate, days, totalKWD });
    adjustWallet(parentId, -totalKWD, 'debit', note);
    return booking;
  })();
}

// Atomic: cancel the booking and refund the wallet in one transaction.
function cancelAndRefund({ bookingId, parentId }) {
  return db.transaction(() => {
    const booking = findBookingById(bookingId);
    if (!booking || booking.status !== 'upcoming') return null;
    updateBooking(bookingId, { status: 'cancelled' });
    adjustWallet(parentId, booking.totalKWD, 'credit', `Refund — booking #${booking.id} cancelled`);
    return findBookingById(bookingId);
  })();
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

module.exports = {
  resetToSeed,
  findParentByCivilId, findParentById, createParent, updateParent,
  getStudentsByParent, findStudentById, createStudent, updateStudent,
  getMenuItems, findMenuItem,
  getPlans,
  getWallet, adjustWallet, getWalletTransactions,
  getBookingsForParent, createBooking, updateBooking, findBookingById,
  bookAndCharge, cancelAndRefund,
  getStaffBookingsByParent, createStaffBooking
};
