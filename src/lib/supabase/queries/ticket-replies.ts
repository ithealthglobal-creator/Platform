import { supabase } from '@/lib/supabase-client'

export async function getRepliesByTicketId(ticketId: string) {
  return supabase
    .from('ticket_replies')
    .select(`
      *,
      author:profiles!ticket_replies_author_id_fkey(id, display_name, email, role)
    `)
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })
}

export async function createReply(data: {
  ticket_id: string
  author_id: string
  body: string
  is_internal: boolean
}) {
  return supabase.from('ticket_replies').insert(data).select().single()
}
