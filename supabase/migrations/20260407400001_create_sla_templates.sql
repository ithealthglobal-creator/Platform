CREATE TABLE public.sla_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  response_critical text,
  response_high text,
  response_medium text,
  response_low text,
  resolution_critical text,
  resolution_high text,
  resolution_medium text,
  resolution_low text,
  uptime_guarantee text,
  support_hours text,
  support_channels text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sla_templates ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER sla_templates_updated_at
  BEFORE UPDATE ON public.sla_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
