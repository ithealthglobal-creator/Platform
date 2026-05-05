-- L1: Support (id ...010 — ...009 is owned by AI in the earlier migration)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('10000000-0000-0000-0000-000000000010', NULL, 'Support', 'headset', '/support', 10, 1)
ON CONFLICT (id) DO NOTHING;

-- L2: Ticketing and SLA Measurements
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000010', 'Ticketing', NULL, '/support/ticketing', 1, 2),
  ('20000000-0000-0000-0000-000000000022', '10000000-0000-0000-0000-000000000010', 'SLA Measurements', NULL, '/support/sla-measurements', 2, 2)
ON CONFLICT (id) DO NOTHING;

-- Grant admin access to new menu items
INSERT INTO public.role_menu_access (role, menu_item_id)
SELECT 'admin', id FROM public.menu_items WHERE id IN (
  '10000000-0000-0000-0000-000000000010',
  '20000000-0000-0000-0000-000000000021',
  '20000000-0000-0000-0000-000000000022'
)
ON CONFLICT (role, menu_item_id) DO NOTHING;
