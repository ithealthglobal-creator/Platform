-- Track which advert/campaign each lead came in on.
-- Stores raw UTM tags (always populated when present in URL) and, when we can
-- resolve them to live Meta records, FKs to meta_campaigns / meta_ads.
ALTER TABLE public.sales_leads
  ADD COLUMN utm_source text,
  ADD COLUMN utm_medium text,
  ADD COLUMN utm_campaign text,
  ADD COLUMN utm_content text,
  ADD COLUMN utm_term text,
  ADD COLUMN landing_path text,
  ADD COLUMN referrer text,
  ADD COLUMN meta_campaign_id uuid REFERENCES public.meta_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN meta_ad_id uuid REFERENCES public.meta_ads(id) ON DELETE SET NULL;

CREATE INDEX idx_sales_leads_meta_campaign ON public.sales_leads (meta_campaign_id);
CREATE INDEX idx_sales_leads_meta_ad ON public.sales_leads (meta_ad_id);
CREATE INDEX idx_sales_leads_utm_campaign ON public.sales_leads (utm_campaign);
