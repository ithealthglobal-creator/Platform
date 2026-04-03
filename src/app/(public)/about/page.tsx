import { Trophy, Security, Rocket } from '@carbon/icons-react'
import { CTABanner } from '@/components/cta-banner'

export default function AboutPage() {
  return (
    <>
      {/* Page Header */}
      <section className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-dark)] py-16 px-6 text-center text-white">
        <h1 className="text-4xl font-bold">About IThealth</h1>
        <p className="text-white/80 mt-2">Your IT Modernisation Champions</p>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-6 md:px-12 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto items-center">
          <div>
            <p className="text-sm uppercase tracking-wider text-[var(--brand-primary)] font-semibold mb-2">
              Our Mission
            </p>
            <h2 className="text-3xl font-bold text-[var(--brand-dark)] mb-4">
              Modernising IT for the businesses that matter most
            </h2>
            <p className="text-gray-600 mb-4">
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
          <div className="rounded-xl h-64 md:h-80 bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-secondary)]/20" />
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 px-6 md:px-12 bg-gray-50">
        <h2 className="text-3xl font-bold text-center mb-10">Our Values</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-white rounded-xl p-8 shadow-sm">
            <Trophy size={32} className="text-[var(--brand-primary)]" />
            <h3 className="font-semibold text-xl mt-4 mb-2">Champion Mindset</h3>
            <p className="text-gray-600">
              We don&apos;t just service IT — we champion your business growth through technology.
              Every decision is made with your success in mind.
            </p>
          </div>
          <div className="bg-white rounded-xl p-8 shadow-sm">
            <Security size={32} className="text-[var(--brand-secondary)]" />
            <h3 className="font-semibold text-xl mt-4 mb-2">Security First</h3>
            <p className="text-gray-600">
              In an era of growing cyber threats, security isn&apos;t an add-on — it&apos;s the
              foundation. We build security into every layer of your IT infrastructure.
            </p>
          </div>
          <div className="bg-white rounded-xl p-8 shadow-sm">
            <Rocket size={32} className="text-[var(--phase-accelerate)]" />
            <h3 className="font-semibold text-xl mt-4 mb-2">Continuous Progress</h3>
            <p className="text-gray-600">
              IT modernisation is a journey, not a destination. We partner with you for the long
              term, continuously improving and adapting as technology evolves.
            </p>
          </div>
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
