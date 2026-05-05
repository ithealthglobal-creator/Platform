-- Insert the Knowledge L1 menu item just above Settings.

update public.menu_items
set sort_order = 9
where id = '10000000-0000-0000-0000-000000000008';

insert into public.menu_items (id, parent_id, label, icon, route, sort_order, level)
values (
  '10000000-0000-0000-0000-00000000000a',
  null,
  'Knowledge',
  'notebook',
  '/knowledge',
  8,
  1
)
on conflict (id) do nothing;

insert into public.role_menu_access (role, menu_item_id)
values ('admin', '10000000-0000-0000-0000-00000000000a')
on conflict (role, menu_item_id) do nothing;
