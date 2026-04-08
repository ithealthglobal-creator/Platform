import { createClient } from '@supabase/supabase-js'
import { ProviderCard } from '@/components/marketplace/provider-card'
import { ScrollReveal } from '@/components/scroll-reveal'

interface ListingWithCompany {
  id: string
  company_id: string
  sort_order: number
  company: {
    id: string
    name: string
    slug: string | null
    tagline: string | null
    domain: string | null
    services_count?: number
  } | null
  branding: {
    logo_url: string | null
  } | null
}

export default async function ProvidersPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: listingsRaw } = await supabase
    .from('marketplace_listings')
    .select('id, company_id, sort_order')
    .eq('is_active', true)
    .order('sort_order')

  const listings: ListingWithCompany[] = []
  if (listingsRaw) {
    for (const listing of listingsRaw) {
      const { data: company } = await supabase
        .from('companies')
        .select('id, name, slug, tagline, domain')
        .eq('id', listing.company_id)
        .maybeSingle()

      const { data: branding } = await supabase
        .from('company_branding')
        .select('logo_url')
        .eq('company_id', listing.company_id)
        .maybeSingle()

      const { count } = await supabase
        .from('services')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', listing.company_id)
        .eq('is_active', true)

      listings.push({
        ...listing,
        company: company ? { ...company, services_count: count ?? 0 } : null,
        branding,
      })
    }
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Hero */}
      <section className="bg-gray-950 text-white py-20 px-6 md:px-12 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-3">
            Marketplace
          </p>
          <h1 className="text-4xl md:text-5xl font-light mb-4">Browse Providers</h1>
          <p className="text-white/60 max-w-xl">
            Certified IT modernisation partners ready to guide your transformation journey.
          </p>
        </div>
      </section>

      {/* Providers grid */}
      <section className="py-16 px-6 md:px-12 lg:px-16">
        <div className="mx-auto max-w-7xl">
          {listings.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-gray-500">No providers listed yet.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-8">
                {listings.length} {listings.length === 1 ? 'provider' : 'providers'} found
              </p>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {listings.map((listing, i) => {
                  if (!listing.company?.slug) return null
                  return (
                    <ScrollReveal key={listing.id} delay={i * 0.05}>
                      <ProviderCard
                        name={listing.company.name}
                        slug={listing.company.slug}
                        logoUrl={listing.branding?.logo_url}
                        tagline={listing.company.tagline}
                        domain={listing.company.domain}
                        serviceCount={listing.company.services_count}
                      />
                    </ScrollReveal>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
