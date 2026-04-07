'use client'

import {
  CheckmarkFilled,
  PlayFilledAlt,
  CircleDash,
  Locked,
} from '@carbon/icons-react'
import type { Course, CourseSection, CourseModule, Assessment, UserSectionProgress } from '@/lib/types'

interface CourseSidebarProps {
  course: Course & {
    course_sections: (CourseSection & {
      course_modules: CourseModule[]
      assessments: Assessment[]
    })[]
  }
  sectionProgress: UserSectionProgress[]
  activeModuleId: string | null
  activeAssessmentId: string | null
  onSelectModule: (moduleId: string) => void
  onSelectAssessment: (assessmentId: string) => void
  phaseColor: string
}

type SectionState = 'completed' | 'active' | 'optional' | 'locked'

function getSectionState(
  section: CourseSection,
  progress: UserSectionProgress | undefined,
  isUnlocked: boolean
): SectionState {
  if (!progress) return isUnlocked ? 'active' : 'locked'
  if (progress.post_assessment_passed) return 'completed'
  if (!progress.required) return 'optional'
  if (!isUnlocked) return 'locked'
  return 'active'
}

export function CourseSidebar({
  course,
  sectionProgress,
  activeModuleId,
  activeAssessmentId,
  onSelectModule,
  onSelectAssessment,
  phaseColor,
}: CourseSidebarProps) {
  const sortedSections = [...(course.course_sections ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  )

  // Determine which sections are unlocked via sequential unlock
  // A section is unlocked if all previous required sections have post_assessment_passed === true
  const unlockedSectionIds = new Set<string>()
  let previousRequiredPassed = true
  for (const section of sortedSections) {
    const prog = sectionProgress.find(p => p.section_id === section.id)
    if (previousRequiredPassed) {
      unlockedSectionIds.add(section.id)
    }
    // Update gate for next section: if this section is required, it must be passed
    if (prog?.required !== false) {
      previousRequiredPassed = prog?.post_assessment_passed === true
    }
  }

  // Find the active section: first unlocked section where post_assessment_passed is not true
  const activeSectionId = sortedSections.find(section => {
    const prog = sectionProgress.find(p => p.section_id === section.id)
    return unlockedSectionIds.has(section.id) && prog?.post_assessment_passed !== true
  })?.id ?? null

  return (
    <aside className="w-[300px] flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto flex flex-col">
      {/* Course title header */}
      <div className="px-5 py-4 border-b border-slate-200">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
          Course
        </p>
        <h2 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
          {course.name}
        </h2>
      </div>

      {/* Sections */}
      <div className="flex-1 py-3">
        {sortedSections.map(section => {
          const prog = sectionProgress.find(p => p.section_id === section.id)
          const isUnlocked = unlockedSectionIds.has(section.id)
          const state = getSectionState(section, prog, isUnlocked)
          const isExpanded = state === 'active' || section.id === activeSectionId

          const sortedModules = [...(section.course_modules ?? [])].sort(
            (a, b) => a.sort_order - b.sort_order
          )
          const preAssessment = section.assessments?.find(a => a.type === 'pre') ?? null
          const postAssessment = section.assessments?.find(a => a.type === 'post') ?? null
          const allModulesComplete =
            sortedModules.length > 0 &&
            sortedModules.every(m => prog?.modules_completed?.includes(m.id))

          return (
            <div key={section.id} className="mb-1">
              {/* Section header row */}
              <div
                className={[
                  'flex items-center gap-3 px-5 py-3 select-none',
                  state === 'completed' ? 'opacity-80' : '',
                  state === 'optional' ? 'opacity-60' : '',
                  state === 'locked' ? 'opacity-50 cursor-not-allowed' : '',
                  state === 'active' ? 'font-semibold' : '',
                ].join(' ')}
              >
                {/* State icon */}
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                  {state === 'completed' && (
                    <CheckmarkFilled size={18} className="text-emerald-500" />
                  )}
                  {state === 'active' && (
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: phaseColor }}
                    />
                  )}
                  {state === 'optional' && (
                    <CheckmarkFilled size={18} className="text-slate-400" />
                  )}
                  {state === 'locked' && (
                    <Locked size={16} className="text-slate-400" />
                  )}
                </span>

                {/* Section name */}
                <span className="flex-1 text-sm text-slate-700 leading-snug">
                  {section.name}
                </span>

                {/* Optional: show pre-assessment score */}
                {state === 'optional' && prog && (
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    Skipped
                  </span>
                )}
              </div>

              {/* Expanded module list */}
              {isExpanded && state !== 'locked' && (
                <div className="pb-2">
                  {/* Pre-assessment row */}
                  {preAssessment && (
                    <button
                      onClick={() => onSelectAssessment(preAssessment.id)}
                      className={[
                        'w-full flex items-center gap-3 px-5 py-2 text-left text-xs transition-colors',
                        activeAssessmentId === preAssessment.id
                          ? 'bg-slate-100 font-semibold'
                          : 'hover:bg-slate-50',
                      ].join(' ')}
                    >
                      <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                        {prog?.pre_assessment_passed ? (
                          <CheckmarkFilled size={16} className="text-emerald-500" />
                        ) : (
                          <CircleDash size={16} className="text-slate-400" />
                        )}
                      </span>
                      <span className="text-slate-600">Pre-assessment</span>
                    </button>
                  )}

                  {/* Module rows */}
                  {sortedModules.map(module => {
                    const isCompleted = prog?.modules_completed?.includes(module.id) ?? false
                    const isNowPlaying = activeModuleId === module.id

                    return (
                      <button
                        key={module.id}
                        onClick={() => onSelectModule(module.id)}
                        className={[
                          'w-full flex items-center gap-3 px-5 py-2 text-left text-xs transition-colors',
                          isNowPlaying
                            ? 'font-semibold'
                            : 'hover:bg-slate-50',
                        ].join(' ')}
                        style={
                          isNowPlaying
                            ? { backgroundColor: `${phaseColor}18` }
                            : undefined
                        }
                      >
                        <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                          {isNowPlaying ? (
                            <PlayFilledAlt
                              size={16}
                              style={{ color: phaseColor }}
                            />
                          ) : isCompleted ? (
                            <CheckmarkFilled size={16} className="text-emerald-500" />
                          ) : (
                            <CircleDash size={16} className="text-slate-400" />
                          )}
                        </span>
                        <span
                          className="flex-1 text-slate-700 leading-snug line-clamp-2"
                          style={isNowPlaying ? { color: phaseColor } : undefined}
                        >
                          {module.title}
                        </span>
                        {module.duration_minutes && (
                          <span className="text-slate-400 flex-shrink-0">
                            {module.duration_minutes}m
                          </span>
                        )}
                      </button>
                    )
                  })}

                  {/* Post-assessment row */}
                  {postAssessment && (
                    <button
                      onClick={() => {
                        if (allModulesComplete) onSelectAssessment(postAssessment.id)
                      }}
                      disabled={!allModulesComplete}
                      className={[
                        'w-full flex items-center gap-3 px-5 py-2 text-left text-xs transition-colors',
                        !allModulesComplete
                          ? 'opacity-50 cursor-not-allowed'
                          : activeAssessmentId === postAssessment.id
                          ? 'bg-slate-100 font-semibold'
                          : 'hover:bg-slate-50',
                      ].join(' ')}
                    >
                      <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                        {!allModulesComplete ? (
                          <Locked size={14} className="text-slate-400" />
                        ) : prog?.post_assessment_passed ? (
                          <CheckmarkFilled size={16} className="text-emerald-500" />
                        ) : (
                          <CircleDash size={16} className="text-slate-400" />
                        )}
                      </span>
                      <span className="text-slate-600">Post-assessment</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
