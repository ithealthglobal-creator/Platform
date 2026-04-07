-- User course enrollments
CREATE TABLE public.user_course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  last_module_id uuid REFERENCES public.course_modules(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Indexes
CREATE INDEX idx_user_course_enrollments_user ON public.user_course_enrollments(user_id);
CREATE INDEX idx_user_course_enrollments_course ON public.user_course_enrollments(course_id);

-- Updated at trigger
CREATE TRIGGER user_course_enrollments_updated_at
  BEFORE UPDATE ON public.user_course_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.user_course_enrollments ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access to enrollments"
  ON public.user_course_enrollments
  FOR ALL
  USING (public.get_my_role() = 'admin');

-- Users can read their own enrollments
CREATE POLICY "Users can read own enrollments"
  ON public.user_course_enrollments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own enrollments
CREATE POLICY "Users can enroll themselves"
  ON public.user_course_enrollments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own enrollments
CREATE POLICY "Users can update own enrollments"
  ON public.user_course_enrollments
  FOR UPDATE
  USING (auth.uid() = user_id);
