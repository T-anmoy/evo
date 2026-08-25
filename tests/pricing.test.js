const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { calculateBookingTotal, canAfford } = require('../lib/pricing');

// Same shape db.getPlans() returns, matching the seeded values in db.js.
const plans = {
  single: { code: 'single', label: 'Single Day', rateKWD: 1.000, monthlyDays: 1 },
  monthly: { code: 'monthly', label: 'Monthly Plan', rateKWD: 24.000, monthlyDays: 22 }
};

describe('calculateBookingTotal', () => {
  test('single-day plan: 1 day costs the per-day rate', () => {
    const { total, days } = calculateBookingTotal({ planType: 'single', days: 1, plans });
    assert.equal(total, 1.000);
    assert.equal(days, 1);
  });

  test('single-day plan: multiple days multiply the per-day rate', () => {
    const { total, days } = calculateBookingTotal({ planType: 'single', days: 5, plans });
    assert.equal(total, 5.000);
    assert.equal(days, 5);
  });

  test('single-day plan: never returns zero for a valid booking (the KWD 0.00 bug)', () => {
    const { total } = calculateBookingTotal({ planType: 'single', days: 1, plans });
    assert.ok(total > 0, 'total must be greater than zero');
  });

  test('monthly plan: flat rate regardless of the days field', () => {
    const { total, days } = calculateBookingTotal({ planType: 'monthly', days: 999, plans });
    assert.equal(total, 24.000);
    assert.equal(days, 22);
  });

  test('missing/garbage days value defaults to 1 day, not zero or NaN', () => {
    const { total, days } = calculateBookingTotal({ planType: 'single', days: undefined, plans });
    assert.equal(days, 1);
    assert.equal(total, 1.000);
  });

  test('throws rather than silently returning zero when a plan is unconfigured', () => {
    assert.throws(() => calculateBookingTotal({ planType: 'monthly', days: 1, plans: {} }));
    assert.throws(() => calculateBookingTotal({ planType: 'single', days: 1, plans: {} }));
  });
});

describe('canAfford', () => {
  test('rejects a booking that costs more than the wallet balance', () => {
    assert.equal(canAfford(24.000, 8.400), false);
  });

  test('allows a booking that costs exactly the wallet balance', () => {
    assert.equal(canAfford(8.400, 8.400), true);
  });

  test('allows a booking that costs less than the wallet balance', () => {
    assert.equal(canAfford(1.000, 8.400), true);
  });
});
