'use client'

import type { JourneyTimelineService, TimeUnit } from '@/lib/types'
import { formatDuration } from '@/lib/journey'
import { ChevronRight, ChevronDown } from '@carbon/icons-react'
import { GanttAcademyRow } from './gantt-academy-row'
import { GanttStepRow } from './gantt-step-row'

interface GanttServiceRowProps {
  service: JourneyTimelineService
  timeUnit: TimeUnit
  totalMinutes: number
  labelWidth: number
  expanded: boolean
  onToggle: () => void
  stepBarColor: string
}

export function GanttServiceRow({
  service,
  timeUnit,
  totalMinutes,
  labelWidth,
  expanded,
  onToggle,
  stepBarColor,
}: GanttServiceRowProps) {
  const leftPct =
    totalMinutes > 0 ? (service.startMinute / totalMinutes) * 100 : 0
  const widthPct =
    totalMinutes > 0 ? (service.durationMinutes / totalMinutes) * 100 : 0

  const ChevronIcon = expanded ? ChevronDown : ChevronRight

  return (
    <>
      {/* Service header row */}
      <div
        className="flex cursor-pointer border-b border-slate-100 bg-white hover:bg-slate-50/50"
        onClick={onToggle}
      >
        <div
          className="flex shrink-0 items-center gap-2 px-4 py-2"
          style={{ width: labelWidth, paddingLeft: 36 }}
        >
          <ChevronIcon size={14} className="shrink-0 text-slate-400" />
          <span className="truncate text-sm font-medium text-slate-700">
            {service.name}
          </span>
          <span className="ml-auto shrink-0 text-xs text-slate-400">
            {formatDuration(service.durationMinutes, timeUnit)}
          </span>
        </div>
        <div className="relative flex flex-1 items-center">
          {service.durationMinutes > 0 && (
            <div
              className="absolute h-5 rounded"
              style={{
                left: `${leftPct}%`,
                width: `${Math.max(widthPct, 0.3)}%`,
                backgroundColor: stepBarColor,
                opacity: 0.6,
              }}
              title={`${service.name} — ${formatDuration(service.durationMinutes, timeUnit)}`}
            />
          )}
          {service.durationMinutes === 0 && (
            <span
              className="absolute text-xs italic text-slate-400"
              style={{ left: `${leftPct}%`, paddingLeft: 4 }}
            >
              Runbook pending
            </span>
          )}
        </div>
      </div>

      {/* Expanded children: academy courses then runbook steps */}
      {expanded && (
        <>
          {service.academyCourses.map((course) => (
            <GanttAcademyRow
              key={course.courseId}
              course={course}
              serviceStartMinute={service.startMinute}
              serviceDurationMinutes={service.durationMinutes}
              totalMinutes={totalMinutes}
              labelWidth={labelWidth}
            />
          ))}
          {service.steps.map((step, i) => (
            <GanttStepRow
              key={step.id}
              step={step}
              index={i}
              totalMinutes={totalMinutes}
              labelWidth={labelWidth}
              timeUnit={timeUnit}
              barColor={stepBarColor}
            />
          ))}
        </>
      )}
    </>
  )
}
