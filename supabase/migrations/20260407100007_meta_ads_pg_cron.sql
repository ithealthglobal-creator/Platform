-- supabase/migrations/20260407100007_meta_ads_pg_cron.sql
-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule sync every 15 minutes — the Route Handler checks sync_frequency
-- to decide whether to actually execute
SELECT cron.schedule(
  'meta-ads-sync',
  '*/15 * * * *',
  $$SELECT net.http_post(
    url := current_setting('app.site_url') || '/api/admin/ads/sync',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key')),
    body := '{}'::jsonb
  )$$
);
