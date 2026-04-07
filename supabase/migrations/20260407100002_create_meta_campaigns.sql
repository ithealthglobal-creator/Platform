-- supabase/migrations/20260407000002_create_meta_campaigns.sql
CREATE TABLE public.meta_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.meta_integrations(id) ON DELETE CASCADE,
  meta_campaign_id text NOT NULL,
  name text NOT NULL,
  status text,
  objective text,
  daily_budget numeric,
  lifetime_budget numeric,
  spend numeric NOT NULL DEFAULT 0,
  impressions bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  ctr numeric,
  cpm numeric,
  cpa numeric,
  conversions bigint NOT NULL DEFAULT 0,
  start_time timestamptz,
  stop_time timestamptz,
  synced_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meta_campaigns_unique UNIQUE (integration_id, meta_campaign_id)
);

ALTER TABLE public.meta_campaigns ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_meta_campaigns_integration_id ON public.meta_campaigns(integration_id);
CREATE INDEX idx_meta_campaigns_status ON public.meta_campaigns(status);
