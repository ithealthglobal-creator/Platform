-- supabase/migrations/20260407000004_create_meta_ads.sql
CREATE TABLE public.meta_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_set_id uuid NOT NULL REFERENCES public.meta_ad_sets(id) ON DELETE CASCADE,
  meta_ad_id text NOT NULL,
  name text NOT NULL,
  status text,
  creative_id text,
  creative_thumbnail_url text,
  creative_body text,
  creative_title text,
  creative_link_url text,
  hook_rate numeric,
  ctr numeric,
  cpm numeric,
  cpa numeric,
  spend numeric NOT NULL DEFAULT 0,
  impressions bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  conversions bigint NOT NULL DEFAULT 0,
  emq_score numeric,
  synced_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meta_ads_unique UNIQUE (ad_set_id, meta_ad_id)
);

ALTER TABLE public.meta_ads ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_meta_ads_ad_set_id ON public.meta_ads(ad_set_id);
CREATE INDEX idx_meta_ads_status ON public.meta_ads(status);
