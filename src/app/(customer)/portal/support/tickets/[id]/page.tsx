'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { getTicketById } from '@/lib/supabase/queries/support-tickets'
import { getRepliesByTicketId, createReply } from '@/lib/supabase/queries/ticket-replies'
import { TicketReplyCard } from '@/components/support/ticket-reply'
import { ReplyForm } from '@/components/support/reply-form'
import { SlaStatus, SlaProgressBar } from '@/components/support/sla-status'
import { Badge } from '@/components/ui/badge'
import type { SupportTicket, TicketReply } from '@/lib/types'

function formatTimeAgo(date: string) {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function CustomerTicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()

  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [replies, setReplies] = useState<TicketReply[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTicket = useCallback(async () => {
    const { data, error } = await getTicketById(id)
    if (error) { toast.error('Failed to load ticket'); return }
    setTicket(data as SupportTicket)
  }, [id])

  const fetchReplies = useCallback(async () => {
    const { data } = await getRepliesByTicketId(id)
    setReplies((data as TicketReply[]) ?? [])
  }, [id])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([fetchTicket(), fetchReplies()])
      setLoading(false)
    }
    init()
  }, [fetchTicket, fetchReplies])

  async function handleReply(body: string, _isInternal: boolean, sendEmail: boolean) {
    if (!profile) return
    const { data: replyData, error } = await createReply({ ticket_id: id, author_id: profile.id, body, is_internal: false })
    if (error) { toast.error('Failed to send reply'); return }

    if (sendEmail) {
      await fetch('/api/support/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: id, reply_id: (replyData as TicketReply).id, type: 'reply' }),
      })
    }

    toast.success('Reply sent')
    await fetchReplies()
    await fetchTicket()
  }

  if (loading) return <div className="py-12 text-center text-slate-400">Loading...</div>
  if (!ticket) return <div className="py-12 text-center text-slate-400">Ticket not found</div>

  return (
    <div className="space-y-4">
      <a href="/portal/support" className="text-sm text-blue-600">← Back to Support</a>

      <div className="flex gap-6">
        {/* Left: conversation */}
        <div className="flex-1 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{ticket.subject}</h2>
            <p className="mt-0.5 text-sm text-slate-400">
              {ticket.ticket_number} · {formatTimeAgo(ticket.created_at)}
            </p>
          </div>

          {/* Original description */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">{ticket.created_by_profile?.display_name ?? 'You'}</span>
              <span className="text-xs text-slate-400">{formatTimeAgo(ticket.created_at)}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{ticket.description}</p>
          </div>

          {replies.map((reply, index) => (
            <TicketReplyCard
              key={reply.id}
              reply={reply}
              previousReply={index > 0 ? replies[index - 1] : null}
              isAdmin={false}
            />
          ))}

          <ReplyForm onSubmit={handleReply} isAdmin={false} />
        </div>

        {/* Right: metadata sidebar */}
        <div className="w-[300px] shrink-0">
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
            {/* Status */}
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Status</p>
              <Badge variant="outline" className="capitalize">{ticket.status.replace(/_/g, ' ')}</Badge>
            </div>

            <hr className="my-4 border-slate-200" />

            {/* Priority */}
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Priority</p>
              <Badge variant="outline" className="capitalize">{ticket.priority}</Badge>
            </div>

            <hr className="my-4 border-slate-200" />

            {/* Category */}
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Category</p>
              <p className="capitalize text-slate-700">{ticket.category}{ticket.service ? ` — ${ticket.service.name}` : ''}</p>
            </div>

            <hr className="my-4 border-slate-200" />

            {/* SLA Tracking */}
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">SLA Tracking</p>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Response</span>
                  <SlaStatus dueAt={ticket.response_due_at} completedAt={ticket.first_responded_at} />
                </div>
                <SlaProgressBar dueAt={ticket.response_due_at} completedAt={ticket.first_responded_at} />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Resolution</span>
                  <SlaStatus dueAt={ticket.resolution_due_at} completedAt={ticket.resolved_at} />
                </div>
                <SlaProgressBar dueAt={ticket.resolution_due_at} completedAt={ticket.resolved_at} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
