// ============================================================
// db/migrate.mjs — apply db/schema.sql to the target database.
// ------------------------------------------------------------
// Usage (server-side only; requires SV_DATABASE_URL env, never echo):
//   DATABASE_URL=... node db/migrate.mjs
//
// Idempotent: the schema uses IF NOT EXISTS everywhere, so re-running
// is safe. Splits statements on ';' — the schema contains no
// functions/triggers, so this is a safe, readable split.
// ============================================================

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

// Vercel/Neon-managed variable (intentional "SV" prefix). Never echo it.
const databaseUrl = process.env.SV_DATABASE_URL;
if (!databaseUrl) {
  console.error('SV_DATABASE_URL is required');
  process.exit(1);
}

const sql = neon(databaseUrl);
const schemaPath = fileURLToPath(new URL('./schema.sql', import.meta.url));
const script = await readFile(schemaPath, 'utf8');

const statements = script
  .split(/;\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean);

let applied = 0;
for (const statement of statements) {
  // Executing a comment-only chunk is a harmless no-op.
  await sql.query(statement);
  applied += 1;
}

console.log(`Migration applied (${applied} statement(s)).`);