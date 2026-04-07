'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/auth-context'
import { StatsCard } from '@/components/academy/stats-card'
import { getPhaseColor } from '@/lib/phase-colors'
import { Document, Time, CheckmarkFilled, Certificate, Education, ArrowRight } from '@carbon/icons-react'
import type { UserCourseEnrollment, UserSectionProgress } from '@/lib/types'

type EnrollmentWithCourse = UserCourseEnrollment & {
  course: {
    id: string
    name: string
    phase?: { name: string }
    course_sections: { id: string }[]
  }
}

type FilterState = 'All' | 'In Progress' | 'Completed'

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
  const days = Math.floor(diff / 86400)
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

export default function AcademyPage() {
  const { profile } = useAuth()
  const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([])
  const [sectionProgress, setSectionProgress] = useState<UserSectionProgress[]>([])
  const [certificates, setCertificates] = useState<{ id: string; course_id: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterState>('All')

  useEffect(() => {
    if (!profile) return

    async function fetchData() {
      setLoading(true)
      const [{ data: enrollmentsData }, { data: progressData }, { data: certsData }] =
        await Promise.all([
          supabase
            .from('user_course_enrollments')
            .select('*, course:courses(*, phase:phases(name), course_sections(id))')
            .eq('user_id', profile!.id)
            .order('last_active_at', { ascending: false }),
          supabase
            .from('user_section_progress')
            .select('*')
            .eq('user_id', profile!.id),
          supabase
            .from('certificates')
            .select('id, course_id')
            .eq('user_id', profile!.id),
        ])

      setEnrollments((enrollmentsData ?? []) as EnrollmentWithCourse[])
      setSectionProgress(progressData ?? [])
      setCertificates(certsData ?? [])
      setLoading(false)
    }

    fetchData()
  }, [profile])

  // Stats
  const enrolled = enrollments.length
  const inProgress = enrollments.filter((e) => e.completed_at == null).length
  const completed = enrollments.filter((e) => e.completed_at != null).length
  const certsCount = certificates.length

  // Progress calculation per course
  function getCourseProgress(enrollment: EnrollmentWithCourse): number {
    const sectionIds = enrollment.course?.course_sections?.map((s) => s.id) ?? []
    if (sectionIds.length === 0) return 0
    const passedCount = sectionProgress.filter(
      (sp) => sectionIds.includes(sp.section_id) && sp.post_assessment_passed === true,
    ).length
    return Math.round((passedCount / sectionIds.length) * 100)
  }

  function getCertificateId(courseId: string): string | undefined {
    return certificates.find((c) => c.course_id === courseId)?.id
  }

  const filteredEnrollments = enrollments.filter((e) => {
    if (filter === 'In Progress') return e.completed_at == null
    if (filter === 'Completed') return e.completed_at != null
    return true
  })

  if (loading) {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Academy</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">My Courses</h1>
        <div className="mt-6 grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-slate-200 h-20"
              style={{ borderRadius: '16px 0 16px 16px' }}
            />
          ))}
        </div>
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-slate-200 h-24"
              style={{ borderRadius: '16px 0 16px 16px' }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Academy</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">My Courses</h1>

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <StatsCard
          label="Enrolled"
          value={enrolled}
          icon={Document}
          iconBg="bg-blue-50"
          iconColor="#1175E4"
        />
        <StatsCard
          label="In Progress"
          value={inProgress}
          icon={Time}
          iconBg="bg-amber-50"
          iconColor="#d97706"
        />
        <StatsCard
          label="Completed"
          value={completed}
          icon={CheckmarkFilled}
          iconBg="bg-green-50"
          iconColor="#16a34a"
        />
        <StatsCard
          label="Certificates"
          value={certsCount}
          icon={Certificate}
          iconBg="bg-purple-50"
          iconColor="#9333ea"
        />
      </div>

      {/* Filter pills */}
      <div className="mt-6 flex items-center gap-2">
        {(['All', 'In Progress', 'Completed'] as FilterState[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-1.5 text-xs font-semibold transition-colors"
            style={{
              borderRadius: '16px 0 16px 16px',
              background: filter === f ? '#133258' : '#e2e8f0',
              color: filter === f ? '#fff' : '#475569',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Course list */}
      <div className="mt-4 space-y-3">
        {filteredEnrollments.length === 0 ? (
          <div
            className="bg-white border border-slate-200 p-10 text-center"
            style={{ borderRadius: '16px 0 16px 16px' }}
          >
            <p className="text-sm text-slate-500">
              {filter === 'All'
                ? "You haven't enrolled in any courses yet."
                : `No ${filter.toLowerCase()} courses.`}
            </p>
            {filter === 'All' && (
              <Link
                href="/portal/academy/courses"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#1175E4] hover:text-[#0d5fc4]"
              >
                Browse courses <ArrowRight size={14} />
              </Link>
            )}
          </div>
        ) : (
          filteredEnrollments.map((enrollment) => {
            const course = enrollment.course
            const phaseName = course?.phase?.name ?? ''
            const phaseColor = getPhaseColor(phaseName)
            const isCompleted = enrollment.completed_at != null
            const progress = isCompleted ? 100 : getCourseProgress(enrollment)
            const sectionTotal = course?.course_sections?.length ?? 0
            const sectionsCompleted = isCompleted
              ? sectionTotal
              : Math.round((progress / 100) * sectionTotal)
            const certId = getCertificateId(course?.id ?? '')

            return (
              <div
                key={enrollment.id}
                className="bg-white border border-slate-200 p-4 flex items-center gap-4"
                style={{ borderRadius: '16px 0 16px 16px' }}
              >
                {/* Phase icon */}
                <div
                  className="shrink-0 w-14 h-14 flex items-center justify-center"
                  style={{
                    background: phaseColor,
                    borderRadius: '12px 0 12px 12px',
                  }}
                >
                  <Education size={28} className="text-white" />
                </div>

                {/* Middle: course info + progress */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-semibold text-slate-900">{course?.name}</span>
                    {phaseName && (
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5"
                        style={{
                          borderRadius: '8px 0 8px 8px',
                          background: phaseColor + '1a',
                          color: phaseColor,
                        }}
                      >
                        {phaseName}
                      </span>
                    )}
                    {isCompleted && (
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 bg-green-100 text-green-700"
                        style={{ borderRadius: '8px 0 8px 8px' }}
                      >
                        Completed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-2">
                    {sectionsCompleted} of {sectionTotal} sections
                    {enrollment.last_active_at && (
                      <> · Last active {timeAgo(enrollment.last_active_at)}</>
                    )}
                  </p>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full max-w-xs">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${progress}%`,
                        background: isCompleted ? '#16a34a' : phaseColor,
                      }}
                    />
                  </div>
                </div>

                {/* Right: action button */}
                <div className="shrink-0">
                  {isCompleted && certId ? (
                    <Link
                      href={`/portal/academy/certificates/${certId}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                      style={{ borderRadius: '10px 0 10px 10px' }}
                    >
                      <Certificate size={14} />
                      Certificate
                    </Link>
                  ) : isCompleted ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-green-200 text-green-700"
                      style={{ borderRadius: '10px 0 10px 10px' }}
                    >
                      <CheckmarkFilled size={14} />
                      Completed
                    </span>
                  ) : (
                    <Link
                      href={`/portal/academy/courses/${course?.id}/learn`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                      style={{
                        borderRadius: '10px 0 10px 10px',
                        background: phaseColor,
                      }}
                    >
                      Continue
                      <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
