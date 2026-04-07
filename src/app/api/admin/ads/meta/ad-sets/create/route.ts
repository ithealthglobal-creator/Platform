import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decrypt } from '@/lib/encryption'
import { metaApiPost } from '@/lib/meta-api'

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

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    campaign_id, name, daily_budget, lifetime_budget,
    targeting, optimization_goal, bid_amount,
    start_time, end_time, status
  } = body

  if (!campaign_id || !name) {
    return NextResponse.json({ error: 'campaign_id and name are required' }, { status: 400 })
  }
  if (!daily_budget && !lifetime_budget) {
    return NextResponse.json({ error: 'Either daily_budget or lifetime_budget is required' }, { status: 400 })
  }

  // Look up meta_campaign_id from internal UUID
  const { data: campaign } = await supabaseAdmin
    .from('meta_campaigns')
    .select('meta_campaign_id, integration_id')
    .eq('id', campaign_id)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('id, access_token_encrypted, ad_account_id')
    .eq('id', campaign.integration_id)
    .single()

  if (!integration?.access_token_encrypted || !integration.ad_account_id) {
    return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
  }

  const accessToken = decrypt(integration.access_token_encrypted)

  const metaBody: Record<string, unknown> = {
    campaign_id: campaign.meta_campaign_id,
    name,
    status: status || 'PAUSED',
    billing_event: 'IMPRESSIONS',
  }

  if (daily_budget) metaBody.daily_budget = daily_budget
  if (lifetime_budget) metaBody.lifetime_budget = lifetime_budget
  if (optimization_goal) metaBody.optimization_goal = optimization_goal
  if (bid_amount) metaBody.bid_amount = bid_amount
  if (start_time) metaBody.start_time = start_time
  if (end_time) metaBody.end_time = end_time

  // Build targeting object
  if (targeting) {
    const metaTargeting: Record<string, unknown> = {}
    if (targeting.geo_locations) metaTargeting.geo_locations = targeting.geo_locations
    if (targeting.age_min) metaTargeting.age_min = targeting.age_min
    if (targeting.age_max) metaTargeting.age_max = targeting.age_max
    if (targeting.genders) metaTargeting.genders = targeting.genders
    if (targeting.flexible_spec) metaTargeting.flexible_spec = targeting.flexible_spec
    if (targeting.publisher_platforms) metaTargeting.publisher_platforms = targeting.publisher_platforms
    if (targeting.facebook_positions) metaTargeting.facebook_positions = targeting.facebook_positions
    metaBody.targeting = JSON.stringify(metaTargeting)
  }

  try {
    const metaResult = await metaApiPost<{ id: string }>(
      `/${integration.ad_account_id}/adsets`,
      metaBody,
      { accessToken }
    )

    const { data: adSet, error: dbError } = await supabaseAdmin
      .from('meta_ad_sets')
      .upsert({
        campaign_id,
        meta_ad_set_id: metaResult.id,
        name,
        status: status || 'PAUSED',
        targeting: targeting || null,
        daily_budget: daily_budget ? daily_budget / 100 : null,
        lifetime_budget: lifetime_budget ? lifetime_budget / 100 : null,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        synced_at: new Date().toISOString(),
      }, { onConflict: 'meta_ad_set_id' })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ adSet })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
