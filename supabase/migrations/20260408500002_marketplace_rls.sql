CREATE POLICY "Super admins manage marketplace listings"
  ON public.marketplace_listings FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins read own marketplace listing"
  ON public.marketplace_listings FOR SELECT
  USING (company_id = public.get_my_company_id());

CREATE POLICY "Public can read active marketplace listings"
  ON public.marketplace_listings FOR SELECT
  USING (is_active = true);
