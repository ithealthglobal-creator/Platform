CREATE TABLE public.pains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pains ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER pains_updated_at
  BEFORE UPDATE ON public.pains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
