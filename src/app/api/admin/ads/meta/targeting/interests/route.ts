import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decrypt } from '@/lib/encryption'
import { metaApiGet } from '@/lib/meta-api'

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'admin') return null
  return { ...user, company_id: profile.company_id }
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q')
  if (!q || q.length < 2) {
    return NextResponse.json({ data: [] })
  }

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('access_token_encrypted')
    .eq('company_id', admin.company_id)
    .single()

  if (!integration?.access_token_encrypted) {
    return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
  }

  const accessToken = decrypt(integration.access_token_encrypted)

  try {
    const result = await metaApiGet<{ data: Array<{ id: string; name: string; audience_size_lower_bound: number; audience_size_upper_bound: number; path: string[] }> }>(
      '/search',
      { type: 'adinterest', q },
      { accessToken }
    )

    return NextResponse.json({ data: result.data || [] })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
