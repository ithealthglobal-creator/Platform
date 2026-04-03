-- Add per-phase score breakdown
ALTER TABLE public.assessment_attempts ADD COLUMN phase_scores jsonb;
