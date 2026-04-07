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
  const { status } = body

  if (!['ACTIVE', 'PAUSED', 'ARCHIVED'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

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
    await metaApiPost(
      `/${existingAdSet.meta_ad_set_id}`,
      { status },
      { accessToken }
    )

    const { data: adSet, error: dbError } = await supabaseAdmin
      .from('meta_ad_sets')
      .update({ status, synced_at: new Date().toISOString() })
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
