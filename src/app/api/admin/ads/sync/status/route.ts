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

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('id, sync_status, sync_error, last_synced_at')
    .eq('company_id', admin.company_id)
    .single()

  if (!integration) {
    return NextResponse.json({ sync_status: null, message: 'No integration found' })
  }

  const { count: campaignCount } = await supabaseAdmin
    .from('meta_campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('integration_id', integration.id)

  return NextResponse.json({
    sync_status: integration.sync_status,
    sync_error: integration.sync_error,
    last_synced_at: integration.last_synced_at,
    campaign_count: campaignCount || 0,
  })
}
