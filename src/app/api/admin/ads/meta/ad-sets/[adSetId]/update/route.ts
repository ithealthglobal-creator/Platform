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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ adSetId: string }> }) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { adSetId } = await params
  const body = await request.json()
  const { name, daily_budget, lifetime_budget, targeting, optimization_goal, bid_amount, start_time, end_time } = body

  const { data: existingAdSet } = await supabaseAdmin
    .from('meta_ad_sets')
    .select('meta_ad_set_id, campaign_id')
    .eq('id', adSetId)
    .single()

  if (!existingAdSet) {
    return NextResponse.json({ error: 'Ad set not found' }, { status: 404 })
  }

  const { data: campaign } = await supabaseAdmin
    .from('meta_campaigns')
    .select('integration_id')
    .eq('id', existingAdSet.campaign_id)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Parent campaign not found' }, { status: 404 })
  }

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('access_token_encrypted')
    .eq('id', campaign.integration_id)
    .single()

  if (!integration?.access_token_encrypted) {
    return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
  }

  const accessToken = decrypt(integration.access_token_encrypted)

  const metaBody: Record<string, unknown> = {}
  if (name) metaBody.name = name
  if (daily_budget !== undefined) metaBody.daily_budget = daily_budget
  if (lifetime_budget !== undefined) metaBody.lifetime_budget = lifetime_budget
  if (optimization_goal) metaBody.optimization_goal = optimization_goal
  if (bid_amount !== undefined) metaBody.bid_amount = bid_amount
  if (start_time !== undefined) metaBody.start_time = start_time
  if (end_time !== undefined) metaBody.end_time = end_time

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
    await metaApiPost(
      `/${existingAdSet.meta_ad_set_id}`,
      metaBody,
      { accessToken }
    )

    const updateData: Record<string, unknown> = { synced_at: new Date().toISOString() }
    if (name) updateData.name = name
    if (daily_budget !== undefined) updateData.daily_budget = daily_budget ? daily_budget / 100 : null
    if (lifetime_budget !== undefined) updateData.lifetime_budget = lifetime_budget ? lifetime_budget / 100 : null
    if (targeting) updateData.targeting = targeting

    const { data: adSet, error: dbError } = await supabaseAdmin
      .from('meta_ad_sets')
      .update(updateData)
      .eq('id', adSetId)
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
