import { resolveCompanyId } from '@/lib/company-resolver'
import { getPageContent } from '@/lib/website-content'
import { DEFAULT_CONTENT } from '@/lib/default-content'
import { PartnersClient } from '@/components/partners-client'

export default async function PartnersPage() {
  const companyId = await resolveCompanyId()
  const sections = await getPageContent(companyId, 'partners')

  const get = (section: string): Record<string, any> =>
    (sections[section]?.content ?? (DEFAULT_CONTENT.partners as any)?.[section] ?? {}) as Record<string, any>

  const hero = get('hero')
  const benefits = get('benefits')

  const benefitItems: Array<{ title: string; description: string }> = Array.isArray(benefits.items)
    ? benefits.items
    : (DEFAULT_CONTENT.partners as any)?.benefits?.items ?? []

  return (
    <PartnersClient
      heroTitle={hero.title ?? 'Our Partners'}
      heroSubtitle={hero.subtitle ?? 'Trusted technology partnerships'}
      benefitsHeading={benefits.heading ?? 'Become a Partner'}
      benefitItems={benefitItems}
    />
  )
}
