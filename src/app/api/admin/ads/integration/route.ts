import { isAdminOrAbove } from '@/lib/auth-utils'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

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
  if (!profile || !isAdminOrAbove(profile.role)) return null
  return { ...user, company_id: profile.company_id }
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('meta_integrations')
    .select('id, company_id, meta_app_id, ad_account_id, ad_account_name, sync_frequency, campaign_filter, last_synced_at, sync_status, sync_error, is_active')
    .eq('company_id', admin.company_id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ integration: data })
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { ad_account_id, ad_account_name, sync_frequency, campaign_filter } = body

  const { data, error } = await supabaseAdmin
    .from('meta_integrations')
    .upsert({
      company_id: admin.company_id,
      ad_account_id,
      ad_account_name,
      sync_frequency,
      campaign_filter,
    }, { onConflict: 'company_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ integration: data })
}

export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabaseAdmin
    .from('meta_integrations')
    .delete()
    .eq('company_id', admin.company_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
