import { createClient } from '@supabase/supabase-js'
import { ServiceCard } from '@/components/marketplace/service-card'
import { ScrollReveal } from '@/components/scroll-reveal'

const phaseColorByName: Record<string, string> = {
  Operate: 'blue',
  Secure: 'pink',
  Streamline: 'navy',
  Accelerate: 'gold',
}

interface PageProps {
  searchParams: Promise<{ phase?: string }>
}

interface ServiceRow {
  id: string
  name: string
  description: string | null
  phase_id: string
  company_id: string
  is_active: boolean
}

interface CompanyRow {
  id: string
  name: string
  slug: string | null
}

interface BrandingRow {
  company_id: string
  logo_url: string | null
}

export default async function ServicesPage({ searchParams }: PageProps) {
  const { phase: phaseFilter } = await searchParams

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get all active marketplace listings
  const { data: listings } = await supabase
    .from('marketplace_listings')
    .select('company_id')
    .eq('is_active', true)

  const activeCompanyIds = listings?.map(l => l.company_id) ?? []

  // Fetch phases
  const { data: phases } = await supabase
    .from('phases')
    .select('id, name, sort_order')
    .eq('is_active', true)
    .order('sort_order')

  const phaseMap: Record<string, string> = {}
  if (phases) {
    for (const p of phases) {
      phaseMap[p.id] = p.name
    }
  }

  // Find phase id from filter
  let filteredPhaseId: string | undefined
  if (phaseFilter && phases) {
    const match = phases.find(p => p.name.toLowerCase() === phaseFilter.toLowerCase())
    filteredPhaseId = match?.id
  }

  // Fetch services from marketplace providers
  let servicesQuery = supabase
    .from('services')
    .select('id, name, description, phase_id, company_id, is_active')
    .eq('is_active', true)
    .in('company_id', activeCompanyIds.length > 0 ? activeCompanyIds : ['__none__'])
    .order('name')

  if (filteredPhaseId) {
    servicesQuery = servicesQuery.eq('phase_id', filteredPhaseId)
  }

  const { data: services } = await servicesQuery

  // Fetch companies + branding for provider info
  const companyIds = [...new Set((services ?? []).map(s => s.company_id))]

  const companyMap: Record<string, CompanyRow> = {}
  const brandingMap: Record<string, string | null> = {}

  if (companyIds.length > 0) {
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name, slug')
      .in('id', companyIds)

    if (companies) {
      for (const c of companies) {
        companyMap[c.id] = c
      }
    }

    const { data: brandings } = await supabase
      .from('company_branding')
      .select('company_id, logo_url')
      .in('company_id', companyIds)

    if (brandings) {
      for (const b of brandings) {
        brandingMap[b.company_id] = b.logo_url
      }
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
          <h1 className="text-4xl md:text-5xl font-light mb-4">Browse Services</h1>
          <p className="text-white/60 max-w-xl">
            Discover IT modernisation services from certified providers across all phases of your journey.
          </p>
        </div>
      </section>

      {/* Phase filter */}
      {phases && phases.length > 0 && (
        <section className="border-b border-gray-100 px-6 md:px-12 lg:px-16 py-4">
          <div className="mx-auto max-w-7xl flex flex-wrap items-center gap-3">
            <a
              href="/marketplace/services"
              className={`text-sm px-4 py-1.5 rounded-full border transition-colors ${!phaseFilter ? 'bg-gray-900 text-white border-gray-900' : 'text-gray-600 border-gray-200 hover:border-gray-400'}`}
            >
              All
            </a>
            {phases.map(p => (
              <a
                key={p.id}
                href={`/marketplace/services?phase=${p.name.toLowerCase()}`}
                className={`text-sm px-4 py-1.5 rounded-full border transition-colors ${phaseFilter?.toLowerCase() === p.name.toLowerCase() ? 'bg-gray-900 text-white border-gray-900' : 'text-gray-600 border-gray-200 hover:border-gray-400'}`}
              >
                {p.name}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Services grid */}
      <section className="py-16 px-6 md:px-12 lg:px-16">
        <div className="mx-auto max-w-7xl">
          {!services || services.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-gray-500">No services found{phaseFilter ? ` for phase "${phaseFilter}"` : ''}.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-8">
                {services.length} {services.length === 1 ? 'service' : 'services'} found
              </p>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((service, i) => {
                  const phaseName = phaseMap[service.phase_id] ?? 'Unknown'
                  const phaseColor = phaseColorByName[phaseName] ?? 'blue'
                  const company = companyMap[service.company_id]
                  if (!company?.slug) return null
                  return (
                    <ScrollReveal key={service.id} delay={i * 0.04}>
                      <ServiceCard
                        name={service.name}
                        description={service.description}
                        phaseName={phaseName}
                        phaseColor={phaseColor}
                        providerName={company.name}
                        providerSlug={company.slug}
                        providerLogoUrl={brandingMap[service.company_id]}
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
