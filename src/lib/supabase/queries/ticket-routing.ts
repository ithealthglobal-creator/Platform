import { supabase } from '@/lib/supabase-client'
import type { TicketCategory } from '@/lib/types'

export async function findRoutingRule(category: TicketCategory, serviceId?: string | null) {
  let query = supabase
    .from('ticket_routing_rules')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)

  if (category === 'service' && serviceId) {
    query = query.eq('service_id', serviceId)
  } else {
    query = query.is('service_id', null)
  }

  return query.maybeSingle()
}
