-- Allow service_id to be NULL for course-scoped assessment questions
-- (course questions don't belong to a specific service)
ALTER TABLE public.assessment_questions
  ALTER COLUMN service_id DROP NOT NULL;
