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
      className="bg-white overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      style={{ borderRadius: '16px 0 16px 16px' }}
      onClick={handleClick}
    >
      {/* Phase-colored header */}
      <div
        className="h-24 flex items-center justify-center relative"
        style={{ background: phaseColor, borderRadius: '16px 0 0 0' }}
      >
        <Education size={40} className="text-white" />
        {isEnrolled && !isCompleted && (
          <span
            className="absolute top-2 right-2 bg-white/90 text-[10px] font-semibold px-2.5 py-0.5 flex items-center gap-1"
            style={{ borderRadius: '8px 0 8px 8px', color: phaseColor }}
          >
            <Time size={12} />
            In Progress
          </span>
        )}
        {isCompleted && (
          <span
            className="absolute top-2 right-2 bg-white/90 text-[10px] font-semibold px-2.5 py-0.5 flex items-center gap-1 text-green-700"
            style={{ borderRadius: '8px 0 8px 8px' }}
          >
            <CheckmarkFilled size={12} className="text-green-600" />
            Completed
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="p-3.5">
        <div
          className="text-[11px] font-semibold uppercase tracking-wide mb-1"
          style={{ color: phaseColor }}
        >
          {phaseName}
        </div>
        <div className="text-[15px] font-semibold text-slate-900 mb-1.5">
          {course.name}
        </div>
        <div className="text-xs text-slate-500 mb-3 flex items-center gap-2">
          <span>{course.section_count} sections</span>
          <span>·</span>
          <span>{course.module_count} videos</span>
        </div>

        {/* Progress bar for in-progress */}
        {isEnrolled && !isCompleted && progress != null && (
          <>
            <div className="bg-slate-100 rounded h-1.5 mb-1">
              <div
                className="rounded h-1.5"
                style={{ width: `${progress}%`, background: phaseColor }}
              />
            </div>
            <div className="text-[10px] text-slate-400 text-right mb-2">
              {progress}% complete
            </div>
          </>
        )}

        {/* Action button */}
        {isCompleted ? (
          <button
            className="w-full py-2 text-xs font-semibold border border-slate-200 bg-white text-slate-900"
            style={{ borderRadius: '10px 0 10px 10px' }}
            onClick={(e) => { e.stopPropagation(); router.push(`/portal/academy/courses/${course.id}`) }}
          >
            View Certificate
          </button>
        ) : isEnrolled ? (
          <button
            className="w-full py-2 text-xs font-semibold text-white border-0"
            style={{ background: phaseColor, borderRadius: '10px 0 10px 10px' }}
            onClick={(e) => { e.stopPropagation(); router.push(`/portal/academy/courses/${course.id}/learn`) }}
          >
            Continue
          </button>
        ) : (
          <button
            className="w-full py-2 text-xs font-semibold text-white border-0"
            style={{ background: phaseColor, borderRadius: '10px 0 10px 10px' }}
            onClick={(e) => { e.stopPropagation(); router.push(`/portal/academy/courses/${course.id}`) }}
          >
            Start Course
          </button>
        )}
      </div>
    </div>
  )
}
