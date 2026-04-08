import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { getPageContent, getCompanyBranding } from '@/lib/website-content'
import { ScrollReveal } from '@/components/scroll-reveal'

const SERVOLU_ID = '00000000-0000-0000-0000-000000000000'

export default async function MarketplaceAboutPage() {
  const branding = await getCompanyBranding(SERVOLU_ID)
  const sections = await getPageContent(SERVOLU_ID, 'about')

  const mission = sections?.mission?.content as Record<string, unknown> | undefined
  const logoUrl = branding?.logo_url ?? branding?.logo_light_url

  // Defaults if no CMS content
  const heading = (mission?.heading as string) ?? 'Connecting IT Modernisation Partners'
  const paragraphs: string[] = Array.isArray(mission?.paragraphs)
    ? (mission.paragraphs as string[])
    : [
        'Servolu is the marketplace platform for IT modernisation. We connect businesses with certified providers who can guide their transformation journey.',
        'Our platform makes it simple to discover, compare, and engage with trusted IT modernisation partners across every phase — from foundation to acceleration.',
        'Built by practitioners, for practitioners. We understand the complexities of modern IT and have built a marketplace that reflects the real-world journey of modernisation.',
      ]

  return (
    <div className="bg-white min-h-screen">
      {/* Hero */}
      <section className="bg-gray-950 text-white py-24 px-6 md:px-12 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            {logoUrl && (
              <Image
                src={logoUrl}
                alt="Servolu"
                width={120}
                height={30}
                className="h-8 w-auto mb-8 opacity-80"
                style={{ width: 'auto' }}
              />
            )}
            <h1 className="text-4xl md:text-6xl font-light mb-6">{heading}</h1>
          </ScrollReveal>
        </div>
      </section>

      {/* Mission */}
      <section className="py-24 px-6 md:px-12 lg:px-16">
        <div className="mx-auto max-w-4xl">
          <ScrollReveal>
            <div className="flex flex-col gap-6">
              {paragraphs.map((p, i) => (
                <p key={i} className="text-gray-700 text-lg leading-relaxed">{p}</p>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 px-6 md:px-12 lg:px-16 bg-gray-50">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <h2 className="text-2xl font-semibold text-gray-900 mb-12">What We Stand For</h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                title: 'Trust',
                body: 'Every provider on our marketplace is vetted and certified. We only work with partners who share our commitment to quality.',
              },
              {
                title: 'Simplicity',
                body: 'We make complex IT decisions simple. Our platform guides you to the right partners and services for your specific journey.',
              },
              {
                title: 'Transformation',
                body: 'We are not just a directory — we are a transformation platform. We measure success by real business outcomes.',
              },
            ].map((v, i) => (
              <ScrollReveal key={v.title} delay={i * 0.1}>
                <div className="flex flex-col gap-3">
                  <div className="h-1 w-8 rounded-full bg-blue-600" />
                  <h3 className="font-semibold text-gray-900 text-lg">{v.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{v.body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
