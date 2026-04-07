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
  const { name, objective, daily_budget, status, lifetime_budget, bid_strategy, start_time, stop_time, special_ad_categories } = body

  if (!name || !objective) {
    return NextResponse.json({ error: 'Name and objective are required' }, { status: 400 })
  }
  if (!daily_budget && !lifetime_budget) {
    return NextResponse.json({ error: 'Either daily_budget or lifetime_budget is required' }, { status: 400 })
  }

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('id, access_token_encrypted, ad_account_id')
    .eq('company_id', admin.company_id)
    .single()

  if (!integration?.access_token_encrypted || !integration.ad_account_id) {
    return NextResponse.json({ error: 'Meta not connected or no ad account selected' }, { status: 400 })
  }

  const accessToken = decrypt(integration.access_token_encrypted)

  const metaBody: Record<string, unknown> = {
    name,
    objective,
    status: status || 'PAUSED',
    special_ad_categories: special_ad_categories || [],
  }

  if (daily_budget) metaBody.daily_budget = daily_budget
  if (lifetime_budget) metaBody.lifetime_budget = lifetime_budget
  if (bid_strategy) metaBody.bid_strategy = bid_strategy
  if (start_time) metaBody.start_time = start_time
  if (stop_time) metaBody.stop_time = stop_time

  try {
    const metaResult = await metaApiPost<{ id: string }>(
      `/${integration.ad_account_id}/campaigns`,
      metaBody,
      { accessToken }
    )

    const { data: campaign, error: dbError } = await supabaseAdmin
      .from('meta_campaigns')
      .upsert({
        integration_id: integration.id,
        meta_campaign_id: metaResult.id,
        name,
        status: status || 'PAUSED',
        objective,
        daily_budget: daily_budget ? daily_budget / 100 : null,
        lifetime_budget: lifetime_budget ? lifetime_budget / 100 : null,
        start_time: start_time || null,
        stop_time: stop_time || null,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        synced_at: new Date().toISOString(),
      }, { onConflict: 'meta_campaign_id' })
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
