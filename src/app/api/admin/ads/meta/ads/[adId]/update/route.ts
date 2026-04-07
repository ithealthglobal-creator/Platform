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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ adId: string }> }) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { adId } = await params
  const body = await request.json()
  const { name, primary_text, headline, link_url, call_to_action, image_hash, image_url, description, display_link, url_tags } = body

  const { data: existingAd } = await supabaseAdmin
    .from('meta_ads')
    .select('meta_ad_id, ad_set_id, creative_id')
    .eq('id', adId)
    .single()

  if (!existingAd) {
    return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
  }

  const { data: adSet } = await supabaseAdmin
    .from('meta_ad_sets')
    .select('campaign_id')
    .eq('id', existingAd.ad_set_id)
    .single()

  const { data: campaign } = await supabaseAdmin
    .from('meta_campaigns')
    .select('integration_id')
    .eq('id', adSet!.campaign_id)
    .single()

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('access_token_encrypted, ad_account_id')
    .eq('id', campaign!.integration_id)
    .single()

  if (!integration?.access_token_encrypted) {
    return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
  }

  const accessToken = decrypt(integration.access_token_encrypted)

  try {
    // If creative fields changed, create a new creative and update the ad
    const needsNewCreative = image_hash || primary_text || headline || link_url || call_to_action || description || display_link

    let newCreativeId = existingAd.creative_id

    if (needsNewCreative) {
      // Merge incoming fields with existing ad data so Meta gets a complete creative
      const creativeBody: Record<string, unknown> = {
        name: `${name || existingAd.name} Creative`,
        object_story_spec: JSON.stringify({
          page_id: process.env.META_PAGE_ID,
          link_data: {
            image_hash: image_hash || existingAd.creative_id || undefined,
            link: link_url || existingAd.creative_link_url || undefined,
            message: primary_text || existingAd.creative_body || undefined,
            name: headline || existingAd.creative_title || undefined,
            call_to_action: { type: call_to_action || 'LEARN_MORE' },
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
      newCreativeId = creativeResult.id
    }

    const metaBody: Record<string, unknown> = {}
    if (name) metaBody.name = name
    if (newCreativeId !== existingAd.creative_id) {
      metaBody.creative = JSON.stringify({ creative_id: newCreativeId })
    }

    if (Object.keys(metaBody).length > 0) {
      await metaApiPost(`/${existingAd.meta_ad_id}`, metaBody, { accessToken })
    }

    const updateData: Record<string, unknown> = { synced_at: new Date().toISOString() }
    if (name) updateData.name = name
    if (newCreativeId) updateData.creative_id = newCreativeId
    if (primary_text) updateData.creative_body = primary_text
    if (headline) updateData.creative_title = headline
    if (link_url) updateData.creative_link_url = link_url
    if (image_url) updateData.creative_thumbnail_url = image_url

    const { data: ad, error: dbError } = await supabaseAdmin
      .from('meta_ads')
      .update(updateData)
      .eq('id', adId)
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
