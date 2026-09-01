// ============================================================
// GET /api/health — liveness + readiness foundation
// ------------------------------------------------------------
// Public, read-only. Never exposes secret values — only booleans.
// - ok / service : the function itself is running
// - db           : "ok" | "not_configured" | "unreachable"
// - auth         : boolean — is the auth foundation configured?
// ============================================================

import { getDb, hasDatabase } from './_lib/db.js';
import { authConfigured } from './_lib/auth.js';

export default async function handler() {
  let db = 'not_configured';
  if (hasDatabase()) {
    try {
      const rows = await getDb()`SELECT 1 AS ok`;
      db = rows && rows[0] && rows[0].ok === 1 ? 'ok' : 'unreachable';
    } catch (_e) {
      db = 'unreachable';
    }
  }

  return Response.json(
    {
      ok: true,
      service: 'private-investment-journal',
      db,
      auth: authConfigured(),
      time: new Date().toISOString(),
    },
    { status: 200 },
  );
}