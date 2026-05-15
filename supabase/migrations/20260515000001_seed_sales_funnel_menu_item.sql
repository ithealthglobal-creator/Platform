-- Add "Sales Funnel" L2 menu item under Settings so the funnel editor
-- is reachable from the platform navigation.
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  (
    '20000000-0000-0000-0000-000000000402',
    '10000000-0000-0000-0000-000000000008', -- Settings L1
    'Sales Funnel',
    NULL,
    '/settings/sales-funnel',
    3,
    2
  )
ON CONFLICT (id) DO NOTHING;

-- Grant admin role access to the new menu item
INSERT INTO public.role_menu_access (role, menu_item_id)
VALUES ('admin', '20000000-0000-0000-0000-000000000402')
ON CONFLICT (role, menu_item_id) DO NOTHING;
