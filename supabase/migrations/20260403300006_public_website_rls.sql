-- blog_posts: public read for published, admin full CRUD
CREATE POLICY "Anyone can read published blog posts"
  ON public.blog_posts FOR SELECT
  USING (status = 'published' AND is_active = true);

CREATE POLICY "Admins can do everything with blog_posts"
  ON public.blog_posts FOR ALL
  USING (public.get_my_role() = 'admin');

-- testimonials: public read for active, admin full CRUD
CREATE POLICY "Anyone can read active testimonials"
  ON public.testimonials FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can do everything with testimonials"
  ON public.testimonials FOR ALL
  USING (public.get_my_role() = 'admin');

-- contact_submissions: anonymous insert, admin read
CREATE POLICY "Anyone can submit contact form"
  ON public.contact_submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read contact_submissions"
  ON public.contact_submissions FOR SELECT
  USING (public.get_my_role() = 'admin');

-- partner_applications: anonymous insert, admin read
CREATE POLICY "Anyone can submit partner application"
  ON public.partner_applications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read partner_applications"
  ON public.partner_applications FOR SELECT
  USING (public.get_my_role() = 'admin');

-- partners: public read for active, admin full CRUD
CREATE POLICY "Anyone can read active partners"
  ON public.partners FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can do everything with partners"
  ON public.partners FOR ALL
  USING (public.get_my_role() = 'admin');
