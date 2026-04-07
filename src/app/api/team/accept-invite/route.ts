import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  // Auth
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = authHeader.replace('Bearer ', '')
  const supabaseAuth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Parse body
  const body = await request.json()
  const inviteToken: string = body.token ?? ''

  if (!inviteToken) {
    return NextResponse.json({ error: 'token is required' }, { status: 400 })
  }

  // Look up the invitation
  const { data: invitation, error: inviteError } = await supabaseAdmin
    .from('team_invitations')
    .select('id, company_id, display_name, invitee_email, companies(name)')
    .eq('token', inviteToken)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single()

  if (inviteError || !invitation) {
    return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 })
  }

  const companyId = invitation.company_id as string
  const companyRow = invitation.companies as unknown as { name: string } | null
  const companyName = companyRow?.name ?? ''

  // Determine display name: from invitation or fall back to email prefix
  const displayName =
    (invitation.display_name as string | null) ??
    (invitation.invitee_email as string).split('@')[0]

  // Update profile
  const { error: profileUpdateError } = await supabaseAdmin
    .from('profiles')
    .update({
      company_id: companyId,
      is_company_admin: false,
      display_name: displayName,
    })
    .eq('id', user.id)

  if (profileUpdateError) {
    return NextResponse.json({ error: profileUpdateError.message }, { status: 500 })
  }

  // Mark invitation as accepted
  const { error: inviteUpdateError } = await supabaseAdmin
    .from('team_invitations')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', invitation.id)

  if (inviteUpdateError) {
    return NextResponse.json({ error: inviteUpdateError.message }, { status: 500 })
  }

  return NextResponse.json({ companyId, companyName })
}
