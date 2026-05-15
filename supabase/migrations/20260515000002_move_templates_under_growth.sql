-- Move the Templates menu item from an L2 child of AI to an L2 child of Growth,
-- placing it last in Growth's L2 list. Route is left unchanged.

update public.menu_items
set
  parent_id  = '10000000-0000-0000-0000-000000000002',  -- Growth
  level      = 2,
  sort_order = (
    select coalesce(max(sort_order), 0) + 1
    from public.menu_items
    where parent_id = '10000000-0000-0000-0000-000000000002'
      and id <> '20000000-0000-0000-0000-000000000030'
  )
where id = '20000000-0000-0000-0000-000000000030';
