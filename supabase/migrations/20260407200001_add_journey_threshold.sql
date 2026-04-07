-- Add configurable threshold for customer journey Gantt chart.
-- Services where the customer's assessment score % < this value are included.
ALTER TABLE public.assessments
  ADD COLUMN journey_threshold integer NOT NULL DEFAULT 80;
