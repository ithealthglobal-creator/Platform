-- Funnel event log: every page view, content view, wizard step transition, lead created, phase assigned
CREATE TABLE public.funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  lead_id uuid REFERENCES public.sales_leads(id) ON DELETE SET NULL,
  assessment_attempt_id uuid,
  event_type text NOT NULL CHECK (event_type IN (
    'page_view', 'content_view',
    'step_entered', 'step_completed',
    'lead_created', 'phase_assigned'
  )),
  step_key text CHECK (step_key IS NULL OR step_key IN (
    'welcome', 'assessment', 'details', 'confirmation'
  )),
  page_path text,
  awareness_source_type text CHECK (awareness_source_type IS NULL OR awareness_source_type IN (
    'paid', 'social', 'blog', 'organic', 'direct'
  )),
  awareness_source_id uuid,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer text,
  meta_campaign_id text,
  phase_id uuid REFERENCES public.phases(id),
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_funnel_events_event_type_occurred ON public.funnel_events(event_type, occurred_at);
CREATE INDEX idx_funnel_events_session_id ON public.funnel_events(session_id);
CREATE INDEX idx_funnel_events_awareness ON public.funnel_events(awareness_source_type, awareness_source_id);
CREATE INDEX idx_funnel_events_meta_campaign ON public.funnel_events(meta_campaign_id);
CREATE INDEX idx_funnel_events_step_key ON public.funnel_events(step_key);

-- Anyone (anon + authenticated) can insert events
CREATE POLICY "Anyone can insert funnel events"
  ON public.funnel_events
  FOR INSERT
  WITH CHECK (true);

-- Only admins can read events
CREATE POLICY "Admins read funnel events"
  ON public.funnel_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );
