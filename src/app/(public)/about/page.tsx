import { Trophy, Security, Rocket } from '@carbon/icons-react'
import { CTABanner } from '@/components/cta-banner'
import { PageHero } from '@/components/page-hero'
import { ScrollReveal } from '@/components/scroll-reveal'

export default function AboutPage() {
  return (
    <>
      {/* Page Header */}
      <PageHero title="About IThealth" subtitle="Your IT Modernisation Champions" />

      {/* Mission Section */}
      <section className="py-32 px-8 md:px-16 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto items-center">
          <ScrollReveal direction="left">
            <div>
              <p className="text-sm uppercase tracking-wider text-[var(--brand-primary)] font-semibold mb-4">
                Our Mission
              </p>
              <h2 className="text-3xl font-bold text-[var(--brand-dark)] mb-8">
                Modernising IT for the businesses that matter most
              </h2>
              <p className="text-gray-600 mb-8">
                IThealth was founded with a simple belief: every small and medium business deserves
                enterprise-quality IT. We guide businesses through their IT modernisation journey,
                making complex technology simple, accessible, and secure.
              </p>
              <p className="text-gray-600">
                Our approach is built on the conviction that IT modernisation shouldn&apos;t be
                overwhelming. Through our proven four-phase journey — Operate, Secure, Streamline,
                and Accelerate — we transform IT from a cost centre into a competitive advantage.
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal direction="right">
            <div className="rounded-xl h-64 md:h-80 bg-[var(--brand-primary)]/10" />
          </ScrollReveal>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-32 px-8 md:px-16 bg-gray-50">
        <h2 className="text-3xl font-bold text-center mb-20">Our Values</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl mx-auto">
          <ScrollReveal delay={0 * 0.15}>
            <div className="bg-white rounded-xl p-12 shadow-sm">
              <Trophy size={32} className="text-[var(--brand-primary)]" />
              <h3 className="font-semibold text-xl mt-8 mb-4">Champion Mindset</h3>
              <p className="text-gray-600">
                We don&apos;t just service IT — we champion your business growth through technology.
                Every decision is made with your success in mind.
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={1 * 0.15}>
            <div className="bg-white rounded-xl p-12 shadow-sm">
              <Security size={32} className="text-[var(--brand-secondary)]" />
              <h3 className="font-semibold text-xl mt-8 mb-4">Security First</h3>
              <p className="text-gray-600">
                In an era of growing cyber threats, security isn&apos;t an add-on — it&apos;s the
                foundation. We build security into every layer of your IT infrastructure.
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={2 * 0.15}>
            <div className="bg-white rounded-xl p-12 shadow-sm">
              <Rocket size={32} className="text-[var(--phase-accelerate)]" />
              <h3 className="font-semibold text-xl mt-8 mb-4">Continuous Progress</h3>
              <p className="text-gray-600">
                IT modernisation is a journey, not a destination. We partner with you for the long
                term, continuously improving and adapting as technology evolves.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA Banner */}
      <CTABanner
        heading="Ready to Start Your Journey?"
        subheading="See where your IT stands today"
      />
    </>
  )
}
