// ============================================================
// /api/journal — Private Investment Journal API (foundation)
// ------------------------------------------------------------
// PUBLIC read (GET):
//   Returns the FULL journal feed, published entities only.
//   This is the server-backed source of truth that the public
//   page will consume in Phase 5. It intentionally mirrors the
//   nested shapes already produced by investments.js so the page
//   presentation stays identical.
//
// PRIVATE boundary (POST):
//   Requires a valid owner session (httpOnly cookie) + CSRF.
//   Foundation only: mutating a draft/publish/archive lifecycle.
//   The full admin dashboard is Phase 4; this route only proves
//   the write boundary works end-to-end.
// ============================================================

import { getDb, hasDatabase } from './_lib/db.js';
import { readSession, sessionHelpers } from './_lib/auth.js';

const PUBLISHED = 'published';

// ---- public : published-only read ------------------------------------

async function fetchPublished(sql) {
  const holdings = await sql`SELECT id, sort_order, name, role, qty_display, avg_display, ltp_display, pos_display
                              FROM portfolio_holdings WHERE status = ${PUBLISHED} ORDER BY sort_order`;
  const diary = await sql`SELECT id, sort_order, num, display_date, sort_date, title, summary, lesson, metrics_json, full_json, session_id
                           FROM diary_entries WHERE status = ${PUBLISHED} ORDER BY sort_order`;
  const learning = await sql`SELECT id, sort_order, text FROM learning WHERE status = ${PUBLISHED} ORDER BY sort_order`;
  const values = await sql`SELECT id, sort_order, step, display_date, sort_date, invested_display, portfolio_display
                            FROM portfolio_values WHERE status = ${PUBLISHED} ORDER BY sort_order`;
  const discussions = await sql`SELECT id, sort_order, tag, title, text
                                 FROM discussions WHERE status = ${PUBLISHED} ORDER BY sort_order`;
  const sessions = await sql`SELECT id, session_id, display_date, sort_date, subject, tagline, open, steady
                              FROM market_sessions WHERE status = ${PUBLISHED} ORDER BY sort_order`;
  const takeaways = await sql`SELECT id, session_id, sort_order, text
                               FROM session_takeaways WHERE status = ${PUBLISHED} ORDER BY sort_order`;
  const events = await sql`SELECT id, sort_order, display_date, month, event_type, instrument, capital, lines_json, session_id
                            FROM investment_events WHERE status = ${PUBLISHED} ORDER BY sort_order`;

  const points = await sql`SELECT id, session_id, sort_order, time_display, value_display, today_display
                            FROM session_points ORDER BY session_id, sort_order`;
  const moves = await sql`SELECT id, session_id, sort_order, label, name, change, detail
                           FROM session_moves ORDER BY session_id, sort_order`;

  const pointsBySession = groupBy(points, 'session_id');
  const movesBySession = groupBy(moves, 'session_id');

  const marketSessions = sessions.map((s) => ({
    ...s,
    points: pointsBySession.get(s.id) || [],
    moves: movesBySession.get(s.id) || [],
  }));

  const decision = await sql`SELECT id, session_id, decision, watch, reason
                              FROM session_decision WHERE status = ${PUBLISHED}
                              ORDER BY session_id nulls last LIMIT 1`;

  return {
    holdings,
    diary,
    learning,
    values,
    discussions,
    marketSessions,
    takeaways,
    decision: decision[0] || null,
    events,
  };
}

function groupBy(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const k = row[key];
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row);
  }
  return map;
}

// ---- MUTABLE lifecycle (foundation write boundary) --------------------
// Expects: { action, entity, id, patch? } with a valid session + CSRF.
// Safe-set: entity -> table name, action, and mutable fields are each
// limited to hard-coded whitelists (no string-builder injection surface).
// The full admin writer (arbitrary field writers, publish workflows)
// is deliberately deferred to Phase 4.

const ENTITIES = {
  holding: 'portfolio_holdings',
  diary: 'diary_entries',
  learning: 'learning',
  value: 'portfolio_values',
  discussion: 'discussions',
  session: 'market_sessions',
  takeaway: 'session_takeaways',
  decision: 'session_decision',
  event: 'investment_events',
};

const STATUSES = new Set(['draft', 'published', 'archived']);

// `table` is always resolved from the hard-coded ENTITIES whitelist, so
// embedding it in SQL is safe (never derived from input). Values are
// parameterized separately via sql.query.
function ident(table) {
  return `"${table.replace(/"/g, '""')}"`;
}

async function privateUpdate(sql, body) {
  const { action, entity, id, patch } = body || {};
  const table = ENTITIES[entity];
  if (!action || !table || !id) {
    return Response.json({ ok: false, error: 'action, entity and id are required' }, { status: 400 });
  }

  if (action === 'get') {
    const rows = await sql.query(`SELECT * FROM ${ident(table)} WHERE id = $1`, [id]);
    return Response.json({ ok: true, item: rows[0] || null });
  }

  if (action === 'update') {
    const allowed = new Set(['status']);
    const updates = Object.entries(patch || {}).filter(([k]) => allowed.has(k));
    if (updates.length === 0) {
      return Response.json({ ok: false, error: 'no allowed fields in patch' }, { status: 400 });
    }
    const status = updates.find(([k]) => k === 'status')?.[1];
    if (!STATUSES.has(status)) {
      return Response.json({ ok: false, error: 'invalid status' }, { status: 400 });
    }
    await sql.query(`UPDATE ${ident(table)} SET status = $1 WHERE id = $2`, [status, id]);
    const rows = await sql.query(`SELECT * FROM ${ident(table)} WHERE id = $2`, [id]);
    return Response.json({ ok: true, item: rows[0] || null });
  }

  if (action === 'delete') {
    await sql.query(`UPDATE ${ident(table)} SET status = 'archived' WHERE id = $1`, [id]);
    return Response.json({ ok: true, archived: true });
  }

  return Response.json({ ok: false, error: 'unsupported action' }, { status: 400 });
}

export default async function handler(req) {
  if (!hasDatabase()) {
    return Response.json(
      { ok: false, error: 'database_not_configured' },
      { status: 503 },
    );
  }

  const method = req?.method || 'GET';
  const sql = getDb();

  if (method === 'GET') {
    try {
      const feed = await fetchPublished(sql);
      return Response.json({ ok: true, feed }, { status: 200 });
    } catch (_e) {
      return Response.json({ ok: false, error: 'read_failed' }, { status: 500 });
    }
  }

  if (method === 'POST') {
    const session = readSession(req);
    if (!session) {
      return Response.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
    }

    const csrfHeader =
      (typeof req.headers?.get === 'function' ? req.headers.get('x-csrf-token') : req.headers?.['x-csrf-token']) || '';
    const { verifyCsrf } = sessionHelpers();
    if (!csrfHeader || !verifyCsrf(csrfHeader, session.csrf)) {
      return Response.json({ ok: false, error: 'csrf_failed' }, { status: 403 });
    }

    let body = null;
    try {
      body = await req.json();
    } catch (_e) {
      return Response.json({ ok: false, error: 'invalid_json' }, { status: 400 });
    }

    try {
      return await privateUpdate(sql, body);
    } catch (_e) {
      return Response.json({ ok: false, error: 'write_failed' }, { status: 500 });
    }
  }

  return Response.json({ ok: false, error: 'method_not_allowed' }, { status: 405 });
}