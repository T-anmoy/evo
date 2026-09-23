const { test, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-only-secret';
process.env.LOG_LEVEL = 'silent';
const os = require('node:os');
const path = require('node:path');
process.env.DATABASE_FILE = process.env.DATABASE_FILE
  || path.join(os.tmpdir(), `evo-display-${process.pid}.db`);

const app = require('../server');
const t = (key) => key;

// Disposable database only — nothing here touches the repository's own.
const dbFile = process.env.DATABASE_FILE;
after(() => {
  for (const suffix of ['', '-wal', '-shm']) require('node:fs').rmSync(dbFile + suffix, { force: true });
});

// A stored timestamp ahead of "now" must never be described in past
// tense. "just now" for a future event is not a rounding artefact, it is
// the wrong statement — so anything in the future falls back to its
// absolute date instead.
test('a future timestamp is never rendered as elapsed past time', () => {
  const future = new Date(Date.now() + 1000 * 60 * 60 * 26).toISOString();
  const rendered = app.locals.timeAgo(future, t);
  assert.equal(rendered, app.locals.fmtDate(future));
  assert.notEqual(rendered, 'common.justNow');
  assert.ok(!rendered.includes('common.timeAgo'));
});

test('a just-passed timestamp still reads as just now', () => {
  assert.equal(app.locals.timeAgo(new Date(Date.now() - 5000).toISOString(), t), 'common.justNow');
  const anHourAgo = new Date(Date.now() - 1000 * 60 * 90).toISOString();
  assert.equal(app.locals.timeAgo(anHourAgo, t), 'common.timeAgo');
});

// Dish imagery is addressed by the menu item's stable record id, so a
// renamed or translated display name cannot silently drop the picture.
test('dish images resolve from the record id, independent of display name', () => {
  assert.equal(app.locals.dishImageSlug({ id: 3, name: 'BBQ Beef Burger' }), 'dish-bbq-beef-burger');
  assert.equal(app.locals.dishImageSlug({ id: 3, name: 'برجر لحم مشوي' }), 'dish-bbq-beef-burger');
});

test('dish images still resolve by name for records outside the asset map', () => {
  assert.equal(app.locals.dishImageSlug({ id: 4096, name: 'Seasonal Fruit Cup' }), 'dish-seasonal-fruit-cup');
  assert.equal(app.locals.dishImageSlug('Seasonal Fruit Cup'), 'dish-seasonal-fruit-cup');
});

test('an unknown dish falls back to no image rather than the wrong one', () => {
  assert.equal(app.locals.dishImageSlug({ id: 4096, name: 'Something Else' }), null);
  assert.equal(app.locals.dishImageSlug(null), null);
});
