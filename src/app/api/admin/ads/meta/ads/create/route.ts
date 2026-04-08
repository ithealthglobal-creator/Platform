import { isAdminOrAbove } from '@/lib/auth-utils'
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
  if (!profile || !isAdminOrAbove(profile.role)) return null
  return { ...user, company_id: profile.company_id }
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    ad_set_id, name, image_hash, image_url,
    primary_text, headline, link_url,
    call_to_action, status,
    description, display_link, url_tags
  } = body

  if (!ad_set_id || !name || !image_hash || !primary_text || !headline || !link_url) {
    return NextResponse.json({ error: 'ad_set_id, name, image_hash, primary_text, headline, and link_url are required' }, { status: 400 })
  }

  // Look up meta_ad_set_id from internal UUID
  const { data: adSet } = await supabaseAdmin
    .from('meta_ad_sets')
    .select('meta_ad_set_id, campaign_id')
    .eq('id', ad_set_id)
    .single()

  if (!adSet) {
    return NextResponse.json({ error: 'Ad set not found' }, { status: 404 })
  }

  const { data: campaign } = await supabaseAdmin
    .from('meta_campaigns')
    .select('integration_id')
    .eq('id', adSet.campaign_id)
    .single()

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('id, access_token_encrypted, ad_account_id')
    .eq('id', campaign!.integration_id)
    .single()

  if (!integration?.access_token_encrypted || !integration.ad_account_id) {
    return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
  }

  const accessToken = decrypt(integration.access_token_encrypted)
  const cta = call_to_action || 'LEARN_MORE'

  try {
    // Step 1: Create ad creative on Meta
    const creativeBody: Record<string, unknown> = {
      name: `${name} Creative`,
      object_story_spec: JSON.stringify({
        page_id: process.env.META_PAGE_ID,
        link_data: {
          image_hash: image_hash,
          link: link_url,
          message: primary_text,
          name: headline,
          call_to_action: { type: cta },
          ...(description ? { description } : {}),
          ...(display_link ? { caption: display_link } : {}),
        },
      }),
    }
    if (url_tags) creativeBody.url_tags = url_tags

    const creativeResult = await metaApiPost<{ id: string }>(
      `/${integration.ad_account_id}/adcreatives`,
      creativeBody,
      { accessToken }
    )

    // Step 2: Create the ad on Meta linking to the creative and ad set
    const adBody: Record<string, unknown> = {
      name,
      adset_id: adSet.meta_ad_set_id,
      creative: JSON.stringify({ creative_id: creativeResult.id }),
      status: status || 'PAUSED',
    }

    const adResult = await metaApiPost<{ id: string }>(
      `/${integration.ad_account_id}/ads`,
      adBody,
      { accessToken }
    )

    // Upsert locally
    const { data: ad, error: dbError } = await supabaseAdmin
      .from('meta_ads')
      .upsert({
        ad_set_id,
        meta_ad_id: adResult.id,
        name,
        status: status || 'PAUSED',
        creative_id: creativeResult.id,
        creative_thumbnail_url: image_url || null,
        creative_body: primary_text,
        creative_title: headline,
        creative_link_url: link_url,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        synced_at: new Date().toISOString(),
      }, { onConflict: 'meta_ad_id' })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ ad })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
