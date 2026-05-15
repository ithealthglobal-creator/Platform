'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { LogoLinkedin, LogoX, LogoFacebook, LogoInstagram, Share } from '@carbon/icons-react'
import type { FunnelMetricsSocialNode, SocialPlatform } from '@/lib/types'
import type { ComponentType } from 'react'

const PLATFORM_ICON: Record<SocialPlatform, ComponentType<{ size?: number; className?: string }>> = {
  linkedin: LogoLinkedin,
  x: LogoX,
  facebook: LogoFacebook,
  instagram: LogoInstagram,
}

export function SocialNode({ data }: NodeProps) {
  const p = data as unknown as FunnelMetricsSocialNode
  const Icon = PLATFORM_ICON[p.platform] ?? Share
  return (
    <div className="w-64 rounded-lg border border-sky-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-sky-100 px-3 py-2">
        <Icon size={16} className="text-[#1175E4]" />
        <span className="text-xs font-semibold uppercase tracking-wide text-[#1175E4]">{p.platform}</span>
      </div>
      <div className="px-3 py-2">
        <div className="truncate text-sm font-medium text-slate-900">{p.title ?? '(untitled)'}</div>
        <div className="mt-1 grid grid-cols-2 gap-1 text-[11px] text-slate-500">
          <div>Impressions</div><div className="text-right text-slate-700">{p.impressions.toLocaleString()}</div>
          <div>Clicks</div><div className="text-right text-slate-700">{p.clicks.toLocaleString()}</div>
          <div>Sessions</div><div className="text-right font-medium text-slate-900">{p.sessions.toLocaleString()}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
