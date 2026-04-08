INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('30000000-0000-0000-0000-000000000203', '20000000-0000-0000-0000-000000000201',
   'Website', 'Globe', '/growth/content/website', 2, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.role_menu_access (role, menu_item_id) VALUES
  ('admin', '30000000-0000-0000-0000-000000000203')
ON CONFLICT (role, menu_item_id) DO NOTHING;
