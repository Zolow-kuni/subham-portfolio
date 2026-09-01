// ============================================================
// SERVER-ONLY AUTH HELPER — Phase 2 foundation
// ------------------------------------------------------------
// Server-side session authentication foundation.
//
// Security model:
//   - The browser is UNTRUSTED. Authorization is enforced here,
//     in serverless functions, never by client-side conditionals.
//   - Session identity is carried in an httpOnly, Secure, SameSite
//     cookie whose value is HMAC-signed with AUTH_SECRET.
//   - AUTH_SECRET and the owner credential must live ONLY in
//     server-side environment variables. Never in source/Git/browser.
//   - State-changers require a CSRF token issued at login and
//     verified server-side on each mutating request.
//   - Login endpoint is rate-limited per IP (in-memory, best-effort).
//
// This is the FOUNDATION for Phase 4's login dashboard; it
// deliberately does not implement the full admin UI.
// ============================================================

import { createHmac, timingSafeEqual, createHash } from 'node:crypto';

const AUTH_SECRET = process.env.AUTH_SECRET;
const OWNER_EMAIL = process.env.OWNER_EMAIL;
// OWNER_PASSWORD_HASH: store a normalized SHA-256 hash of the owner
// password (hex). NEVER store the plaintext password anywhere.
const OWNER_PASSWORD_HASH = process.env.OWNER_PASSWORD_HASH;

const COOKIE_NAME = 'inv_session';
const SESSION_DAYS = 7;
const SESSION_TTL_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

// Per-IP in-memory login attempt tracking (best-effort; resets on
// function cold start — acceptable for a single-owner journal).
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const loginAttempts = new Map();

function hmacValue(data) {
  if (!AUTH_SECRET) throw new Error('AUTH_SECRET is not configured');
  return createHmac('sha256', AUTH_SECRET).update(data).digest('hex');
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

export const authConfigured = () =>
  Boolean(AUTH_SECRET && OWNER_EMAIL && OWNER_PASSWORD_HASH);

// Accepts both Web API Request (headers.get) and Node-style
// req (headers object), so the foundation works on either surface.
function getCookieHeader(req) {
  if (!req || !req.headers) return '';
  if (typeof req.headers.get === 'function') return req.headers.get('cookie') || '';
  return req.headers.cookie || '';
}

function parseCookieHeader(header) {
  if (!header) return {};
  if (Array.isArray(header)) header = header.join(';');
  const out = {};
  header.split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i === -1) return;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function setCookieOn(res, cookie) {
  if (typeof res.setHeader === 'function') {
    // Node-style response (Vercel req/res).
    res.setHeader('Set-Cookie', cookie);
  } else if (res.headers && typeof res.headers.append === 'function') {
    // Web API Response — set the cookie on its Headers.
    res.headers.append('Set-Cookie', cookie);
  } else if (typeof res.append === 'function') {
    res.append('Set-Cookie', cookie);
  } else if (typeof res.set === 'function') {
    res.set('Set-Cookie', cookie);
  } else {
    throw new Error('Unsupported response surface for cookies');
  }
}

function sessionCookieData(session) {
  const payload = `${session.expiresAt}|${session.nonce}`;
  const sig = hmacValue(payload);
  return `${payload}|${sig}`;
}

function verifySession(raw) {
  if (!raw) return null;
  const parts = String(raw).split('|');
  if (parts.length !== 3) return null;
  const [expiresAt, nonce, sig] = parts;
  const expectedSig = hmacValue(`${expiresAt}|${nonce}`);
  if (!safeEqual(sig, expectedSig)) return null;
  if (Number(expiresAt) < Date.now()) return null;
  return { expiresAt: Number(expiresAt), nonce };
}

function setSessionCookie(res, session) {
  const value = sessionCookieData(session);
  // Secure + SameSite=Strict for production safety (foundation default).
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  setCookieOn(res, [
    `${COOKIE_NAME}=${encodeURIComponent(value)}; HttpOnly; Path=/; Max-Age=${SESSION_DAYS * 86400}; ${
      secure ? 'Secure; ' : ''
    }SameSite=Strict`,
  ]);
}

function clearSessionCookie(res) {
  setCookieOn(res, [`${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict`]);
}

// CSRF is derived deterministically from the signed session payload, so it
// can be recomputed server-side on every request without client state.
function sessionCsrf(session) {
  return createHmac('sha256', AUTH_SECRET)
    .update(`csrf|${session.expiresAt}|${session.nonce}`)
    .digest('hex')
    .slice(0, 32);
}

function verifyCsrf(token, expected) {
  if (!token || !expected) return false;
  return safeEqual(token, expected);
}

// Creates a fresh signed session + CSRF token for the owner.
export function createSession() {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const nonce = createHmac('sha256', AUTH_SECRET)
    .update(`${Date.now()}|${Math.random()}`)
    .digest('hex')
    .slice(0, 32);
  const session = { expiresAt, nonce };
  return { ...session, csrf: sessionCsrf(session) };
}

// Returns { session, csrf } if a valid cookie is present, else null.
export function readSession(req) {
  const raw = parseCookieHeader(getCookieHeader(req));
  const verified = verifySession(raw[COOKIE_NAME]);
  if (!verified) return null;
  return { ...verified, csrf: sessionCsrf(verified) };
}

// True if the request carries a valid owner session (server-side).
export function isOwner(req) {
  return Boolean(readSession(req));
}

// Server-side credential check (constant-time). Plaintext password is
// hashed and compared against OWNER_PASSWORD_HASH (sha256 hex) only —
// never stored or logged.
export function verifyCredentials(email, password) {
  if (!authConfigured()) return false;
  const emailOk = safeEqual(email.trim().toLowerCase(), OWNER_EMAIL.toLowerCase());
  const hashInput = createHash('sha256').update(String(password)).digest('hex');
  const hashOk = safeEqual(hashInput, OWNER_PASSWORD_HASH);
  return emailOk && hashOk;
}

// Best-effort per-IP login rate limiting.
export function rateLimited(ip) {
  const now = Date.now();
  const rec = loginAttempts.get(ip) || { count: 0, resetAt: 0 };
  if (now > rec.resetAt) rec.count = 0, rec.resetAt = now + LOGIN_WINDOW_MS;
  rec.count += 1;
  loginAttempts.set(ip, rec);
  return rec.count > LOGIN_MAX_ATTEMPTS;
}

export function clearRateLimit(ip) {
  loginAttempts.delete(ip);
}

export function sessionHelpers() {
  return {
    COOKIE_NAME,
    setSessionCookie,
    clearSessionCookie,
    verifyCsrf,
  };
}