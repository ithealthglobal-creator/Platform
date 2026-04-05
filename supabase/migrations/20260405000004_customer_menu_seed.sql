-- Customer L1 menu items
INSERT INTO menu_items (id, label, icon, route, sort_order, level, is_active) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Home', 'home', '/portal/home', 1, 1, true),
  ('c0000000-0000-0000-0000-000000000002', 'Journey', 'roadmap', '/portal/journey', 2, 1, true),
  ('c0000000-0000-0000-0000-000000000003', 'Academy', 'education', '/portal/academy', 3, 1, true),
  ('c0000000-0000-0000-0000-000000000004', 'Services', 'tool-kit', '/portal/services', 4, 1, true),
  ('c0000000-0000-0000-0000-000000000005', 'Team', 'user-multiple', '/portal/team', 5, 1, true),
  ('c0000000-0000-0000-0000-000000000006', 'Support', 'help', '/portal/support', 6, 1, true),
  ('c0000000-0000-0000-0000-000000000007', 'Settings', 'settings', '/portal/settings', 7, 1, true)
ON CONFLICT (id) DO NOTHING;

-- Grant customer role access
INSERT INTO role_menu_access (role, menu_item_id) VALUES
  ('customer', 'c0000000-0000-0000-0000-000000000001'),
  ('customer', 'c0000000-0000-0000-0000-000000000002'),
  ('customer', 'c0000000-0000-0000-0000-000000000003'),
  ('customer', 'c0000000-0000-0000-0000-000000000004'),
  ('customer', 'c0000000-0000-0000-0000-000000000005'),
  ('customer', 'c0000000-0000-0000-0000-000000000006'),
  ('customer', 'c0000000-0000-0000-0000-000000000007')
ON CONFLICT DO NOTHING;
