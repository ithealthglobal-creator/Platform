CREATE TABLE public.service_costing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('setup', 'maintenance')),
  pricing_type text NOT NULL CHECK (pricing_type IN ('tiered', 'formula')),
  cost_variable_id uuid REFERENCES public.cost_variables(id),
  formula text,
  base_cost numeric(10,2) DEFAULT 0,
  tiers jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_costing_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_service_costing_items_service_cat_sort ON public.service_costing_items(service_id, category, sort_order);

CREATE TRIGGER service_costing_items_updated_at
  BEFORE UPDATE ON public.service_costing_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
