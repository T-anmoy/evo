const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { calculateBookingTotal, endOfMonthISO } = require('../lib/pricing');

// Same shape db.getPlans() returns, matching the seeded values in db.js.
// The monthly plan's own rate_kwd/monthlyDays are unused by calculation —
// pricing is calendar-driven, always off the single/daily rate.
const plans = {
  single: { code: 'single', label: 'Single Day', rateKWD: 2.000 },
  monthly: { code: 'monthly', label: 'Monthly Plan' }
};

describe('calculateBookingTotal', () => {
  test('single-day plan: 1 day costs the per-day rate', () => {
    const { total, days } = calculateBookingTotal({ planType: 'single', days: 1, plans });
    assert.equal(total, 2.000);
    assert.equal(days, 1);
  });

  test('single-day plan: multiple days multiply the per-day rate', () => {
    const { total, days } = calculateBookingTotal({ planType: 'single', days: 5, plans });
    assert.equal(total, 10.000);
    assert.equal(days, 5);
  });

  test('single-day plan: never returns zero for a valid booking (the KWD 0.00 bug)', () => {
    const { total } = calculateBookingTotal({ planType: 'single', days: 1, plans });
    assert.ok(total > 0, 'total must be greater than zero');
  });

  test('missing/garbage days value defaults to 1 day, not zero or NaN', () => {
    const { total, days } = calculateBookingTotal({ planType: 'single', days: undefined, plans });
    assert.equal(days, 1);
    assert.equal(total, 2.000);
  });

  test('monthly plan: charges only for the real school days given, not a flat rate', () => {
    const schoolDays = ['2026-08-27', '2026-08-30', '2026-08-31'];
    const { total, days } = calculateBookingTotal({ planType: 'monthly', plans, schoolDays });
    assert.equal(total, 6.000);
    assert.equal(days, 3);
  });

  test('monthly plan: a start date late in the month charges for exactly the days left, not a flat 24 KWD', () => {
    const schoolDays = ['2026-08-30', '2026-08-31'];
    const { total, days } = calculateBookingTotal({ planType: 'monthly', plans, schoolDays });
    assert.equal(total, 4.000);
    assert.equal(days, 2);
    assert.notEqual(total, 24.000);
  });

  test('monthly plan: zero school days remaining in the period charges zero, not a flat rate', () => {
    const { total, days } = calculateBookingTotal({ planType: 'monthly', plans, schoolDays: [] });
    assert.equal(total, 0);
    assert.equal(days, 0);
  });

  test('monthly plan: the `days` field is ignored — only the real schoolDays list is priced', () => {
    const { total, days } = calculateBookingTotal({ planType: 'monthly', days: 999, plans, schoolDays: ['2026-09-01'] });
    assert.equal(total, 2.000);
    assert.equal(days, 1);
  });

  test('throws when the daily rate is not configured', () => {
    assert.throws(() => calculateBookingTotal({ planType: 'single', days: 1, plans: {} }));
    assert.throws(() => calculateBookingTotal({ planType: 'monthly', plans: {}, schoolDays: [] }));
  });

  test('throws when a monthly booking is priced without school calendar days', () => {
    assert.throws(() => calculateBookingTotal({ planType: 'monthly', plans }));
  });
});

describe('endOfMonthISO', () => {
  test('mid-month date resolves to the last day of that month', () => {
    assert.equal(endOfMonthISO('2026-08-05'), '2026-08-31');
  });

  test('a date near month-end resolves to the same month\'s last day', () => {
    assert.equal(endOfMonthISO('2026-08-30'), '2026-08-31');
  });

  test('handles a 30-day month correctly', () => {
    assert.equal(endOfMonthISO('2026-09-01'), '2026-09-30');
  });

  test('handles February in a non-leap year correctly', () => {
    assert.equal(endOfMonthISO('2027-02-10'), '2027-02-28');
  });

  test('handles February in a leap year correctly', () => {
    assert.equal(endOfMonthISO('2028-02-10'), '2028-02-29');
  });
});
