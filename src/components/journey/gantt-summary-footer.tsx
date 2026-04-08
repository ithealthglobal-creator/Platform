'use client'

import type { JourneyTimeline, TimeUnit } from '@/lib/types'
import { formatDuration } from '@/lib/journey'

interface GanttSummaryFooterProps {
  timeline: JourneyTimeline
  timeUnit: TimeUnit
  labelWidth: number
}

export function GanttSummaryFooter({
  timeline,
  timeUnit,
  labelWidth,
}: GanttSummaryFooterProps) {
  return (
    <div className="flex border-t-2 border-brand-primary/20 bg-brand-primary/5">
      <div
        className="shrink-0 px-4 py-3 text-sm font-semibold text-brand-dark"
        style={{ width: labelWidth }}
      >
        Total Implementation
      </div>
      <div className="flex flex-1 items-center gap-4 px-4 py-3">
        <span className="text-sm font-semibold text-brand-primary">
          {formatDuration(timeline.totalMinutes, timeUnit)}
        </span>
        <span className="text-xs text-slate-500">
          {timeline.serviceCount} service{timeline.serviceCount !== 1 ? 's' : ''} across{' '}
          {timeline.phaseCount} phase{timeline.phaseCount !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}
