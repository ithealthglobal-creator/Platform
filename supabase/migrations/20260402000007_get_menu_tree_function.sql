CREATE OR REPLACE FUNCTION public.get_menu_tree(user_role public.user_role)
RETURNS SETOF public.menu_items
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT m.*
  FROM public.menu_items m
  INNER JOIN public.role_menu_access rma
    ON rma.menu_item_id = m.id
  WHERE rma.role = user_role
    AND m.is_active = true
  ORDER BY m.level, m.sort_order;
$$;
