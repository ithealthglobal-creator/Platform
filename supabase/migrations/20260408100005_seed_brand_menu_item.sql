INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000301', '10000000-0000-0000-0000-000000000002',
   'Brand', 'ColorPalette', '/growth/brand', 3, 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.role_menu_access (role, menu_item_id) VALUES
  ('admin', '20000000-0000-0000-0000-000000000301')
ON CONFLICT (role, menu_item_id) DO NOTHING;
