import { createClient } from '@supabase/supabase-js'

export async function resolveCompanyId(searchParams?: { company?: string }): Promise<string> {
  if (searchParams?.company) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', searchParams.company)
      .single()
    if (data) return data.id
  }
  return process.env.DEFAULT_COMPANY_ID ?? '00000000-0000-0000-0000-000000000001'
}
