// Integration test: boots the real Express app against a throwaway SQLite
// database and confirms Civil ID never appears unmasked in the HTML of any
// route a logged-in parent can view — their own profile, and their
// children's records on /students (list + edit form).

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const TEST_DB = path.join(os.tmpdir(), `evo360-test-${process.pid}-${Date.now()}.db`);
process.env.DATABASE_FILE = TEST_DB;
process.env.SESSION_SECRET = 'test-secret-not-for-production';

let server;
let baseUrl;
let cookie = '';

function extractCsrfToken(html) {
  const match = html.match(/name="_csrf" value="([^"]+)"/);
  assert.ok(match, 'expected a _csrf hidden field in the response HTML');
  return match[1];
}

function extractSetCookie(res) {
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
}

async function get(pathname) {
  const res = await fetch(baseUrl + pathname, {
    headers: { cookie },
    redirect: 'manual'
  });
  extractSetCookie(res);
  const body = await res.text().catch(() => '');
  return { status: res.status, body };
}

async function post(pathname, formFields) {
  const res = await fetch(baseUrl + pathname, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(formFields).toString(),
    redirect: 'manual'
  });
  extractSetCookie(res);
  const body = await res.text().catch(() => '');
  return { status: res.status, body };
}

before(async () => {
  const app = require('../server');
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  // Log in as the seeded demo parent (Civil ID 111111111111 / demo1234).
  const loginPage = await get('/login');
  const csrfToken = extractCsrfToken(loginPage.body);
  const loginResult = await post('/login', {
    _csrf: csrfToken,
    civilId: '111111111111',
    password: 'demo1234'
  });
  assert.equal(loginResult.status, 302, 'login should redirect to /dashboard');
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
  fs.rmSync(TEST_DB, { force: true });
  fs.rmSync(TEST_DB + '-wal', { force: true });
  fs.rmSync(TEST_DB + '-shm', { force: true });
});

test('the logged-in parent\'s own Civil ID is masked on /profile', async () => {
  const { body } = await get('/profile');
  assert.ok(!body.includes('111111111111'), 'raw parent Civil ID must not appear in /profile HTML');
  assert.ok(body.includes('••••••••1111'), 'masked parent Civil ID should be shown');
});

test('children\'s Civil IDs are masked in the /students list', async () => {
  const { body } = await get('/students');
  assert.ok(!body.includes('289011234567'), 'raw Civil ID for Ahmed must not appear in /students HTML');
  assert.ok(!body.includes('295042198765'), 'raw Civil ID for Sara must not appear in /students HTML');
  assert.ok(body.includes('••••••••4567'), 'masked Civil ID for Ahmed should be shown');
  assert.ok(body.includes('••••••••8765'), 'masked Civil ID for Sara should be shown');
});

test('a child\'s Civil ID is masked (and read-only) on the /students edit form', async () => {
  const { body } = await get('/students/1/edit');
  assert.ok(!body.includes('289011234567'), 'raw Civil ID must not appear in the edit form');
  assert.ok(body.includes('••••••••4567'), 'masked Civil ID should populate the edit form field');
});
