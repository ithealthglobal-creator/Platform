-- Sales stages (kanban columns)
CREATE TABLE sales_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#1175E4',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sales_stages ENABLE ROW LEVEL SECURITY;

-- Sales leads (kanban cards)
CREATE TABLE sales_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES sales_stages(id),
  assessment_attempt_id uuid REFERENCES assessment_attempts(id),
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sales_leads ENABLE ROW LEVEL SECURITY;

-- Seed default stage
INSERT INTO sales_stages (name, sort_order, color) VALUES ('New Lead', 1, '#1175E4');
