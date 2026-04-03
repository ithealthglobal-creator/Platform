-- Courses: admins full CRUD, authenticated read published
CREATE POLICY "Admins full access to courses"
  ON public.courses FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated read published courses"
  ON public.courses FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_published = true);

-- Course sections: admins full CRUD, authenticated read
CREATE POLICY "Admins full access to course_sections"
  ON public.course_sections FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated read course_sections"
  ON public.course_sections FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Course modules: admins full CRUD, authenticated read
CREATE POLICY "Admins full access to course_modules"
  ON public.course_modules FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated read course_modules"
  ON public.course_modules FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Assessments: admins full CRUD, authenticated read
CREATE POLICY "Admins full access to assessments"
  ON public.assessments FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated read assessments"
  ON public.assessments FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Assessment questions: admins full CRUD, authenticated read
CREATE POLICY "Admins full access to assessment_questions"
  ON public.assessment_questions FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated read assessment_questions"
  ON public.assessment_questions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Assessment attempts: admins full CRUD, users manage own
CREATE POLICY "Admins full access to assessment_attempts"
  ON public.assessment_attempts FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Users insert own attempts"
  ON public.assessment_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own attempts"
  ON public.assessment_attempts FOR SELECT
  USING (auth.uid() = user_id);

-- Certificates: admins full CRUD, users read own
CREATE POLICY "Admins full access to certificates"
  ON public.certificates FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Users read own certificates"
  ON public.certificates FOR SELECT
  USING (auth.uid() = user_id);

-- User section progress: admins full CRUD, users manage own
CREATE POLICY "Admins full access to user_section_progress"
  ON public.user_section_progress FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Users manage own progress"
  ON public.user_section_progress FOR ALL
  USING (auth.uid() = user_id);
