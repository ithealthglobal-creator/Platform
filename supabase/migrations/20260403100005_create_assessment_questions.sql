CREATE TABLE public.assessment_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  options jsonb NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_assessment_questions_assessment_sort ON public.assessment_questions(assessment_id, sort_order);

CREATE TRIGGER assessment_questions_updated_at
  BEFORE UPDATE ON public.assessment_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
