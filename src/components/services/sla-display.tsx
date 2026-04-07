'use client'

import type { ServiceSla, SlaTemplate } from '@/lib/types'

interface SlaDisplayProps {
  serviceSla: ServiceSla & { sla_template: SlaTemplate }
}

export function SlaDisplay({ serviceSla }: SlaDisplayProps) {
  const t = serviceSla.sla_template
  const resolve = (field: keyof SlaTemplate) => {
    const overrideKey = `override_${field}` as keyof ServiceSla
    return (serviceSla[overrideKey] as string | string[] | null) ?? (t[field] as string | string[] | null) ?? '—'
  }

  const priorities = [
    { label: 'Critical', response: resolve('response_critical'), resolution: resolve('resolution_critical') },
    { label: 'High', response: resolve('response_high'), resolution: resolve('resolution_high') },
    { label: 'Medium', response: resolve('response_medium'), resolution: resolve('resolution_medium') },
    { label: 'Low', response: resolve('response_low'), resolution: resolve('resolution_low') },
  ]

  const supportChannels = resolve('support_channels')

  return (
    <div className="overflow-hidden border border-slate-200 bg-white p-6" style={{ borderRadius: '16px 0 16px 16px' }}>
      <h3 className="mb-4 text-[15px] font-semibold text-slate-900">SLA Terms</h3>

      <table className="mb-4 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-3 py-2 text-left font-medium text-slate-500">Priority</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500">Response Time</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500">Resolution Target</th>
          </tr>
        </thead>
        <tbody>
          {priorities.map(p => (
            <tr key={p.label} className="border-b border-slate-100">
              <td className="px-3 py-2 font-medium text-slate-900">{p.label}</td>
              <td className="px-3 py-2 text-slate-600">{p.response}</td>
              <td className="px-3 py-2 text-slate-600">{p.resolution}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-slate-400">Uptime Guarantee</div>
          <div className="font-medium text-slate-900">{resolve('uptime_guarantee')}</div>
        </div>
        <div>
          <div className="text-slate-400">Support Hours</div>
          <div className="font-medium text-slate-900">{resolve('support_hours')}</div>
        </div>
        <div>
          <div className="text-slate-400">Support Channels</div>
          <div className="font-medium text-slate-900">
            {Array.isArray(supportChannels) ? supportChannels.join(', ') : supportChannels}
          </div>
        </div>
      </div>
    </div>
  )
}
