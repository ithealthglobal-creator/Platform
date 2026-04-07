'use client'

import type { CarbonIconType } from '@carbon/icons-react'

interface StatsCardProps {
  label: string
  value: number
  icon: CarbonIconType
  iconBg: string  // tailwind bg class e.g. "bg-blue-50"
  iconColor: string  // hex color for icon
}

export function StatsCard({ label, value, icon: Icon, iconBg, iconColor }: StatsCardProps) {
  return (
    <div
      className="bg-white p-4 shadow-sm flex items-center gap-3"
      style={{ borderRadius: '16px 0 16px 16px' }}
    >
      <div
        className={`w-11 h-11 flex items-center justify-center ${iconBg}`}
        style={{ borderRadius: '12px 0 12px 12px' }}
      >
        <Icon size={22} style={{ color: iconColor }} />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900 leading-none">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  )
}
