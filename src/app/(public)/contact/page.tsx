import { resolveCompanyId } from '@/lib/company-resolver'
import { getPageContent } from '@/lib/website-content'
import { DEFAULT_CONTENT } from '@/lib/default-content'
import { ContactClient } from '@/components/contact-client'

export default async function ContactPage() {
  const companyId = await resolveCompanyId()
  const sections = await getPageContent(companyId, 'contact')

  const get = (section: string): Record<string, any> =>
    (sections[section]?.content ?? (DEFAULT_CONTENT.contact as any)?.[section] ?? {}) as Record<string, any>

  const hero = get('hero')
  const info = get('info')
  const form = get('form')
  const cta = get('cta')

  return (
    <ContactClient
      heroTitle={hero.title ?? 'Contact Us'}
      heroSubtitle={hero.subtitle ?? 'Get in touch with our team'}
      email={info.email ?? 'hello@platform.local'}
      phone={info.phone ?? '+27 (0) 11 123 4567'}
      location={info.location ?? 'Johannesburg, South Africa'}
      formHeading={form.heading ?? 'Send us a message'}
      ctaText={cta.text ?? 'Ready to start your IT modernisation journey?'}
      ctaButtonText={cta.button_text ?? 'Start Now'}
      ctaButtonLink={cta.button_link ?? '/login'}
    />
  )
}
