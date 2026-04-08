CREATE TABLE public.website_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  page text NOT NULL,
  section text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT website_content_company_page_section_key UNIQUE (company_id, page, section)
);

ALTER TABLE public.website_content ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER website_content_updated_at
  BEFORE UPDATE ON public.website_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_website_content_company_page
  ON public.website_content (company_id, page, is_active, sort_order);
