import { isAdminOrAbove } from '@/lib/auth-utils'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decrypt } from '@/lib/encryption'
import { metaApiGet } from '@/lib/meta-api'

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

  const ids = request.nextUrl.searchParams.get('ids')?.split(',') || []
  if (ids.length < 2 || ids.length > 4) {
    return NextResponse.json({ error: 'Provide 2-4 ad IDs' }, { status: 400 })
  }

  const { data: ads } = await supabaseAdmin
    .from('meta_ads')
    .select('id, meta_ad_id')
    .in('id', ids)

  if (!ads || ads.length !== ids.length) {
    return NextResponse.json({ error: 'One or more ads not found' }, { status: 404 })
  }

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('access_token_encrypted')
    .eq('company_id', admin.company_id)
    .single()

  if (!integration?.access_token_encrypted) {
    return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
  }

  const accessToken = decrypt(integration.access_token_encrypted)

  try {
    const results = await Promise.all(
      ads.map(async (ad) => {
        const data = await metaApiGet(`/${ad.meta_ad_id}`, {
          fields: 'id,name,status,creative{thumbnail_url,body,title,link_url},insights{impressions,clicks,spend,ctr,cpm,actions,cost_per_action_type,video_p25_watched_actions,quality_ranking,engagement_rate_ranking,conversion_rate_ranking}',
        }, { accessToken })
        return { internalId: ad.id, ...(data as Record<string, unknown>) }
      })
    )
    return NextResponse.json({ ads: results })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
