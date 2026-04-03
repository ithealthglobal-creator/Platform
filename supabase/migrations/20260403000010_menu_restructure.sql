-- Remove old Services L2 items (cascade deletes children)
DELETE FROM public.menu_items WHERE id IN (
  '20000000-0000-0000-0000-000000000006',
  '20000000-0000-0000-0000-000000000007',
  '20000000-0000-0000-0000-000000000008'
);

-- Remove old Growth L2 items
DELETE FROM public.menu_items WHERE id IN (
  '20000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000003'
);

-- New Services L2 items
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000101', '10000000-0000-0000-0000-000000000004', 'Services', NULL, '/services', 1, 2),
  ('20000000-0000-0000-0000-000000000102', '10000000-0000-0000-0000-000000000004', 'Phases', NULL, '/services/phases', 2, 2),
  ('20000000-0000-0000-0000-000000000103', '10000000-0000-0000-0000-000000000004', 'Products', NULL, '/services/products', 3, 2),
  ('20000000-0000-0000-0000-000000000104', '10000000-0000-0000-0000-000000000004', 'Cost Variables', NULL, '/services/cost-variables', 4, 2);

-- New Growth L2 item: Market
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000105', '10000000-0000-0000-0000-000000000002', 'Market', NULL, '/growth/market', 1, 2);

-- New Growth > Market L3 items
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('30000000-0000-0000-0000-000000000101', '20000000-0000-0000-0000-000000000105', 'Verticals', NULL, '/growth/market/verticals', 1, 3),
  ('30000000-0000-0000-0000-000000000102', '20000000-0000-0000-0000-000000000105', 'Personas', NULL, '/growth/market/personas', 2, 3),
  ('30000000-0000-0000-0000-000000000103', '20000000-0000-0000-0000-000000000105', 'Pains', NULL, '/growth/market/pains', 3, 3),
  ('30000000-0000-0000-0000-000000000104', '20000000-0000-0000-0000-000000000105', 'Gains', NULL, '/growth/market/gains', 4, 3);

-- New People L2 item: Skills
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000106', '10000000-0000-0000-0000-000000000007', 'Skills', NULL, '/people/skills', 3, 2);

-- Grant admin access to all new menu items
INSERT INTO public.role_menu_access (role, menu_item_id)
SELECT 'admin', id FROM public.menu_items
WHERE id IN (
  '20000000-0000-0000-0000-000000000101',
  '20000000-0000-0000-0000-000000000102',
  '20000000-0000-0000-0000-000000000103',
  '20000000-0000-0000-0000-000000000104',
  '20000000-0000-0000-0000-000000000105',
  '20000000-0000-0000-0000-000000000106',
  '30000000-0000-0000-0000-000000000101',
  '30000000-0000-0000-0000-000000000102',
  '30000000-0000-0000-0000-000000000103',
  '30000000-0000-0000-0000-000000000104'
)
ON CONFLICT (role, menu_item_id) DO NOTHING;
