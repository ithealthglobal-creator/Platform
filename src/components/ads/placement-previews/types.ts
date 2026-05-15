import { MetaAd } from '@/lib/types'

export interface PlacementPreviewProps {
  ad: MetaAd
  pageName?: string
}

export const ctaLabel = (objective: string | null): string => {
  switch ((objective || '').toUpperCase()) {
    case 'OUTCOME_LEADS':
    case 'LEAD_GENERATION':
      return 'Sign Up'
    case 'OUTCOME_SALES':
    case 'CONVERSIONS':
      return 'Shop Now'
    case 'OUTCOME_AWARENESS':
    case 'REACH':
    case 'BRAND_AWARENESS':
      return 'Learn More'
    case 'OUTCOME_TRAFFIC':
    case 'LINK_CLICKS':
      return 'Learn More'
    case 'OUTCOME_ENGAGEMENT':
    case 'POST_ENGAGEMENT':
      return 'Like Page'
    case 'OUTCOME_APP_PROMOTION':
    case 'APP_INSTALLS':
      return 'Install Now'
    default:
      return 'Learn More'
  }
}

export const hostFromUrl = (url: string | null): string => {
  if (!url) return 'example.com'
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'example.com'
  }
}
