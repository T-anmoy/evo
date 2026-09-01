-- 004_school_calendar_remove_wallet.sql
--
-- Billing model change: a parent is charged only for the real school working
-- days inside their subscription period (see lib/pricing.js), looked up
-- day-by-day per school here, rather than a flat monthly fee. This also
-- removes the wallet system — with exact per-period charging there's no
-- need for a pre-funded balance; payment is now a direct simulated charge
-- per booking, matching how KNET top-ups were already simulated.

CREATE TABLE school_calendar_days (
  school         TEXT NOT NULL,
  date           TEXT NOT NULL,
  is_school_day  INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (school, date)
);
CREATE INDEX idx_school_calendar_school_date ON school_calendar_days(school, date);

DROP TABLE IF EXISTS wallet_transactions;
DROP TABLE IF EXISTS wallets;
