-- Make Funnel the first L2 under Growth and land the Growth L1 click on it.
-- Funnel itself is inserted by 20260515100005_add_funnel_menu_items.sql; this
-- migration just reorders it and repoints the L1 route.
--
-- It also cleans up any legacy /growth/pipeline rows that may have been
-- created via the live Menu Editor.

-- 1. Drop any stale /growth/pipeline menu rows and their role grants.
DELETE FROM public.role_menu_access
WHERE menu_item_id IN (
  SELECT id FROM public.menu_items WHERE route = '/growth/pipeline'
);

DELETE FROM public.menu_items WHERE route = '/growth/pipeline';

-- 2. Move Funnel to sort_order 0 so it appears before Market/Content/Brand/
--    Ads/Awareness under Growth.
UPDATE public.menu_items
SET sort_order = 0
WHERE id = '20000000-0000-0000-0000-000000000402';

-- 3. Point the Growth L1 entry at /growth/funnel so the sidebar lands there.
UPDATE public.menu_items
SET route = '/growth/funnel'
WHERE id = '10000000-0000-0000-0000-000000000002';
