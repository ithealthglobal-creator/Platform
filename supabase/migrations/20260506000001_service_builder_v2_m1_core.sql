-- Service Builder v2 — M1 (core schema)
-- Adds per-tab description columns, tab toggle flags, marketing/positioning fields,
-- the in_review status, and the service_business_outcomes table.
-- This is the foundation phase 1 of the v2 plan; subsequent migrations enrich each tab.

-- ============================================================
-- 1. services.status — add 'in_review'
-- ============================================================
ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_status_check;

ALTER TABLE public.services
  ADD CONSTRAINT services_status_check
  CHECK (status IN ('draft', 'in_review', 'active', 'archived'));

-- ============================================================
-- 2. Tab toggles on services
-- ============================================================
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS includes_products          boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS includes_marketing_content boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS includes_academy           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS includes_sla               boolean NOT NULL DEFAULT true;

-- ============================================================
-- 3. Per-tab description columns
-- The matching tab specialist writes these as the last step of its work.
-- ============================================================
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS market_description    text,
  ADD COLUMN IF NOT EXISTS products_description  text,
  ADD COLUMN IF NOT EXISTS skills_description    text,
  ADD COLUMN IF NOT EXISTS runbook_description   text,
  ADD COLUMN IF NOT EXISTS growth_description    text,
  ADD COLUMN IF NOT EXISTS costing_description   text,
  ADD COLUMN IF NOT EXISTS academy_description   text,
  ADD COLUMN IF NOT EXISTS sla_description       text;

-- ============================================================
-- 4. Marketing / positioning columns (Growth tab)
-- value_props is a jsonb array of {title, description} cards used on
-- the public services page. Features/benefits live in their own table
-- (added in M6).
-- ============================================================
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS tagline          text,
  ADD COLUMN IF NOT EXISTS seo_title        text,
  ADD COLUMN IF NOT EXISTS seo_description  text,
  ADD COLUMN IF NOT EXISTS value_props      jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS phase_alignment  text,
  ADD COLUMN IF NOT EXISTS pain_alignment   text;

-- ============================================================
-- 5. service_business_outcomes — per-service outcomes table
-- Edited inline on the Description tab; populated by the orchestrator.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.service_business_outcomes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  uuid        NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  outcome     text        NOT NULL,
  explanation text,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_business_outcomes_service_sort
  ON public.service_business_outcomes (service_id, sort_order);

CREATE TRIGGER service_business_outcomes_updated_at
  BEFORE UPDATE ON public.service_business_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS — mirror the services_* policy pattern (admin RW, authenticated read)
ALTER TABLE public.service_business_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to service_business_outcomes"
  ON public.service_business_outcomes
  FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Read service_business_outcomes"
  ON public.service_business_outcomes
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
