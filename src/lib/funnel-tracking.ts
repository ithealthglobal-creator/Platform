'use client'

import { supabase } from '@/lib/supabase-client'
import type {
  AwarenessSourceType,
  FunnelEventType,
  FunnelStepKey,
} from '@/lib/types'

const SESSION_KEY = 'funnel.session_id'
const UTM_KEY = 'funnel.utm'
const REFERRER_KEY = 'funnel.referrer'

const SOCIAL_HOSTNAMES = [
  'linkedin.com',
  'lnkd.in',
  'twitter.com',
  'x.com',
  't.co',
  'facebook.com',
  'fb.com',
  'instagram.com',
]

interface PersistedUtm {
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage
  } catch {
    return null
  }
}

export function getOrCreateSessionId(): string {
  const ls = safeLocalStorage()
  if (!ls) return uuid()
  let id = ls.getItem(SESSION_KEY)
  if (!id) {
    id = uuid()
    ls.setItem(SESSION_KEY, id)
  }
  return id
}

export function captureUtmFromUrl(): void {
  const ls = safeLocalStorage()
  if (!ls || typeof window === 'undefined') return

  const params = new URLSearchParams(window.location.search)
  const hasUtm = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
    .some((k) => params.has(k))

  if (hasUtm) {
    const utm: PersistedUtm = {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_content: params.get('utm_content'),
      utm_term: params.get('utm_term'),
    }
    ls.setItem(UTM_KEY, JSON.stringify(utm))
  }

  // Record the first non-empty referrer of the session
  if (!ls.getItem(REFERRER_KEY) && document.referrer) {
    ls.setItem(REFERRER_KEY, document.referrer)
  }
}

function readPersistedUtm(): PersistedUtm {
  const ls = safeLocalStorage()
  if (!ls) {
    return {
      utm_source: null, utm_medium: null, utm_campaign: null,
      utm_content: null, utm_term: null,
    }
  }
  const raw = ls.getItem(UTM_KEY)
  if (!raw) {
    return {
      utm_source: null, utm_medium: null, utm_campaign: null,
      utm_content: null, utm_term: null,
    }
  }
  try {
    return JSON.parse(raw) as PersistedUtm
  } catch {
    return {
      utm_source: null, utm_medium: null, utm_campaign: null,
      utm_content: null, utm_term: null,
    }
  }
}

function readPersistedReferrer(): string | null {
  const ls = safeLocalStorage()
  return ls?.getItem(REFERRER_KEY) ?? null
}

interface ResolvedSource {
  type: AwarenessSourceType
  id: string | null
  meta_campaign_id: string | null
}

async function resolveAwarenessSource(opts: {
  pathname: string
  utm: PersistedUtm
  referrer: string | null
  explicitBlogId?: string | null
}): Promise<ResolvedSource> {
  const { pathname, utm, referrer, explicitBlogId } = opts

  // Blog page — resolve by explicit id (preferred) or slug from path
  if (explicitBlogId) {
    return { type: 'blog', id: explicitBlogId, meta_campaign_id: null }
  }
  if (pathname.startsWith('/blog/')) {
    const slug = pathname.replace(/^\/blog\//, '').split('/')[0]
    if (slug) {
      const { data } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle()
      if (data?.id) {
        return { type: 'blog', id: data.id as string, meta_campaign_id: null }
      }
    }
  }

  // Social — utm_medium=social, utm_content carries social_posts.id (or external_post_id)
  if (utm.utm_medium === 'social' && utm.utm_content) {
    const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      utm.utm_content,
    )
    const query = supabase.from('social_posts').select('id').eq('status', 'published')
    const { data } = await (looksLikeUuid
      ? query.eq('id', utm.utm_content)
      : query.eq('external_post_id', utm.utm_content)
    ).maybeSingle()
    if (data?.id) {
      return { type: 'social', id: data.id as string, meta_campaign_id: null }
    }
    return { type: 'social', id: null, meta_campaign_id: null }
  }

  // Paid — utm_medium in cpc/paid OR utm_source = meta
  const isPaid =
    utm.utm_medium === 'cpc' ||
    utm.utm_medium === 'paid' ||
    utm.utm_source === 'meta' ||
    utm.utm_source === 'facebook'
  if (isPaid && utm.utm_campaign) {
    const { data } = await supabase
      .from('meta_campaigns')
      .select('id, meta_campaign_id')
      .eq('name', utm.utm_campaign)
      .maybeSingle()
    if (data?.id) {
      return {
        type: 'paid',
        id: data.id as string,
        meta_campaign_id: (data.meta_campaign_id as string) ?? null,
      }
    }
    return { type: 'paid', id: null, meta_campaign_id: null }
  }

  // Organic social via referrer
  if (referrer) {
    try {
      const host = new URL(referrer).hostname.toLowerCase()
      if (SOCIAL_HOSTNAMES.some((h) => host === h || host.endsWith('.' + h))) {
        return { type: 'social', id: null, meta_campaign_id: null }
      }
      return { type: 'organic', id: null, meta_campaign_id: null }
    } catch {
      // ignore parse errors
    }
  }

  return { type: 'direct', id: null, meta_campaign_id: null }
}

export interface TrackEventOptions {
  eventType: FunnelEventType
  stepKey?: FunnelStepKey
  pagePath?: string
  blogPostId?: string
  leadId?: string
  assessmentAttemptId?: string
  phaseId?: string
  properties?: Record<string, unknown>
}

export async function trackEvent(opts: TrackEventOptions): Promise<void> {
  if (typeof window === 'undefined') return

  const sessionId = getOrCreateSessionId()
  const utm = readPersistedUtm()
  const referrer = readPersistedReferrer()
  const pagePath = opts.pagePath ?? window.location.pathname

  const source = await resolveAwarenessSource({
    pathname: pagePath,
    utm,
    referrer,
    explicitBlogId: opts.blogPostId ?? null,
  })

  await supabase.from('funnel_events').insert({
    session_id: sessionId,
    lead_id: opts.leadId ?? null,
    assessment_attempt_id: opts.assessmentAttemptId ?? null,
    event_type: opts.eventType,
    step_key: opts.stepKey ?? null,
    page_path: pagePath,
    awareness_source_type: source.type,
    awareness_source_id: source.id,
    utm_source: utm.utm_source,
    utm_medium: utm.utm_medium,
    utm_campaign: utm.utm_campaign,
    utm_content: utm.utm_content,
    utm_term: utm.utm_term,
    referrer,
    meta_campaign_id: source.meta_campaign_id,
    phase_id: opts.phaseId ?? null,
    properties: opts.properties ?? {},
  })
}
