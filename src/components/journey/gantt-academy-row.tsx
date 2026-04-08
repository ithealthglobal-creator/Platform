'use client'

import type { JourneyAcademyCourse } from '@/lib/types'
import { Education } from '@carbon/icons-react'

interface GanttAcademyRowProps {
  course: JourneyAcademyCourse
  serviceStartMinute: number
  serviceDurationMinutes: number
  totalMinutes: number
  labelWidth: number
}

export function GanttAcademyRow({
  course,
  serviceStartMinute,
  serviceDurationMinutes,
  totalMinutes,
  labelWidth,
}: GanttAcademyRowProps) {
  const leftPct = totalMinutes > 0 ? (serviceStartMinute / totalMinutes) * 100 : 0
  const widthPct =
    totalMinutes > 0 ? (serviceDurationMinutes / totalMinutes) * 100 : 0

  return (
    <div className="flex border-b border-slate-50 bg-brand-secondary/5">
      <div
        className="flex shrink-0 items-center gap-1.5 px-4 py-1"
        style={{ width: labelWidth, paddingLeft: 56 }}
      >
        <Education size={14} className="shrink-0 text-brand-secondary" />
        <span className="truncate text-xs italic text-brand-secondary">
          {course.courseName}
        </span>
        {course.isRequired && (
          <span className="ml-auto shrink-0 rounded bg-brand-secondary/20 px-1 py-0.5 text-[9px] font-medium text-brand-secondary">
            Required
          </span>
        )}
      </div>
      <div className="relative flex flex-1 items-center">
        {serviceDurationMinutes > 0 && (
          <svg
            className="absolute h-3.5"
            style={{
              left: `${leftPct}%`,
              width: `${Math.max(widthPct, 0.3)}%`,
            }}
          >
            <rect
              width="100%"
              height="100%"
              rx="2"
              fill="url(#academy-stripe)"
              opacity="0.8"
            />
          </svg>
        )}
      </div>
    </div>
  )
}
