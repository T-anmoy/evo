const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const file = path.join(os.tmpdir(), `evo-features-${process.pid}.db`);
process.env.DATABASE_FILE = file;
process.env.SESSION_SECRET = 'test-only';
process.env.LOG_LEVEL = 'silent';
const app = require('../server');
const { FEATURES } = require('../lib/features');
const server = app.listen(0);
after(() => { server.close(); for (const suffix of ['', '-wal', '-shm']) fs.rmSync(file + suffix, { force: true }); });
test('collection feature flag hides and restores the illustrative flow in both languages', async () => {
  try {
    for (const enabled of [false, true]) {
      FEATURES.showCollection = enabled;
      for (const route of ['/', '/parents', '/ar', '/ar/parents']) {
        const res = await fetch(`http://localhost:${server.address().port}${route}`);
        const html = await res.text();
        assert.equal(res.status, 200);
        assert.equal(html.includes('class="collection-example"'), enabled, route);
        assert.equal(html.includes('journey-attention'), enabled, route);
      }
    }
  } finally { FEATURES.showCollection = false; }
});
