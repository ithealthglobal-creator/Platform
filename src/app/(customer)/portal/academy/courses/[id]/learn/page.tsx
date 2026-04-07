'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ChevronLeft, ChevronRight, Certificate } from '@carbon/icons-react'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/auth-context'
import { getPhaseColor } from '@/lib/phase-colors'
import { CourseSidebar } from '@/components/academy/course-sidebar'
import { VideoPlayer } from '@/components/academy/video-player'
import { AssessmentTaker } from '@/components/academy/assessment-taker'
import type {
  Course,
  CourseSection,
  CourseModule,
  Assessment,
  AssessmentQuestion,
  UserSectionProgress,
  UserCourseEnrollment,
} from '@/lib/types'

type CourseWithSections = Course & {
  phase: { name: string } | null
  course_sections: (CourseSection & {
    course_modules: CourseModule[]
    assessments: (Assessment & { assessment_questions: AssessmentQuestion[] })[]
  })[]
}

type SectionAssessment = Assessment & { assessment_questions: AssessmentQuestion[] }

type ActiveView = 'video' | 'pre-assessment' | 'post-assessment'

export default function CoursePlayerPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string
  const { profile } = useAuth()

  const [course, setCourse] = useState<CourseWithSections | null>(null)
  const [enrollment, setEnrollment] = useState<UserCourseEnrollment | null>(null)
  const [sectionProgress, setSectionProgress] = useState<UserSectionProgress[]>([])
  const [activeView, setActiveView] = useState<ActiveView>('video')
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null)
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [completedCertId, setCompletedCertId] = useState<string | null>(null)
  const [finalScore, setFinalScore] = useState<number | null>(null)

  // ── Sorted sections ───────────────────────────────────────────────────────
  const sortedSections = useMemo(() => {
    if (!course) return []
    return [...(course.course_sections ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order
    )
  }, [course])

  // ── Helper: find section for a module ─────────────────────────────────────
  const findSectionForModule = useCallback(
    (moduleId: string) => {
      return sortedSections.find(s =>
        s.course_modules.some(m => m.id === moduleId)
      )
    },
    [sortedSections]
  )

  // ── Helper: sorted modules within a section ───────────────────────────────
  const getSortedModules = useCallback(
    (section: CourseWithSections['course_sections'][number]) => {
      return [...(section.course_modules ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order
      )
    },
    []
  )

  // ── Compute active module/section data ────────────────────────────────────
  const activeModule = useMemo(() => {
    if (!activeModuleId) return null
    for (const section of sortedSections) {
      const found = section.course_modules.find(m => m.id === activeModuleId)
      if (found) return found
    }
    return null
  }, [activeModuleId, sortedSections])

  const activeAssessment = useMemo((): SectionAssessment | null => {
    if (!activeAssessmentId) return null
    for (const section of sortedSections) {
      const found = section.assessments.find(a => a.id === activeAssessmentId)
      if (found) return found as SectionAssessment
    }
    return null
  }, [activeAssessmentId, sortedSections])

  // ── Helper: which section IDs belong to this course ───────────────────────
  const courseSectionIds = useMemo(
    () => new Set(sortedSections.map(s => s.id)),
    [sortedSections]
  )

  // ── Determine unlock state for sections ───────────────────────────────────
  const unlockedSectionIds = useMemo(() => {
    const ids = new Set<string>()
    let previousRequiredPassed = true
    for (const section of sortedSections) {
      const prog = sectionProgress.find(p => p.section_id === section.id)
      if (previousRequiredPassed) ids.add(section.id)
      if (prog?.required !== false) {
        previousRequiredPassed = prog?.post_assessment_passed === true
      }
    }
    return ids
  }, [sortedSections, sectionProgress])

  // ── Progress percentage ───────────────────────────────────────────────────
  const progressPercent = useMemo(() => {
    const requiredSections = sectionProgress.filter(p =>
      courseSectionIds.has(p.section_id) && p.required
    )
    if (requiredSections.length === 0) return 0
    const completed = requiredSections.filter(p => p.post_assessment_passed).length
    return Math.round((completed / requiredSections.length) * 100)
  }, [sectionProgress, courseSectionIds])

  // ── Initial active module logic ───────────────────────────────────────────
  const determineInitialState = useCallback(
    (
      enroll: UserCourseEnrollment,
      sections: CourseWithSections['course_sections'][],
      progress: UserSectionProgress[]
    ) => {
      const sorted = [...(course?.course_sections ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order
      )

      // If enrollment has last_module_id, resume there
      if (enroll.last_module_id) {
        setActiveModuleId(enroll.last_module_id)
        setActiveView('video')
        return
      }

      // Find first required section that is not yet completed
      for (const section of sorted) {
        const prog = progress.find(p => p.section_id === section.id)
        if (!prog || !prog.required || prog.post_assessment_passed) continue

        // Found a required uncompleted section
        const preAssessment = section.assessments.find(a => a.type === 'pre')
        if (preAssessment && !prog.pre_assessment_passed) {
          // Show pre-assessment
          setActiveAssessmentId(preAssessment.id)
          setActiveView('pre-assessment')
          return
        }

        // Pre-assessment passed (or none) — find first uncompleted module
        const sortedMods = [...(section.course_modules ?? [])].sort(
          (a, b) => a.sort_order - b.sort_order
        )
        const firstIncomplete = sortedMods.find(
          m => !(prog.modules_completed ?? []).includes(m.id)
        )
        if (firstIncomplete) {
          setActiveModuleId(firstIncomplete.id)
          setActiveView('video')
          return
        }

        // All modules done — show post-assessment
        const postAssessment = section.assessments.find(a => a.type === 'post')
        if (postAssessment && !prog.post_assessment_passed) {
          setActiveAssessmentId(postAssessment.id)
          setActiveView('post-assessment')
          return
        }
      }

      // Fallback: first module of first section
      if (sorted.length > 0) {
        const firstModules = [...(sorted[0].course_modules ?? [])].sort(
          (a, b) => a.sort_order - b.sort_order
        )
        if (firstModules.length > 0) {
          setActiveModuleId(firstModules[0].id)
          setActiveView('video')
        }
      }
    },
    [course]
  )

  // ── Fetch data ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile?.id || !courseId) return

    async function load() {
      setLoading(true)

      const [courseRes, enrollRes, progressRes] = await Promise.all([
        supabase
          .from('courses')
          .select(
            '*, phase:phases(name), course_sections(*, course_modules(*), assessments(*, assessment_questions(*)))'
          )
          .eq('id', courseId)
          .eq('is_active', true)
          .single(),
        supabase
          .from('user_course_enrollments')
          .select('*')
          .eq('user_id', profile!.id)
          .eq('course_id', courseId)
          .single(),
        supabase
          .from('user_section_progress')
          .select('*')
          .eq('user_id', profile!.id),
      ])

      if (courseRes.error || !courseRes.data) {
        router.push('/portal/academy')
        return
      }

      const courseData = courseRes.data as unknown as CourseWithSections
      setCourse(courseData)

      if (enrollRes.error || !enrollRes.data) {
        router.push(`/portal/academy/courses/${courseId}`)
        return
      }

      const enrollData = enrollRes.data as UserCourseEnrollment
      setEnrollment(enrollData)

      // Filter progress to this course's sections
      const sectionIds = new Set(
        (courseData.course_sections ?? []).map(s => s.id)
      )
      const filteredProgress = (progressRes.data ?? []).filter(p =>
        sectionIds.has(p.section_id)
      ) as UserSectionProgress[]
      setSectionProgress(filteredProgress)

      // Determine initial view
      determineInitialState(enrollData, [], filteredProgress)

      setLoading(false)
    }

    load()
  }, [profile?.id, courseId, router, determineInitialState])

  // ── Navigation helpers ────────────────────────────────────────────────────
  const navigateToNextSection = useCallback(
    (currentSectionId: string) => {
      const currentIdx = sortedSections.findIndex(s => s.id === currentSectionId)
      if (currentIdx === -1) return

      // Find next required section that is not done
      for (let i = currentIdx + 1; i < sortedSections.length; i++) {
        const section = sortedSections[i]
        const prog = sectionProgress.find(p => p.section_id === section.id)

        // Skip optional sections that were already skipped
        if (prog && !prog.required && prog.pre_assessment_passed) continue
        // Skip completed sections
        if (prog?.post_assessment_passed) continue

        // Check if section is unlocked
        if (!unlockedSectionIds.has(section.id)) continue

        const preAssessment = section.assessments.find(a => a.type === 'pre')
        if (preAssessment && (!prog || !prog.pre_assessment_passed)) {
          setActiveModuleId(null)
          setActiveAssessmentId(preAssessment.id)
          setActiveView('pre-assessment')
          return
        }

        // Go to first module
        const mods = getSortedModules(section)
        if (mods.length > 0) {
          setActiveAssessmentId(null)
          setActiveModuleId(mods[0].id)
          setActiveView('video')
          return
        }
      }
    },
    [sortedSections, sectionProgress, unlockedSectionIds, getSortedModules]
  )

  // ── Handle module completion & next ───────────────────────────────────────
  const handleNextModule = useCallback(async () => {
    if (!activeModuleId || !enrollment) return

    const section = findSectionForModule(activeModuleId)
    if (!section) return

    const prog = sectionProgress.find(p => p.section_id === section.id)
    if (!prog) return

    const sortedMods = getSortedModules(section)
    const currentModIdx = sortedMods.findIndex(m => m.id === activeModuleId)

    // Mark module complete
    const updatedCompleted = [...new Set([...(prog.modules_completed ?? []), activeModuleId])]
    await supabase
      .from('user_section_progress')
      .update({ modules_completed: updatedCompleted })
      .eq('id', prog.id)

    // Update enrollment last_module_id
    await supabase
      .from('user_course_enrollments')
      .update({
        last_module_id: activeModuleId,
        last_active_at: new Date().toISOString(),
      })
      .eq('id', enrollment.id)

    // Update local progress
    setSectionProgress(prev =>
      prev.map(p =>
        p.id === prog.id ? { ...p, modules_completed: updatedCompleted } : p
      )
    )

    // Navigate to next module or post-assessment
    if (currentModIdx < sortedMods.length - 1) {
      setActiveModuleId(sortedMods[currentModIdx + 1].id)
      setActiveView('video')
    } else {
      // All modules in section done — show post-assessment
      const postAssessment = section.assessments.find(a => a.type === 'post')
      if (postAssessment) {
        setActiveModuleId(null)
        setActiveAssessmentId(postAssessment.id)
        setActiveView('post-assessment')
      } else {
        // No post-assessment — section done, move to next
        navigateToNextSection(section.id)
      }
    }
  }, [
    activeModuleId,
    enrollment,
    findSectionForModule,
    sectionProgress,
    getSortedModules,
    navigateToNextSection,
  ])

  const handlePreviousModule = useCallback(() => {
    if (!activeModuleId) return
    const section = findSectionForModule(activeModuleId)
    if (!section) return

    const sortedMods = getSortedModules(section)
    const currentModIdx = sortedMods.findIndex(m => m.id === activeModuleId)
    if (currentModIdx > 0) {
      setActiveModuleId(sortedMods[currentModIdx - 1].id)
      setActiveView('video')
    }
  }, [activeModuleId, findSectionForModule, getSortedModules])

  // ── Check course completion ───────────────────────────────────────────────
  const checkCourseCompletion = useCallback(
    async (updatedProgress: UserSectionProgress[]) => {
      if (!enrollment || !course) return false

      const requiredSections = updatedProgress.filter(
        p => courseSectionIds.has(p.section_id) && p.required
      )
      const allDone = requiredSections.length > 0 && requiredSections.every(
        p => p.post_assessment_passed
      )

      if (!allDone) return false

      // Calculate final score — average of post-assessment scores
      const postAssessmentIds = sortedSections
        .flatMap(s => s.assessments)
        .filter(a => a.type === 'post')
        .map(a => a.id)

      const { data: attempts } = await supabase
        .from('assessment_attempts')
        .select('score')
        .eq('user_id', profile!.id)
        .in('assessment_id', postAssessmentIds)
        .eq('passed', true)

      const scores = (attempts ?? []).map(a => a.score)
      const avgScore =
        scores.length > 0
          ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
          : 0

      const phaseName = course.phase?.name ?? null
      const certNumber = `CERT-${new Date().getFullYear()}-${
        phaseName?.substring(0, 3).toUpperCase() ?? 'GEN'
      }-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`

      const { data: certData } = await supabase
        .from('certificates')
        .insert({
          course_id: courseId,
          user_id: profile!.id,
          certificate_number: certNumber,
          score: avgScore,
          issued_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      await supabase
        .from('user_course_enrollments')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', enrollment.id)

      setFinalScore(avgScore)
      setCompletedCertId(certData?.id ?? null)
      return true
    },
    [enrollment, course, courseSectionIds, sortedSections, courseId, profile]
  )

  // ── Pre-assessment complete ───────────────────────────────────────────────
  const handlePreAssessmentComplete = useCallback(
    async (passed: boolean, score: number) => {
      if (!activeAssessmentId) return

      // Find which section this assessment belongs to
      const section = sortedSections.find(s =>
        s.assessments.some(a => a.id === activeAssessmentId)
      )
      if (!section) return

      const prog = sectionProgress.find(p => p.section_id === section.id)
      if (!prog) return

      const assessment = section.assessments.find(a => a.id === activeAssessmentId)
      if (!assessment) return

      // Update pre_assessment_passed
      const updates: Partial<UserSectionProgress> = {
        pre_assessment_passed: true,
      }

      // If score >= threshold, section becomes optional (skip)
      if (passed && score >= assessment.pass_threshold) {
        updates.required = false
      }

      await supabase
        .from('user_section_progress')
        .update(updates)
        .eq('id', prog.id)

      const updatedProgress = sectionProgress.map(p =>
        p.id === prog.id ? { ...p, ...updates } : p
      )
      setSectionProgress(updatedProgress)

      if (updates.required === false) {
        // Section became optional (high pre-assessment score) — skip to next section
        navigateToNextSection(section.id)
      } else {
        // Section is still required — proceed to first module
        const sortedMods = getSortedModules(section)
        if (sortedMods.length > 0) {
          setActiveAssessmentId(null)
          setActiveModuleId(sortedMods[0].id)
          setActiveView('video')
        }
      }
    },
    [
      activeAssessmentId,
      sortedSections,
      sectionProgress,
      getSortedModules,
      navigateToNextSection,
    ]
  )

  // ── Post-assessment complete ──────────────────────────────────────────────
  const handlePostAssessmentComplete = useCallback(
    async (passed: boolean, _score: number) => {
      if (!activeAssessmentId) return

      const section = sortedSections.find(s =>
        s.assessments.some(a => a.id === activeAssessmentId)
      )
      if (!section) return

      const prog = sectionProgress.find(p => p.section_id === section.id)
      if (!prog) return

      if (!passed) {
        // Failed — go back to first module of this section to review
        const sortedMods = getSortedModules(section)
        if (sortedMods.length > 0) {
          setActiveAssessmentId(null)
          setActiveModuleId(sortedMods[0].id)
          setActiveView('video')
        }
        return
      }

      // Update post_assessment_passed
      await supabase
        .from('user_section_progress')
        .update({ post_assessment_passed: true })
        .eq('id', prog.id)

      const updatedProgress = sectionProgress.map(p =>
        p.id === prog.id ? { ...p, post_assessment_passed: true } : p
      )
      setSectionProgress(updatedProgress)

      // Check if course is complete
      const isComplete = await checkCourseCompletion(updatedProgress)
      if (!isComplete) {
        navigateToNextSection(section.id)
      }
    },
    [
      activeAssessmentId,
      sortedSections,
      sectionProgress,
      getSortedModules,
      checkCourseCompletion,
      navigateToNextSection,
    ]
  )

  // ── Sidebar click handlers ────────────────────────────────────────────────
  const handleSelectModule = useCallback((moduleId: string) => {
    setActiveModuleId(moduleId)
    setActiveAssessmentId(null)
    setActiveView('video')
  }, [])

  const handleSelectAssessment = useCallback(
    (assessmentId: string) => {
      // Determine if pre or post
      for (const section of sortedSections) {
        const assessment = section.assessments.find(a => a.id === assessmentId)
        if (assessment) {
          setActiveAssessmentId(assessmentId)
          setActiveModuleId(null)
          setActiveView(assessment.type === 'pre' ? 'pre-assessment' : 'post-assessment')
          return
        }
      }
    },
    [sortedSections]
  )

  // ── Phase color ───────────────────────────────────────────────────────────
  const phaseColor = getPhaseColor(course?.phase?.name)
  const phaseName = course?.phase?.name ?? null

  // ── Navigation state for prev/next buttons ────────────────────────────────
  const { canGoPrevious, canGoNext, isLastInSection } = useMemo(() => {
    if (!activeModuleId) return { canGoPrevious: false, canGoNext: false, isLastInSection: false }
    const section = findSectionForModule(activeModuleId)
    if (!section) return { canGoPrevious: false, canGoNext: false, isLastInSection: false }
    const sortedMods = getSortedModules(section)
    const idx = sortedMods.findIndex(m => m.id === activeModuleId)
    return {
      canGoPrevious: idx > 0,
      canGoNext: true, // always can go next (either next module or post-assessment)
      isLastInSection: idx === sortedMods.length - 1,
    }
  }, [activeModuleId, findSectionForModule, getSortedModules])

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading || !course || !enrollment) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div
          className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: `${phaseColor} transparent ${phaseColor} ${phaseColor}` }}
        />
      </div>
    )
  }

  // ── Congratulations overlay ───────────────────────────────────────────────
  if (completedCertId !== null) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div
          className="bg-white p-12 text-center max-w-md"
          style={{ borderRadius: '24px 0 24px 24px' }}
        >
          <div
            className="w-20 h-20 mx-auto mb-6 flex items-center justify-center rounded-full"
            style={{ backgroundColor: `${phaseColor}15` }}
          >
            <Certificate size={40} style={{ color: phaseColor }} />
          </div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Congratulations!
          </h1>
          <p className="text-slate-500 text-sm mb-2">
            You have completed <span className="font-semibold text-slate-700">{course.name}</span>
          </p>
          {finalScore !== null && (
            <p className="text-slate-500 text-sm mb-8">
              Final score: <span className="font-semibold text-slate-700">{finalScore}%</span>
            </p>
          )}
          <button
            onClick={() =>
              router.push(`/portal/academy/certificates/${completedCertId}`)
            }
            className="inline-flex items-center gap-2 px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{
              backgroundColor: phaseColor,
              borderRadius: '8px 0 8px 8px',
            }}
          >
            View Certificate
          </button>
        </div>
      </div>
    )
  }

  // ── Build assessment prop for AssessmentTaker ─────────────────────────────
  const assessmentForTaker = activeAssessment
    ? {
        ...activeAssessment,
        questions: activeAssessment.assessment_questions ?? [],
      }
    : null

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-4 px-6 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <button
          onClick={() => router.push('/portal/academy')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        <div className="flex-1 flex items-center gap-3 min-w-0">
          <h1
            className="text-sm font-semibold text-slate-800 truncate"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            {course.name}
          </h1>
          {phaseName && (
            <span
              className="flex-shrink-0 px-2.5 py-0.5 text-xs font-semibold text-white"
              style={{
                backgroundColor: phaseColor,
                borderRadius: '6px 0 6px 6px',
              }}
            >
              {phaseName}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div
            className="w-32 h-2 bg-slate-100 overflow-hidden"
            style={{ borderRadius: '4px 0 4px 4px' }}
          >
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: phaseColor,
                borderRadius: '4px 0 4px 4px',
              }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-500 w-8 text-right">
            {progressPercent}%
          </span>
        </div>
      </header>

      {/* ── Body: sidebar + main content ─────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        <CourseSidebar
          course={course}
          sectionProgress={sectionProgress}
          activeModuleId={activeModuleId}
          activeAssessmentId={activeAssessmentId}
          onSelectModule={handleSelectModule}
          onSelectAssessment={handleSelectAssessment}
          phaseColor={phaseColor}
        />

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-8">
          {/* ── Video view ─────────────────────────────────────────────── */}
          {activeView === 'video' && activeModule && (
            <div className="max-w-4xl mx-auto">
              <VideoPlayer
                youtubeUrl={activeModule.youtube_url}
                title={activeModule.title}
              />

              <div className="mt-6">
                <div className="flex items-center gap-3 mb-2">
                  <h2
                    className="text-xl font-bold text-slate-800"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  >
                    {activeModule.title}
                  </h2>
                  {activeModule.duration_minutes && (
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {activeModule.duration_minutes} min
                    </span>
                  )}
                </div>
                {activeModule.description && (
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {activeModule.description}
                  </p>
                )}
              </div>

              {/* Previous / Next buttons */}
              <div className="flex items-center justify-between mt-8">
                <button
                  onClick={handlePreviousModule}
                  disabled={!canGoPrevious}
                  className={[
                    'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border transition-colors',
                    canGoPrevious
                      ? 'border-slate-300 text-slate-600 hover:bg-slate-50'
                      : 'border-slate-200 text-slate-300 cursor-not-allowed',
                  ].join(' ')}
                  style={{ borderRadius: '8px 0 8px 8px' }}
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <button
                  onClick={handleNextModule}
                  disabled={!canGoNext}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: phaseColor,
                    borderRadius: '8px 0 8px 8px',
                  }}
                >
                  {isLastInSection ? 'Complete & Continue' : 'Next'}
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── Pre-assessment view ────────────────────────────────────── */}
          {activeView === 'pre-assessment' && assessmentForTaker && profile && (
            <AssessmentTaker
              assessment={assessmentForTaker}
              userId={profile.id}
              phaseColor={phaseColor}
              onComplete={handlePreAssessmentComplete}
            />
          )}

          {/* ── Post-assessment view ───────────────────────────────────── */}
          {activeView === 'post-assessment' && assessmentForTaker && profile && (
            <AssessmentTaker
              assessment={assessmentForTaker}
              userId={profile.id}
              phaseColor={phaseColor}
              onComplete={handlePostAssessmentComplete}
            />
          )}
        </main>
      </div>
    </div>
  )
}
