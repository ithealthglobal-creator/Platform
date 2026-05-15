'use client'

import { Badge } from '@/components/ui/badge'
import { getPhaseColor } from '@/lib/phase-colors'
import type { ServiceStatus } from '@/lib/types'

interface ServiceGridCardProps {
  name: string
  description: string | null
  phaseName: string | null
  status: ServiceStatus
  productCount: number
  onClick: () => void
}

function statusBadgeVariant(status: ServiceStatus) {
  switch (status) {
    case 'active':
      return 'default' as const
    case 'in_review':
      return 'secondary' as const
    case 'draft':
      return 'secondary' as const
    case 'archived':
      return 'outline' as const
  }
}

function statusLabel(status: ServiceStatus) {
  if (status === 'in_review') return 'In Review'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function ServiceGridCard({
  name,
  description,
  phaseName,
  status,
  productCount,
  onClick,
}: ServiceGridCardProps) {
  const phaseColor = getPhaseColor(phaseName)

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden bg-white text-left transition-shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      style={{ borderRadius: '16px 0 16px 16px', border: '1px solid #e5e7eb' }}
    >
      <div className="h-1" style={{ backgroundColor: phaseColor }} />

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
            style={{ backgroundColor: phaseColor }}
          >
            {phaseName ?? 'Unphased'}
          </span>
        </div>

        <h3 className="text-[15px] font-semibold text-slate-900">{name}</h3>
        <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-slate-500">
          {description || 'No description yet.'}
        </p>

        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <Badge variant={statusBadgeVariant(status)}>{statusLabel(status)}</Badge>
          <span className="text-xs text-slate-500">
            {productCount} {productCount === 1 ? 'product' : 'products'}
          </span>
        </div>
      </div>
    </button>
  )
}
