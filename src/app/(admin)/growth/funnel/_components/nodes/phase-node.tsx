'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { FunnelMetricsPhase } from '@/lib/types'

interface PhaseNodeData extends FunnelMetricsPhase {
  color: string
}

export function PhaseNode({ data }: NodeProps) {
  const p = data as unknown as PhaseNodeData
  return (
    <div
      className="w-52 rounded-lg border-2 bg-white shadow-sm"
      style={{ borderColor: p.color }}
    >
      <div
        className="rounded-t-md px-3 py-2 text-white"
        style={{ backgroundColor: p.color }}
      >
        <span className="text-xs font-semibold uppercase tracking-wide">{p.name}</span>
      </div>
      <div className="px-3 py-3">
        <div className="text-xs text-slate-500">Leads</div>
        <div className="text-2xl font-semibold text-slate-900">{p.leads.toLocaleString()}</div>
      </div>
      <Handle type="target" position={Position.Left} />
    </div>
  )
}
