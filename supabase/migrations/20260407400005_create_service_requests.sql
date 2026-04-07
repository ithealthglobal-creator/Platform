CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  profile_id uuid NOT NULL REFERENCES public.profiles(id),
  service_id uuid NOT NULL REFERENCES public.services(id),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'approved', 'declined')),
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_service_requests_company_id ON public.service_requests(company_id);
CREATE INDEX idx_service_requests_status ON public.service_requests(status);

CREATE TRIGGER service_requests_updated_at
  BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
