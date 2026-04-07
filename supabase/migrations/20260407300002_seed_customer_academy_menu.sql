-- Customer Academy L2 menu items
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Courses', 'education', '/portal/academy/courses', 1, 2),
  ('c1000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'My Courses', 'education', '/portal/academy', 2, 2)
ON CONFLICT (id) DO NOTHING;

-- Grant access to customer role
INSERT INTO public.role_menu_access (role, menu_item_id) VALUES
  ('customer', 'c1000000-0000-0000-0000-000000000001'),
  ('customer', 'c1000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;
