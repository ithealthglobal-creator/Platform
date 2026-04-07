'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/auth-context'
import { getPhaseColor } from '@/lib/phase-colors'
import type { UserCourseEnrollment } from '@/lib/types'
import { ArrowLeft, Education, Certificate, Play } from '@carbon/icons-react'

interface SectionRow {
  id: string
  name: string
  description: string | null
  sort_order: number
  is_active: boolean
  course_modules: { count: number }[]
  assessments: { count: number }[]
}

interface CourseDetail {
  id: string
  name: string
  description: string | null
  phase_id: string | null
  phase: { name: string } | null
  course_sections: SectionRow[]
}

interface CertificateRow {
  id: string
}

export default function CourseDetailPage() {
  const { profile } = useAuth()
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string

  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [enrollment, setEnrollment] = useState<UserCourseEnrollment | null | undefined>(undefined)
  const [certificate, setCertificate] = useState<CertificateRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)

  useEffect(() => {
    if (!profile || !courseId) return

    async function fetchData() {
      setLoading(true)
      const [{ data: courseData }, { data: enrollmentData }] = await Promise.all([
        supabase
          .from('courses')
          .select(
            '*, phase:phases(name), course_sections(*, course_modules(count), assessments(count))',
          )
          .eq('id', courseId)
          .single(),
        supabase
          .from('user_course_enrollments')
          .select('*')
          .eq('user_id', profile!.id)
          .eq('course_id', courseId)
          .maybeSingle(),
      ])

      setCourse(courseData ?? null)
      setEnrollment(enrollmentData ?? null)

      // Fetch certificate only if completed
      if (enrollmentData?.completed_at) {
        const { data: certData } = await supabase
          .from('certificates')
          .select('id')
          .eq('user_id', profile!.id)
          .eq('course_id', courseId)
          .maybeSingle()
        setCertificate(certData ?? null)
      }

      setLoading(false)
    }

    fetchData()
  }, [profile, courseId])

  async function handleStartCourse() {
    if (!profile || !course) return
    setEnrolling(true)
    try {
      // 1. Enroll the user
      const { error: enrollError } = await supabase
        .from('user_course_enrollments')
        .insert({ user_id: profile.id, course_id: courseId })

      if (enrollError) throw enrollError

      // 2. Insert section progress rows for each active section
      const activeSections = course.course_sections.filter((s) => s.is_active)
      if (activeSections.length > 0) {
        const { error: progressError } = await supabase
          .from('user_section_progress')
          .insert(
            activeSections.map((s) => ({
              user_id: profile.id,
              section_id: s.id,
              required: true,
            })),
          )
        if (progressError) throw progressError
      }

      toast.success('Enrolled! Let\'s get started.')
      router.push(`/portal/academy/courses/${courseId}/learn`)
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to enroll. Please try again.')
    } finally {
      setEnrolling(false)
    }
  }

  if (loading) {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Academy / Courses
        </p>
        <div className="mt-6 flex items-center justify-center rounded-xl border border-slate-200 bg-white p-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#1175E4]" />
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div>
        <Link
          href="/portal/academy/courses"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft size={16} />
          Back to Courses
        </Link>
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          Course not found.
        </div>
      </div>
    )
  }

  const phaseName = course.phase?.name ?? ''
  const phaseColor = getPhaseColor(phaseName)
  const isCompleted = enrollment?.completed_at != null
  const isEnrolled = enrollment != null

  // Sort sections by sort_order
  const sortedSections = [...course.course_sections].sort(
    (a, b) => a.sort_order - b.sort_order,
  )

  return (
    <div className="pb-24">
      {/* Back link */}
      <Link
        href="/portal/academy/courses"
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5"
      >
        <ArrowLeft size={16} />
        Back to Courses
      </Link>

      {/* Course header */}
      <div
        className="bg-white border border-slate-200 p-7 mb-4"
        style={{ borderRadius: '16px 0 16px 16px' }}
      >
        <div className="flex items-start gap-5">
          {/* Icon block */}
          <div
            className="h-16 w-16 flex items-center justify-center shrink-0"
            style={{ background: phaseColor, borderRadius: '12px 0 12px 12px' }}
          >
            <Education size={32} className="text-white" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Phase badge */}
            {phaseName && (
              <span
                className="inline-flex items-center px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white mb-2"
                style={{
                  background: phaseColor,
                  borderRadius: '20px 0 20px 20px',
                }}
              >
                {phaseName}
              </span>
            )}
            <h1 className="text-2xl font-bold text-slate-900">{course.name}</h1>
            {course.description && (
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                {course.description}
              </p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-5 flex items-center gap-6 border-t border-slate-100 pt-5">
          <div className="text-sm text-slate-500">
            <span className="font-semibold text-slate-900">
              {sortedSections.length}
            </span>{' '}
            sections
          </div>
          <div className="text-sm text-slate-500">
            <span className="font-semibold text-slate-900">
              {sortedSections.reduce(
                (sum, s) => sum + (s.course_modules?.[0]?.count ?? 0),
                0,
              )}
            </span>{' '}
            modules
          </div>
        </div>
      </div>

      {/* Section breakdown */}
      {sortedSections.length > 0 && (
        <div className="space-y-3 mb-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Course Content
          </h2>
          {sortedSections.map((section, idx) => {
            const moduleCount = section.course_modules?.[0]?.count ?? 0
            const assessmentCount = section.assessments?.[0]?.count ?? 0
            return (
              <div
                key={section.id}
                className="bg-white border border-slate-200 p-4 flex items-start gap-4"
                style={{
                  borderRadius: '12px 0 12px 12px',
                  borderLeft: `3px solid ${phaseColor}`,
                }}
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center text-xs font-bold text-white"
                  style={{ background: phaseColor, borderRadius: '6px 0 6px 6px' }}
                >
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {section.name}
                  </p>
                  {section.description && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {section.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    {moduleCount} module{moduleCount !== 1 ? 's' : ''} ·{' '}
                    {assessmentCount} assessment{assessmentCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Completion summary (if completed) */}
      {isCompleted && (
        <div
          className="bg-green-50 border border-green-200 p-6 mb-4"
          style={{ borderRadius: '12px 0 12px 12px' }}
        >
          <div className="flex items-center gap-3">
            <Certificate size={28} className="text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-800">Course Completed</p>
              <p className="text-sm text-green-600">
                You have successfully completed this course.
                {certificate && ' Your certificate is ready.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sticky bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white px-8 py-4 flex items-center justify-end gap-3"
        style={{ marginLeft: '260px' }} // offset for sidebar
      >
        {isCompleted ? (
          <>
            <button
              className="px-6 py-2.5 text-sm font-semibold border border-slate-200 bg-white text-slate-700"
              style={{ borderRadius: '10px 0 10px 10px' }}
              onClick={() => router.push(`/portal/academy/courses/${courseId}/learn`)}
            >
              <span className="flex items-center gap-2">
                <Play size={16} />
                Review Course
              </span>
            </button>
            {certificate && (
              <button
                className="px-6 py-2.5 text-sm font-semibold text-white"
                style={{ background: phaseColor, borderRadius: '10px 0 10px 10px' }}
                onClick={() => router.push(`/portal/academy/certificates/${certificate.id}`)}
              >
                <span className="flex items-center gap-2">
                  <Certificate size={16} />
                  View Certificate
                </span>
              </button>
            )}
          </>
        ) : isEnrolled ? (
          <button
            className="px-6 py-2.5 text-sm font-semibold text-white"
            style={{ background: phaseColor, borderRadius: '10px 0 10px 10px' }}
            onClick={() => router.push(`/portal/academy/courses/${courseId}/learn`)}
          >
            <span className="flex items-center gap-2">
              <Play size={16} />
              Continue Learning
            </span>
          </button>
        ) : (
          <button
            className="px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: phaseColor, borderRadius: '10px 0 10px 10px' }}
            onClick={handleStartCourse}
            disabled={enrolling}
          >
            <span className="flex items-center gap-2">
              <Education size={16} />
              {enrolling ? 'Enrolling…' : 'Start Course'}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
