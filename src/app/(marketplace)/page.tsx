import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { ProviderCard } from '@/components/marketplace/provider-card'
import { ScrollReveal } from '@/components/scroll-reveal'
const SERVOLU_ID = '00000000-0000-0000-0000-000000000000'

const phaseColors: Record<string, string> = {
  Operate: 'bg-blue-600',
  Secure: 'bg-pink-600',
  Streamline: 'bg-slate-700',
  Accelerate: 'bg-amber-500',
}

const phaseTextColors: Record<string, string> = {
  Operate: 'text-blue-600',
  Secure: 'text-pink-600',
  Streamline: 'text-slate-700',
  Accelerate: 'text-amber-600',
}

interface ListingRow {
  id: string
  company_id: string
  is_featured: boolean
  is_active: boolean
  sort_order: number
  company: {
    id: string
    name: string
    slug: string | null
    tagline: string | null
    domain: string | null
  } | null
  branding: {
    logo_url: string | null
    logo_light_url: string | null
  } | null
}

export default async function MarketplaceHomePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch featured listings
  const { data: listingsRaw } = await supabase
    .from('marketplace_listings')
    .select('id, company_id, is_featured, is_active, sort_order')
    .eq('is_featured', true)
    .eq('is_active', true)
    .order('sort_order')

  // Fetch company data and branding for each listing
  const listings: ListingRow[] = []
  if (listingsRaw) {
    for (const listing of listingsRaw) {
      const { data: company } = await supabase
        .from('companies')
        .select('id, name, slug, tagline, domain')
        .eq('id', listing.company_id)
        .maybeSingle()

      const { data: branding } = await supabase
        .from('company_branding')
        .select('logo_url, logo_light_url')
        .eq('company_id', listing.company_id)
        .maybeSingle()

      listings.push({ ...listing, company, branding })
    }
  }

  // Fetch phases
  const { data: phases } = await supabase
    .from('phases')
    .select('id, name, sort_order')
    .eq('is_active', true)
    .order('sort_order')

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gray-950 text-white py-32 px-6 md:px-12 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <p className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-4">
              Servolu Marketplace
            </p>
            <h1 className="text-4xl md:text-6xl font-light leading-tight mb-6">
              Find Your IT Modernisation Partner
            </h1>
            <p className="text-lg text-white/60 max-w-2xl mb-12">
              Discover certified providers and services to accelerate your IT modernisation journey. From foundations to advanced automation.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/marketplace/providers"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors"
              >
                Browse Providers
              </Link>
              <Link
                href="/marketplace/services"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors"
              >
                Explore Services
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Featured Providers */}
      {listings.length > 0 && (
        <section className="py-24 px-6 md:px-12 lg:px-16">
          <div className="mx-auto max-w-7xl">
            <ScrollReveal>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">Featured Providers</h2>
              <p className="text-gray-500 mb-12">Trusted partners delivering IT modernisation services</p>
            </ScrollReveal>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing, i) => {
                if (!listing.company?.slug) return null
                return (
                  <ScrollReveal key={listing.id} delay={i * 0.1}>
                    <ProviderCard
                      name={listing.company.name}
                      slug={listing.company.slug}
                      logoUrl={listing.branding?.logo_url ?? listing.branding?.logo_light_url}
                      tagline={listing.company.tagline}
                      domain={listing.company.domain}
                    />
                  </ScrollReveal>
                )
              })}
            </div>
            <div className="mt-10 text-center">
              <Link
                href="/marketplace/providers"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View all providers →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Phase Categories */}
      {phases && phases.length > 0 && (
        <section className="py-24 px-6 md:px-12 lg:px-16 bg-gray-50">
          <div className="mx-auto max-w-7xl">
            <ScrollReveal>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">Browse by Phase</h2>
              <p className="text-gray-500 mb-12">Find services tailored to each stage of your IT modernisation</p>
            </ScrollReveal>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {phases.map((phase: { id: string; name: string; sort_order: number }, i) => (
                <ScrollReveal key={phase.id} delay={i * 0.1}>
                  <Link
                    href={`/marketplace/services?phase=${phase.name.toLowerCase()}`}
                    className="group flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-8 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                  >
                    <div className={`h-2 w-8 rounded-full ${phaseColors[phase.name] ?? 'bg-gray-400'}`} />
                    <h3 className={`font-semibold text-lg group-hover:${phaseTextColors[phase.name] ?? 'text-gray-700'} transition-colors`}>
                      {phase.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Explore {phase.name.toLowerCase()} services →
                    </p>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-gray-950 text-white py-24 px-6 md:px-12 lg:px-16">
        <div className="mx-auto max-w-7xl text-center">
          <ScrollReveal>
            <h2 className="text-3xl font-light text-white mb-4">
              Ready to Modernise Your IT?
            </h2>
            <p className="text-white/60 mb-8 max-w-xl mx-auto">
              Connect with a certified provider and start your transformation journey today.
            </p>
            <Link
              href="/marketplace/providers"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-sm font-medium transition-colors"
            >
              Find a Provider
            </Link>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}
