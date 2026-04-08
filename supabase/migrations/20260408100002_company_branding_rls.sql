-- Public SELECT: all authenticated users can read branding
CREATE POLICY "Public read company branding"
  ON public.company_branding FOR SELECT
  USING (true);

-- Admin SELECT own company branding
CREATE POLICY "Admins read own company branding"
  ON public.company_branding FOR SELECT
  USING (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  );

-- Admin INSERT own company branding
CREATE POLICY "Admins insert own company branding"
  ON public.company_branding FOR INSERT
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  );

-- Admin UPDATE own company branding
CREATE POLICY "Admins update own company branding"
  ON public.company_branding FOR UPDATE
  USING (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  );
