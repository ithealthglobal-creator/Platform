import { isAdminOrAbove } from '@/lib/auth-utils'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !isAdminOrAbove(profile.role)) return null
  return user
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { action } = body

  if (action === 'create') {
    const { email, password, display_name, company_id, role } = body

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email,
        display_name,
        company_id,
        role,
      })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ user: authUser.user })
  }

  if (action === 'reset-password') {
    const { email } = body
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
    })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  }

  if (action === 'update') {
    const { user_id, display_name, company_id, role, is_active } = body
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ display_name, company_id, role, is_active })
      .eq('id', user_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
