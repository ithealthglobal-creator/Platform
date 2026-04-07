'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/auth-context'
import { CourseCard } from '@/components/academy/course-card'
import { getPhaseColor } from '@/lib/phase-colors'
import type { Course, UserCourseEnrollment, UserSectionProgress } from '@/lib/types'

type MappedCourse = Course & {
  section_count: number
  module_count: number
}

export default function CoursesPage() {
  const { profile } = useAuth()
  const [courses, setCourses] = useState<MappedCourse[]>([])
  const [enrollments, setEnrollments] = useState<UserCourseEnrollment[]>([])
  const [sectionProgress, setSectionProgress] = useState<UserSectionProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [activePhase, setActivePhase] = useState<string>('All')

  useEffect(() => {
    if (!profile) return

    async function fetchData() {
      setLoading(true)
      const [{ data: coursesData }, { data: enrollmentsData }, { data: progressData }] =
        await Promise.all([
          supabase
            .from('courses')
            .select('*, phase:phases(name), course_sections(id, course_modules(id))')
            .eq('is_published', true)
            .eq('is_active', true)
            .order('name'),
          supabase
            .from('user_course_enrollments')
            .select('*')
            .eq('user_id', profile!.id),
          supabase
            .from('user_section_progress')
            .select('*')
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

      setCourses(mapped)
      setEnrollments(enrollmentsData ?? [])
      setSectionProgress(progressData ?? [])
      setLoading(false)
    }

    fetchData()
  }, [profile])

  // Unique phases from courses
  const phases = Array.from(
    new Set(courses.map((c) => c.phase?.name).filter(Boolean) as string[]),
  )

  const filteredCourses =
    activePhase === 'All'
      ? courses
      : courses.filter((c) => c.phase?.name === activePhase)

  function getEnrollment(courseId: string): UserCourseEnrollment | undefined {
    return enrollments.find((e) => e.course_id === courseId)
  }

  function getProgress(courseId: string): number {
    const course = courses.find((c) => c.id === courseId)
    if (!course || course.section_count === 0) return 0
    const enrollment = getEnrollment(courseId)
    if (!enrollment) return 0
    // Count section IDs for this course from raw courses data
    const rawCourse = courses.find((c) => c.id === courseId) as any
    const sectionIds: string[] =
      rawCourse?.course_sections?.map((s: any) => s.id) ?? []
    const completed = sectionProgress.filter(
      (sp) =>
        sectionIds.includes(sp.section_id) &&
        sp.post_assessment_passed === true,
    ).length
    const total = sectionIds.length
    return total === 0 ? 0 : Math.round((completed / total) * 100)
  }

  if (loading) {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Academy
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Courses</h1>
        <div className="mt-6 grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-slate-200"
              style={{ borderRadius: '16px 0 16px 16px', height: 220 }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
        Academy
      </p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">Courses</h1>

      {/* Phase filter pills */}
      <div className="mt-5 flex items-center gap-2 flex-wrap">
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

      {/* Course grid */}
      <div className="mt-6">
        {filteredCourses.length === 0 ? (
          <div
            className="bg-white border border-slate-200 p-12 text-center text-slate-500 text-sm"
            style={{ borderRadius: '16px 0 16px 16px' }}
          >
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
                progress={getProgress(course.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
