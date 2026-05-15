-- Add Tools L2 under AI (after Execution at sort_order 5)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000040',
   '10000000-0000-0000-0000-000000000009',
   'Tools', 'tool-kit', '/ai/tools', 5, 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.role_menu_access (role, menu_item_id) VALUES
  ('admin', '20000000-0000-0000-0000-000000000040')
ON CONFLICT (role, menu_item_id) DO NOTHING;
