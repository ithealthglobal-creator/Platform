-- Saved layout state for the Growth → Funnel canvas (per user, per company)
CREATE TABLE public.funnel_canvases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default',
  layout jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.funnel_canvases ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_funnel_canvases_company_id ON public.funnel_canvases(company_id);
CREATE INDEX idx_funnel_canvases_owner ON public.funnel_canvases(owner_user_id);

CREATE TRIGGER funnel_canvases_updated_at
  BEFORE UPDATE ON public.funnel_canvases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE POLICY "Admins manage their funnel canvases"
  ON public.funnel_canvases
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.company_id = funnel_canvases.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.company_id = funnel_canvases.company_id
    )
  );
