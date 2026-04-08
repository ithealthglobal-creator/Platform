CREATE OR REPLACE FUNCTION public.get_my_company_type()
RETURNS public.company_type
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT c.type FROM public.companies c
  INNER JOIN public.profiles p ON p.company_id = c.id
  WHERE p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_above()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT role IN ('admin', 'super_admin') FROM public.profiles WHERE id = auth.uid();
$$;
