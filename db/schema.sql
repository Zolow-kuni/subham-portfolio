-- ============================================================
-- PRIVATE INVESTMENT JOURNAL — SCHEMA (Phase 2 foundation)
-- ------------------------------------------------------------
-- Portable PostgreSQL / Neon-compatible relational schema.
-- Represents the Phase 1 approved data model for the existing
-- static Investment Journal (investments.js) without flattening
-- the 9 source collections into one generic table.
--
-- Conventions:
--   id         stable UUID (introduced for every entity)
--   sort_order explicit ordering (NEVER rely on insert order)
--   legacy_ref preserves the original array index from
--              investments.js for audit / rollback (null where n/a)
--   display_*  verbatim display strings (never normalized away)
--   *_json     JSONB for nested structures preserved verbatim
--   status     draft | published | archived (public feed = published)
--   created_at / updated_at  server-managed timestamps
--
-- Migration from investments.js is Phase 3. This foundation file is
-- imported in Phase 2 to create the tables; no data is inserted here.
-- ============================================================

-- (gen_random_uuid() is built into core PostgreSQL since v13, so no
--  pgcrypto extension or superuser rights are required on Neon.)

-- ------------------------------------------------------------
-- PORTFOLIO HOLDINGS  (investments.js -> PORTFOLIO_HOLDINGS)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portfolio_holdings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order    INTEGER      NOT NULL,
  legacy_ref    INTEGER,
  name          TEXT         NOT NULL,
  role          TEXT         NOT NULL,
  qty_display   TEXT,                          -- NULL -> renders as "—"
  avg_display   TEXT,                          -- e.g. '₹36.63' verbatim
  ltp_display   TEXT,                          -- e.g. '₹36.61' verbatim
  pos_display   TEXT,                          -- e.g. '-₹0.08' / '+₹7.47'
  status        TEXT         NOT NULL DEFAULT 'published'
                CHECK (status IN ('draft','published','archived')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- INVESTMENT DIARY ENTRIES  (DIARY_ENTRIES)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS diary_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order    INTEGER      NOT NULL,
  legacy_ref    INTEGER,
  num           TEXT         NOT NULL,          -- e.g. 'Entry 03' verbatim
  display_date  TEXT         NOT NULL,          -- e.g. 'August 31, 2026'
  sort_date     DATE,                           -- machine date (ordering only)
  title         TEXT         NOT NULL,
  summary       TEXT         NOT NULL,
  lesson        TEXT         NOT NULL,
  metrics_json  JSONB        NOT NULL DEFAULT '[]',   -- metrics[]
  full_json     JSONB        NOT NULL DEFAULT '[]',   -- full[] paragraphs
  session_id    UUID,                           -- FK: 31 Aug session cluster
  status        TEXT         NOT NULL DEFAULT 'published'
                CHECK (status IN ('draft','published','archived')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- LEARNING TIMELINE  (LEARNING : ordered strings)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order    INTEGER      NOT NULL,
  legacy_ref    INTEGER,
  text          TEXT         NOT NULL,
  status        TEXT         NOT NULL DEFAULT 'published'
                CHECK (status IN ('draft','published','archived')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- PORTFOLIO EVOLUTION / VALUE LADDER  (PORTFOLIO_VALUES)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portfolio_values (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order    INTEGER      NOT NULL,
  legacy_ref    INTEGER,
  step          TEXT         NOT NULL,          -- e.g. 'Day 1'
  display_date  TEXT         NOT NULL,          -- e.g. '24 Aug'
  sort_date     DATE,                           -- ordering only
  invested_display TEXT,                        -- '~₹490' or NULL ("—")
  portfolio_display TEXT,                       -- '~₹490' or NULL ("—")
  status        TEXT         NOT NULL DEFAULT 'published'
                CHECK (status IN ('draft','published','archived')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- DISCUSSIONS / THOUGHTS  (DISCUSSIONS)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS discussions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order    INTEGER      NOT NULL,
  legacy_ref    INTEGER,
  tag           TEXT         NOT NULL,          -- e.g. 'THESIS SHIFT'
  title         TEXT         NOT NULL,
  text          TEXT         NOT NULL,
  status        TEXT         NOT NULL DEFAULT 'published'
                CHECK (status IN ('draft','published','archived')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- MARKET SESSIONS  (MARKET_SESSIONS + points[] + moves[])
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS market_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order    INTEGER      NOT NULL,
  legacy_ref    INTEGER,
  session_id    UUID,                          -- shared cluster id (31 Aug)
  display_date  TEXT         NOT NULL,          -- e.g. '31 Aug 2026'
  sort_date     DATE,                           -- ordering only
  subject       TEXT         NOT NULL,
  tagline       TEXT         NOT NULL,
  open          TEXT         NOT NULL,
  steady        TEXT,                           -- nullable
  status        TEXT         NOT NULL DEFAULT 'published'
                CHECK (status IN ('draft','published','archived')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Session points[] (timestamped checkpoints)
CREATE TABLE IF NOT EXISTS session_points (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID         NOT NULL REFERENCES market_sessions(id) ON DELETE CASCADE,
  sort_order    INTEGER      NOT NULL,
  legacy_ref    INTEGER,
  time_display  TEXT         NOT NULL,          -- e.g. '09:19'
  value_display TEXT         NOT NULL,          -- e.g. '₹1,205'
  today_display TEXT         NOT NULL,          -- e.g. '-1.03%'
  note          TEXT         NOT NULL,          -- e.g. 'Opened red'
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Session moves[] (per-instrument move labels)
CREATE TABLE IF NOT EXISTS session_moves (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID         NOT NULL REFERENCES market_sessions(id) ON DELETE CASCADE,
  sort_order    INTEGER      NOT NULL,
  legacy_ref    INTEGER,
  label         TEXT         NOT NULL,          -- e.g. 'KEY MOVE'
  name          TEXT         NOT NULL,          -- e.g. 'SUZLON'
  change        TEXT         NOT NULL,          -- e.g. '-1.95% → +1.35%'
  detail        TEXT         NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- SESSION TAKEAWAYS  (SESSION_TAKEAWAYS : ordered strings)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS session_takeaways (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID,                           -- cluster FK (nullable)
  sort_order    INTEGER      NOT NULL,
  legacy_ref    INTEGER,
  text          TEXT         NOT NULL,
  status        TEXT         NOT NULL DEFAULT 'published'
                CHECK (status IN ('draft','published','archived')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- SESSION DECISION  (SESSION_DECISION : single object)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS session_decision (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID UNIQUE REFERENCES market_sessions(id) ON DELETE CASCADE,
  legacy_ref    INTEGER,
  decision      TEXT         NOT NULL,
  watch         TEXT         NOT NULL,
  reason        TEXT         NOT NULL,
  status        TEXT         NOT NULL DEFAULT 'published'
                CHECK (status IN ('draft','published','archived')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- INVESTMENT EVENTS  (INVESTMENT_EVENTS)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS investment_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order    INTEGER      NOT NULL,
  legacy_ref    INTEGER,
  display_date  TEXT         NOT NULL,          -- e.g. '31 Aug 2026'
  month         TEXT         NOT NULL,          -- e.g. 'August'
  event_type    TEXT         NOT NULL,          -- e.g. 'BUY' / 'REVIEW'
  instrument    TEXT,                           -- nullable
  capital       TEXT,                           -- nullable (e.g. '~₹586.88')
  lines_json    JSONB        NOT NULL DEFAULT '[]',  -- lines[] verbatim
  session_id    UUID,                           -- cluster FK (nullable)
  status        TEXT         NOT NULL DEFAULT 'published'
                CHECK (status IN ('draft','published','archived')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES for authored ordering + status filtering
-- ============================================================
CREATE INDEX IF NOT EXISTS ix_portfolio_holdings_sort    ON portfolio_holdings (status, sort_order);
CREATE INDEX IF NOT EXISTS ix_diary_entries_sort         ON diary_entries (status, sort_order);
CREATE INDEX IF NOT EXISTS ix_learning_sort              ON learning (status, sort_order);
CREATE INDEX IF NOT EXISTS ix_portfolio_values_sort      ON portfolio_values (status, sort_order);
CREATE INDEX IF NOT EXISTS ix_discussions_sort           ON discussions (status, sort_order);
CREATE INDEX IF NOT EXISTS ix_market_sessions_sort       ON market_sessions (status, sort_order);
CREATE INDEX IF NOT EXISTS ix_session_points_sort        ON session_points (session_id, sort_order);
CREATE INDEX IF NOT EXISTS ix_session_moves_sort         ON session_moves (session_id, sort_order);
CREATE INDEX IF NOT EXISTS ix_session_takeaways_sort     ON session_takeaways (session_id, sort_order);
CREATE INDEX IF NOT EXISTS ix_investment_events_sort     ON investment_events (status, sort_order);