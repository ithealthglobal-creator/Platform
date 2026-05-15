-- Growth > Awareness > Social Posts (new L3)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('30000000-0000-0000-0000-000000000204', '20000000-0000-0000-0000-000000000204', 'Social Posts', NULL, '/growth/awareness/social-posts', 2, 3);

INSERT INTO public.role_menu_access (role, menu_item_id)
SELECT 'admin', id FROM public.menu_items
WHERE id = '30000000-0000-0000-0000-000000000204'
ON CONFLICT (role, menu_item_id) DO NOTHING;
