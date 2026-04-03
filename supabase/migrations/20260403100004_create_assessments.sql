CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('pre', 'post')),
  name text NOT NULL,
  description text,
  pass_threshold integer NOT NULL DEFAULT 80,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_assessments_section_type ON public.assessments(section_id, type);
CREATE INDEX idx_assessments_section ON public.assessments(section_id);

CREATE TRIGGER assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
