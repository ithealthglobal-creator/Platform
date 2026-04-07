import { supabase } from '@/lib/supabase-client'
import type {
  JourneyTimeline,
  JourneyTimelinePhase,
  JourneyTimelineService,
  JourneyTimelineStep,
  JourneyAcademyCourse,
  TimeUnit,
} from '@/lib/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MINUTES_PER_HOUR = 60
const MINUTES_PER_DAY = 480 // 8-hour work day
const MINUTES_PER_WEEK = 2400 // 5 × 480

// ---------------------------------------------------------------------------
// Unit helpers
// ---------------------------------------------------------------------------

/** Convert a duration in minutes to the given time unit. */
export function minutesToUnit(minutes: number, unit: TimeUnit): number {
  switch (unit) {
    case 'hours':
      return minutes / MINUTES_PER_HOUR
    case 'days':
      return minutes / MINUTES_PER_DAY
    case 'weeks':
      return minutes / MINUTES_PER_WEEK
  }
}

/** Human-readable duration string, e.g. "1.6d", "2h", "30m". */
export function formatDuration(minutes: number, unit: TimeUnit): string {
  if (unit === 'hours') {
    const val = minutes / MINUTES_PER_HOUR
    if (val < 1) return `${minutes}m`
    return `${parseFloat(val.toFixed(1))}h`
  }
  if (unit === 'days') {
    const val = minutes / MINUTES_PER_DAY
    if (val < 1) {
      const hrs = minutes / MINUTES_PER_HOUR
      if (hrs < 1) return `${minutes}m`
      return `${parseFloat(hrs.toFixed(1))}h`
    }
    return `${parseFloat(val.toFixed(1))}d`
  }
  // weeks
  const val = minutes / MINUTES_PER_WEEK
  if (val < 1) {
    const days = minutes / MINUTES_PER_DAY
    if (days < 1) {
      const hrs = minutes / MINUTES_PER_HOUR
      if (hrs < 1) return `${minutes}m`
      return `${parseFloat(hrs.toFixed(1))}h`
    }
    return `${parseFloat(days.toFixed(1))}d`
  }
  return `${parseFloat(val.toFixed(1))}w`
}

/** Generate axis labels like ["Day 1", "Day 2", ...] covering totalMinutes. */
export function getTimeAxisLabels(
  totalMinutes: number,
  unit: TimeUnit,
): string[] {
  const totalUnits = Math.ceil(minutesToUnit(totalMinutes, unit))
  const count = Math.max(totalUnits, 1)
  const labelPrefix =
    unit === 'hours' ? 'Hour' : unit === 'days' ? 'Day' : 'Week'
  return Array.from({ length: count }, (_, i) => `${labelPrefix} ${i + 1}`)
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

export interface FetchJourneyResult {
  timeline: JourneyTimeline | null
  allAboveThreshold: boolean
}

/**
 * Fetch the journey timeline for a user.
 *
 * 1. Gets the onboarding assessment and its journey_threshold.
 * 2. Gets the user's latest attempt for that assessment.
 * 3. Filters services where score < threshold.
 * 4. Fetches service details, runbook steps, and academy links.
 * 5. Builds sequential timeline grouped by phase.
 */
export async function fetchJourneyTimeline(
  userId: string,
): Promise<FetchJourneyResult> {
  // 1. Get the onboarding assessment
  const { data: assessment, error: assessmentErr } = await supabase
    .from('assessments')
    .select('id, journey_threshold')
    .eq('is_onboarding', true)
    .single()

  if (assessmentErr || !assessment) {
    return { timeline: null, allAboveThreshold: false }
  }

  const threshold = assessment.journey_threshold

  // 2. Get the user's latest attempt for this assessment
  const { data: attempt, error: attemptErr } = await supabase
    .from('assessment_attempts')
    .select('id, service_scores')
    .eq('assessment_id', assessment.id)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (attemptErr || !attempt) {
    return { timeline: null, allAboveThreshold: false }
  }

  const serviceScores = attempt.service_scores as Record<
    string,
    { earned: number; max: number; pct: number }
  > | null

  if (!serviceScores) {
    return { timeline: null, allAboveThreshold: false }
  }

  // 3. Filter services below threshold
  const belowThreshold = Object.entries(serviceScores).filter(
    ([, s]) => s.pct < threshold,
  )

  if (belowThreshold.length === 0) {
    return { timeline: null, allAboveThreshold: true }
  }

  const serviceIds = belowThreshold.map(([id]) => id)
  const scoreMap = new Map(belowThreshold.map(([id, s]) => [id, s.pct]))

  // 4. Fetch services with phase info, runbook steps, and academy links in parallel
  const [servicesRes, stepsRes, academyRes] = await Promise.all([
    supabase
      .from('services')
      .select(
        'id, name, description, phase_id, phase:phases(id, name, sort_order)',
      )
      .in('id', serviceIds),
    supabase
      .from('service_runbook_steps')
      .select(
        'id, service_id, title, description, estimated_minutes, role, sort_order',
      )
      .in('service_id', serviceIds)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('service_academy_links')
      .select('service_id, is_required, course:courses(id, name)')
      .in('service_id', serviceIds),
  ])

  if (servicesRes.error || !servicesRes.data) {
    return { timeline: null, allAboveThreshold: false }
  }

  // Index runbook steps by service_id
  const stepsByService = new Map<
    string,
    (typeof stepsRes.data extends (infer T)[] | null ? T : never)[]
  >()
  for (const step of stepsRes.data ?? []) {
    const arr = stepsByService.get(step.service_id) ?? []
    arr.push(step)
    stepsByService.set(step.service_id, arr)
  }

  // Index academy links by service_id
  const academyByService = new Map<string, JourneyAcademyCourse[]>()
  for (const link of academyRes.data ?? []) {
    const arr = academyByService.get(link.service_id) ?? []
    const course = link.course as unknown as { id: string; name: string } | null
    if (course) {
      arr.push({
        courseId: course.id,
        courseName: course.name,
        isRequired: link.is_required,
      })
    }
    academyByService.set(link.service_id, arr)
  }

  // Sort academy courses: required first, then by name
  for (const [, courses] of academyByService) {
    courses.sort((a, b) => {
      if (a.isRequired !== b.isRequired) return a.isRequired ? -1 : 1
      return a.courseName.localeCompare(b.courseName)
    })
  }

  // 5. Group services by phase, ordered by phase sort_order then service name
  type PhaseInfo = { id: string; name: string; sort_order: number }
  const phaseMap = new Map<
    string,
    { phase: PhaseInfo; services: typeof servicesRes.data }
  >()

  for (const svc of servicesRes.data) {
    const phase = svc.phase as unknown as PhaseInfo | null
    if (!phase) continue
    const existing = phaseMap.get(phase.id)
    if (existing) {
      existing.services.push(svc)
    } else {
      phaseMap.set(phase.id, { phase, services: [svc] })
    }
  }

  // Sort phases by sort_order
  const sortedPhases = Array.from(phaseMap.values()).sort(
    (a, b) => a.phase.sort_order - b.phase.sort_order,
  )

  // Sort services within each phase alphabetically
  for (const entry of sortedPhases) {
    entry.services.sort((a, b) => a.name.localeCompare(b.name))
  }

  // 6. Build sequential timeline
  let cursor = 0
  const timelinePhases: JourneyTimelinePhase[] = []

  for (const { phase, services } of sortedPhases) {
    const phaseStart = cursor
    const phaseServices: JourneyTimelineService[] = []

    for (const svc of services) {
      const serviceStart = cursor
      const rawSteps = stepsByService.get(svc.id) ?? []
      const timelineSteps: JourneyTimelineStep[] = []

      for (const step of rawSteps) {
        const dur = step.estimated_minutes ?? 0
        timelineSteps.push({
          id: step.id,
          title: step.title,
          description: step.description,
          durationMinutes: dur,
          role: step.role,
          startMinute: cursor,
        })
        cursor += dur
      }

      const serviceDuration = cursor - serviceStart
      phaseServices.push({
        id: svc.id,
        name: svc.name,
        description: svc.description,
        phaseId: phase.id,
        score: scoreMap.get(svc.id) ?? 0,
        durationMinutes: serviceDuration,
        startMinute: serviceStart,
        academyCourses: academyByService.get(svc.id) ?? [],
        steps: timelineSteps,
      })
    }

    const phaseDuration = cursor - phaseStart
    timelinePhases.push({
      id: phase.id,
      name: phase.name,
      sortOrder: phase.sort_order,
      durationMinutes: phaseDuration,
      startMinute: phaseStart,
      services: phaseServices,
    })
  }

  const totalMinutes = cursor
  const serviceCount = timelinePhases.reduce(
    (sum, p) => sum + p.services.length,
    0,
  )

  return {
    timeline: {
      phases: timelinePhases,
      totalMinutes,
      serviceCount,
      phaseCount: timelinePhases.length,
    },
    allAboveThreshold: false,
  }
}
