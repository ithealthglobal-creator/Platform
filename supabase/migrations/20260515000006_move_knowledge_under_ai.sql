-- Move the Knowledge menu item from a top-level L1 entry to an L2 child of AI.
-- Route stays at /knowledge (the page still lives at src/app/(admin)/knowledge).

update public.menu_items
set
  parent_id  = '10000000-0000-0000-0000-000000000009',  -- AI
  level      = 2,
  sort_order = 5  -- after Chat(1), Agents(2), Organogram(3), Execution(4)
where id = '10000000-0000-0000-0000-00000000000a';
