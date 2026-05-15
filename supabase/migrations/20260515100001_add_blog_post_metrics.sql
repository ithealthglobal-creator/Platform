-- Cached counters on blog_posts, kept in sync from funnel_events via RPC
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS impressions bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS views bigint NOT NULL DEFAULT 0;

-- Anyone (incl. anon) can increment views on a published post
CREATE OR REPLACE FUNCTION public.increment_blog_post_view(p_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.blog_posts
  SET views = views + 1
  WHERE slug = p_slug
    AND status = 'published'
    AND is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.increment_blog_post_view(text) TO anon, authenticated;
