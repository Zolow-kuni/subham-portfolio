// ============================================================
// db/verify.mjs — verify only. Prints the public schema table
// names and row counts (NOT credentials). Safe for reports.
//   Usage: SV_DATABASE_URL=... node db/verify.mjs
// ============================================================

import { neon } from '@neondatabase/serverless';

// Vercel/Neon-managed variable (intentional "SV" prefix). Never echo it.
const databaseUrl = process.env.SV_DATABASE_URL;
if (!databaseUrl) {
  console.error('SV_DATABASE_URL is required');
  process.exit(1);
}

const EXPECTED = [
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

const sql = neon(databaseUrl);

const tables = await sql`
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename`;

const actual = new Set(tables.map((r) => r.tablename));

const missing = EXPECTED.filter((t) => !actual.has(t));
const present = EXPECTED.filter((t) => actual.has(t));

console.log(`public tables: ${tables.map((r) => r.tablename).join(', ') || '(none)'}`);
console.log(`approved 11-entity schema present: ${present.length}/11`);
if (missing.length) {
  console.log(`MISSING: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('schema verification: OK');

for (const t of present) {
  const rows = await sql.query(`SELECT COUNT(*) AS n FROM "${t}"`);
  console.log(`  ${t}: ${rows[0]?.n ?? 0} row(s)`);
}