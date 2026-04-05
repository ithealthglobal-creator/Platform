ALTER TABLE assessments ADD COLUMN is_onboarding boolean NOT NULL DEFAULT false;
ALTER TABLE assessments ADD COLUMN welcome_heading text;
ALTER TABLE assessments ADD COLUMN welcome_description text;
ALTER TABLE assessments ADD COLUMN completion_heading text;
ALTER TABLE assessments ADD COLUMN completion_description text;

-- Only one assessment can be the onboarding assessment
CREATE UNIQUE INDEX idx_assessments_onboarding ON assessments (is_onboarding) WHERE is_onboarding = true;
