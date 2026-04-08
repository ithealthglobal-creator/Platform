import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createTicketSchema } from '@/lib/validations/support'

function parseDurationToMs(text: string): number {
  if (!text) return 24 * 60 * 60 * 1000
  const cleaned = text.toLowerCase().trim()
  const match = cleaned.match(/^(\d+\.?\d*)/)
  if (!match) return 24 * 60 * 60 * 1000
  const num = parseFloat(match[1])
  if (isNaN(num)) return 24 * 60 * 60 * 1000
  if (/\d\s*(h|hour)/.test(cleaned)) return num * 60 * 60 * 1000
  if (/\d\s*(d|day)/.test(cleaned)) return num * 24 * 60 * 60 * 1000
  if (/\d\s*(min)/.test(cleaned)) return num * 60 * 1000
  return 24 * 60 * 60 * 1000
}

async function verifyUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, role, company_id, email, display_name')
    .eq('id', user.id)
    .single()
  return profile
}

export async function POST(request: NextRequest) {
  const profile = await verifyUser(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = createTicketSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const input = parsed.data
  const companyId = profile.role === 'admin' ? input.company_id : profile.company_id

  // Determine SLA template
  let slaTemplateId: string | null = null
  let responseDuration: string | null = null
  let resolutionDuration: string | null = null

  if (input.category === 'service' && input.service_id) {
    const { data: serviceSla } = await supabaseAdmin
      .from('service_sla')
      .select('*, sla_template:sla_templates(*)')
      .eq('service_id', input.service_id)
      .maybeSingle()

    if (serviceSla?.sla_template) {
      slaTemplateId = serviceSla.sla_template_id
      const tpl = serviceSla.sla_template
      responseDuration = serviceSla[`override_response_${input.priority}`] || tpl[`response_${input.priority}`]
      resolutionDuration = serviceSla[`override_resolution_${input.priority}`] || tpl[`resolution_${input.priority}`]
    }
  }

  if (!slaTemplateId) {
    const { data: defaultTpl } = await supabaseAdmin
      .from('sla_templates')
      .select('*')
      .eq('name', 'Default Support')
      .eq('is_active', true)
      .maybeSingle()

    if (defaultTpl) {
      slaTemplateId = defaultTpl.id
      responseDuration = defaultTpl[`response_${input.priority}` as keyof typeof defaultTpl] as string
      resolutionDuration = defaultTpl[`resolution_${input.priority}` as keyof typeof defaultTpl] as string
    }
  }

  // Compute deadlines in JS (simpler than RPC round-trips)
  let responseDueAt: string | null = null
  let resolutionDueAt: string | null = null

  if (responseDuration) {
    responseDueAt = new Date(Date.now() + parseDurationToMs(responseDuration)).toISOString()
  }
  if (resolutionDuration) {
    resolutionDueAt = new Date(Date.now() + parseDurationToMs(resolutionDuration)).toISOString()
  }

  // Look up routing rule
  let assignedTo: string | null = null
  const routingQuery = supabaseAdmin
    .from('ticket_routing_rules')
    .select('assigned_to')
    .eq('category', input.category)
    .eq('is_active', true)

  if (input.category === 'service' && input.service_id) {
    routingQuery.eq('service_id', input.service_id)
  } else {
    routingQuery.is('service_id', null)
  }

  const { data: rule } = await routingQuery.maybeSingle()
  if (rule) assignedTo = rule.assigned_to

  // Insert ticket
  const { data: ticket, error } = await supabaseAdmin
    .from('support_tickets')
    .insert({
      company_id: companyId,
      created_by: profile.id,
      assigned_to: assignedTo,
      category: input.category,
      service_id: input.service_id,
      priority: input.priority,
      subject: input.subject,
      description: input.description,
      sla_template_id: slaTemplateId,
      response_due_at: responseDueAt,
      resolution_due_at: resolutionDueAt,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ticket })
}
