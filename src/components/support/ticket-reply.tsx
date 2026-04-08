'use client'

import type { TicketReply } from '@/lib/types'

interface TicketReplyProps {
  reply: TicketReply
  previousReply?: TicketReply | null
  isAdmin?: boolean
}

export function TicketReplyCard({ reply, previousReply, isAdmin }: TicketReplyProps) {
  const isInternal = reply.is_internal
  const authorName = reply.author?.display_name || reply.author?.email || 'Unknown'
  const authorRole = reply.author?.role
  const timeAgo = formatTimeAgo(reply.created_at)

  if (isInternal && !isAdmin) return null

  return (
    <div className={`rounded-lg border p-4 ${
      isInternal
        ? 'border-amber-200 bg-amber-50'
        : authorRole === 'admin'
          ? 'border-blue-200 bg-blue-50'
          : 'border-slate-200 bg-white'
    }`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">
          {authorName}
          {authorRole === 'admin' && <span className="ml-1 font-normal text-blue-600">(Admin)</span>}
          {isInternal && <span className="ml-1 font-normal text-amber-600">🔒 Internal Note</span>}
        </span>
        <span className="text-xs text-slate-400">
          {timeAgo}
          {reply.email_sent && ' · 📧 Email sent'}
        </span>
      </div>

      {previousReply && !isInternal && (
        <div className="mb-3 rounded border-l-[3px] border-slate-300 bg-slate-50 p-2 text-sm text-slate-500">
          <span className="text-xs text-slate-400">{previousReply.author?.display_name} wrote:</span>
          <p className="mt-1 line-clamp-3">{previousReply.body}</p>
        </div>
      )}

      <p className="whitespace-pre-wrap text-sm text-slate-700">{reply.body}</p>
    </div>
  )
}

function formatTimeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
