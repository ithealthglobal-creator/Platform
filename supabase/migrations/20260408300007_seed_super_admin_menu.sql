INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('50000000-0000-0000-0000-000000000001', NULL, 'Platform', 'Dashboard', '/platform', 1, 1),
  ('50000000-0000-0000-0000-000000000002', NULL, 'Companies', 'Building', '/platform/companies', 2, 1),
  ('50000000-0000-0000-0000-000000000003', NULL, 'Marketplace', 'Store', '/platform/marketplace', 3, 1),
  ('50000000-0000-0000-0000-000000000004', NULL, 'Settings', 'Settings', '/platform/settings', 4, 1),
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'All Companies', NULL, '/platform/companies', 1, 2),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 'Add Company', NULL, '/platform/companies/new', 2, 2),
  ('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003', 'Listings', NULL, '/platform/marketplace/listings', 1, 2),
  ('60000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000003', 'Branding', NULL, '/platform/marketplace/branding', 2, 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.role_menu_access (role, menu_item_id)
SELECT 'super_admin', id FROM public.menu_items WHERE id::text LIKE '50000000%' OR id::text LIKE '60000000%'
ON CONFLICT (role, menu_item_id) DO NOTHING;
