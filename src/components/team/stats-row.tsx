'use client'

import { getMaturityLabel } from '@/lib/scoring'

interface StatsRowProps {
  memberCount: number
  avgMaturity: number
  trend30d: number
  coursesCompleted: number
}

export function StatsRow({ memberCount, avgMaturity, trend30d, coursesCompleted }: StatsRowProps) {
  const trendPositive = trend30d >= 0
  const trendColor = trendPositive ? '#16a34a' : '#dc2626'
  const trendPrefix = trendPositive ? '+' : ''

  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Card 1: Team Members */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Team Members</p>
        <p className="mt-3 text-4xl font-bold text-slate-900">{memberCount}</p>
      </div>

      {/* Card 2: Avg Maturity */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Avg Maturity</p>
        <div className="mt-3 flex items-end gap-2.5">
          <p className="text-4xl font-bold" style={{ color: '#1175E4' }}>{avgMaturity}%</p>
          <span
            className="mb-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
            style={{ backgroundColor: '#1175E4' }}
          >
            {getMaturityLabel(avgMaturity)}
          </span>
        </div>
      </div>

      {/* Card 3: 30-Day Trend */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">30-Day Trend</p>
        <p className="mt-3 text-4xl font-bold" style={{ color: trendColor }}>
          {trendPrefix}{trend30d}%
        </p>
      </div>

      {/* Card 4: Courses Completed */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Courses Completed</p>
        <p className="mt-3 text-4xl font-bold" style={{ color: '#EDB600' }}>{coursesCompleted}</p>
      </div>
    </div>
  )
}
