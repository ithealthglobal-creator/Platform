-- L1: Support (sort_order 9, after Settings at 8)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('10000000-0000-0000-0000-000000000009', NULL, 'Support', 'headset', '/support', 9, 1)
ON CONFLICT (id) DO NOTHING;

-- L2: Ticketing and SLA Measurements
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000009', 'Ticketing', NULL, '/support/ticketing', 1, 2),
  ('20000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000009', 'SLA Measurements', NULL, '/support/sla-measurements', 2, 2)
ON CONFLICT (id) DO NOTHING;

-- Grant admin access to new menu items
INSERT INTO public.role_menu_access (role, menu_item_id)
SELECT 'admin', id FROM public.menu_items WHERE id IN (
  '10000000-0000-0000-0000-000000000009',
  '20000000-0000-0000-0000-000000000017',
  '20000000-0000-0000-0000-000000000018'
)
ON CONFLICT (role, menu_item_id) DO NOTHING;

-- Grant customer access to Support L1 (they see it in customer sidebar via /portal/support)
INSERT INTO public.role_menu_access (role, menu_item_id) VALUES
  ('customer', '10000000-0000-0000-0000-000000000009')
ON CONFLICT (role, menu_item_id) DO NOTHING;
