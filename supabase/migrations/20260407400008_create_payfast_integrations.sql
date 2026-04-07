CREATE TABLE public.payfast_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  merchant_id text,
  merchant_key_encrypted text,
  passphrase_encrypted text,
  is_sandbox boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payfast_integrations_company_unique UNIQUE (company_id)
);

ALTER TABLE public.payfast_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to payfast_integrations" ON public.payfast_integrations FOR ALL USING (public.get_my_role() = 'admin');

CREATE TRIGGER payfast_integrations_updated_at
  BEFORE UPDATE ON public.payfast_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
