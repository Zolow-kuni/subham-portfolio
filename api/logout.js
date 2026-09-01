// ============================================================
// POST /api/logout — end the owner session (foundation)
// ------------------------------------------------------------
// Idempotent. Clears the session cookie regardless of whether a
// valid session was present (a user can always sign out).
// ============================================================

import { sessionHelpers } from './_lib/auth.js';

export default async function handler(req) {
  if (req?.method !== 'POST') {
    return Response.json({ ok: false, error: 'method_not_allowed' }, { status: 405 });
  }
  const { clearSessionCookie } = sessionHelpers();
  const res = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  clearSessionCookie(res);
  return res;
}