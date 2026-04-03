-- Make section_id nullable for standalone assessments
ALTER TABLE public.assessments ALTER COLUMN section_id DROP NOT NULL;

-- Add scope column with default for existing rows
ALTER TABLE public.assessments ADD COLUMN scope text NOT NULL DEFAULT 'course_section'
  CHECK (scope IN ('journey', 'phase', 'service', 'course_section'));

-- Add phase_id and service_id for scoped assessments
ALTER TABLE public.assessments ADD COLUMN phase_id uuid REFERENCES public.phases(id);
ALTER TABLE public.assessments ADD COLUMN service_id uuid REFERENCES public.services(id);

-- Add check constraint: scope fields must match
ALTER TABLE public.assessments ADD CONSTRAINT chk_assessment_scope CHECK (
  (scope = 'course_section' AND section_id IS NOT NULL) OR
  (scope = 'phase' AND phase_id IS NOT NULL) OR
  (scope = 'service' AND service_id IS NOT NULL) OR
  (scope = 'journey')
);

-- Index for scope-based queries
CREATE INDEX idx_assessments_scope ON public.assessments(scope);
CREATE INDEX idx_assessments_phase ON public.assessments(phase_id) WHERE phase_id IS NOT NULL;
CREATE INDEX idx_assessments_service ON public.assessments(service_id) WHERE service_id IS NOT NULL;
