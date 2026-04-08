'use client'

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { SlaStatus } from '@/components/support/sla-status'

interface SlaTicket {
  id: string
  ticket_number?: string
  subject?: string
  priority: string
  response_due_at: string | null
  resolution_due_at: string | null
  first_responded_at: string | null
  resolved_at: string | null
  created_at: string
  sla_template?: { name: string; response_hours?: number; resolution_hours?: number } | null
}

interface SlaTicketTableProps {
  tickets: SlaTicket[]
}

const priorityColor: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-amber-100 text-amber-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-gray-100 text-gray-700',
}

function formatDuration(ms: number) {
  if (ms <= 0) return '—'
  const totalMins = Math.floor(ms / 60000)
  const days = Math.floor(totalMins / 1440)
  const hours = Math.floor((totalMins % 1440) / 60)
  const mins = totalMins % 60
  if (days > 0) return `${days}d ${hours}h`
  return `${hours}h ${mins}m`
}

function targetLabel(hours: number | undefined) {
  if (!hours) return '—'
  if (hours >= 24) return `${Math.round(hours / 24)}d`
  return `${hours}h`
}

export function SlaTicketTable({ tickets }: SlaTicketTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[110px]">Ticket #</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead className="w-[90px]">Priority</TableHead>
            <TableHead className="w-[100px] text-center">Resp. Target</TableHead>
            <TableHead className="w-[110px] text-center">Actual Resp.</TableHead>
            <TableHead className="w-[110px] text-center">Resp. SLA</TableHead>
            <TableHead className="w-[100px] text-center">Reso. Target</TableHead>
            <TableHead className="w-[110px] text-center">Actual Reso.</TableHead>
            <TableHead className="w-[110px] text-center">Reso. SLA</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">No tickets</TableCell>
            </TableRow>
          ) : (
            tickets.map((t) => {
              const respMs = t.first_responded_at ? new Date(t.first_responded_at).getTime() - new Date(t.created_at).getTime() : 0
              const resoMs = t.resolved_at ? new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime() : 0
              const isBreached =
                (t.response_due_at && !t.first_responded_at && new Date(t.response_due_at).getTime() < Date.now()) ||
                (t.resolution_due_at && !t.resolved_at && new Date(t.resolution_due_at).getTime() < Date.now())

              return (
                <TableRow key={t.id} className={isBreached ? 'bg-red-50' : ''}>
                  <TableCell className="text-sm font-semibold text-blue-600">{t.ticket_number ?? '—'}</TableCell>
                  <TableCell className="max-w-[180px] truncate text-sm">{t.subject ?? '—'}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor[t.priority] ?? ''}`}>
                      {t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-sm">{targetLabel(t.sla_template?.response_hours)}</TableCell>
                  <TableCell className="text-center text-sm">{t.first_responded_at ? formatDuration(respMs) : '—'}</TableCell>
                  <TableCell className="text-center"><SlaStatus dueAt={t.response_due_at} completedAt={t.first_responded_at} /></TableCell>
                  <TableCell className="text-center text-sm">{targetLabel(t.sla_template?.resolution_hours)}</TableCell>
                  <TableCell className="text-center text-sm">{t.resolved_at ? formatDuration(resoMs) : '—'}</TableCell>
                  <TableCell className="text-center"><SlaStatus dueAt={t.resolution_due_at} completedAt={t.resolved_at} /></TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
