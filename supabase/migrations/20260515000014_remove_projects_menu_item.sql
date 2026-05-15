-- Remove the Projects L2 menu item under Delivery.
-- role_menu_access rows cascade via FK ON DELETE CASCADE.

delete from public.menu_items
where id = '20000000-0000-0000-0000-000000000009';
