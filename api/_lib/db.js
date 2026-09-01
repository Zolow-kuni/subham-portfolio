// ============================================================
// SERVER-ONLY DB HELPER — Phase 2 foundation
// ------------------------------------------------------------
// Uses the Neon serverless Postgres driver. The connection string
// comes from the Vercel/Neon-managed environment variable
// SV_DATABASE_URL (intentional custom prefix "SV" — the application
// contract per the master directive) and is server-side only.
// This module is imported ONLY by api/* functions — never by public
// browser JS.
//
// SECURITY: this file must never be shipped to the browser and
// must never log the connection string.
// ============================================================

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.SV_DATABASE_URL;

let sql = null;

export function getDb() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }
  if (!sql) {
    // neon() returns a tagged-template query function; safe for
    // parameterized queries. Never interpolate untrusted input.
    sql = neon(DATABASE_URL);
  }
  return sql;
}

// Server-side singleton reset hook for tests / env reloads.
export function _resetDb() {
  sql = null;
}

export const hasDatabase = () => Boolean(DATABASE_URL);