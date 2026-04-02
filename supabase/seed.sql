-- IThealth company
INSERT INTO public.companies (id, name, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'IThealth', true)
ON CONFLICT (id) DO NOTHING;

-- L1 Menu Items (Sidebar)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('10000000-0000-0000-0000-000000000001', NULL, 'Dashboard', 'dashboard', '/dashboard', 1, 1),
  ('10000000-0000-0000-0000-000000000002', NULL, 'Growth', 'growth', '/growth', 2, 1),
  ('10000000-0000-0000-0000-000000000003', NULL, 'Sales', 'currency', '/sales', 3, 1),
  ('10000000-0000-0000-0000-000000000004', NULL, 'Services', 'tool-kit', '/services', 4, 1),
  ('10000000-0000-0000-0000-000000000005', NULL, 'Delivery', 'delivery', '/delivery', 5, 1),
  ('10000000-0000-0000-0000-000000000006', NULL, 'Academy', 'education', '/academy', 6, 1),
  ('10000000-0000-0000-0000-000000000007', NULL, 'People', 'user-multiple', '/people', 7, 1),
  ('10000000-0000-0000-0000-000000000008', NULL, 'Settings', 'settings', '/settings', 8, 1)
ON CONFLICT (id) DO NOTHING;

-- L2 Menu Items (Mega Menu tabs)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Overview', NULL, '/dashboard', 1, 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Pipeline', NULL, '/growth/pipeline', 1, 2),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Marketing', NULL, '/growth/marketing', 2, 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'Deals', NULL, '/sales/deals', 1, 2),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', 'Proposals', NULL, '/sales/proposals', 2, 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000004', 'Managed IT', NULL, '/services/managed-it', 1, 2),
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000004', 'Cloud', NULL, '/services/cloud', 2, 2),
  ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000004', 'Security', NULL, '/services/security', 3, 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000005', 'Projects', NULL, '/delivery/projects', 1, 2),
  ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000005', 'Tickets', NULL, '/delivery/tickets', 2, 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000006', 'Courses', NULL, '/academy/courses', 1, 2),
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000006', 'Certifications', NULL, '/academy/certifications', 2, 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000007', 'Companies', NULL, '/people/companies', 1, 2),
  ('20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000007', 'Users', NULL, '/people/users', 2, 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000008', 'General', NULL, '/settings/general', 1, 2),
  ('20000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000008', 'Menu Editor', NULL, '/settings/menu-editor', 2, 2)
ON CONFLICT (id) DO NOTHING;

-- L3 placeholder items (Services > Managed IT)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', 'Monitoring', NULL, '/services/managed-it/monitoring', 1, 3),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000006', 'Patching', NULL, '/services/managed-it/patching', 2, 3),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000006', 'Backup', NULL, '/services/managed-it/backup', 3, 3)
ON CONFLICT (id) DO NOTHING;

-- L4 placeholder items (Services > Managed IT > Monitoring)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Agent-based', NULL, '/services/managed-it/monitoring/agent', 1, 4),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'Agentless', NULL, '/services/managed-it/monitoring/agentless', 2, 4)
ON CONFLICT (id) DO NOTHING;

-- Grant admin access to all menu items
INSERT INTO public.role_menu_access (role, menu_item_id)
SELECT 'admin', id FROM public.menu_items
ON CONFLICT (role, menu_item_id) DO NOTHING;
