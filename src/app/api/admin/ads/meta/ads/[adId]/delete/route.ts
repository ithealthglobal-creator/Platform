import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decrypt } from '@/lib/encryption'
import { metaApiDelete } from '@/lib/meta-api'

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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ adId: string }> }) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { adId } = await params

  const { data: existingAd } = await supabaseAdmin
    .from('meta_ads')
    .select('meta_ad_id, ad_set_id')
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
    .select('access_token_encrypted')
    .eq('id', campaign!.integration_id)
    .single()

  if (!integration?.access_token_encrypted) {
    return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
  }

  const accessToken = decrypt(integration.access_token_encrypted)

  try {
    await metaApiDelete(`/${existingAd.meta_ad_id}`, { accessToken })

    const { error: dbError } = await supabaseAdmin
      .from('meta_ads')
      .delete()
      .eq('id', adId)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
