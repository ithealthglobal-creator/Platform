'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/auth-context'
import { getTicketById, updateTicketStatus, updateTicketAssignee } from '@/lib/supabase/queries/support-tickets'
import { getRepliesByTicketId, createReply } from '@/lib/supabase/queries/ticket-replies'
import { TicketReplyCard } from '@/components/support/ticket-reply'
import { ReplyForm } from '@/components/support/reply-form'
import { SlaStatus, SlaProgressBar } from '@/components/support/sla-status'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { SupportTicket, TicketReply, TicketStatus, Profile } from '@/lib/types'

const statusLabel: Record<TicketStatus, string> = {
  open: 'Open', in_progress: 'In Progress', waiting_on_customer: 'Waiting',
  resolved: 'Resolved', closed: 'Closed',
}

function formatTimeAgo(date: string) {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()

  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [replies, setReplies] = useState<TicketReply[]>([])
  const [admins, setAdmins] = useState<Profile[]>([])
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
      const { data } = await supabase.from('profiles').select('id, display_name, email, role').eq('role', 'admin').order('display_name')
      setAdmins((data as Profile[]) ?? [])
      setLoading(false)
    }
    init()
  }, [fetchTicket, fetchReplies])

  async function handleReply(body: string, isInternal: boolean, sendEmail: boolean) {
    if (!profile) return
    const { data: replyData, error } = await createReply({ ticket_id: id, author_id: profile.id, body, is_internal: isInternal })
    if (error) { toast.error('Failed to send reply'); return }

    if (sendEmail && !isInternal) {
      await fetch('/api/support/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: id, reply_id: (replyData as TicketReply).id, type: 'reply' }),
      })
    }

    if (ticket && !ticket.first_responded_at && !isInternal) {
      await supabase.from('support_tickets').update({ first_responded_at: new Date().toISOString() }).eq('id', id)
    }

    toast.success(isInternal ? 'Note added' : 'Reply sent')
    await fetchReplies()
    await fetchTicket()
  }

  async function handleStatusChange(status: string) {
    const { error } = await updateTicketStatus(id, status as TicketStatus)
    if (error) { toast.error('Failed to update status'); return }
    toast.success('Status updated')
    await fetchTicket()
  }

  async function handleAssigneeChange(assignedTo: string) {
    const value = assignedTo === 'unassigned' ? null : assignedTo
    const { error } = await updateTicketAssignee(id, value)
    if (error) { toast.error('Failed to update assignee'); return }
    toast.success('Assignee updated')
    await fetchTicket()
  }

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading...</div>
  if (!ticket) return <div className="py-12 text-center text-muted-foreground">Ticket not found</div>

  return (
    <div className="flex gap-6">
      {/* Left: conversation */}
      <div className="flex-1 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">{ticket.subject}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {ticket.ticket_number} · {ticket.created_by_profile?.display_name ?? 'Unknown'} · {formatTimeAgo(ticket.created_at)}
          </p>
        </div>

        {/* Original description */}
        <div className="rounded-lg bg-white p-4 ring-1 ring-foreground/10">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">{ticket.created_by_profile?.display_name ?? 'Unknown'}</span>
            <span className="text-xs text-muted-foreground">{formatTimeAgo(ticket.created_at)}</span>
          </div>
          <p className="whitespace-pre-wrap text-sm text-foreground">{ticket.description}</p>
        </div>

        {replies.map((reply, index) => (
          <TicketReplyCard
            key={reply.id}
            reply={reply}
            previousReply={index > 0 ? replies[index - 1] : null}
            isAdmin={true}
          />
        ))}

        <ReplyForm onSubmit={handleReply} isAdmin={true} />
      </div>

      {/* Right: metadata sidebar */}
      <div className="w-[300px] shrink-0">
        <div className="rounded-lg bg-white p-4 text-sm ring-1 ring-foreground/10">
          {/* Status */}
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</p>
            <Select value={ticket.status} onValueChange={(v) => { if (v) handleStatusChange(v) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(statusLabel) as TicketStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <hr className="my-4 border-border" />

          {/* Priority */}
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Priority</p>
            <Badge variant="outline" className="capitalize">{ticket.priority}</Badge>
          </div>

          <hr className="my-4 border-border" />

          {/* Category */}
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Category</p>
            <p className="capitalize text-foreground">{ticket.category}{ticket.service ? ` — ${ticket.service.name}` : ''}</p>
          </div>

          <hr className="my-4 border-border" />

          {/* Assigned To */}
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Assigned To</p>
            <Select value={ticket.assigned_to ?? 'unassigned'} onValueChange={(v) => { if (v) handleAssigneeChange(v) }}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {admins.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <hr className="my-4 border-border" />

          {/* Company */}
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Company</p>
            <p className="text-foreground">{ticket.company?.name ?? '—'}</p>
          </div>

          <hr className="my-4 border-border" />

          {/* SLA Tracking */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">SLA Tracking</p>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Response</span>
                <SlaStatus dueAt={ticket.response_due_at} completedAt={ticket.first_responded_at} />
              </div>
              <SlaProgressBar dueAt={ticket.response_due_at} completedAt={ticket.first_responded_at} />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Resolution</span>
                <SlaStatus dueAt={ticket.resolution_due_at} completedAt={ticket.resolved_at} />
              </div>
              <SlaProgressBar dueAt={ticket.resolution_due_at} completedAt={ticket.resolved_at} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
