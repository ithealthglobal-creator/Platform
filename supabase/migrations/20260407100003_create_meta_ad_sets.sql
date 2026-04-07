-- supabase/migrations/20260407000003_create_meta_ad_sets.sql
CREATE TABLE public.meta_ad_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.meta_campaigns(id) ON DELETE CASCADE,
  meta_ad_set_id text NOT NULL,
  name text NOT NULL,
  status text,
  targeting jsonb,
  daily_budget numeric,
  lifetime_budget numeric,
  spend numeric NOT NULL DEFAULT 0,
  impressions bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  ctr numeric,
  cpm numeric,
  cpa numeric,
  conversions bigint NOT NULL DEFAULT 0,
  synced_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meta_ad_sets_unique UNIQUE (campaign_id, meta_ad_set_id)
);

ALTER TABLE public.meta_ad_sets ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_meta_ad_sets_campaign_id ON public.meta_ad_sets(campaign_id);
CREATE INDEX idx_meta_ad_sets_status ON public.meta_ad_sets(status);
