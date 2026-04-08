'use client'

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { SlaStatus, getSlaState } from '@/components/support/sla-status'
import type { SupportTicket, TicketCategory, TicketStatus, TicketPriority } from '@/lib/types'

export interface TicketTableFilters {
  category: TicketCategory | 'all'
  status: TicketStatus | 'all'
  priority: TicketPriority | 'all'
}

interface TicketTableProps {
  tickets: SupportTicket[]
  loading: boolean
  onRowClick: (id: string) => void
  filters: TicketTableFilters
  onFilterChange: (filters: TicketTableFilters) => void
}

const categoryVariant: Record<TicketCategory, string> = {
  general: 'bg-green-100 text-green-800',
  billing: 'bg-purple-100 text-purple-800',
  service: 'bg-blue-100 text-blue-800',
}

const priorityVariant: Record<TicketPriority, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-amber-100 text-amber-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-gray-100 text-gray-700',
}

const statusVariant: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-amber-100 text-amber-800',
  waiting_on_customer: 'bg-slate-100 text-slate-700',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-slate-100 text-slate-600',
}

const statusLabel: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  waiting_on_customer: 'Waiting',
  resolved: 'Resolved',
  closed: 'Closed',
}

export function TicketTable({ tickets, loading, onRowClick, filters, onFilterChange }: TicketTableProps) {
  function set(key: keyof TicketTableFilters, value: string) {
    onFilterChange({ ...filters, [key]: value })
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex gap-3 mb-4">
        <Select value={filters.category} onValueChange={(v) => set('category', v ?? 'all')}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="billing">Billing</SelectItem>
            <SelectItem value="service">Service</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(v) => set('status', v ?? 'all')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="waiting_on_customer">Waiting</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.priority} onValueChange={(v) => set('priority', v ?? 'all')}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[110px]">Ticket #</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="w-[110px]">Category</TableHead>
              <TableHead className="w-[160px]">Company</TableHead>
              <TableHead className="w-[100px]">Priority</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[120px]">SLA</TableHead>
              <TableHead className="w-[140px]">Assigned To</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No tickets found
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => {
                const slaState = getSlaState(ticket.resolution_due_at, ticket.resolved_at, ticket.created_at)
                const isBreached = slaState === 'breached'
                return (
                  <TableRow
                    key={ticket.id}
                    className={`cursor-pointer hover:bg-muted/50 ${isBreached ? 'bg-red-50' : ''}`}
                    onClick={() => onRowClick(ticket.id)}
                  >
                    <TableCell className="text-blue-600 font-semibold text-sm">
                      {ticket.ticket_number}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{ticket.subject}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${categoryVariant[ticket.category]}`}>
                        {ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{ticket.company?.name ?? '—'}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityVariant[ticket.priority]}`}>
                        {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusVariant[ticket.status]}`}>
                        {statusLabel[ticket.status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <SlaStatus dueAt={ticket.resolution_due_at} completedAt={ticket.resolved_at} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ticket.assigned_to_profile?.display_name ?? '—'}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
