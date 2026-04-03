CREATE TABLE public.phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_phases_sort_order ON public.phases(sort_order);

CREATE TRIGGER phases_updated_at
  BEFORE UPDATE ON public.phases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
