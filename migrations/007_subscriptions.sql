-- Additive subscription model. Legacy bookings are retained, never rewritten.
CREATE TABLE subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER NOT NULL REFERENCES parents(id),
  student_id INTEGER NOT NULL REFERENCES students(id),
  first_month TEXT NOT NULL,
  months_count INTEGER NOT NULL CHECK(months_count BETWEEN 1 AND 6),
  daily_rate_kwd REAL NOT NULL CHECK(daily_rate_kwd > 0),
  total_kwd REAL NOT NULL CHECK(total_kwd > 0),
  status TEXT NOT NULL DEFAULT 'paid' CHECK(status = 'paid'),
  draft_token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TABLE subscription_months (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
  student_id INTEGER NOT NULL REFERENCES students(id),
  month TEXT NOT NULL,
  total_days INTEGER NOT NULL,
  holiday_days INTEGER NOT NULL,
  meal_days INTEGER NOT NULL,
  rate_kwd REAL NOT NULL,
  amount_kwd REAL NOT NULL,
  UNIQUE(student_id, month)
);
CREATE TABLE subscription_meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
  date TEXT NOT NULL,
  menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(subscription_id, date)
);
CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id INTEGER NOT NULL UNIQUE REFERENCES subscriptions(id),
  invoice_number TEXT NOT NULL UNIQUE,
  amount_kwd REAL NOT NULL CHECK(amount_kwd > 0),
  method TEXT NOT NULL DEFAULT 'KNET' CHECK(method = 'KNET'),
  status TEXT NOT NULL DEFAULT 'paid_simulated' CHECK(status = 'paid_simulated'),
  paid_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TABLE terms_acceptances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER NOT NULL REFERENCES parents(id),
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
  accepted_at TEXT NOT NULL
);
CREATE INDEX idx_subscriptions_parent_date ON subscriptions(parent_id, created_at DESC);
CREATE INDEX idx_subscriptions_student ON subscriptions(student_id);
CREATE INDEX idx_subscription_months_current ON subscription_months(month, student_id);
CREATE INDEX idx_subscription_months_subscription ON subscription_months(subscription_id);
CREATE INDEX idx_subscription_meals_date ON subscription_meals(date, subscription_id);
CREATE INDEX idx_students_school ON students(school);
