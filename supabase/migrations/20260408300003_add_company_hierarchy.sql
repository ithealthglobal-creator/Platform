ALTER TABLE public.companies
  ADD COLUMN parent_company_id uuid REFERENCES public.companies(id),
  ADD COLUMN domain text,
  ADD COLUMN tagline text,
  ADD COLUMN support_email text,
  ADD COLUMN contact_email text,
  ADD COLUMN slug text UNIQUE;

CREATE INDEX idx_companies_parent ON public.companies (parent_company_id);

-- Auto-set parent_company_id for new companies
CREATE OR REPLACE FUNCTION public.set_parent_company_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_company_id IS NULL AND NEW.type IN ('customer', 'partner') THEN
    NEW.parent_company_id := (SELECT company_id FROM public.profiles WHERE id = auth.uid());
  END IF;
  IF NEW.parent_company_id IS NULL AND NEW.type = 'admin' THEN
    NEW.parent_company_id := (SELECT company_id FROM public.profiles WHERE id = auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER companies_set_parent
  BEFORE INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_parent_company_on_insert();
