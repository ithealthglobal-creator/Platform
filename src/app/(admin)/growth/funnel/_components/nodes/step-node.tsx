'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { FunnelMetricsStep } from '@/lib/types'

const STEP_LABEL: Record<string, string> = {
  welcome: 'Welcome',
  assessment: 'Assessment',
  details: 'Details',
  confirmation: 'Confirmation',
}

export function StepNode({ data }: NodeProps) {
  const s = data as unknown as FunnelMetricsStep
  return (
    <div className="w-52 rounded-lg bg-white shadow-sm ring-1 ring-foreground/10">
      <div className="border-b border-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {STEP_LABEL[s.key] ?? s.key}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1 px-3 py-2 text-[11px] text-muted-foreground">
        <div>Entered</div><div className="text-right font-medium text-foreground">{s.entered.toLocaleString()}</div>
        <div>Completed</div><div className="text-right text-foreground">{s.completed.toLocaleString()}</div>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
