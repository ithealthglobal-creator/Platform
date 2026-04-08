import { notFound } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { getPageContent } from '@/lib/website-content'
import { ServiceCard } from '@/components/marketplace/service-card'
import { ScrollReveal } from '@/components/scroll-reveal'
import { Building } from '@carbon/icons-react'
import type { Service, Phase } from '@/lib/types'

const phaseColorByName: Record<string, string> = {
  Operate: 'blue',
  Secure: 'pink',
  Streamline: 'navy',
  Accelerate: 'gold',
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function ProviderProfilePage({ params }: PageProps) {
  const { slug } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch company by slug
  const { data: company } = await supabase
    .from('companies')
    .select('id, name, slug, tagline, domain, contact_email')
    .eq('slug', slug)
    .maybeSingle()

  if (!company) notFound()

  // Verify active marketplace listing
  const { data: listing } = await supabase
    .from('marketplace_listings')
    .select('id, description')
    .eq('company_id', company.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!listing) notFound()

  // Fetch branding
  const { data: branding } = await supabase
    .from('company_branding')
    .select('logo_url, logo_light_url, primary_colour')
    .eq('company_id', company.id)
    .maybeSingle()

  // Fetch about page content
  const aboutSections = await getPageContent(company.id, 'about')
  const mission = aboutSections?.mission?.content as Record<string, unknown> | undefined

  // Fetch services with phases
  const { data: servicesRaw } = await supabase
    .from('services')
    .select('id, name, description, phase_id, status, is_active, thumbnail_url')
    .eq('company_id', company.id)
    .eq('is_active', true)
    .order('created_at')

  // Fetch phases for phase names
  const { data: phases } = await supabase
    .from('phases')
    .select('id, name')

  const phaseMap: Record<string, string> = {}
  if (phases) {
    for (const p of phases) {
      phaseMap[p.id] = p.name
    }
  }

  const logoUrl = branding?.logo_url ?? branding?.logo_light_url

  return (
    <div className="bg-white min-h-screen">
      {/* Provider header */}
      <section className="bg-gray-950 text-white py-20 px-6 md:px-12 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-6 mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white/10">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={`${company.name} logo`}
                  width={56}
                  height={56}
                  className="h-14 w-14 object-contain"
                />
              ) : (
                <Building size={32} className="text-white/60" />
              )}
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-light">{company.name}</h1>
              {company.domain && (
                <p className="text-white/50 text-sm mt-1">{company.domain}</p>
              )}
            </div>
          </div>
          {(company.tagline || listing.description) && (
            <p className="text-white/70 text-lg max-w-2xl">
              {company.tagline ?? listing.description}
            </p>
          )}
        </div>
      </section>

      {/* About section */}
      {mission && (
        <section className="py-16 px-6 md:px-12 lg:px-16 border-b border-gray-100">
          <div className="mx-auto max-w-7xl">
            <ScrollReveal>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">About</h2>
              {!!mission.heading && (
                <h3 className="text-2xl font-light text-gray-800 mb-4">{String(mission.heading)}</h3>
              )}
              {Array.isArray(mission.paragraphs) && (mission.paragraphs as unknown[]).map((p, i) => (
                <p key={i} className="text-gray-600 mb-3 max-w-3xl">{String(p)}</p>
              ))}
              {typeof mission.body === 'string' && (
                <p className="text-gray-600 max-w-3xl">{mission.body}</p>
              )}
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* Services */}
      <section className="py-16 px-6 md:px-12 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Services</h2>
            <p className="text-gray-500 mb-10">
              {servicesRaw?.length ?? 0} services offered by {company.name}
            </p>
          </ScrollReveal>

          {!servicesRaw || servicesRaw.length === 0 ? (
            <p className="text-gray-400 text-sm">No services listed yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {servicesRaw.map((service, i) => {
                const phaseName = phaseMap[service.phase_id] ?? 'Unknown'
                const phaseColor = phaseColorByName[phaseName] ?? 'blue'
                return (
                  <ScrollReveal key={service.id} delay={i * 0.05}>
                    <ServiceCard
                      name={service.name}
                      description={service.description}
                      phaseName={phaseName}
                      phaseColor={phaseColor}
                      providerName={company.name}
                      providerSlug={slug}
                      providerLogoUrl={logoUrl}
                    />
                  </ScrollReveal>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Contact CTA */}
      {company.contact_email && (
        <section className="bg-gray-50 py-16 px-6 md:px-12 lg:px-16">
          <div className="mx-auto max-w-7xl text-center">
            <h2 className="text-2xl font-light text-gray-900 mb-4">
              Interested in working with {company.name}?
            </h2>
            <a
              href={`mailto:${company.contact_email}`}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors"
            >
              Get in Touch
            </a>
          </div>
        </section>
      )}
    </div>
  )
}
