CREATE TABLE public.cost_variables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  unit_label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cost_variables ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER cost_variables_updated_at
  BEFORE UPDATE ON public.cost_variables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
