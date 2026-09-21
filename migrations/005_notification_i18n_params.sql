-- 005_notification_i18n_params.sql
--
-- Additive column so notification bodies can be re-rendered in the
-- viewer's current locale instead of being frozen in whatever language
-- was active the moment the event happened. `message` (NOT NULL) is kept
-- as-is and still written on every insert as an English fallback — used
-- for legacy/seed rows that have no params, and as a safety net if a
-- notification's type is ever unrecognized at display time.

ALTER TABLE notifications ADD COLUMN params TEXT;
