CREATE TABLE public.service_runbook_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  estimated_minutes integer,
  product_id uuid REFERENCES public.products(id),
  skill_id uuid REFERENCES public.skills(id),
  role text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_runbook_steps ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_service_runbook_steps_service_sort ON public.service_runbook_steps(service_id, sort_order);

CREATE TRIGGER service_runbook_steps_updated_at
  BEFORE UPDATE ON public.service_runbook_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
