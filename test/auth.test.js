// ============================================================
// Foundation tests — pure server-side auth logic (no DB).
// Run: npm test  (node --test)
// ============================================================

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const PASSWORD = 'correct-horse-battery-staple';
const HASH = createHash('sha256').update(PASSWORD).digest('hex');

let auth;

before(async () => {
  process.env.AUTH_SECRET = 'test-secret-0123456789abcdef';
  process.env.OWNER_EMAIL = 'owner@example.com';
  process.env.OWNER_PASSWORD_HASH = HASH;
  auth = await import('../api/_lib/auth.js');
});

// A fake Vercel/Node response that captures Set-Cookie.
function fakeRes() {
  const headers = {};
  return { setHeader: (k, v) => { headers[k] = v; }, _headers: headers };
}

// A fake Request with a cookie header (either surface).
function fakeReq(cookie) {
  return {
    headers: { cookie },
    headersObject: { cookie },
  };
}

describe('auth foundation', () => {
  test('authConfigured reflects env', () => {
    assert.equal(auth.authConfigured(), true);
  });

  test('correct credentials verify; wrong ones do not', () => {
    assert.equal(auth.verifyCredentials('OWNER@example.com', PASSWORD), true);
    assert.equal(auth.verifyCredentials('owner@example.com', 'wrong-password'), false);
    assert.equal(auth.verifyCredentials('someone@example.com', PASSWORD), false);
  });

  test('session cookie round-trips and CSRF is stable per session', () => {
    const session = auth.createSession();
    assert.ok(session.csrf);
    const res = fakeRes();
    auth.sessionHelpers().setSessionCookie(res, session);
    const cookieValue = res._headers['Set-Cookie'];

    const read = auth.readSession(fakeReq(cookieValue));
    assert.ok(read);
    assert.equal(read.nonce, session.nonce);
    assert.equal(read.expiresAt, session.expiresAt);
    // readSession must recompute the same CSRF server-side.
    assert.equal(read.csrf, session.csrf);
    assert.ok(auth.sessionHelpers().verifyCsrf(session.csrf, session.csrf));
    assert.equal(auth.sessionHelpers().verifyCsrf('wrong-token', session.csrf), false);
  });

  test('tampered cookie is rejected', () => {
    const session = auth.createSession();
    const res = fakeRes();
    auth.sessionHelpers().setSessionCookie(res, session);
    const tampered = res._headers['Set-Cookie'].slice(0, -2) + 'zz';
    assert.equal(auth.readSession(fakeReq(tampered)), null);
  });

  test('expired session is rejected', () => {
    const session = { expiresAt: Date.now() - 1000, nonce: 'n', csrf: 'c' };
    const res = fakeRes();
    auth.sessionHelpers().setSessionCookie(res, session);
    assert.equal(auth.readSession(fakeReq(res._headers['Set-Cookie'])), null);
  });

  test('per-IP rate limiting trips after max attempts', () => {
    auth.clearRateLimit('10.0.0.1');
    const max = 5;
    for (let i = 0; i < max; i++) {
      assert.equal(auth.rateLimited('10.0.0.1'), false);
    }
    assert.equal(auth.rateLimited('10.0.0.1'), true);
  });
});