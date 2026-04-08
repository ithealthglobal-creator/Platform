-- Public SELECT: all users can read website content
CREATE POLICY "Public read website content"
  ON public.website_content FOR SELECT
  USING (true);

-- Admin SELECT own company website content
CREATE POLICY "Admins read own company website content"
  ON public.website_content FOR SELECT
  USING (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  );

-- Admin INSERT own company website content
CREATE POLICY "Admins insert own company website content"
  ON public.website_content FOR INSERT
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  );

-- Admin UPDATE own company website content
CREATE POLICY "Admins update own company website content"
  ON public.website_content FOR UPDATE
  USING (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  );

-- Admin DELETE own company website content
CREATE POLICY "Admins delete own company website content"
  ON public.website_content FOR DELETE
  USING (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  );
