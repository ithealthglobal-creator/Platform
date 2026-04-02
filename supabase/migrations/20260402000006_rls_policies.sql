CREATE POLICY "Admins can do everything with companies"
  ON public.companies FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Users can read own company"
  ON public.companies FOR SELECT
  USING (id = public.get_my_company_id());

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything with profiles"
  ON public.profiles FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Users can read own company profiles"
  ON public.profiles FOR SELECT
  USING (company_id = public.get_my_company_id());

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything with menu_items"
  ON public.menu_items FOR ALL
  USING (public.get_my_role() = 'admin');

ALTER TABLE public.role_menu_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read role_menu_access"
  ON public.role_menu_access FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage role_menu_access"
  ON public.role_menu_access FOR ALL
  USING (public.get_my_role() = 'admin');
