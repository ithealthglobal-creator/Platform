'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Document } from '@carbon/icons-react'
import type { FunnelMetricsBlogNode } from '@/lib/types'

export function BlogNode({ data }: NodeProps) {
  const p = data as unknown as FunnelMetricsBlogNode
  return (
    <div className="w-64 rounded-lg border border-amber-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-amber-100 px-3 py-2">
        <Document size={16} className="text-[#EDB600]" />
        <span className="text-xs font-semibold uppercase tracking-wide text-[#B88900]">Blog</span>
      </div>
      <div className="px-3 py-2">
        <div className="truncate text-sm font-medium text-slate-900">{p.title}</div>
        <div className="truncate text-[11px] text-slate-400">/blog/{p.slug}</div>
        <div className="mt-1 grid grid-cols-2 gap-1 text-[11px] text-slate-500">
          <div>Views</div><div className="text-right text-slate-700">{p.views.toLocaleString()}</div>
          <div>Sessions</div><div className="text-right font-medium text-slate-900">{p.sessions.toLocaleString()}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
