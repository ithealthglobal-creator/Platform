-- Aggregates funnel_events + meta_campaigns + blog_posts + social_posts + phases
-- into one jsonb payload for the Growth → Funnel canvas.
CREATE OR REPLACE FUNCTION public.get_funnel_metrics(
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from timestamptz := COALESCE(p_date_from, now() - interval '30 days');
  v_to   timestamptz := COALESCE(p_date_to, now());
  v_result jsonb;
BEGIN
  -- Caller must be admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH
  paid AS (
    SELECT
      mc.id,
      mc.name,
      mc.spend,
      mc.impressions,
      mc.clicks,
      COALESCE(s.sessions, 0) AS sessions
    FROM public.meta_campaigns mc
    LEFT JOIN (
      SELECT awareness_source_id, COUNT(DISTINCT session_id) AS sessions
      FROM public.funnel_events
      WHERE awareness_source_type = 'paid'
        AND occurred_at BETWEEN v_from AND v_to
      GROUP BY awareness_source_id
    ) s ON s.awareness_source_id = mc.id
  ),
  social AS (
    SELECT
      sp.id,
      sp.platform,
      sp.title,
      sp.impressions,
      sp.clicks,
      COALESCE(s.sessions, 0) AS sessions
    FROM public.social_posts sp
    LEFT JOIN (
      SELECT awareness_source_id, COUNT(DISTINCT session_id) AS sessions
      FROM public.funnel_events
      WHERE awareness_source_type = 'social'
        AND occurred_at BETWEEN v_from AND v_to
      GROUP BY awareness_source_id
    ) s ON s.awareness_source_id = sp.id
    WHERE sp.is_active = true
      AND sp.status = 'published'
  ),
  blog AS (
    SELECT
      bp.id,
      bp.title,
      bp.slug,
      bp.views,
      COALESCE(s.sessions, 0) AS sessions
    FROM public.blog_posts bp
    LEFT JOIN (
      SELECT awareness_source_id, COUNT(DISTINCT session_id) AS sessions
      FROM public.funnel_events
      WHERE awareness_source_type = 'blog'
        AND occurred_at BETWEEN v_from AND v_to
      GROUP BY awareness_source_id
    ) s ON s.awareness_source_id = bp.id
    WHERE bp.is_active = true
      AND bp.status = 'published'
  ),
  website AS (
    SELECT COUNT(DISTINCT session_id) AS sessions
    FROM public.funnel_events
    WHERE event_type = 'page_view'
      AND occurred_at BETWEEN v_from AND v_to
  ),
  steps AS (
    SELECT
      step_key,
      COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'step_entered')   AS entered,
      COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'step_completed') AS completed
    FROM public.funnel_events
    WHERE step_key IS NOT NULL
      AND occurred_at BETWEEN v_from AND v_to
    GROUP BY step_key
  ),
  phase_counts AS (
    SELECT
      p.id,
      p.name,
      COALESCE(c.leads, 0) AS leads
    FROM public.phases p
    LEFT JOIN (
      SELECT phase_id, COUNT(DISTINCT session_id) AS leads
      FROM public.funnel_events
      WHERE event_type = 'phase_assigned'
        AND phase_id IS NOT NULL
        AND occurred_at BETWEEN v_from AND v_to
      GROUP BY phase_id
    ) c ON c.phase_id = p.id
    WHERE p.is_active = true
    ORDER BY p.sort_order
  )
  SELECT jsonb_build_object(
    'date_from', v_from,
    'date_to', v_to,
    'awareness', jsonb_build_object(
      'paid',   COALESCE((SELECT jsonb_agg(to_jsonb(paid))   FROM paid),   '[]'::jsonb),
      'social', COALESCE((SELECT jsonb_agg(to_jsonb(social)) FROM social), '[]'::jsonb),
      'blog',   COALESCE((SELECT jsonb_agg(to_jsonb(blog))   FROM blog),   '[]'::jsonb)
    ),
    'website', jsonb_build_object(
      'sessions', COALESCE((SELECT sessions FROM website), 0)
    ),
    'steps', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'key', step_key,
        'entered', entered,
        'completed', completed
      )) FROM steps
    ), '[]'::jsonb),
    'phases', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'leads', leads
      )) FROM phase_counts
    ), '[]'::jsonb)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_funnel_metrics(timestamptz, timestamptz) TO authenticated;
