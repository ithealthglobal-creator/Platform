-- Add Assessments L2 menu item under Academy
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000006', 'Assessments', NULL, '/academy/assessments', 2, 2)
ON CONFLICT (id) DO NOTHING;

-- Bump Certificates to sort_order 3
UPDATE public.menu_items
SET sort_order = 3
WHERE id = '20000000-0000-0000-0000-000000000012';

-- Grant admin access
INSERT INTO public.role_menu_access (role, menu_item_id)
VALUES ('admin', '20000000-0000-0000-0000-000000000013')
ON CONFLICT (role, menu_item_id) DO NOTHING;
