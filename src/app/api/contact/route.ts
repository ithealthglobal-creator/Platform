import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, email, message, phone, company } = body

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Name, email, and message are required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('contact_submissions')
    .insert({ name, email, message, phone: phone || null, company: company || null })

  if (error) {
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
