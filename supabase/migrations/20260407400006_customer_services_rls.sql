-- SLA Templates: admin full, authenticated read active
CREATE POLICY "Admins full access to sla_templates" ON public.sla_templates FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Authenticated read active sla_templates" ON public.sla_templates FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

-- Service SLA: admin full, authenticated read
CREATE POLICY "Admins full access to service_sla" ON public.service_sla FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Authenticated read service_sla" ON public.service_sla FOR SELECT USING (auth.uid() IS NOT NULL);

-- Customer Contracts: admin full, customers read own company
CREATE POLICY "Admins full access to customer_contracts" ON public.customer_contracts FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Customers read own contracts" ON public.customer_contracts FOR SELECT USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Service Requests: admin full read, customers insert+read own company
CREATE POLICY "Admins full access to service_requests" ON public.service_requests FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Customers read own requests" ON public.service_requests FOR SELECT USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Customers create requests" ON public.service_requests FOR INSERT WITH CHECK (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Orders: admin full, customers read own company
CREATE POLICY "Admins full access to orders" ON public.orders FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Customers read own orders" ON public.orders FOR SELECT USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Order Items: admin full, customers read via order
CREATE POLICY "Admins full access to order_items" ON public.order_items FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Customers read own order_items" ON public.order_items FOR SELECT USING (
  order_id IN (SELECT id FROM public.orders WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);
