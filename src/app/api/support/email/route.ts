import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  return user
}

export async function POST(request: NextRequest) {
  const user = await verifyAuth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ticket_id, reply_id, recipient_email, email_type, subject, html_body } = await request.json()

  // Log the email attempt
  const { data: logEntry, error: logError } = await supabaseAdmin
    .from('ticket_email_log')
    .insert({
      ticket_id,
      reply_id: reply_id || null,
      recipient_email,
      email_type,
      status: 'pending',
    })
    .select()
    .single()

  if (logError) return NextResponse.json({ error: logError.message }, { status: 400 })

  // Send via Resend
  // NOTE: Install resend package: npm install resend
  // Set RESEND_API_KEY in .env.local
  // If RESEND_API_KEY is not set, log the email but skip actual sending (dev mode)
  try {
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'IThealth Support <support@ithealth.ai>',
        to: recipient_email,
        subject,
        html: html_body,
      })
    } else {
      console.log(`[Email] Would send to ${recipient_email}: ${subject}`)
    }

    await supabaseAdmin
      .from('ticket_email_log')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', logEntry.id)

    // Update reply email_sent flag if applicable
    if (reply_id) {
      await supabaseAdmin
        .from('ticket_replies')
        .update({ email_sent: true, email_sent_at: new Date().toISOString() })
        .eq('id', reply_id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    await supabaseAdmin
      .from('ticket_email_log')
      .update({ status: 'failed', error: errorMsg })
      .eq('id', logEntry.id)

    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
