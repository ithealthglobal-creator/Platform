-- supabase/migrations/20260515000001_rename_ads_menu_to_campaigns.sql
-- Repoint the existing Growth > Ads menu item to the new Campaigns route.

UPDATE public.menu_items
SET
  label = 'Campaigns',
  route = '/growth/campaigns',
  updated_at = NOW()
WHERE id = '20000000-0000-0000-0000-000000000401';
