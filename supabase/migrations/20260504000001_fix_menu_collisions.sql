-- ---------------------------------------------------------------------------
-- Cleanup for legacy DB states caused by:
--   * AI / Support both seeded with id 10000000-...009 (Support silently lost)
--   * Earlier seed runs that granted admin access to customer (c0000000%) items
--   * Stray customer grant on AI L1 (intended for Support) from the same migration
-- ---------------------------------------------------------------------------

-- 1. Strip admin role access to any customer-namespaced (c0000000%) items.
DELETE FROM public.role_menu_access
WHERE role = 'admin'
  AND menu_item_id IN (
    SELECT id FROM public.menu_items WHERE id::text LIKE 'c0000000%'
  );

-- 2. Drop the customer grant that was meant for Support but landed on AI.
DELETE FROM public.role_menu_access
WHERE role = 'customer'
  AND menu_item_id = '10000000-0000-0000-0000-000000000009'
  AND EXISTS (
    SELECT 1 FROM public.menu_items
    WHERE id = '10000000-0000-0000-0000-000000000009' AND label = 'AI'
  );

-- 3. If a legacy DB has a Support row sitting on the colliding ...009 id,
--    re-id it to ...010 so AI can live at ...009 alone.
UPDATE public.menu_items
SET id = '10000000-0000-0000-0000-000000000010', sort_order = 10
WHERE id = '10000000-0000-0000-0000-000000000009' AND label = 'Support';

-- 4. Insert the canonical Support L1 + children (no-op on a fresh reset where
--    20260407700001 already inserted them under the new ids).
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('10000000-0000-0000-0000-000000000010', NULL, 'Support', 'headset', '/support', 10, 1),
  ('20000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000010', 'Ticketing',        NULL, '/support/ticketing',        1, 2),
  ('20000000-0000-0000-0000-000000000022', '10000000-0000-0000-0000-000000000010', 'SLA Measurements', NULL, '/support/sla-measurements', 2, 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.role_menu_access (role, menu_item_id) VALUES
  ('admin', '10000000-0000-0000-0000-000000000010'),
  ('admin', '20000000-0000-0000-0000-000000000021'),
  ('admin', '20000000-0000-0000-0000-000000000022')
ON CONFLICT (role, menu_item_id) DO NOTHING;

-- 5. Dedupe any pre-existing (parent_id, route) duplicates. The
--    20260407400007_menu_customer_services migration's SELECT-INSERT for
--    SLA Templates was re-run somewhere along the way and created two
--    copies under each Settings L1. Keep the lowest id, drop the rest.
DELETE FROM public.menu_items a
USING public.menu_items b
WHERE a.parent_id IS NOT DISTINCT FROM b.parent_id
  AND a.route = b.route
  AND a.route IS NOT NULL
  AND a.id > b.id;

-- 6. Prevent future silent collisions: a parent cannot have two children
--    sharing the same route. Catches accidental dupes without breaking the
--    existing pattern where an L1 and one of its L2 children share a route
--    (different parent_id, so distinct).
ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_parent_route_unique UNIQUE (parent_id, route);
