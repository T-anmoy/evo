// lib/pricing.js — pure booking-total calculation, kept separate from the
// database and from server.js so it can be unit tested directly. Prices
// themselves live in the `plans` table (see migrations/001_init.sql) and are
// passed in here, never hardcoded.
//
// Billing model: a parent is charged only for the real school working days
// that fall inside their subscription period, not a flat monthly fee. The
// caller (server.js) looks up the actual school-day dates from the
// `school_calendar_days` table (see migrations/004_school_calendar.sql) and
// passes them in as `schoolDays` — this function stays DB-agnostic and just
// counts what it's given, so it's still trivially unit-testable with a plain
// array of dates.

function calculateBookingTotal({ planType, days, plans, schoolDays }) {
  const dailyPlan = plans.single;
  if (!dailyPlan) throw new Error('Daily rate is not configured.');
  const dailyRate = dailyPlan.rateKWD;

  if (planType === 'monthly') {
    if (!plans.monthly) throw new Error('Monthly plan is not configured.');
    if (!Array.isArray(schoolDays)) {
      throw new Error('School calendar days are required to price a monthly subscription.');
    }
    const numDays = schoolDays.length;
    return { total: round3(dailyRate * numDays), days: numDays };
  }

  const numDays = Math.max(1, parseInt(days, 10) || 1);
  return { total: round3(dailyRate * numDays), days: numDays };
}

// Last calendar day of the month that `dateISO` falls in, as YYYY-MM-DD.
// A monthly subscription's coverage period always ends here — never 30 raw
// days from the start date, which could bleed into the following month.
function endOfMonthISO(dateISO) {
  const d = new Date(`${dateISO}T00:00:00Z`);
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return end.toISOString().split('T')[0];
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

module.exports = { calculateBookingTotal, endOfMonthISO };
