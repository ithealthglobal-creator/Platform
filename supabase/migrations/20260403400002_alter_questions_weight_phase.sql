-- Add phase tagging for per-phase scoring
ALTER TABLE public.assessment_questions ADD COLUMN phase_id uuid REFERENCES public.phases(id);

-- Add weight for question weighting in scoring
ALTER TABLE public.assessment_questions ADD COLUMN weight integer NOT NULL DEFAULT 1;

-- Index for phase-based scoring queries
CREATE INDEX idx_assessment_questions_phase ON public.assessment_questions(phase_id) WHERE phase_id IS NOT NULL;
