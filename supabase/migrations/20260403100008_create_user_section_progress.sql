CREATE TABLE public.user_section_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
  required boolean NOT NULL DEFAULT true,
  modules_completed jsonb DEFAULT '[]',
  pre_assessment_passed boolean DEFAULT false,
  post_assessment_passed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_section_progress ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_user_section_progress_user_section ON public.user_section_progress(user_id, section_id);

CREATE TRIGGER user_section_progress_updated_at
  BEFORE UPDATE ON public.user_section_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
