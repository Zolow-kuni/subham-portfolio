// ============================================================
// scripts/verify-api.mjs — short-lived Phase 2 API verification
// ------------------------------------------------------------
// Runs the real serverless handlers in-process against the LIVE
// database (matching the notepad's "short-lived/safe" requirement —
// no server process is left running). Secrets are loaded from the
// gitignored .vercel/.env.production.local (pulled via `vercel pull`)
// and ephemeral test auth env vars are set locally only.
//
//   Usage: node scripts/verify-api.mjs
//
// Never prints secret values. Prints only statuses and non-secret facts.
// ============================================================

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';

const ENV_FILE = '.vercel/.env.production.local';

let failures = 0;
function check(name, cond, extra = '') {
  const ok = Boolean(cond);
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`);
}

function loadDatabaseUrl() {
  const raw = readFileSync(ENV_FILE, 'utf8').replace(/\r/g, '');
  const m = raw.match(/^SV_DATABASE_URL="?([^"\r\n]+)"?$/m);
  return m ? m[1] : null;
}

const dbUrl = loadDatabaseUrl();
if (!dbUrl) {
  console.log('SKIP  SV_DATABASE_URL not present in local env file — run `vercel pull` first.');
  process.exit(0);
}

// Ephemeral, local-only auth (never used against production envs).
process.env.SV_DATABASE_URL = dbUrl;
process.env.AUTH_SECRET = 'verify-api-local-integration-secret';
process.env.OWNER_EMAIL = 'owner@test.local';
process.env.OWNER_PASSWORD_HASH = createHash('sha256')
  .update('local-test-password')
  .digest('hex');

const health = (await import('../api/health.js')).default;
const journal = (await import('../api/journal.js')).default;
const login = (await import('../api/login.js')).default;
const logout = (await import('../api/logout.js')).default;
const adminStatus = (await import('../api/admin/status.js')).default;

const BASE = 'http://localhost';

function req(method, path, { cookie, csrf, body, ip } = {}) {
  const headers = { 'x-forwarded-for': ip || '127.0.0.1' };
  if (cookie) headers.cookie = cookie;
  if (csrf) headers['x-csrf-token'] = csrf;
  if (body !== undefined) headers['content-type'] = 'application/json';
  return new Request(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function readJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

// --- 1. health -------------------------------------------------
{
  const res = await health(req('GET', '/api/health'));
  const body = await readJson(res);
  check('/api/health returns 200', res.status === 200, `status=${res.status}`);
  check('/api/health ok true', body.ok === true);
  check('/api/health db ok (live Neon)', body.db === 'ok', `db=${body.db}`);
  check('/api/health auth configured (local ephemeral)', body.auth === true);
}

// --- 2. public journal read -------------------------------------
{
  const res = await journal(req('GET', '/api/journal'));
  const body = await readJson(res);
  const feed = body.feed || {};
  const keys = ['holdings', 'diary', 'learning', 'values', 'discussions', 'marketSessions', 'takeaways', 'decision', 'events'];
  check('GET /api/journal returns 200', res.status === 200, `status=${res.status}`);
  check('GET /api/journal ok true', body.ok === true);
  check('GET /api/journal feed has 9 top-level keys', keys.every((k) => k in feed));
  check('GET /api/journal 8 collections empty (no Phase 3 data yet)',
    keys.filter((k) => k !== 'decision').every((k) => Array.isArray(feed[k]) && feed[k].length === 0));
  check('GET /api/journal decision null (no data yet)', feed.decision === null);
}

// --- 3. unauthenticated protection ------------------------------
{
  const res = await journal(req('POST', '/api/journal', { body: { action: 'update', entity: 'holding', id: randomUUID(), patch: { status: 'draft' } } }));
  check('POST /api/journal (anonymous) rejected', res.status === 401, `status=${res.status}`);

  const resAdm = await adminStatus(req('GET', '/api/admin/status'));
  check('GET /api/admin/status (anonymous) rejected', resAdm.status === 401, `status=${resAdm.status}`);
}

// --- 4. login / session / CSRF / private boundary -----------------
let sessionCookie = null;
let csrf = null;
{
  const wrong = await login(req('POST', '/api/login', { ip: '10.0.0.10', body: { email: 'owner@test.local', password: 'wrong' } }));
  check('login wrong credentials -> 401', wrong.status === 401, `status=${wrong.status}`);

  const good = await login(req('POST', '/api/login', { ip: '10.0.0.10', body: { email: 'OWNER@test.local', password: 'local-test-password' } }));
  const goodBody = await readJson(good);
  const setCookie = good.headers.get('set-cookie') || '';
  check('login correct credentials -> 200', good.status === 200, `status=${good.status}`);
  check('login correct ok true', goodBody.ok === true);
  check('login cookie HttpOnly', /\bHttpOnly\b/i.test(setCookie));
  check('login cookie SameSite=Strict', /\bSameSite=Strict\b/i.test(setCookie));
  check('login cookie Path=/', /\bPath=\//.test(setCookie));
  check('login returns csrf token', Boolean(goodBody.csrf));
  sessionCookie = setCookie.split(';')[0];
  csrf = goodBody.csrf;
}

{
  const noCsrf = await journal(req('POST', '/api/journal', { cookie: sessionCookie, body: { action: 'get', entity: 'holding', id: randomUUID() } }));
  check('POST /api/journal (session, no CSRF header) -> 403', noCsrf.status === 403, `status=${noCsrf.status}`);

  const badCsrf = await journal(req('POST', '/api/journal', { cookie: sessionCookie, csrf: 'wrong-token', body: { action: 'get', entity: 'holding', id: randomUUID() } }));
  check('POST /api/journal (session, wrong CSRF) -> 403', badCsrf.status === 403, `status=${badCsrf.status}`);

  const okW = await journal(req('POST', '/api/journal', { cookie: sessionCookie, csrf, body: { action: 'get', entity: 'holding', id: randomUUID() } }));
  const okWB = await readJson(okW);
  check('POST /api/journal (session + CSRF) allowed', okW.status === 200, `status=${okW.status}`);
  check('POST /api/journal private read ok', okWB.ok === true && okWB.item === null);

  const adm = await adminStatus(req('GET', '/api/admin/status', { cookie: sessionCookie }));
  const admBody = await readJson(adm);
  check('GET /api/admin/status (session) allowed', adm.status === 200, `status=${adm.status}`);
  check('GET /api/admin/status reports 11 tables',
    admBody.tables && Object.keys(admBody.tables).length === 11, `n=${admBody.tables ? Object.keys(admBody.tables).length : 'n/a'}`);

  const out = await logout(req('POST', '/api/logout', { cookie: sessionCookie }));
  const clearedCookie = (out.headers.get('set-cookie') || '').split(';')[0];
  check('POST /api/logout -> 200 idempotent', out.status === 200, `status=${out.status}`);

  const after = await journal(req('POST', '/api/journal', { cookie: clearedCookie, body: { action: 'get', entity: 'holding', id: randomUUID() } }));
  check('POST /api/journal after logout (cleared cookie) -> 401', after.status === 401, `status=${after.status}`);
}

// --- 5. login rate limiting ---------------------------------------
{
  let lastStatus = 0;
  for (let i = 0; i < 6; i += 1) {
    const r = await login(req('POST', '/api/login', { ip: '10.0.0.99', body: { email: 'owner@test.local', password: 'wrong' } }));
    lastStatus = r.status;
  }
  check('rate limit: 6 failed logins -> 6th returns 429', lastStatus === 429, `status=${lastStatus}`);
}

console.log(failures === 0 ? '\nALL API CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);