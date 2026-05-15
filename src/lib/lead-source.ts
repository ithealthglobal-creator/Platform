// Captures the advert/campaign that brought a visitor to a landing page.
// Stored in sessionStorage so the source survives multi-step flows even if the
// user navigates between assessment questions.

export interface LeadSource {
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  meta_ad_id: string | null
  meta_campaign_id: string | null
  landing_path: string | null
  referrer: string | null
}

const STORAGE_KEY = 'lead-source'

function pickParam(params: URLSearchParams, ...names: string[]): string | null {
  for (const n of names) {
    const v = params.get(n)
    if (v) return v
  }
  return null
}

export function captureLeadSourceFromUrl(): LeadSource | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const hasAnyParam =
    params.has('utm_source') ||
    params.has('utm_campaign') ||
    params.has('utm_medium') ||
    params.has('ad_id') ||
    params.has('campaign_id') ||
    params.has('fbclid') ||
    params.has('gclid')

  const existing = readLeadSource()
  if (!hasAnyParam) return existing

  const source: LeadSource = {
    utm_source: pickParam(params, 'utm_source'),
    utm_medium: pickParam(params, 'utm_medium'),
    utm_campaign: pickParam(params, 'utm_campaign'),
    utm_content: pickParam(params, 'utm_content'),
    utm_term: pickParam(params, 'utm_term'),
    meta_ad_id: pickParam(params, 'ad_id'),
    meta_campaign_id: pickParam(params, 'campaign_id'),
    landing_path: window.location.pathname,
    referrer: document.referrer || null,
  }

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(source))
  } catch {
    // ignore quota / privacy-mode errors
  }
  return source
}

export function readLeadSource(): LeadSource | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as LeadSource) : null
  } catch {
    return null
  }
}
