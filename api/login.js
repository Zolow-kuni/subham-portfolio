// ============================================================
// POST /api/login — owner authentication (foundation)
// ------------------------------------------------------------
// - Validates email + password against server-side env config.
// - Rate-limited per IP (in-memory, best-effort).
// - On success issues an httpOnly, Secure, SameSite session cookie
//   and returns the per-session CSRF token for mutating requests.
// Never logs credentials. Never returns why a check failed.
// ============================================================

import {
  authConfigured,
  clearRateLimit,
  createSession,
  rateLimited,
  sessionHelpers,
  verifyCredentials,
} from './_lib/auth.js';

function clientIp(req) {
  const fwd = req.headers?.get ? req.headers.get('x-forwarded-for') : req.headers?.['x-forwarded-for'];
  return (String(fwd || '').split(',')[0] || 'unknown').trim();
}

export default async function handler(req) {
  if (req?.method !== 'POST') {
    return Response.json({ ok: false, error: 'method_not_allowed' }, { status: 405 });
  }

  if (!authConfigured()) {
    return Response.json({ ok: false, error: 'auth_not_configured' }, { status: 503 });
  }

  const ip = clientIp(req);
  if (rateLimited(ip)) {
    return Response.json({ ok: false, error: 'too_many_attempts' }, { status: 429 });
  }

  let body = null;
  try {
    body = await req.json();
  } catch (_e) {
    return Response.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const { email, password } = body || {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return Response.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  if (!verifyCredentials(email, password)) {
    return Response.json({ ok: false, error: 'invalid_credentials' }, { status: 401 });
  }

  const session = createSession();
  const { setSessionCookie } = sessionHelpers();
  const res = new Response(
    JSON.stringify({ ok: true, csrf: session.csrf }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
  setSessionCookie(res, session);
  clearRateLimit(ip);
  return res;
}