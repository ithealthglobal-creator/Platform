-- Phases
CREATE POLICY "Admins can do everything with phases"
  ON public.phases FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated users can read phases"
  ON public.phases FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Products
CREATE POLICY "Admins can do everything with products"
  ON public.products FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated users can read products"
  ON public.products FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Cost Variables
CREATE POLICY "Admins can do everything with cost_variables"
  ON public.cost_variables FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated users can read cost_variables"
  ON public.cost_variables FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Verticals
CREATE POLICY "Admins can do everything with verticals"
  ON public.verticals FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated users can read verticals"
  ON public.verticals FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Personas
CREATE POLICY "Admins can do everything with personas"
  ON public.personas FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated users can read personas"
  ON public.personas FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Pains
CREATE POLICY "Admins can do everything with pains"
  ON public.pains FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated users can read pains"
  ON public.pains FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Gains
CREATE POLICY "Admins can do everything with gains"
  ON public.gains FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated users can read gains"
  ON public.gains FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Skills
CREATE POLICY "Admins can do everything with skills"
  ON public.skills FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated users can read skills"
  ON public.skills FOR SELECT
  USING (auth.uid() IS NOT NULL);
