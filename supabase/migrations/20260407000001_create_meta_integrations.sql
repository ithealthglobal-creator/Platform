-- supabase/migrations/20260407000001_create_meta_integrations.sql
CREATE TABLE public.meta_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  meta_app_id text,
  meta_app_secret_encrypted text,
  access_token_encrypted text,
  ad_account_id text,
  ad_account_name text,
  sync_frequency text NOT NULL DEFAULT '1hour',
  campaign_filter jsonb,
  last_synced_at timestamptz,
  sync_status text NOT NULL DEFAULT 'idle',
  sync_error text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meta_integrations_company_unique UNIQUE (company_id),
  CONSTRAINT meta_integrations_sync_frequency_check CHECK (sync_frequency IN ('15min', '30min', '1hour', '6hour', '24hour')),
  CONSTRAINT meta_integrations_sync_status_check CHECK (sync_status IN ('idle', 'syncing', 'error'))
);

ALTER TABLE public.meta_integrations ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_meta_integrations_company_id ON public.meta_integrations(company_id);

CREATE TRIGGER meta_integrations_updated_at
  BEFORE UPDATE ON public.meta_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
