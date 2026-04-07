import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { encrypt } from '@/lib/encryption'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const error = request.nextUrl.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations/meta?error=oauth_denied`
    )
  }

  const appId = process.env.META_APP_ID!
  const appSecret = process.env.META_APP_SECRET!
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/ads/auth/meta/callback`

  // Exchange code for short-lived token
  const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
  tokenUrl.searchParams.set('client_id', appId)
  tokenUrl.searchParams.set('client_secret', appSecret)
  tokenUrl.searchParams.set('redirect_uri', redirectUri)
  tokenUrl.searchParams.set('code', code)

  const tokenRes = await fetch(tokenUrl.toString())
  if (!tokenRes.ok) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations/meta?error=token_exchange_failed`
    )
  }

  const { access_token: shortLivedToken } = await tokenRes.json()

  // Exchange for long-lived token (60-day expiry)
  const longLivedUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
  longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
  longLivedUrl.searchParams.set('client_id', appId)
  longLivedUrl.searchParams.set('client_secret', appSecret)
  longLivedUrl.searchParams.set('fb_exchange_token', shortLivedToken)

  const longLivedRes = await fetch(longLivedUrl.toString())
  if (!longLivedRes.ok) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations/meta?error=long_lived_token_failed`
    )
  }

  const { access_token: longLivedToken } = await longLivedRes.json()

  const encryptedToken = encrypt(longLivedToken)
  const encryptedSecret = encrypt(appSecret)

  // For MVP: look up the first admin company. In production, the OAuth state
  // parameter would carry the company_id.
  const { data: companies } = await supabaseAdmin
    .from('companies')
    .select('id')
    .eq('type', 'admin')
    .limit(1)
    .single()

  if (!companies) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations/meta?error=no_company`
    )
  }

  await supabaseAdmin
    .from('meta_integrations')
    .upsert({
      company_id: companies.id,
      meta_app_id: appId,
      meta_app_secret_encrypted: encryptedSecret,
      access_token_encrypted: encryptedToken,
      sync_status: 'idle',
    }, { onConflict: 'company_id' })

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations/meta?success=connected`
  )
}
