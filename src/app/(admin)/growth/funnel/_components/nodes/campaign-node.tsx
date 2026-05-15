'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Bullhorn } from '@carbon/icons-react'
import type { FunnelMetricsPaidNode } from '@/lib/types'

export function CampaignNode({ data }: NodeProps) {
  const p = data as unknown as FunnelMetricsPaidNode
  return (
    <div className="w-64 rounded-lg border border-pink-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-pink-100 px-3 py-2">
        <Bullhorn size={16} className="text-[#FF246B]" />
        <span className="text-xs font-semibold uppercase tracking-wide text-[#FF246B]">Paid</span>
      </div>
      <div className="px-3 py-2">
        <div className="truncate text-sm font-medium text-slate-900">{p.name}</div>
        <div className="mt-1 grid grid-cols-2 gap-1 text-[11px] text-slate-500">
          <div>Spend</div><div className="text-right text-slate-700">R{Math.round(p.spend).toLocaleString()}</div>
          <div>Impressions</div><div className="text-right text-slate-700">{p.impressions.toLocaleString()}</div>
          <div>Clicks</div><div className="text-right text-slate-700">{p.clicks.toLocaleString()}</div>
          <div>Sessions</div><div className="text-right font-medium text-slate-900">{p.sessions.toLocaleString()}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
