-- Add SLA Templates under Settings for admin
INSERT INTO public.menu_items (parent_id, label, icon, route, sort_order, level, is_active)
SELECT id, 'SLA Templates', NULL, '/settings/sla-templates', 40, 3, true
FROM public.menu_items WHERE label = 'Settings' AND level = 1
ON CONFLICT DO NOTHING;

-- Grant admin access to SLA Templates menu item
INSERT INTO public.role_menu_access (role, menu_item_id)
SELECT 'admin', id FROM public.menu_items WHERE route = '/settings/sla-templates'
ON CONFLICT DO NOTHING;

-- Add Cart to customer portal menu (if not present)
INSERT INTO public.menu_items (parent_id, label, icon, route, sort_order, level, is_active)
SELECT id, 'Cart', 'ShoppingCart', '/portal/cart', 25, 2, true
FROM public.menu_items WHERE route = '/portal/services' AND level = 2
ON CONFLICT DO NOTHING;

-- Grant customer access to Cart menu item
INSERT INTO public.role_menu_access (role, menu_item_id)
SELECT 'customer', id FROM public.menu_items WHERE route = '/portal/cart'
ON CONFLICT DO NOTHING;
