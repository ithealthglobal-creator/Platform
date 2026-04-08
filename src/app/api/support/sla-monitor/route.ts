import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  let warnings = 0
  let breaches = 0

  // Fetch open tickets with SLA deadlines
  const { data: tickets } = await supabaseAdmin
    .from('support_tickets')
    .select('id, ticket_number, subject, assigned_to, response_due_at, resolution_due_at, first_responded_at, resolved_at, created_at')
    .in('status', ['open', 'in_progress', 'waiting_on_customer'])
    .not('sla_template_id', 'is', null)

  if (!tickets) return NextResponse.json({ checked: 0, warnings: 0, breaches: 0 })

  for (const ticket of tickets) {
    // Check for existing notifications
    const { data: existingBreachLogs } = await supabaseAdmin
      .from('ticket_email_log')
      .select('email_type')
      .eq('ticket_id', ticket.id)
      .eq('email_type', 'sla_breach')

    const { data: existingWarningLogs } = await supabaseAdmin
      .from('ticket_email_log')
      .select('email_type')
      .eq('ticket_id', ticket.id)
      .eq('email_type', 'sla_warning')

    const alreadyBreachNotified = (existingBreachLogs || []).length > 0
    const alreadyWarningNotified = (existingWarningLogs || []).length > 0

    // Check response SLA breach
    const responseBreach = ticket.response_due_at
      && !ticket.first_responded_at
      && now > new Date(ticket.response_due_at)

    // Check resolution SLA breach
    const resolutionBreach = ticket.resolution_due_at
      && !ticket.resolved_at
      && now > new Date(ticket.resolution_due_at)

    if ((responseBreach || resolutionBreach) && !alreadyBreachNotified) {
      // Fetch all admins for breach notification
      const { data: admins } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('role', 'admin')

      const sendEmail = process.env.RESEND_API_KEY
        ? async (to: string, subject: string, html: string) => {
            const { Resend } = await import('resend')
            const r = new Resend(process.env.RESEND_API_KEY)
            await r.emails.send({ from: process.env.SUPPORT_FROM_EMAIL ?? 'Platform Support <support@platform.local>', to, subject, html })
          }
        : null

      for (const admin of (admins || [])) {
        const { data: logEntry } = await supabaseAdmin.from('ticket_email_log').insert({
          ticket_id: ticket.id,
          recipient_email: admin.email,
          email_type: 'sla_breach',
          status: 'pending',
        }).select().single()

        try {
          if (sendEmail) {
            await sendEmail(
              admin.email,
              `⚠ SLA Breached: [${ticket.ticket_number}] ${ticket.subject}`,
              `<p>SLA has been breached for ticket ${ticket.ticket_number}.</p>`,
            )
          }
          if (logEntry) {
            await supabaseAdmin.from('ticket_email_log')
              .update({ status: 'sent', sent_at: now.toISOString() })
              .eq('id', logEntry.id)
          }
        } catch (err) {
          if (logEntry) {
            await supabaseAdmin.from('ticket_email_log')
              .update({ status: 'failed', error: err instanceof Error ? err.message : 'Unknown' })
              .eq('id', logEntry.id)
          }
        }
      }
      breaches++
      continue
    }

    // Check 75% warning (response)
    if (ticket.response_due_at && !ticket.first_responded_at && !alreadyWarningNotified) {
      const created = new Date(ticket.created_at).getTime()
      const due = new Date(ticket.response_due_at).getTime()
      const elapsed = now.getTime() - created
      const total = due - created
      if (total > 0 && elapsed / total >= 0.75 && elapsed / total < 1) {
        if (ticket.assigned_to) {
          const { data: assignee } = await supabaseAdmin
            .from('profiles')
            .select('email')
            .eq('id', ticket.assigned_to)
            .single()

          if (assignee) {
            const { data: warnLog } = await supabaseAdmin.from('ticket_email_log').insert({
              ticket_id: ticket.id,
              recipient_email: assignee.email,
              email_type: 'sla_warning',
              status: 'pending',
            }).select().single()

            try {
              const hoursLeft = Math.round((due - now.getTime()) / (1000 * 60 * 60) * 10) / 10
              if (process.env.RESEND_API_KEY) {
                const { Resend } = await import('resend')
                const r = new Resend(process.env.RESEND_API_KEY)
                await r.emails.send({
                  from: process.env.SUPPORT_FROM_EMAIL ?? 'Platform Support <support@platform.local>',
                  to: assignee.email,
                  subject: `⚠ SLA at risk: [${ticket.ticket_number}] (${hoursLeft}h remaining)`,
                  html: `<p>SLA deadline approaching for ticket ${ticket.ticket_number}. ${hoursLeft} hours remaining.</p>`,
                })
              }
              if (warnLog) {
                await supabaseAdmin.from('ticket_email_log')
                  .update({ status: 'sent', sent_at: now.toISOString() })
                  .eq('id', warnLog.id)
              }
            } catch (err) {
              if (warnLog) {
                await supabaseAdmin.from('ticket_email_log')
                  .update({ status: 'failed', error: err instanceof Error ? err.message : 'Unknown' })
                  .eq('id', warnLog.id)
              }
            }
          }
        }
        warnings++
      }
    }
  }

  return NextResponse.json({ checked: tickets.length, warnings, breaches })
}
