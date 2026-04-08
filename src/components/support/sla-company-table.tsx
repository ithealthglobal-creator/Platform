'use client'

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { getSlaState } from '@/components/support/sla-status'

interface SlaTicket {
  company_id: string | null
  response_due_at: string | null
  resolution_due_at: string | null
  first_responded_at: string | null
  resolved_at: string | null
  status: string
  company?: { id: string; name: string } | null
}

interface SlaCompanyTableProps {
  tickets: SlaTicket[]
  onRowClick: (companyId: string, companyName: string) => void
}

function pctColor(val: number) {
  if (val >= 90) return 'text-green-600'
  if (val >= 75) return 'text-amber-500'
  return 'text-red-600'
}

function pctBarColor(val: number) {
  if (val >= 90) return 'bg-green-500'
  if (val >= 75) return 'bg-amber-500'
  return 'bg-red-500'
}

export function SlaCompanyTable({ tickets, onRowClick }: SlaCompanyTableProps) {
  // Group by company_id
  const byCompany = new Map<string, { name: string; tickets: SlaTicket[] }>()
  for (const t of tickets) {
    const id = t.company_id ?? 'unknown'
    const name = t.company?.name ?? 'Unknown'
    if (!byCompany.has(id)) byCompany.set(id, { name, tickets: [] })
    byCompany.get(id)!.tickets.push(t)
  }

  const rows = Array.from(byCompany.entries()).map(([id, { name, tickets: ts }]) => {
    const resolved = ts.filter((t) => t.resolved_at)
    const now = Date.now()

    const withResp = ts.filter((t) => t.first_responded_at)
    const respMet = withResp.filter((t) => getSlaState(t.response_due_at, t.first_responded_at) === 'met').length
    const responsePct = withResp.length ? Math.round((respMet / withResp.length) * 100) : 0

    const resoMet = resolved.filter((t) => getSlaState(t.resolution_due_at, t.resolved_at) === 'met').length
    const resolutionPct = resolved.length ? Math.round((resoMet / resolved.length) * 100) : 0

    const breaches = ts.filter((t) => {
      if (t.resolved_at) return false
      return (
        (t.response_due_at && !t.first_responded_at && new Date(t.response_due_at).getTime() < now) ||
        (t.resolution_due_at && new Date(t.resolution_due_at).getTime() < now)
      )
    }).length

    const bothMet = resolved.filter(
      (t) =>
        getSlaState(t.response_due_at, t.first_responded_at) === 'met' &&
        getSlaState(t.resolution_due_at, t.resolved_at) === 'met',
    ).length
    const overallPct = resolved.length ? Math.round((bothMet / resolved.length) * 100) : 0

    return { id, name, total: ts.length, responsePct, resolutionPct, breaches, overallPct }
  }).sort((a, b) => a.overallPct - b.overallPct)

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead className="w-[90px] text-center">Tickets</TableHead>
            <TableHead className="w-[130px] text-center">Response SLA</TableHead>
            <TableHead className="w-[130px] text-center">Resolution SLA</TableHead>
            <TableHead className="w-[100px] text-center">Breaches</TableHead>
            <TableHead className="w-[160px]">Overall</TableHead>
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
                <TableCell className="text-center text-sm">{row.total}</TableCell>
                <TableCell className={`text-center text-sm font-semibold ${pctColor(row.responsePct)}`}>{row.responsePct}%</TableCell>
                <TableCell className={`text-center text-sm font-semibold ${pctColor(row.resolutionPct)}`}>{row.resolutionPct}%</TableCell>
                <TableCell className={`text-center text-sm font-semibold ${row.breaches > 0 ? 'text-red-600' : 'text-slate-500'}`}>{row.breaches}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${pctColor(row.overallPct)}`}>{row.overallPct}%</span>
                    <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                      <div className={`h-1.5 rounded-full ${pctBarColor(row.overallPct)}`} style={{ width: `${row.overallPct}%` }} />
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
