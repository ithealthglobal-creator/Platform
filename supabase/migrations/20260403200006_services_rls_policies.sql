CREATE POLICY "Admins full access to services" ON public.services FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Authenticated read services" ON public.services FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins full access to service_verticals" ON public.service_verticals FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Read service_verticals" ON public.service_verticals FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins full access to service_personas" ON public.service_personas FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Read service_personas" ON public.service_personas FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins full access to service_pains" ON public.service_pains FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Read service_pains" ON public.service_pains FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins full access to service_gains" ON public.service_gains FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Read service_gains" ON public.service_gains FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins full access to service_products" ON public.service_products FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Read service_products" ON public.service_products FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins full access to service_skills" ON public.service_skills FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Read service_skills" ON public.service_skills FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins full access to service_runbook_steps" ON public.service_runbook_steps FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Read service_runbook_steps" ON public.service_runbook_steps FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins full access to service_costing_items" ON public.service_costing_items FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Read service_costing_items" ON public.service_costing_items FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins full access to service_academy_links" ON public.service_academy_links FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Read service_academy_links" ON public.service_academy_links FOR SELECT USING (auth.uid() IS NOT NULL);
