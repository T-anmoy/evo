const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const file = path.join(os.tmpdir(), `evo-hardening-${process.pid}.db`);
process.env.DATABASE_FILE = file;
process.env.SESSION_SECRET = 'test-only-secret';
process.env.LOG_LEVEL = 'silent';

let server, base;
// Full cookie jar rather than a single string: session regeneration
// issues a new identifier, and the point of several tests below is to
// watch that identifier change.
let cookie = '', csrf = '';
async function request(route, fields, opts = {}) {
  const res = await fetch(base + route, {
    method: fields ? 'POST' : 'GET',
    headers: { cookie: opts.cookie !== undefined ? opts.cookie : cookie, 'content-type': 'application/x-www-form-urlencoded' },
    body: fields ? new URLSearchParams({ ...fields, _csrf: opts.csrf !== undefined ? opts.csrf : csrf }) : undefined,
    redirect: 'manual'
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie && !opts.keepCookie) cookie = setCookie.split(';')[0];
  const body = await res.text();
  const token = body.match(/name="_csrf" value="([^"]+)"/);
  if (token && !opts.keepCsrf) csrf = token[1];
  return { status: res.status, body, setCookie, location: res.headers.get('location'), headers: res.headers };
}

before(async () => {
  server = http.createServer(require('../server'));
  await new Promise(r => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise(r => server.close(r));
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(file + suffix, { force: true });
});

// A session identifier planted before sign-in must not still be valid
// after it. Regenerating on every privilege change is what prevents that.
test('signing in issues a new session identifier', async () => {
  cookie = ''; csrf = '';
  const anonymous = await request('/login');
  const before = cookie;
  assert.ok(before, 'expected a pre-login session cookie to compare against');
  assert.match(anonymous.body, /name="_csrf"/);
  const loggedIn = await request('/login', { civilId: '111111111111', password: 'demo1234' });
  assert.equal(loggedIn.status, 302);
  assert.ok(loggedIn.setCookie, 'expected a replacement session cookie on sign-in');
  assert.notEqual(cookie, before, 'session identifier was reused across authentication');
});

test('the pre-login CSRF token does not survive the session change', async () => {
  cookie = ''; csrf = '';
  await request('/login');
  const staleToken = csrf;
  await request('/login', { civilId: '111111111111', password: 'demo1234' });
  const rejected = await request('/profile', { name: 'Layla Ahmad' }, { csrf: staleToken });
  assert.equal(rejected.status, 403);
});

test('registering also issues a new session identifier', async () => {
  cookie = ''; csrf = '';
  await request('/register');
  const before = cookie;
  const created = await request('/register', {
    name: 'Fixation Test', civilId: '277001122334', email: 'fixation@example.test',
    phone: '99887766', password: 'Fixation-test123!', confirmPassword: 'Fixation-test123!', agreeTerms: 'on'
  });
  assert.equal(created.status, 302);
  assert.notEqual(cookie, before);
});

test('school admin sign-in issues a new session identifier', async () => {
  cookie = ''; csrf = '';
  await request('/school-admin/login');
  const before = cookie;
  const loggedIn = await request('/school-admin/login', { email: 'admin@kes.evomeals.demo', password: 'admin1234' });
  assert.equal(loggedIn.status, 302);
  assert.notEqual(cookie, before);
});

test('the locale chosen before signing in survives the session change', async () => {
  cookie = ''; csrf = '';
  await request('/ar/login');
  const loggedIn = await request('/ar/login', { civilId: '111111111111', password: 'demo1234' });
  assert.equal(loggedIn.status, 302);
  const dashboard = await request('/dashboard');
  assert.match(dashboard.body, /dir="rtl"/);
});

// Signing out changes authentication state, so it must not be reachable
// by a plain cross-site GET.
test('logout is a CSRF-protected POST, not a GET', async () => {
  cookie = ''; csrf = '';
  await request('/login');
  await request('/login', { civilId: '111111111111', password: 'demo1234' });
  await request('/dashboard');

  const viaGet = await request('/logout');
  assert.equal(viaGet.status, 404, 'GET /logout should no longer exist');
  assert.equal((await request('/dashboard')).status, 200, 'the GET must not have ended the session');

  const withoutToken = await request('/logout', {}, { csrf: 'not-the-token' });
  assert.equal(withoutToken.status, 403);
  assert.equal((await request('/dashboard')).status, 200, 'a rejected POST must not have ended the session');

  await request('/dashboard');
  const signedOut = await request('/logout', {});
  assert.equal(signedOut.status, 302);
  assert.equal((await request('/dashboard')).status, 302, 'the session should be gone');
});

test('school admin logout is also a POST', async () => {
  cookie = ''; csrf = '';
  await request('/school-admin/login');
  await request('/school-admin/login', { email: 'admin@kes.evomeals.demo', password: 'admin1234' });
  await request('/school-admin/dashboard');
  assert.equal((await request('/school-admin/logout')).status, 404);
  assert.equal((await request('/school-admin/dashboard')).status, 200);
  const signedOut = await request('/school-admin/logout', {});
  assert.equal(signedOut.status, 302);
  assert.equal((await request('/school-admin/dashboard')).status, 302);
});

// Scripts are nonce-allowed; styles still need 'unsafe-inline' and that
// limitation is recorded rather than hidden.
test('a content security policy is sent, and inline scripts carry its nonce', async () => {
  cookie = ''; csrf = '';
  const page = await request('/');
  const csp = page.headers.get('content-security-policy');
  assert.ok(csp, 'expected a Content-Security-Policy header');
  assert.match(csp, /script-src [^;]*'nonce-/);
  assert.doesNotMatch(csp, /script-src [^;]*'unsafe-inline'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);

  const nonce = csp.match(/script-src [^;]*'nonce-([^']+)'/)[1];
  for (const tag of page.body.match(/<script(?![^>]*\bsrc=)[^>]*>/g) || []) {
    assert.ok(tag.includes(`nonce="${nonce}"`), `inline script without the request nonce: ${tag}`);
  }
});

test('each request gets its own nonce', async () => {
  const a = (await request('/')).headers.get('content-security-policy');
  const b = (await request('/')).headers.get('content-security-policy');
  assert.notEqual(a.match(/'nonce-([^']+)'/)[1], b.match(/'nonce-([^']+)'/)[1]);
});

// Malformed input reaching an unhandled error must not hand the visitor
// a stack trace, a filesystem path or internal error text.
test('an unhandled error returns a generic page, not a stack trace', async () => {
  // No ordinary request to this application throws, so the handler is
  // exercised directly — mounted exactly as the real server mounts it,
  // with the same view engine behind it.
  const express = require('express');
  const app = require('../server');
  const probeApp = express();
  probeApp.set('view engine', 'ejs');
  probeApp.set('views', path.join(__dirname, '..', 'views'));
  probeApp.locals = app.locals;
  probeApp.use((req, res, next) => {
    res.locals.t = (key) => require('../lib/i18n').t('en', key);
    res.locals.locale = 'en'; res.locals.lang = 'en'; res.locals.dir = 'ltr';
    res.locals.cspNonce = 'test-nonce';
    res.locals.currentPath = req.originalUrl; res.locals.origin = 'http://test';
    res.locals.altLocalePath = null;
    next();
  });
  probeApp.get('/boom', () => { throw new Error('deliberate failure at /Users/secret/path/detail.js'); });
  probeApp.use(app.errorHandler);

  const probe = http.createServer(probeApp);
  await new Promise(r => probe.listen(0, r));
  const thrown = await fetch(`http://127.0.0.1:${probe.address().port}/boom`);
  const body = await thrown.text();
  await new Promise(r => probe.close(r));

  assert.equal(thrown.status, 500);
  assert.doesNotMatch(body, /deliberate failure/, 'the error message leaked into the response');
  assert.doesNotMatch(body, /\/Users\/secret/, 'a filesystem path leaked into the response');
  assert.doesNotMatch(body, /at .*\(.*:\d+:\d+\)/, 'a stack frame leaked into the response');
  assert.match(body, /Something went wrong/);
});

test('unauthenticated write endpoints are rate limited', async () => {
  cookie = ''; csrf = '';
  await request('/forgot-password');
  let limited = false;
  for (let i = 0; i < 40 && !limited; i++) {
    const r = await request('/forgot-password', { identifier: '111111111111' });
    if (r.status === 429) limited = true;
  }
  assert.ok(limited, 'expected the forgot-password endpoint to start refusing after a burst');
});
