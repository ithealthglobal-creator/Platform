import { z } from 'zod'

export const createTicketSchema = z.object({
  category: z.enum(['general', 'billing', 'service']),
  service_id: z.string().uuid().nullable(),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  subject: z.string().min(1, 'Subject is required').max(200),
  description: z.string().min(1, 'Description is required').max(5000),
  company_id: z.string().uuid(),
})

export const createReplySchema = z.object({
  ticket_id: z.string().uuid(),
  body: z.string().min(1, 'Reply body is required').max(10000),
  is_internal: z.boolean().default(false),
  send_email: z.boolean().default(true),
})

export const updateTicketStatusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed']),
})

export type CreateTicketInput = z.infer<typeof createTicketSchema>
export type CreateReplyInput = z.infer<typeof createReplySchema>
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>
