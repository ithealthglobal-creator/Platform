'use client'

import type { JourneyTimelinePhase, TimeUnit } from '@/lib/types'
import { formatDuration } from '@/lib/journey'
import { PHASE_COLORS } from './gantt-chart'
import { ChevronRight, ChevronDown } from '@carbon/icons-react'
import { GanttServiceRow } from './gantt-service-row'

interface GanttPhaseRowProps {
  phase: JourneyTimelinePhase
  timeUnit: TimeUnit
  totalMinutes: number
  labelWidth: number
  expanded: boolean
  expandedServices: Record<string, boolean>
  onTogglePhase: (phaseId: string) => void
  onToggleService: (serviceId: string) => void
}

export function GanttPhaseRow({
  phase,
  timeUnit,
  totalMinutes,
  labelWidth,
  expanded,
  expandedServices,
  onTogglePhase,
  onToggleService,
}: GanttPhaseRowProps) {
  const colors = PHASE_COLORS[phase.name.toLowerCase()] ?? PHASE_COLORS.operate
  const leftPct =
    totalMinutes > 0 ? (phase.startMinute / totalMinutes) * 100 : 0
  const widthPct =
    totalMinutes > 0 ? (phase.durationMinutes / totalMinutes) * 100 : 0

  const ChevronIcon = expanded ? ChevronDown : ChevronRight

  return (
    <>
      {/* Phase header row */}
      <div
        className="flex cursor-pointer border-b border-slate-200"
        style={{ backgroundColor: colors.bg }}
        onClick={() => onTogglePhase(phase.id)}
      >
        <div
          className="flex shrink-0 items-center gap-2 px-4 py-2.5"
          style={{ width: labelWidth }}
        >
          <ChevronIcon size={14} style={{ color: colors.barFrom }} />
          <span
            className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
            style={{ backgroundColor: colors.barFrom }}
          >
            {phase.name}
          </span>
          {!expanded && (
            <span className="ml-auto text-xs text-slate-500">
              {phase.services.length} service{phase.services.length !== 1 ? 's' : ''}{' '}
              &middot; {formatDuration(phase.durationMinutes, timeUnit)}
            </span>
          )}
        </div>
        <div className="relative flex flex-1 items-center">
          {phase.durationMinutes > 0 && (
            <svg
              className="absolute h-6"
              style={{
                left: `${leftPct}%`,
                width: `${Math.max(widthPct, 0.5)}%`,
              }}
            >
              <rect
                width="100%"
                height="100%"
                rx="4"
                fill={`url(#grad-${phase.name.toLowerCase()})`}
              />
              <text
                x="8"
                y="50%"
                dominantBaseline="central"
                fill="white"
                fontSize="10"
                fontWeight="600"
                fontFamily="Poppins, sans-serif"
              >
                {formatDuration(phase.durationMinutes, timeUnit)}
              </text>
            </svg>
          )}
        </div>
      </div>

      {/* Expanded services */}
      {expanded &&
        phase.services.map((service) => (
          <GanttServiceRow
            key={service.id}
            service={service}
            timeUnit={timeUnit}
            totalMinutes={totalMinutes}
            labelWidth={labelWidth}
            expanded={!!expandedServices[service.id]}
            onToggle={() => onToggleService(service.id)}
            stepBarColor={colors.stepBar}
          />
        ))}
    </>
  )
}
