'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { captureUtmFromUrl, trackEvent } from '@/lib/funnel-tracking'

interface Props {
  eventType?: 'page_view' | 'content_view'
  blogPostId?: string
  blogSlug?: string
}

export function FunnelPageTracker({ eventType = 'page_view', blogPostId, blogSlug }: Props) {
  const pathname = usePathname()

  useEffect(() => {
    captureUtmFromUrl()
    trackEvent({
      eventType,
      pagePath: pathname ?? undefined,
      blogPostId,
    }).catch(() => {})

    if (blogSlug) {
      import('@/lib/supabase-client').then(({ supabase }) => {
        supabase.rpc('increment_blog_post_view', { p_slug: blogSlug })
      }).catch(() => {})
    }
  }, [pathname, eventType, blogPostId, blogSlug])

  return null
}
