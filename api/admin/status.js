// ============================================================
// GET /api/admin/status — private boundary proof (foundation)
// ------------------------------------------------------------
// Requires a valid owner session. Returns per-entity row counts so
// the dashboard (Phase 4) and migration (Phase 3) can self-check.
// Never returns secret values — only counts and booleans.
// ============================================================

import { getDb, hasDatabase } from '../_lib/db.js';
import { isOwner } from '../_lib/auth.js';

const TABLES = [
  'portfolio_holdings',
  'diary_entries',
  'learning',
  'portfolio_values',
  'discussions',
  'market_sessions',
  'session_points',
  'session_moves',
  'session_takeaways',
  'session_decision',
  'investment_events',
];

export default async function handler(req) {
  if (req?.method !== 'GET') {
    return Response.json({ ok: false, error: 'method_not_allowed' }, { status: 405 });
  }
  if (!isOwner(req)) {
    return Response.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
  }

  if (!hasDatabase()) {
    return Response.json({ ok: false, error: 'database_not_configured' }, { status: 503 });
  }

  try {
    const sql = getDb();
    const counts = {};
    for (const t of TABLES) {
      const rows = await sql.query(`SELECT COUNT(*) AS n FROM "${t}"`);
      counts[t] = rows[0]?.n ?? 0;
    }
    return Response.json(
      { ok: true, tables: counts, time: new Date().toISOString() },
      { status: 200 },
    );
  } catch (_e) {
    return Response.json({ ok: false, error: 'read_failed' }, { status: 500 });
  }
}