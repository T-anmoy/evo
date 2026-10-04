const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { calculateBookingTotal, endOfMonthISO } = require('../lib/pricing');
test('calendar pricing multiplies the configured daily rate and rounds to fils', () => {
 assert.deepEqual(calculateBookingTotal({dailyRate:2,schoolDays:['2026-01-01','2026-01-04']}),{total:4,days:2});
 assert.equal(calculateBookingTotal({dailyRate:2.1234,schoolDays:['2026-01-01']} ).total,2.123);
});
test('calendar pricing never substitutes an invented rate or day count', () => {
 for(const dailyRate of [0,-1,NaN,undefined])assert.throws(()=>calculateBookingTotal({dailyRate,schoolDays:[]}));
 assert.throws(()=>calculateBookingTotal({dailyRate:2}));
 assert.deepEqual(calculateBookingTotal({dailyRate:2,schoolDays:[]}),{total:0,days:0});
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
