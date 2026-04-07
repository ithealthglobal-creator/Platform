-- Add service_id to assessment_questions (replace phase_id)
ALTER TABLE public.assessment_questions
  ADD COLUMN service_id uuid REFERENCES public.services(id);

-- Backfill existing questions using phase_id → service mapping
-- Operate phase: Q1,Q2 → Managed IT Support, Q3,Q4 → Backup & DR
UPDATE public.assessment_questions
SET service_id = 'b0000000-0000-0000-0000-000000000001'
WHERE phase_id = 'a0000000-0000-0000-0000-000000000001' AND sort_order IN (1, 2);

UPDATE public.assessment_questions
SET service_id = 'b0000000-0000-0000-0000-000000000002'
WHERE phase_id = 'a0000000-0000-0000-0000-000000000001' AND sort_order IN (3, 4);

-- Secure phase: Q5 (endpoint protection), Q6 (authentication) → Cyber Security Essentials
-- Q7 (security training), Q8 (backup/recovery) → Compliance & Governance
UPDATE public.assessment_questions
SET service_id = 'b0000000-0000-0000-0000-000000000003'
WHERE phase_id = 'a0000000-0000-0000-0000-000000000002' AND sort_order IN (5, 6);

UPDATE public.assessment_questions
SET service_id = 'b0000000-0000-0000-0000-000000000004'
WHERE phase_id = 'a0000000-0000-0000-0000-000000000002' AND sort_order IN (7, 8);

-- Streamline phase: Q9,Q10 → Cloud Migration, Q11,Q12 → Process Automation
UPDATE public.assessment_questions
SET service_id = 'b0000000-0000-0000-0000-000000000005'
WHERE phase_id = 'a0000000-0000-0000-0000-000000000003' AND sort_order IN (9, 10);

UPDATE public.assessment_questions
SET service_id = 'b0000000-0000-0000-0000-000000000006'
WHERE phase_id = 'a0000000-0000-0000-0000-000000000003' AND sort_order IN (11, 12);

-- Accelerate phase: Q13,Q14 → AI & Analytics, Q15,Q16 → Digital Transformation Strategy
UPDATE public.assessment_questions
SET service_id = 'b0000000-0000-0000-0000-000000000007'
WHERE phase_id = 'a0000000-0000-0000-0000-000000000004' AND sort_order IN (13, 14);

UPDATE public.assessment_questions
SET service_id = 'b0000000-0000-0000-0000-000000000008'
WHERE phase_id = 'a0000000-0000-0000-0000-000000000004' AND sort_order IN (15, 16);

-- Set NOT NULL after backfill
ALTER TABLE public.assessment_questions
  ALTER COLUMN service_id SET NOT NULL;

-- Drop phase_id and its index
DROP INDEX IF EXISTS idx_assessment_questions_phase;
ALTER TABLE public.assessment_questions DROP COLUMN phase_id;

-- Add index on service_id
CREATE INDEX idx_assessment_questions_service ON public.assessment_questions(service_id);

-- Add service_scores JSONB to assessment_attempts
ALTER TABLE public.assessment_attempts
  ADD COLUMN service_scores jsonb;
