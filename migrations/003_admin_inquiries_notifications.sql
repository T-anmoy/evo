-- 003_admin_inquiries_notifications.sql
-- Three additive tables for this pass: a lightweight school-admin login
-- (separate from parent auth, same security basics — hashed passwords,
-- no plaintext secrets), real storage for the Schools/Caterers lead-capture
-- forms, and a real parent-facing notification feed.

CREATE TABLE school_admins (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  school         TEXT NOT NULL,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE inquiries (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  type                 TEXT NOT NULL, -- 'school' | 'caterer'
  organization_name    TEXT NOT NULL,
  contact_name         TEXT NOT NULL,
  contact_role         TEXT NOT NULL DEFAULT '',
  email                TEXT NOT NULL,
  phone                TEXT NOT NULL DEFAULT '',
  scale_info           TEXT NOT NULL DEFAULT '', -- student count range, or caterer capacity
  current_arrangement  TEXT NOT NULL DEFAULT '',
  message              TEXT NOT NULL DEFAULT '',
  status               TEXT NOT NULL DEFAULT 'new', -- new | contacted | closed
  created_at           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE notifications (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id    INTEGER NOT NULL REFERENCES parents(id),
  type         TEXT NOT NULL, -- booking_confirmed | booking_cancelled | collected | low_balance | renewal_due
  message      TEXT NOT NULL,
  related_id   INTEGER, -- usually a booking id; used to de-dupe renewal reminders
  read         INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_notifications_parent_id ON notifications(parent_id);
