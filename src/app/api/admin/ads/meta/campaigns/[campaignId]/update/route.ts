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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { campaignId } = await params
  const body = await request.json()
  const { name, objective, daily_budget, lifetime_budget, bid_strategy, start_time, stop_time, special_ad_categories } = body

  // Look up the meta_campaign_id from the local UUID
  const { data: existingCampaign } = await supabaseAdmin
    .from('meta_campaigns')
    .select('meta_campaign_id, integration_id')
    .eq('id', campaignId)
    .single()

  if (!existingCampaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('access_token_encrypted, ad_account_id')
    .eq('id', existingCampaign.integration_id)
    .single()

  if (!integration?.access_token_encrypted) {
    return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
  }

  const accessToken = decrypt(integration.access_token_encrypted)

  const metaBody: Record<string, unknown> = {}
  if (name) metaBody.name = name
  if (objective) metaBody.objective = objective
  if (daily_budget !== undefined) metaBody.daily_budget = daily_budget
  if (lifetime_budget !== undefined) metaBody.lifetime_budget = lifetime_budget
  if (bid_strategy) metaBody.bid_strategy = bid_strategy
  if (start_time !== undefined) metaBody.start_time = start_time
  if (stop_time !== undefined) metaBody.stop_time = stop_time
  if (special_ad_categories) metaBody.special_ad_categories = special_ad_categories

  try {
    await metaApiPost(
      `/${existingCampaign.meta_campaign_id}`,
      metaBody,
      { accessToken }
    )

    const updateData: Record<string, unknown> = { synced_at: new Date().toISOString() }
    if (name) updateData.name = name
    if (objective) updateData.objective = objective
    if (daily_budget !== undefined) updateData.daily_budget = daily_budget ? daily_budget / 100 : null
    if (lifetime_budget !== undefined) updateData.lifetime_budget = lifetime_budget ? lifetime_budget / 100 : null
    if (start_time !== undefined) updateData.start_time = start_time
    if (stop_time !== undefined) updateData.stop_time = stop_time

    const { data: campaign, error: dbError } = await supabaseAdmin
      .from('meta_campaigns')
      .update(updateData)
      .eq('id', campaignId)
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ campaign })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
