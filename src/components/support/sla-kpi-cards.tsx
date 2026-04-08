'use client'

import { getSlaState } from '@/components/support/sla-status'

interface SlaTicket {
  response_due_at: string | null
  resolution_due_at: string | null
  first_responded_at: string | null
  resolved_at: string | null
  status: string
  created_at: string
}

interface SlaKpiCardsProps {
  tickets: SlaTicket[]
}

function pctColor(val: number) {
  if (val >= 90) return 'text-green-600'
  if (val >= 75) return 'text-amber-500'
  return 'text-red-600'
}

export function SlaKpiCards({ tickets }: SlaKpiCardsProps) {
  const resolved = tickets.filter((t) => t.resolved_at)

  // Overall SLA Compliance: both response + resolution met
  const bothMet = resolved.filter(
    (t) =>
      getSlaState(t.response_due_at, t.first_responded_at) === 'met' &&
      getSlaState(t.resolution_due_at, t.resolved_at) === 'met',
  ).length
  const overallPct = resolved.length ? Math.round((bothMet / resolved.length) * 100) : 0

  // Response SLA Met
  const withResponse = tickets.filter((t) => t.first_responded_at)
  const responseMet = withResponse.filter(
    (t) => getSlaState(t.response_due_at, t.first_responded_at) === 'met',
  ).length
  const responsePct = withResponse.length ? Math.round((responseMet / withResponse.length) * 100) : 0

  // Resolution SLA Met
  const resolutionMet = resolved.filter(
    (t) => getSlaState(t.resolution_due_at, t.resolved_at) === 'met',
  ).length
  const resolutionPct = resolved.length ? Math.round((resolutionMet / resolved.length) * 100) : 0

  // Active Breaches: open tickets past either deadline
  const now = Date.now()
  const activeBreaches = tickets.filter((t) => {
    if (t.resolved_at) return false
    const respBreached = t.response_due_at && !t.first_responded_at && new Date(t.response_due_at).getTime() < now
    const resoBreached = t.resolution_due_at && new Date(t.resolution_due_at).getTime() < now
    return respBreached || resoBreached
  }).length

  const cards = [
    { label: 'Overall SLA Compliance', value: `${overallPct}%`, color: pctColor(overallPct), sub: `${bothMet} of ${resolved.length} resolved tickets` },
    { label: 'Response SLA Met', value: `${responsePct}%`, color: pctColor(responsePct), sub: `${responseMet} of ${withResponse.length} responded` },
    { label: 'Resolution SLA Met', value: `${resolutionPct}%`, color: pctColor(resolutionPct), sub: `${resolutionMet} of ${resolved.length} resolved` },
    { label: 'Active Breaches', value: `${activeBreaches}`, color: activeBreaches > 0 ? 'text-red-600' : 'text-green-600', sub: 'open tickets past deadline', breach: activeBreaches > 0 },
  ]

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl border bg-white p-5 ${card.breach ? 'border-red-200' : ''}`}
        >
          <p className="text-xs uppercase tracking-wider text-slate-400">{card.label}</p>
          <p className={`mt-2 text-2xl font-bold ${card.color}`}>{card.value}</p>
          <p className="mt-1 text-xs text-slate-500">{card.sub}</p>
        </div>
      ))}
    </div>
  )
}
