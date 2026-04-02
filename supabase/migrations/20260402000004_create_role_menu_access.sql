CREATE TABLE public.role_menu_access (
  role public.user_role NOT NULL,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  PRIMARY KEY (role, menu_item_id)
);
