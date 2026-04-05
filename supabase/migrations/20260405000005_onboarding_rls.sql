-- Sales stages: admin full access
CREATE POLICY "Admin full access to sales_stages"
  ON sales_stages FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Sales leads: admin full access
CREATE POLICY "Admin full access to sales_leads"
  ON sales_leads FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Allow public (anon) read of onboarding assessment + its questions
CREATE POLICY "Public read onboarding assessment"
  ON assessments FOR SELECT
  USING (is_onboarding = true);

CREATE POLICY "Public read onboarding questions"
  ON assessment_questions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM assessments WHERE assessments.id = assessment_questions.assessment_id AND assessments.is_onboarding = true)
  );
