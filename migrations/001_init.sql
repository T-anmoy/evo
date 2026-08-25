-- 001_init.sql — base schema for the Evo360 demo system.
-- Mirrors the shape of the old JSON datastore (see db.js) so the data-access
-- layer can be swapped without changing what each table represents.

CREATE TABLE parents (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  civil_id      TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL DEFAULT '',
  phone         TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE students (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id  INTEGER NOT NULL REFERENCES parents(id),
  name       TEXT NOT NULL,
  civil_id   TEXT NOT NULL DEFAULT '',
  school     TEXT NOT NULL DEFAULT '',
  class      TEXT NOT NULL DEFAULT '',
  section    TEXT NOT NULL DEFAULT '',
  gender     TEXT NOT NULL DEFAULT '',
  meal_type  TEXT NOT NULL DEFAULT 'Regular Meal',
  allergies  TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_students_parent_id ON students(parent_id);

CREATE TABLE menu_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  tag            TEXT NOT NULL DEFAULT '',
  calories       INTEGER NOT NULL DEFAULT 0,
  protein        INTEGER NOT NULL DEFAULT 0,
  allergen_free  TEXT NOT NULL DEFAULT '[]' -- JSON array
);

-- Pricing lives in the database (not hardcoded in route logic) so plan
-- prices can change without a code deploy.
CREATE TABLE plans (
  code             TEXT PRIMARY KEY,   -- 'single' | 'monthly'
  label            TEXT NOT NULL,
  rate_kwd         REAL NOT NULL,      -- per-day rate for 'single', flat rate for 'monthly'
  monthly_days     INTEGER NOT NULL DEFAULT 22
);

CREATE TABLE wallets (
  parent_id    INTEGER PRIMARY KEY REFERENCES parents(id),
  balance_kwd  REAL NOT NULL DEFAULT 0
);

CREATE TABLE wallet_transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id   INTEGER NOT NULL REFERENCES parents(id),
  type        TEXT NOT NULL,   -- 'credit' | 'debit'
  amount_kwd  REAL NOT NULL,
  note        TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_wallet_tx_parent_id ON wallet_transactions(parent_id);

CREATE TABLE bookings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id    INTEGER NOT NULL REFERENCES students(id),
  menu_item_id  INTEGER NOT NULL REFERENCES menu_items(id),
  plan_type     TEXT NOT NULL,
  start_date    TEXT NOT NULL,
  days          INTEGER NOT NULL DEFAULT 1,
  total_kwd     REAL NOT NULL,
  status        TEXT NOT NULL DEFAULT 'upcoming', -- upcoming | collected | cancelled
  collected_at  TEXT
);
CREATE INDEX idx_bookings_student_id ON bookings(student_id);

CREATE TABLE staff_bookings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id      INTEGER NOT NULL REFERENCES parents(id),
  menu_item_id  INTEGER NOT NULL REFERENCES menu_items(id),
  start_date    TEXT NOT NULL,
  total_kwd     REAL NOT NULL,
  status        TEXT NOT NULL DEFAULT 'upcoming'
);
CREATE INDEX idx_staff_bookings_staff_id ON staff_bookings(staff_id);
