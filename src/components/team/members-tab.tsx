'use client'

import { getPhaseColor } from '@/lib/phase-colors'
import type { Phase, Service, CompositeScore } from '@/lib/types'

interface MembersTabProps {
  members: { id: string; display_name: string; scores: CompositeScore | null; coursesCompleted: number }[]
  phases: Phase[]
  services: Pick<Service, 'id' | 'name' | 'phase_id'>[]
  teamAverages: CompositeScore
}

function cellStyle(pct: number | undefined): string {
  if (pct === undefined) return 'text-slate-300'
  if (pct >= 75) return 'bg-green-100 text-green-700'
  if (pct >= 26) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

export function MembersTab({ members, phases, services, teamAverages }: MembersTabProps) {
  // Sort phases by sort_order and group services under their phase
  const sortedPhases = [...phases].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const servicesByPhase: Record<string, Pick<Service, 'id' | 'name' | 'phase_id'>[]> = {}
  for (const phase of sortedPhases) {
    servicesByPhase[phase.id] = services.filter(s => s.phase_id === phase.id)
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            {/* Phase header row */}
            <tr>
              <th className="sticky left-0 z-10 bg-white py-2 pr-4 text-left font-medium text-slate-500 min-w-[160px]" />
              {sortedPhases.map(phase => {
                const count = servicesByPhase[phase.id]?.length ?? 0
                if (count === 0) return null
                return (
                  <th
                    key={phase.id}
                    colSpan={count}
                    className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider"
                    style={{ color: getPhaseColor(phase.name) }}
                  >
                    {phase.name}
                  </th>
                )
              })}
              <th className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                Courses
              </th>
            </tr>

            {/* Service header row */}
            <tr className="border-b border-slate-200">
              <th className="sticky left-0 z-10 bg-white py-2 pr-4 text-left text-xs font-medium text-slate-400">
                Member
              </th>
              {sortedPhases.flatMap(phase =>
                (servicesByPhase[phase.id] ?? []).map(service => (
                  <th
                    key={service.id}
                    className="px-2 py-2 text-center text-xs font-medium text-slate-500 max-w-[80px] whitespace-normal leading-tight"
                    style={{ minWidth: '72px' }}
                  >
                    {service.name}
                  </th>
                ))
              )}
              <th className="px-2 py-2 text-center text-xs font-medium text-slate-500" />
            </tr>
          </thead>

          <tbody>
            {members.map(member => (
              <tr key={member.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="sticky left-0 z-10 bg-white py-2 pr-4 font-medium text-slate-700 whitespace-nowrap">
                  {member.display_name}
                </td>
                {sortedPhases.flatMap(phase =>
                  (servicesByPhase[phase.id] ?? []).map(service => {
                    const svc = member.scores?.services[service.id]
                    const pct = svc?.pct
                    return (
                      <td key={service.id} className={`px-2 py-2 text-center rounded ${cellStyle(pct)}`}>
                        {pct !== undefined ? `${Math.round(pct)}%` : '—'}
                      </td>
                    )
                  })
                )}
                <td className="px-2 py-2 text-center text-slate-600">
                  {member.coursesCompleted}
                </td>
              </tr>
            ))}

            {/* Team average footer */}
            <tr className="bg-slate-50 font-bold">
              <td className="sticky left-0 z-10 bg-slate-50 py-2 pr-4 text-slate-700 whitespace-nowrap">
                Team Average
              </td>
              {sortedPhases.flatMap(phase =>
                (servicesByPhase[phase.id] ?? []).map(service => {
                  const svc = teamAverages.services[service.id]
                  const pct = svc?.pct
                  return (
                    <td key={service.id} className={`px-2 py-2 text-center rounded ${cellStyle(pct)}`}>
                      {pct !== undefined ? `${Math.round(pct)}%` : '—'}
                    </td>
                  )
                })
              )}
              <td className="px-2 py-2 text-center text-slate-600">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Color legend */}
      <div className="mt-4 flex items-center gap-6 text-xs text-slate-500">
        <span className="font-medium">Legend:</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-green-100" />
          <span className="text-green-700">≥ 75% — Strong</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-amber-100" />
          <span className="text-amber-700">26–74% — Developing</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-red-100" />
          <span className="text-red-700">≤ 25% — Needs attention</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="text-slate-300">—</span>
          <span>No data</span>
        </span>
      </div>
    </div>
  )
}
