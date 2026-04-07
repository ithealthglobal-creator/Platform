-- supabase/migrations/20260407100006_seed_ads_menu_items.sql

-- L2: Growth > Ads (parent = Growth L1)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000301', '10000000-0000-0000-0000-000000000002', 'Ads', 'campaign', '/growth/ads', 3, 2)
ON CONFLICT (id) DO NOTHING;

-- L2: Settings > Integrations (parent = Settings L1)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000302', '10000000-0000-0000-0000-000000000008', 'Integrations', 'connect', '/settings/integrations', 3, 2)
ON CONFLICT (id) DO NOTHING;

-- L3: Settings > Integrations > Meta
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('30000000-0000-0000-0000-000000000301', '20000000-0000-0000-0000-000000000302', 'Meta', 'logo--facebook', '/settings/integrations/meta', 1, 3)
ON CONFLICT (id) DO NOTHING;

-- Grant admin access to new menu items
INSERT INTO public.role_menu_access (role, menu_item_id)
SELECT 'admin', id FROM public.menu_items
WHERE id IN (
  '20000000-0000-0000-0000-000000000301',
  '20000000-0000-0000-0000-000000000302',
  '30000000-0000-0000-0000-000000000301'
)
ON CONFLICT (role, menu_item_id) DO NOTHING;
