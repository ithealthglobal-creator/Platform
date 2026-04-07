'use client'

import type { JourneyTimelineStep, TimeUnit } from '@/lib/types'
import { formatDuration } from '@/lib/journey'

interface GanttStepRowProps {
  step: JourneyTimelineStep
  index: number
  totalMinutes: number
  labelWidth: number
  timeUnit: TimeUnit
  barColor: string
}

export function GanttStepRow({
  step,
  index,
  totalMinutes,
  labelWidth,
  timeUnit,
  barColor,
}: GanttStepRowProps) {
  const leftPct = totalMinutes > 0 ? (step.startMinute / totalMinutes) * 100 : 0
  const widthPct = totalMinutes > 0 ? (step.durationMinutes / totalMinutes) * 100 : 0

  return (
    <div className="flex border-b border-slate-50 bg-white">
      <div
        className="flex shrink-0 items-center gap-1.5 px-4 py-1"
        style={{ width: labelWidth, paddingLeft: 56 }}
      >
        <span className="text-xs text-slate-400">{index + 1}.</span>
        <span className="truncate text-xs text-slate-600">{step.title}</span>
        <span className="ml-auto shrink-0 text-[10px] text-slate-400">
          {formatDuration(step.durationMinutes, timeUnit)}
        </span>
      </div>
      <div className="relative flex flex-1 items-center">
        {step.durationMinutes > 0 && (
          <div
            className="absolute h-3.5 rounded-sm"
            style={{
              left: `${leftPct}%`,
              width: `${Math.max(widthPct, 0.3)}%`,
              backgroundColor: barColor,
            }}
            title={`${step.title} — ${formatDuration(step.durationMinutes, timeUnit)}${step.role ? ` (${step.role})` : ''}`}
          />
        )}
      </div>
    </div>
  )
}
