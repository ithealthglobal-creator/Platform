'use client'

import { Separator } from '@/components/ui/separator'

interface SlaServiceCardProps {
  serviceName: string
  templateName: string
  responseCompliance: number
  resolutionCompliance: number
  slaTargets: {
    response: Record<string, string | null>
    resolution: Record<string, string | null>
  }
  supportHours: string | null
  ticketCount: number
}

const PRIORITIES = ['critical', 'high', 'medium', 'low']

function complianceColor(pct: number) {
  if (pct >= 90) return { text: 'text-green-600', bar: 'bg-green-500' }
  if (pct >= 75) return { text: 'text-amber-500', bar: 'bg-amber-500' }
  return { text: 'text-red-600', bar: 'bg-red-500' }
}

function GaugeBlock({ label, pct }: { label: string; pct: number }) {
  const { text, bar } = complianceColor(pct)
  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-2xl font-bold ${text}`}>{pct}%</p>
      <div className="h-1 w-full rounded-full bg-slate-200">
        <div className={`h-1 rounded-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function SlaServiceCard({
  serviceName,
  templateName,
  responseCompliance,
  resolutionCompliance,
  slaTargets,
  supportHours,
  ticketCount,
}: SlaServiceCardProps) {
  return (
    <div className="rounded-xl border bg-white p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-bold text-slate-900">{serviceName}</p>
          <p className="text-xs text-slate-400">{templateName}</p>
        </div>
        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600 whitespace-nowrap">
          Active
        </span>
      </div>

      <Separator />

      {/* Compliance gauges */}
      <div className="grid grid-cols-2 gap-3">
        <GaugeBlock label="Response compliance" pct={responseCompliance} />
        <GaugeBlock label="Resolution compliance" pct={resolutionCompliance} />
      </div>

      {/* SLA targets */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="space-y-1">
          <p className="font-semibold text-slate-600">Response targets</p>
          {PRIORITIES.map((p) => (
            <div key={p} className="flex justify-between text-slate-500">
              <span className="capitalize">{p}</span>
              <span>{slaTargets.response[p] ?? '—'}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-slate-600">Resolution targets</p>
          {PRIORITIES.map((p) => (
            <div key={p} className="flex justify-between text-slate-500">
              <span className="capitalize">{p}</span>
              <span>{slaTargets.resolution[p] ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{supportHours ?? 'Support hours not set'}</span>
        <span>{ticketCount} ticket{ticketCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}
