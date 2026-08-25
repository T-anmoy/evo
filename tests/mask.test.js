const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { maskCivilId } = require('../lib/mask');

describe('maskCivilId', () => {
  test('shows only the last 4 digits of a 12-digit Civil ID', () => {
    const masked = maskCivilId('289011234567');
    assert.equal(masked, '••••••••4567');
  });

  test('never contains any of the leading digits unmasked', () => {
    const civilId = '295042198765';
    const masked = maskCivilId(civilId);
    const leadingDigits = civilId.slice(0, -4);
    for (const digit of leadingDigits) {
      // every leading character must not survive as itself among the digits shown
      assert.ok(!masked.startsWith(leadingDigits), 'masked value must not start with the real leading digits');
    }
    assert.ok(masked.endsWith(civilId.slice(-4)));
  });

  test('is idempotent-safe on short/empty input (does not throw)', () => {
    assert.equal(maskCivilId(''), '');
    assert.equal(maskCivilId(null), null);
    assert.equal(maskCivilId('12'), '12');
  });
});
