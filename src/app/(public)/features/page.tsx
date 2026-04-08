import { AnimatedImage } from '@/components/animated-image'
import { ScrollReveal, AnimatedCounter } from '@/components/scroll-reveal'
import { CTABanner } from '@/components/cta-banner'
import { resolveCompanyId } from '@/lib/company-resolver'
import { getPageContent } from '@/lib/website-content'
import { DEFAULT_CONTENT } from '@/lib/default-content'

const ROTATIONS = [-2, 2, -1.5, 1.5, -1]

export default async function FeaturesPage() {
  const companyId = await resolveCompanyId()
  const sections = await getPageContent(companyId, 'features')

  const get = (section: string): Record<string, any> =>
    (sections[section]?.content ?? (DEFAULT_CONTENT.features as any)?.[section] ?? {}) as Record<string, any>

  const hero = get('hero')
  const featuresSection = get('features')
  const statsSection = get('stats')
  const cta = get('cta')

  const featureItems: Array<{
    title: string
    description: string
    image: string
    bullets: string[]
  }> = Array.isArray(featuresSection.items)
    ? featuresSection.items
    : (DEFAULT_CONTENT.features as any)?.features?.items ?? []

  const statItems: Array<{ value: string; suffix?: string; label: string }> = Array.isArray(
    statsSection.items
  )
    ? statsSection.items
    : (DEFAULT_CONTENT.features as any)?.stats?.items ?? []

  return (
    <>
      {/* Hero */}
      <section className="bg-[var(--brand-primary)] py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-16">
          <ScrollReveal>
            <p className="text-sm font-semibold uppercase tracking-widest text-white/60">
              {hero.eyebrow ?? 'Features'}
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-light leading-tight text-white md:text-5xl">
              {hero.title ?? 'Everything you need to modernise your IT'}
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-light text-white/80">
              {hero.subtitle ?? 'From assessment to implementation, IThealth gives your business the tools, knowledge, and guided journey to build a modern, resilient IT foundation.'}
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Feature sections */}
      {featureItems.map((feature, index) => (
        <section
          key={feature.title}
          className={`py-24 overflow-hidden ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
        >
          <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-16">
            <div
              className={`flex flex-col items-center gap-16 md:flex-row ${
                index % 2 === 1 ? 'md:flex-row-reverse' : ''
              }`}
            >
              {/* Text */}
              <ScrollReveal className="flex-1" direction={index % 2 === 0 ? 'left' : 'right'}>
                <h2 className="text-3xl font-light text-[var(--brand-dark)]">
                  {feature.title}
                </h2>
                <p className="mt-4 text-lg font-light text-slate-600">
                  {feature.description}
                </p>
                <ul className="mt-6 space-y-3">
                  {(feature.bullets ?? []).map((b: string) => (
                    <li key={b} className="flex items-start gap-3 text-sm text-slate-700">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--brand-primary)]" />
                      {b}
                    </li>
                  ))}
                </ul>
              </ScrollReveal>

              {/* Image with rotation */}
              <div className="flex-1">
                <AnimatedImage
                  src={feature.image}
                  alt={feature.title}
                  width={700}
                  height={450}
                  rotate={ROTATIONS[index % ROTATIONS.length]}
                  delay={0.15}
                />
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Stats with animated counters */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-16">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {statItems.map((stat, i) => (
              <ScrollReveal key={stat.label} delay={i * 0.1} scale>
                <div className="text-center">
                  <AnimatedCounter
                    value={stat.value}
                    suffix={stat.suffix ?? ''}
                    className="text-4xl font-light text-[var(--brand-primary)]"
                  />
                  <p className="mt-2 text-sm text-slate-500">{stat.label}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <CTABanner
        heading={cta.heading ?? 'Ready to Modernise Your IT?'}
        subheading={cta.subheading ?? 'Start your free modernisation journey today'}
        buttonText={cta.button_text ?? 'Start Now'}
        buttonHref={cta.button_link ?? '/login'}
      />
    </>
  )
}
