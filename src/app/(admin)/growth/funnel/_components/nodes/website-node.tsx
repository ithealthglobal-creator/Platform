'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Home } from '@carbon/icons-react'

export function WebsiteNode({ data }: NodeProps) {
  const sessions = (data as { sessions: number }).sessions
  return (
    <div className="w-56 rounded-lg border-2 border-slate-300 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
        <Home size={16} className="text-slate-600" />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Website</span>
      </div>
      <div className="px-3 py-3">
        <div className="text-xs text-slate-500">Sessions</div>
        <div className="text-2xl font-semibold text-slate-900">{sessions.toLocaleString()}</div>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
