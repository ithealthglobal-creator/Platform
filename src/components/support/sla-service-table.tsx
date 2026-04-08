'use client'

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { getSlaState } from '@/components/support/sla-status'

interface SlaTicket {
  service_id: string | null
  response_due_at: string | null
  resolution_due_at: string | null
  first_responded_at: string | null
  resolved_at: string | null
  created_at: string
  service?: { id: string; name: string } | null
  sla_template?: { name: string } | null
}

interface SlaServiceTableProps {
  tickets: SlaTicket[]
  onRowClick: (serviceId: string, serviceName: string) => void
}

function formatDuration(ms: number) {
  if (ms < 0) return '—'
  const totalMins = Math.floor(ms / 60000)
  const days = Math.floor(totalMins / 1440)
  const hours = Math.floor((totalMins % 1440) / 60)
  const mins = totalMins % 60
  if (days > 0) return `${days}d ${hours}h`
  return `${hours}h ${mins}m`
}

function pctColor(val: number) {
  if (val >= 90) return 'text-green-600'
  if (val >= 75) return 'text-amber-500'
  return 'text-red-600'
}

export function SlaServiceTable({ tickets, onRowClick }: SlaServiceTableProps) {
  const byService = new Map<string, { name: string; templateName: string; tickets: SlaTicket[] }>()

  for (const t of tickets) {
    const id = t.service_id ?? 'general'
    const name = t.service?.name ?? 'General & Billing'
    const templateName = t.sla_template?.name ?? '—'
    if (!byService.has(id)) byService.set(id, { name, templateName, tickets: [] })
    byService.get(id)!.tickets.push(t)
  }

  const rows = Array.from(byService.entries()).map(([id, { name, templateName, tickets: ts }]) => {
    const resolved = ts.filter((t) => t.resolved_at)
    const withResp = ts.filter((t) => t.first_responded_at)

    const avgRespMs = withResp.length
      ? withResp.reduce((sum, t) => sum + (new Date(t.first_responded_at!).getTime() - new Date(t.created_at).getTime()), 0) / withResp.length
      : -1

    const avgResoMs = resolved.length
      ? resolved.reduce((sum, t) => sum + (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()), 0) / resolved.length
      : -1

    const resoMet = resolved.filter((t) => getSlaState(t.resolution_due_at, t.resolved_at) === 'met').length
    const compliancePct = resolved.length ? Math.round((resoMet / resolved.length) * 100) : 0

    return { id, name, templateName, total: ts.length, avgRespMs, avgResoMs, compliancePct }
  }).sort((a, b) => b.total - a.total)

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Service</TableHead>
            <TableHead className="w-[160px]">SLA Template</TableHead>
            <TableHead className="w-[90px] text-center">Tickets</TableHead>
            <TableHead className="w-[130px] text-center">Avg Response</TableHead>
            <TableHead className="w-[140px] text-center">Avg Resolution</TableHead>
            <TableHead className="w-[120px] text-center">Compliance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No data</TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onRowClick(row.id, row.name)}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-sm text-slate-500">{row.templateName}</TableCell>
                <TableCell className="text-center text-sm">{row.total}</TableCell>
                <TableCell className="text-center text-sm">{formatDuration(row.avgRespMs)}</TableCell>
                <TableCell className="text-center text-sm">{formatDuration(row.avgResoMs)}</TableCell>
                <TableCell className={`text-center text-sm font-semibold ${pctColor(row.compliancePct)}`}>{row.compliancePct}%</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
