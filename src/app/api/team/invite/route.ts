import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-server'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  // Auth
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = authHeader.replace('Bearer ', '')
  const supabaseAuth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify caller is a company admin
  const { data: callerProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('company_id, is_company_admin')
    .eq('id', user.id)
    .single()

  if (profileError || !callerProfile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }
  if (!callerProfile.is_company_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const companyId = callerProfile.company_id as string

  // Parse body
  const body = await request.json()
  const invitees: { email: string; display_name?: string }[] = body.invitees ?? []
  const message: string = body.message ?? ''

  if (!Array.isArray(invitees) || invitees.length === 0) {
    return NextResponse.json({ error: 'invitees must be a non-empty array' }, { status: 400 })
  }

  // Validate email formats
  const validationErrors: { email: string; reason: string }[] = []
  const validInvitees = invitees.filter((inv) => {
    if (!EMAIL_REGEX.test(inv.email)) {
      validationErrors.push({ email: inv.email, reason: 'Invalid email format' })
      return false
    }
    return true
  })

  const validEmails = validInvitees.map((inv) => inv.email)

  // Check for existing active members
  const { data: existingMembers } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('company_id', companyId)
    .in('email', validEmails)

  const existingMemberEmails = new Set((existingMembers ?? []).map((m) => m.email as string))

  // Check for pending invitations
  const { data: pendingInvitations } = await supabaseAdmin
    .from('team_invitations')
    .select('invitee_email')
    .eq('company_id', companyId)
    .eq('status', 'pending')
    .in('invitee_email', validEmails)

  const pendingEmails = new Set((pendingInvitations ?? []).map((inv) => inv.invitee_email as string))

  // Filter out already-existing or pending
  const toInvite = validInvitees.filter((inv) => {
    if (existingMemberEmails.has(inv.email)) {
      validationErrors.push({ email: inv.email, reason: 'Already a team member' })
      return false
    }
    if (pendingEmails.has(inv.email)) {
      validationErrors.push({ email: inv.email, reason: 'Invitation already pending' })
      return false
    }
    return true
  })

  let sent = 0
  const errors = [...validationErrors]

  // Process each valid invitee
  for (const inv of toInvite) {
    // Insert invitation row
    const { data: invitation, error: insertError } = await supabaseAdmin
      .from('team_invitations')
      .insert({
        company_id: companyId,
        invitee_email: inv.email,
        display_name: inv.display_name ?? null,
        invited_by: user.id,
        message: message || null,
      })
      .select('id, token')
      .single()

    if (insertError || !invitation) {
      errors.push({ email: inv.email, reason: insertError?.message ?? 'Failed to create invitation' })
      continue
    }

    // Send auth invite email
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/set-password?invite=${invitation.token}`
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(inv.email, {
      redirectTo,
      data: {
        display_name: inv.display_name ?? '',
        company_id: companyId,
        invite_token: invitation.token,
      },
    })

    if (inviteError) {
      // Roll back the invitation row
      await supabaseAdmin.from('team_invitations').delete().eq('id', invitation.id)
      errors.push({ email: inv.email, reason: inviteError.message })
      continue
    }

    sent++
  }

  return NextResponse.json({ sent, errors })
}
