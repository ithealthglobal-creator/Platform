import { createClient } from '@supabase/supabase-js'
import { ScrollReveal } from '@/components/scroll-reveal'
import { Email, Phone, Location } from '@carbon/icons-react'

const SERVOLU_ID = '00000000-0000-0000-0000-000000000000'

export default async function MarketplaceContactPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: company } = await supabase
    .from('companies')
    .select('name, contact_email, support_email, domain')
    .eq('id', SERVOLU_ID)
    .maybeSingle()

  const contactEmail = company?.contact_email ?? company?.support_email ?? 'hello@servolu.com'
  const companyName = company?.name ?? 'Servolu'

  return (
    <div className="bg-white min-h-screen">
      {/* Hero */}
      <section className="bg-gray-950 text-white py-24 px-6 md:px-12 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <p className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-3">
              Get in touch
            </p>
            <h1 className="text-4xl md:text-5xl font-light mb-4">Contact {companyName}</h1>
            <p className="text-white/60 max-w-xl">
              Questions about the marketplace? Interested in becoming a provider? We&apos;d love to hear from you.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Contact info */}
      <section className="py-24 px-6 md:px-12 lg:px-16">
        <div className="mx-auto max-w-3xl">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <ScrollReveal>
              <div className="flex flex-col gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <Email size={20} className="text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Email Us</h3>
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-blue-600 hover:text-blue-700 text-sm transition-colors"
                >
                  {contactEmail}
                </a>
                <p className="text-sm text-gray-500">We aim to respond within 24 hours.</p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <div className="flex flex-col gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <Location size={20} className="text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Become a Provider</h3>
                <p className="text-sm text-gray-500">
                  Are you an IT modernisation company? Apply to list your services on the Servolu Marketplace.
                </p>
                <a
                  href={`mailto:${contactEmail}?subject=Provider Application`}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Apply now →
                </a>
              </div>
            </ScrollReveal>
          </div>

          {/* CTA */}
          <ScrollReveal delay={0.2}>
            <div className="mt-16 rounded-xl bg-gray-950 text-white p-10 text-center">
              <h2 className="text-2xl font-light mb-3">Ready to get started?</h2>
              <p className="text-white/60 mb-6 text-sm">
                Browse our marketplace and find the right IT modernisation partner for your business.
              </p>
              <a
                href="/marketplace/providers"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors"
              >
                Browse Providers
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}
