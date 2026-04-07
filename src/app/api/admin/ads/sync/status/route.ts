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
  if (!profile || profile.role !== 'admin') return null
  return { ...user, company_id: profile.company_id }
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('sync_status, sync_error, last_synced_at')
    .eq('company_id', admin.company_id)
    .single()

  if (!integration) {
    return NextResponse.json({ sync_status: null, message: 'No integration found' })
  }

  // Get counts
  const { count: campaignCount } = await supabaseAdmin
    .from('meta_campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('integration_id', (await supabaseAdmin
      .from('meta_integrations')
      .select('id')
      .eq('company_id', admin.company_id)
      .single()).data?.id || '')

  return NextResponse.json({
    ...integration,
    campaign_count: campaignCount || 0,
  })
}
