CREATE TABLE public.assessment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer NOT NULL,
  passed boolean NOT NULL,
  answers jsonb NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_assessment_attempts_assessment_user ON public.assessment_attempts(assessment_id, user_id);
