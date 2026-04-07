'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/auth-context'
import { StatsCard } from '@/components/academy/stats-card'
import { CourseCard } from '@/components/academy/course-card'
import { getPhaseColor } from '@/lib/phase-colors'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Document, Time, CheckmarkFilled, Certificate, Education, ArrowRight } from '@carbon/icons-react'
import type { Course, UserCourseEnrollment, UserSectionProgress } from '@/lib/types'

type MappedCourse = Course & {
  section_count: number
  module_count: number
}

type EnrollmentWithCourse = UserCourseEnrollment & {
  course: {
    id: string
    name: string
    phase?: { name: string }
    course_sections: { id: string }[]
  }
}

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
  const [allCourses, setAllCourses] = useState<MappedCourse[]>([])
  const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([])
  const [enrollmentMap, setEnrollmentMap] = useState<UserCourseEnrollment[]>([])
  const [sectionProgress, setSectionProgress] = useState<UserSectionProgress[]>([])
  const [certificates, setCertificates] = useState<{ id: string; course_id: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [activePhase, setActivePhase] = useState<string>('All')
  const [myFilter, setMyFilter] = useState<'All' | 'In Progress' | 'Completed'>('All')

  useEffect(() => {
    if (!profile) return

    async function fetchData() {
      setLoading(true)
      const [
        { data: coursesData },
        { data: enrollmentsData },
        { data: enrollmentMapData },
        { data: progressData },
        { data: certsData },
      ] = await Promise.all([
        supabase
          .from('courses')
          .select('*, phase:phases(name), course_sections(id, course_modules(id))')
          .eq('is_published', true)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('user_course_enrollments')
          .select('*, course:courses(*, phase:phases(name), course_sections(id))')
          .eq('user_id', profile!.id)
          .order('last_active_at', { ascending: false }),
        supabase
          .from('user_course_enrollments')
          .select('*')
          .eq('user_id', profile!.id),
        supabase
          .from('user_section_progress')
          .select('*')
          .eq('user_id', profile!.id),
        supabase
          .from('certificates')
          .select('id, course_id')
          .eq('user_id', profile!.id),
      ])

      const mapped: MappedCourse[] = (coursesData ?? []).map((c: any) => ({
        ...c,
        section_count: c.course_sections?.length ?? 0,
        module_count:
          c.course_sections?.reduce(
            (sum: number, s: any) => sum + (s.course_modules?.length ?? 0),
            0,
          ) ?? 0,
      }))

      setAllCourses(mapped)
      setEnrollments((enrollmentsData ?? []) as EnrollmentWithCourse[])
      setEnrollmentMap(enrollmentMapData ?? [])
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

  // Phase filters from all courses
  const phases = Array.from(
    new Set(allCourses.map((c) => c.phase?.name).filter(Boolean) as string[]),
  )

  const filteredCourses =
    activePhase === 'All'
      ? allCourses
      : allCourses.filter((c) => c.phase?.name === activePhase)

  // My courses filter
  const filteredEnrollments = enrollments.filter((e) => {
    if (myFilter === 'In Progress') return e.completed_at == null
    if (myFilter === 'Completed') return e.completed_at != null
    return true
  })

  function getEnrollment(courseId: string): UserCourseEnrollment | undefined {
    return enrollmentMap.find((e) => e.course_id === courseId)
  }

  function getCourseProgress(enrollment: EnrollmentWithCourse): number {
    const sectionIds = enrollment.course?.course_sections?.map((s) => s.id) ?? []
    if (sectionIds.length === 0) return 0
    const passedCount = sectionProgress.filter(
      (sp) => sectionIds.includes(sp.section_id) && sp.post_assessment_passed === true,
    ).length
    return Math.round((passedCount / sectionIds.length) * 100)
  }

  function getCardProgress(courseId: string): number {
    const course = allCourses.find((c) => c.id === courseId)
    if (!course || course.section_count === 0) return 0
    const enrollment = getEnrollment(courseId)
    if (!enrollment) return 0
    const rawCourse = allCourses.find((c) => c.id === courseId) as any
    const sectionIds: string[] =
      rawCourse?.course_sections?.map((s: any) => s.id) ?? []
    const completedCount = sectionProgress.filter(
      (sp) => sectionIds.includes(sp.section_id) && sp.post_assessment_passed === true,
    ).length
    return sectionIds.length === 0 ? 0 : Math.round((completedCount / sectionIds.length) * 100)
  }

  function getCertificateId(courseId: string): string | undefined {
    return certificates.find((c) => c.course_id === courseId)?.id
  }

  if (loading) {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Academy</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Academy</h1>
        <div className="mt-6 grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Academy</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">Academy</h1>

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <StatsCard label="Enrolled" value={enrolled} icon={Document} iconBg="bg-blue-50" iconColor="#1175E4" />
        <StatsCard label="In Progress" value={inProgress} icon={Time} iconBg="bg-amber-50" iconColor="#d97706" />
        <StatsCard label="Completed" value={completed} icon={CheckmarkFilled} iconBg="bg-green-50" iconColor="#16a34a" />
        <StatsCard label="Certificates" value={certsCount} icon={Certificate} iconBg="bg-purple-50" iconColor="#9333ea" />
      </div>

      {/* Tabs: All Courses / My Courses */}
      <Tabs defaultValue="all-courses" className="mt-6">
        <TabsList variant="line">
          <TabsTrigger value="all-courses">All Courses</TabsTrigger>
          <TabsTrigger value="my-courses">My Courses</TabsTrigger>
        </TabsList>

        {/* All Courses tab */}
        <TabsContent value="all-courses" className="mt-6">
          {/* Phase filter pills */}
          <div className="mb-5 flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActivePhase('All')}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${activePhase === 'All' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              All
            </button>
            {phases.map((phase) => {
              const color = getPhaseColor(phase)
              const isActive = activePhase === phase
              return (
                <button
                  key={phase}
                  onClick={() => setActivePhase(phase)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${isActive ? 'text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  style={isActive ? { backgroundColor: color } : undefined}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                    {phase}
                  </span>
                </button>
              )
            })}
          </div>

          {filteredCourses.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
              {activePhase !== 'All'
                ? 'No courses found for this phase.'
                : 'No courses available yet. Check back soon.'}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {filteredCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  enrollment={getEnrollment(course.id)}
                  progress={getCardProgress(course.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* My Courses tab */}
        <TabsContent value="my-courses" className="mt-6">
          {/* Status filter pills */}
          <div className="mb-5 flex items-center gap-2">
            {(['All', 'In Progress', 'Completed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setMyFilter(f)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${myFilter === f ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {f}
              </button>
            ))}
          </div>

          {filteredEnrollments.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
              <p className="text-sm text-slate-500">
                {myFilter === 'All'
                  ? "You haven't enrolled in any courses yet."
                  : `No ${myFilter.toLowerCase()} courses.`}
              </p>
              {myFilter === 'All' && (
                <button
                  onClick={() => {
                    const tabEl = document.querySelector('[data-value="all-courses"]') as HTMLElement
                    tabEl?.click()
                  }}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#1175E4] hover:text-[#0d5fc4]"
                >
                  Browse courses <ArrowRight size={14} />
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEnrollments.map((enrollment) => {
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
                    className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4"
                  >
                    {/* Phase icon */}
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `${phaseColor}15` }}
                    >
                      <Education size={28} style={{ color: phaseColor }} />
                    </div>

                    {/* Course info + progress */}
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{course?.name}</span>
                        {phaseName && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                            style={{ backgroundColor: phaseColor }}
                          >
                            {phaseName}
                          </span>
                        )}
                        {isCompleted && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                            Completed
                          </span>
                        )}
                      </div>
                      <p className="mb-2 text-xs text-slate-400">
                        {sectionsCompleted} of {sectionTotal} sections
                        {enrollment.last_active_at && (
                          <> &middot; Last active {timeAgo(enrollment.last_active_at)}</>
                        )}
                      </p>
                      <div className="h-1.5 max-w-xs overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${progress}%`,
                            background: isCompleted
                              ? '#16a34a'
                              : `linear-gradient(90deg, ${phaseColor}99, ${phaseColor})`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="shrink-0">
                      {isCompleted && certId ? (
                        <Link
                          href={`/portal/academy/certificates/${certId}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          <Certificate size={14} />
                          Certificate
                        </Link>
                      ) : isCompleted ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 px-4 py-2 text-xs font-semibold text-green-700">
                          <CheckmarkFilled size={14} />
                          Completed
                        </span>
                      ) : (
                        <Link
                          href={`/portal/academy/courses/${course?.id}/learn`}
                          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                          style={{ background: phaseColor }}
                        >
                          Continue
                          <ArrowRight size={14} />
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
