import { isAdminOrAbove } from '@/lib/auth-utils'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decrypt } from '@/lib/encryption'
import { metaApiGet } from '@/lib/meta-api'

async function getIntegrationToken(companyId: string) {
  const { data } = await supabaseAdmin
    .from('meta_integrations')
    .select('access_token_encrypted')
    .eq('company_id', companyId)
    .single()
  if (!data?.access_token_encrypted) return null
  return decrypt(data.access_token_encrypted)
}

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

  const accessToken = await getIntegrationToken(admin.company_id)
  if (!accessToken) return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })

  try {
    const data = await metaApiGet('/me/adaccounts', {
      fields: 'id,name,account_status,currency',
    }, { accessToken })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
