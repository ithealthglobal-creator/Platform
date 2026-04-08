import { Trophy, Security, Rocket } from '@carbon/icons-react'
import { CTABanner } from '@/components/cta-banner'
import { PageHero } from '@/components/page-hero'
import { ScrollReveal } from '@/components/scroll-reveal'
import { resolveCompanyId } from '@/lib/company-resolver'
import { getPageContent } from '@/lib/website-content'
import { DEFAULT_CONTENT } from '@/lib/default-content'

const VALUE_ICONS = [Trophy, Security, Rocket]
const VALUE_COLORS = [
  'text-[var(--brand-primary)]',
  'text-[var(--brand-secondary)]',
  'text-[var(--phase-accelerate)]',
]

export default async function AboutPage() {
  const companyId = await resolveCompanyId()
  const sections = await getPageContent(companyId, 'about')

  const get = (section: string): Record<string, any> =>
    (sections[section]?.content ?? (DEFAULT_CONTENT.about as any)?.[section] ?? {}) as Record<string, any>

  const hero = get('hero')
  const mission = get('mission')
  const values = get('values')
  const cta = get('cta')

  const paragraphs: string[] = Array.isArray(mission.paragraphs)
    ? mission.paragraphs
    : (DEFAULT_CONTENT.about as any)?.mission?.paragraphs ?? []

  const valueItems: Array<{ title: string; description: string }> = Array.isArray(values.items)
    ? values.items
    : (DEFAULT_CONTENT.about as any)?.values?.items ?? []

  return (
    <>
      {/* Page Header */}
      <PageHero
        title={hero.title ?? 'About Us'}
        subtitle={hero.subtitle ?? 'Your IT Modernisation Champions'}
      />

      {/* Mission Section */}
      <section className="py-96 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-7xl mx-auto px-6 md:px-12 lg:px-16 items-center">
          <ScrollReveal direction="left">
            <div>
              <p className="text-sm uppercase tracking-wider text-[var(--brand-primary)] font-semibold mb-4">
                {mission.eyebrow ?? 'Our Mission'}
              </p>
              <h2 className="text-3xl font-light text-[var(--brand-dark)] mb-8">
                {mission.heading ?? 'Modernising IT for the businesses that matter most'}
              </h2>
              {paragraphs.map((para, i) => (
                <p key={i} className={`text-gray-600${i < paragraphs.length - 1 ? ' mb-8' : ''}`}>
                  {para}
                </p>
              ))}
            </div>
          </ScrollReveal>
          <ScrollReveal direction="right">
            <div className="rounded-xl h-64 md:h-80 bg-[var(--brand-primary)]/10" />
          </ScrollReveal>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-96 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        <h2 className="text-3xl font-light mb-20">{values.heading ?? 'Our Values'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {valueItems.map((item, i) => {
            const Icon = VALUE_ICONS[i % VALUE_ICONS.length]
            const colorClass = VALUE_COLORS[i % VALUE_COLORS.length]
            return (
              <ScrollReveal key={item.title} delay={i * 0.15}>
                <div className="bg-white rounded-xl p-12 shadow-sm">
                  <Icon size={32} className={colorClass} />
                  <h3 className="font-semibold text-xl mt-8 mb-4">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              </ScrollReveal>
            )
          })}
        </div>
        </div>
      </section>

      {/* CTA Banner */}
      <CTABanner
        heading={cta.heading ?? 'Ready to Start Your Journey?'}
        subheading={cta.subheading ?? 'See where your IT stands today'}
        buttonText={cta.button_text ?? 'Start Now'}
        buttonHref={cta.button_link ?? '/login'}
      />
    </>
  )
}
