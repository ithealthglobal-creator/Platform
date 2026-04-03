-- Growth > Content (new L2)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000201', '10000000-0000-0000-0000-000000000002', 'Content', NULL, '/growth/content', 2, 2);

-- Growth > Content > Blog (new L3)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('30000000-0000-0000-0000-000000000201', '20000000-0000-0000-0000-000000000201', 'Blog', NULL, '/growth/content/blog', 1, 3);

-- Growth > Market > Testimonials (new L3)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('30000000-0000-0000-0000-000000000202', '20000000-0000-0000-0000-000000000105', 'Testimonials', NULL, '/growth/market/testimonials', 5, 3);

-- People > Partners (new L2)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000202', '10000000-0000-0000-0000-000000000007', 'Partners', NULL, '/people/partners', 4, 2);

-- Grant admin access
INSERT INTO public.role_menu_access (role, menu_item_id)
SELECT 'admin', id FROM public.menu_items
WHERE id IN (
  '20000000-0000-0000-0000-000000000201',
  '30000000-0000-0000-0000-000000000201',
  '30000000-0000-0000-0000-000000000202',
  '20000000-0000-0000-0000-000000000202'
)
ON CONFLICT (role, menu_item_id) DO NOTHING;
