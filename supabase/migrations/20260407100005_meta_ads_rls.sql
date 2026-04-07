-- supabase/migrations/20260407100005_meta_ads_rls.sql

-- meta_integrations: admin-only
CREATE POLICY "Admins can do everything with meta_integrations"
  ON public.meta_integrations FOR ALL
  USING (public.get_my_role() = 'admin');

-- meta_campaigns: admin-only
CREATE POLICY "Admins can do everything with meta_campaigns"
  ON public.meta_campaigns FOR ALL
  USING (public.get_my_role() = 'admin');

-- meta_ad_sets: admin-only
CREATE POLICY "Admins can do everything with meta_ad_sets"
  ON public.meta_ad_sets FOR ALL
  USING (public.get_my_role() = 'admin');

-- meta_ads: admin-only
CREATE POLICY "Admins can do everything with meta_ads"
  ON public.meta_ads FOR ALL
  USING (public.get_my_role() = 'admin');
