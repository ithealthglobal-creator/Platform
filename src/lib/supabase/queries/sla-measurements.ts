import { supabase } from '@/lib/supabase-client'

export interface SlaPeriod {
  from: string
  to: string
}

export async function getCompanySlaSummary(period: SlaPeriod, companyId?: string) {
  let query = supabase
    .from('support_tickets')
    .select(`
      id, company_id, category, service_id, priority, status,
      response_due_at, resolution_due_at, first_responded_at, resolved_at, created_at,
      company:companies(id, name),
      service:services(id, name),
      sla_template:sla_templates(name)
    `)
    .gte('created_at', period.from)
    .lte('created_at', period.to)
    .not('sla_template_id', 'is', null)

  if (companyId) query = query.eq('company_id', companyId)

  return query.order('created_at', { ascending: false })
}

export async function getCustomerSlaSummary(companyId: string, period: SlaPeriod) {
  return supabase
    .from('support_tickets')
    .select(`
      id, ticket_number, subject, category, service_id, priority, status,
      response_due_at, resolution_due_at, first_responded_at, resolved_at, created_at,
      service:services(id, name),
      sla_template:sla_templates(*)
    `)
    .eq('company_id', companyId)
    .gte('created_at', period.from)
    .lte('created_at', period.to)
    .not('sla_template_id', 'is', null)
    .order('created_at', { ascending: false })
}
