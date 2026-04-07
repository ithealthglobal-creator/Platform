-- L1: AI
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('10000000-0000-0000-0000-000000000009', NULL, 'AI', 'ai-governance-lifecycle', '/ai', 9, 1)
ON CONFLICT (id) DO NOTHING;

-- L2: AI children
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000009', 'Chat', 'chat', '/ai/chat', 1, 2),
  ('20000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000009', 'Agents', 'bot', '/ai/agents', 2, 2),
  ('20000000-0000-0000-0000-000000000019', '10000000-0000-0000-0000-000000000009', 'Organogram', 'network-enterprise', '/ai/organogram', 3, 2),
  ('20000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000009', 'Execution', 'flow-stream', '/ai/execution', 4, 2)
ON CONFLICT (id) DO NOTHING;

-- Grant admin access
INSERT INTO public.role_menu_access (role, menu_item_id)
SELECT 'admin', id FROM public.menu_items WHERE route LIKE '/ai%'
ON CONFLICT (role, menu_item_id) DO NOTHING;
