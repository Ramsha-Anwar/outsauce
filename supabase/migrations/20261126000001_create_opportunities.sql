-- Migration: create opportunities table for multi-source job ingestion
--
-- Foundation for PR-06 (multi-source opportunity ingestion pipeline).
-- See docs/PR-06-ARCHITECTURE.md §5 for the design rationale.
--
-- Platform data (not user-owned). Authenticated users read; only the
-- ingestion pipeline (service role) writes. RLS enforces this:
--   - SELECT: authenticated only (no anon)
--   - INSERT/UPDATE/DELETE: denied to authenticated and anon
--   - service_role bypasses RLS (Supabase platform behavior) — write path
--
-- Key design choices:
--   - (source_key, external_id) unique: prevents duplicates across syncs
--   - remote_regions text[]: profile-aware matching ("jobs open to Pakistan")
--   - last_seen_at: structural freshness signal (stale if not seen recently)
--   - raw jsonb: source payload preserved for audit/debugging
--
-- Forward-only, additive change. No data migration needed (new table).

CREATE TABLE IF NOT EXISTS public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key TEXT NOT NULL,
  external_id TEXT NOT NULL,
  source_url TEXT NOT NULL,

  title TEXT NOT NULL,
  company_name TEXT,
  location TEXT,
  description_excerpt TEXT,

  work_mode TEXT NOT NULL DEFAULT 'unknown',
  employment_type TEXT NOT NULL DEFAULT 'unknown',
  seniority TEXT,
  categories TEXT[] NOT NULL DEFAULT '{}',
  remote_regions TEXT[] NOT NULL DEFAULT '{}',

  salary_min NUMERIC,
  salary_max NUMERIC,
  salary_currency TEXT,
  salary_period TEXT NOT NULL DEFAULT 'unknown',

  status TEXT NOT NULL DEFAULT 'unknown',
  published_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,

  apply_url TEXT,

  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  raw JSONB NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT opportunities_source_key_external_id_unique
    UNIQUE (source_key, external_id)
);

-- Indexes for filtering and freshness queries
CREATE INDEX IF NOT EXISTS idx_opportunities_source_key
  ON public.opportunities (source_key);

CREATE INDEX IF NOT EXISTS idx_opportunities_status
  ON public.opportunities (status);

CREATE INDEX IF NOT EXISTS idx_opportunities_published_at
  ON public.opportunities (published_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_opportunities_last_seen_at
  ON public.opportunities (last_seen_at DESC);

-- GIN index for profile-aware filtering: "jobs open to Pakistan"
-- Example: WHERE remote_regions @> ARRAY['Pakistan']
CREATE INDEX IF NOT EXISTS idx_opportunities_remote_regions_gin
  ON public.opportunities USING gin (remote_regions);

-- RLS: platform data, read-only for authenticated, write-only for service role
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all opportunities (platform catalog)
CREATE POLICY "Authenticated users can read opportunities"
  ON public.opportunities FOR SELECT
  TO authenticated
  USING (true);

-- No anon SELECT policy → anon is denied by default.
-- No INSERT/UPDATE/DELETE policies for authenticated or anon → denied.
-- Service role bypasses RLS (Supabase platform behavior) → ingestion writes work.