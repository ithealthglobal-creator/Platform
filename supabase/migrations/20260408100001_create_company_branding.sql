CREATE TABLE public.company_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  logo_url text,
  logo_light_url text,
  icon_url text,
  primary_colour text NOT NULL DEFAULT '#1175E4',
  secondary_colour text NOT NULL DEFAULT '#FF246B',
  accent_colour text,
  font_heading text NOT NULL DEFAULT 'Poppins',
  font_body text NOT NULL DEFAULT 'Poppins',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_branding_company_id_key UNIQUE (company_id)
);

ALTER TABLE public.company_branding ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER company_branding_updated_at
  BEFORE UPDATE ON public.company_branding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
