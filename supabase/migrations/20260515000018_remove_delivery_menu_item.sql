-- Remove the Delivery L1 menu item.
-- Cascades via parent_id FK to its remaining L2 child (Tickets),
-- and via role_menu_access FK to all role grants.

delete from public.menu_items
where id = '10000000-0000-0000-0000-000000000005';
