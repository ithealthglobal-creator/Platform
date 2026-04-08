import { supabase } from '@/lib/supabase-client'
import type { SupportTicket, TicketCategory, TicketPriority, TicketStatus } from '@/lib/types'

export interface TicketFilters {
  category?: TicketCategory
  status?: TicketStatus
  priority?: TicketPriority
  assigned_to?: string
  company_id?: string
  search?: string
}

export async function getTickets(filters: TicketFilters = {}) {
  let query = supabase
    .from('support_tickets')
    .select(`
      *,
      company:companies(id, name),
      created_by_profile:profiles!support_tickets_created_by_fkey(id, display_name, email),
      assigned_to_profile:profiles!support_tickets_assigned_to_fkey(id, display_name, email),
      service:services(id, name)
    `)
    .order('created_at', { ascending: false })

  if (filters.category) query = query.eq('category', filters.category)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.priority) query = query.eq('priority', filters.priority)
  if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to)
  if (filters.company_id) query = query.eq('company_id', filters.company_id)
  if (filters.search) query = query.or(`subject.ilike.%${filters.search}%,ticket_number.ilike.%${filters.search}%`)

  return query
}

export async function getTicketById(id: string) {
  return supabase
    .from('support_tickets')
    .select(`
      *,
      company:companies(id, name),
      created_by_profile:profiles!support_tickets_created_by_fkey(id, display_name, email),
      assigned_to_profile:profiles!support_tickets_assigned_to_fkey(id, display_name, email),
      service:services(id, name),
      sla_template:sla_templates(*)
    `)
    .eq('id', id)
    .single()
}

export async function updateTicketStatus(id: string, status: TicketStatus) {
  const updates: Record<string, unknown> = { status }
  if (status === 'resolved') updates.resolved_at = new Date().toISOString()
  return supabase.from('support_tickets').update(updates).eq('id', id)
}

export async function updateTicketAssignee(id: string, assigned_to: string | null) {
  return supabase.from('support_tickets').update({ assigned_to }).eq('id', id)
}

export async function getCustomerTickets(companyId: string, filters: TicketFilters = {}) {
  let query = supabase
    .from('support_tickets')
    .select(`
      *,
      service:services(id, name)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (filters.category) query = query.eq('category', filters.category)
  if (filters.status) query = query.eq('status', filters.status)

  return query
}
