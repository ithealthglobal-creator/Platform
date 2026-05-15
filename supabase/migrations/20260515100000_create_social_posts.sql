-- Organic social posts tracked as top-of-funnel awareness sources
CREATE TABLE public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('linkedin', 'x', 'facebook', 'instagram')),
  title text,
  content text,
  external_url text,
  external_post_id text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published')),
  published_at timestamptz,
  impressions bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  reach bigint NOT NULL DEFAULT 0,
  engagement bigint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_social_posts_company_id ON public.social_posts(company_id);
CREATE INDEX idx_social_posts_status ON public.social_posts(status);
CREATE INDEX idx_social_posts_published_at ON public.social_posts(published_at);
CREATE INDEX idx_social_posts_platform ON public.social_posts(platform);

CREATE TRIGGER social_posts_updated_at
  BEFORE UPDATE ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Admins read/write within their company hierarchy
CREATE POLICY "Admins manage social posts in their hierarchy"
  ON public.social_posts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- Public can read published social posts (for awareness landing/attribution)
CREATE POLICY "Public read published social posts"
  ON public.social_posts
  FOR SELECT
  USING (status = 'published' AND is_active = true);
