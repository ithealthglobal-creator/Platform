-- Growth > Awareness (new L2)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000204', '10000000-0000-0000-0000-000000000002', 'Awareness', NULL, '/growth/awareness', 3, 2);

-- Reparent Blog: Content -> Awareness, update route, set as first child of Awareness
UPDATE public.menu_items
SET parent_id = '20000000-0000-0000-0000-000000000204',
    route     = '/growth/awareness/blog',
    sort_order = 1
WHERE id = '30000000-0000-0000-0000-000000000201';

-- Grant admin access to the new Awareness L2
INSERT INTO public.role_menu_access (role, menu_item_id)
SELECT 'admin', id FROM public.menu_items
WHERE id = '20000000-0000-0000-0000-000000000204'
ON CONFLICT (role, menu_item_id) DO NOTHING;
