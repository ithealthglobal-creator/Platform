'use client'

import { getPhaseColor } from '@/lib/phase-colors'
import type { Course, UserCourseEnrollment } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { Education, Time, CheckmarkFilled } from '@carbon/icons-react'

interface CourseCardProps {
  course: Course & { section_count: number; module_count: number }
  enrollment?: UserCourseEnrollment | null
  progress?: number // 0-100
}

export function CourseCard({ course, enrollment, progress }: CourseCardProps) {
  const router = useRouter()
  const phaseName = course.phase?.name ?? ''
  const phaseColor = getPhaseColor(phaseName)
  const isCompleted = enrollment?.completed_at != null
  const isEnrolled = enrollment != null

  function handleClick() {
    if (isCompleted) {
      router.push(`/portal/academy/courses/${course.id}`)
    } else if (isEnrolled) {
      router.push(`/portal/academy/courses/${course.id}/learn`)
    } else {
      router.push(`/portal/academy/courses/${course.id}`)
    }
  }

  return (
    <div
      className="group flex flex-col overflow-hidden bg-white border border-slate-200 cursor-pointer transition-all hover:shadow-lg hover:border-slate-300"
      style={{ borderRadius: '16px 0 16px 16px' }}
      onClick={handleClick}
    >
      {/* Gradient header with phase color */}
      <div
        className="relative h-28 flex items-end p-4"
        style={{
          background: `linear-gradient(135deg, ${phaseColor}18 0%, ${phaseColor}40 100%)`,
        }}
      >
        {/* Large faded icon */}
        <Education
          size={64}
          className="absolute right-3 top-3 opacity-10"
          style={{ color: phaseColor }}
        />

        {/* Status badge */}
        {isEnrolled && !isCompleted && (
          <span
            className="absolute top-3 right-3 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: `${phaseColor}20`, color: phaseColor }}
          >
            <Time size={12} />
            In Progress
          </span>
        )}
        {isCompleted && (
          <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-semibold text-green-700">
            <CheckmarkFilled size={12} />
            Completed
          </span>
        )}

        {/* Phase pill at bottom-left of header */}
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
          style={{ backgroundColor: phaseColor }}
        >
          {phaseName}
        </span>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-[15px] font-semibold text-slate-900 group-hover:text-slate-700">
          {course.name}
        </h3>
        <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
          <span>{course.section_count} sections</span>
          <span>·</span>
          <span>{course.module_count} videos</span>
        </div>

        {/* Progress bar for in-progress */}
        {isEnrolled && !isCompleted && progress != null && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-400">Progress</span>
              <span className="text-[10px] font-semibold" style={{ color: phaseColor }}>{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100">
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${phaseColor}99, ${phaseColor})` }}
              />
            </div>
          </div>
        )}

        {/* Spacer to push button to bottom */}
        <div className="flex-1" />

        {/* Action button */}
        <div className="mt-4">
          {isCompleted ? (
            <button
              className="w-full py-2.5 text-xs font-semibold border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
              style={{ borderRadius: '10px 0 10px 10px' }}
              onClick={(e) => { e.stopPropagation(); router.push(`/portal/academy/courses/${course.id}`) }}
            >
              View Certificate
            </button>
          ) : isEnrolled ? (
            <button
              className="w-full py-2.5 text-xs font-semibold text-white border-0 transition-opacity hover:opacity-90"
              style={{ background: phaseColor, borderRadius: '10px 0 10px 10px' }}
              onClick={(e) => { e.stopPropagation(); router.push(`/portal/academy/courses/${course.id}/learn`) }}
            >
              Continue Learning
            </button>
          ) : (
            <button
              className="w-full py-2.5 text-xs font-semibold text-white border-0 transition-opacity hover:opacity-90"
              style={{ background: phaseColor, borderRadius: '10px 0 10px 10px' }}
              onClick={(e) => { e.stopPropagation(); router.push(`/portal/academy/courses/${course.id}`) }}
            >
              Start Course
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
