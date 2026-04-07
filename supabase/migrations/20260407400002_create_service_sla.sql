CREATE TABLE public.service_sla (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  sla_template_id uuid NOT NULL REFERENCES public.sla_templates(id),
  override_response_critical text,
  override_response_high text,
  override_response_medium text,
  override_response_low text,
  override_resolution_critical text,
  override_resolution_high text,
  override_resolution_medium text,
  override_resolution_low text,
  override_uptime_guarantee text,
  override_support_hours text,
  override_support_channels text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_id)
);

ALTER TABLE public.service_sla ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_service_sla_service_id ON public.service_sla(service_id);
CREATE INDEX idx_service_sla_template_id ON public.service_sla(sla_template_id);

CREATE TRIGGER service_sla_updated_at
  BEFORE UPDATE ON public.service_sla
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
