import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { company_name, contact_name, email, phone, website, message } = body

  if (!company_name || !contact_name || !email) {
    return NextResponse.json({ error: 'Company name, contact name, and email are required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('partner_applications')
    .insert({
      company_name,
      contact_name,
      email,
      phone: phone || null,
      website: website || null,
      message: message || null,
    })

  if (error) {
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
