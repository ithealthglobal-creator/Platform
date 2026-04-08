import { notFound, redirect } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { Building } from '@carbon/icons-react'
import Link from 'next/link'

const phaseColorByName: Record<string, string> = {
  Operate: 'bg-blue-100 text-blue-700',
  Secure: 'bg-pink-100 text-pink-700',
  Streamline: 'bg-slate-100 text-slate-700',
  Accelerate: 'bg-amber-100 text-amber-700',
}

interface PageProps {
  params: Promise<{ slug: string; serviceSlug: string }>
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug, serviceSlug } = await params

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
    .select('id')
    .eq('company_id', company.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!listing) notFound()

  // Fetch service by slug-like name match or id
  // Services don't have a slug column — use name-based lookup or id
  const { data: service } = await supabase
    .from('services')
    .select('id, name, description, long_description, phase_id, is_active, hero_image_url, thumbnail_url')
    .eq('company_id', company.id)
    .eq('id', serviceSlug)
    .maybeSingle()

  if (!service) notFound()

  // Fetch branding
  const { data: branding } = await supabase
    .from('company_branding')
    .select('logo_url, logo_light_url')
    .eq('company_id', company.id)
    .maybeSingle()

  // Fetch phase name
  const { data: phase } = await supabase
    .from('phases')
    .select('id, name')
    .eq('id', service.phase_id)
    .maybeSingle()

  const phaseName = phase?.name ?? 'Unknown'
  const phaseBadgeClass = phaseColorByName[phaseName] ?? 'bg-gray-100 text-gray-700'
  const logoUrl = branding?.logo_url ?? branding?.logo_light_url

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <section className="bg-gray-950 text-white py-20 px-6 md:px-12 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-2 text-sm text-white/50 mb-6">
            <Link href="/marketplace/providers" className="hover:text-white transition-colors">Providers</Link>
            <span>/</span>
            <Link href={`/marketplace/providers/${slug}`} className="hover:text-white transition-colors">{company.name}</Link>
            <span>/</span>
            <span className="text-white/80">{service.name}</span>
          </div>

          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mb-4 ${phaseBadgeClass}`}>
            {phaseName}
          </span>

          <h1 className="text-3xl md:text-5xl font-light mb-4">{service.name}</h1>
          {service.description && (
            <p className="text-white/70 text-lg max-w-2xl">{service.description}</p>
          )}
        </div>
      </section>

      {/* Hero image */}
      {service.hero_image_url && (
        <div className="relative h-64 md:h-96 w-full overflow-hidden">
          <Image
            src={service.hero_image_url}
            alt={service.name}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Content */}
      <section className="py-16 px-6 md:px-12 lg:px-16">
        <div className="mx-auto max-w-4xl">
          {service.long_description && (
            <div className="prose prose-gray max-w-none mb-12">
              <p className="text-gray-700 text-lg leading-relaxed">{service.long_description}</p>
            </div>
          )}

          {/* Provider attribution */}
          <div className="rounded-xl border border-gray-200 p-6 flex items-center gap-4 bg-gray-50">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white border border-gray-100">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={`${company.name} logo`}
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain"
                />
              ) : (
                <Building size={20} className="text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-0.5">Provided by</p>
              <p className="font-semibold text-gray-900">{company.name}</p>
              {company.tagline && (
                <p className="text-sm text-gray-500">{company.tagline}</p>
              )}
            </div>
            <Link
              href={`/marketplace/providers/${slug}`}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
            >
              View Profile →
            </Link>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      {company.contact_email && (
        <section className="bg-gray-950 text-white py-16 px-6 md:px-12 lg:px-16">
          <div className="mx-auto max-w-7xl text-center">
            <h2 className="text-2xl font-light mb-4">Interested in this service?</h2>
            <a
              href={`mailto:${company.contact_email}?subject=Enquiry: ${service.name}`}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors"
            >
              Contact {company.name}
            </a>
          </div>
        </section>
      )}
    </div>
  )
}
