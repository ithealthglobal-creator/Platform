import { notFound, redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

interface PageProps {
  params: Promise<{ slug: string }>
}

// Services don't have a slug column — this route resolves a service by id
// and redirects to /marketplace/providers/[providerSlug]/services/[serviceId]
export default async function ServiceSlugRedirect({ params }: PageProps) {
  const { slug } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get active marketplace company IDs
  const { data: listings } = await supabase
    .from('marketplace_listings')
    .select('company_id')
    .eq('is_active', true)

  const activeCompanyIds = listings?.map(l => l.company_id) ?? []

  // Find service by id within marketplace providers
  const { data: service } = await supabase
    .from('services')
    .select('id, company_id')
    .eq('id', slug)
    .in('company_id', activeCompanyIds.length > 0 ? activeCompanyIds : ['__none__'])
    .maybeSingle()

  if (!service) notFound()

  // Get provider slug
  const { data: company } = await supabase
    .from('companies')
    .select('slug')
    .eq('id', service.company_id)
    .maybeSingle()

  if (!company?.slug) notFound()

  redirect(`/marketplace/providers/${company.slug}/services/${service.id}`)
}
