import { createClient } from '@supabase/supabase-js'
import type { WebsiteSection, CompanyBranding } from '@/lib/types'

export async function getPageContent(
  companyId: string,
  page: string
): Promise<Record<string, WebsiteSection>> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data } = await supabase
    .from('website_content')
    .select('*')
    .eq('company_id', companyId)
    .eq('page', page)
    .eq('is_active', true)
    .order('sort_order')

  return (data ?? []).reduce((acc, row) => {
    acc[row.section] = row
    return acc
  }, {} as Record<string, WebsiteSection>)
}

export async function getCompanyBranding(
  companyId: string
): Promise<CompanyBranding | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data } = await supabase
    .from('company_branding')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle()

  return data
}
