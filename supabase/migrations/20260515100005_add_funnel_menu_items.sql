-- L2: Growth > Awareness (parent = Growth L1)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000403',
   '10000000-0000-0000-0000-000000000002',
   'Awareness', 'campaign', '/growth/awareness', 3, 2)
ON CONFLICT (id) DO NOTHING;

-- L2: Growth > Funnel (parent = Growth L1)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000402',
   '10000000-0000-0000-0000-000000000002',
   'Funnel', 'flow-stream', '/growth/funnel', 4, 2)
ON CONFLICT (id) DO NOTHING;

-- L3: Growth > Awareness > Social Posts
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('30000000-0000-0000-0000-000000000403',
   '20000000-0000-0000-0000-000000000403',
   'Social Posts', 'share', '/growth/awareness/social', 1, 3)
ON CONFLICT (id) DO NOTHING;

-- Grant admin access to the new menu items
INSERT INTO public.role_menu_access (role, menu_item_id)
SELECT 'admin', id FROM public.menu_items
WHERE id IN (
  '20000000-0000-0000-0000-000000000402',
  '20000000-0000-0000-0000-000000000403',
  '30000000-0000-0000-0000-000000000403'
)
ON CONFLICT (role, menu_item_id) DO NOTHING;
