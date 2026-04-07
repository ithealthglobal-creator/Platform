import { supabaseAdmin } from '@/lib/supabase-server'
import { calculatePhaseScores, calculateOverallScore } from '@/lib/scoring'
import type { ServiceScore } from '@/lib/scoring'
import type { CompositeScore } from '@/lib/types'

/**
 * Raw shape stored in assessment_attempts.service_scores (jsonb).
 * phase_id is optional — if absent we look it up from the services table.
 */
interface RawServiceScore {
  earned: number
  max: number
  pct: number
  phase_id?: string
}

/**
 * Calculate a user's composite skill score by:
 * 1. Taking the best pct score for each service across all attempts
 * 2. Applying a +5 per completed linked course bonus (capped at 100)
 * 3. Deriving phase and overall scores from the adjusted service scores
 */
export async function calculateCompositeScore(
  userId: string
): Promise<CompositeScore | null> {
  // 1. Fetch all attempts that have service_scores
  const { data: attempts, error: attemptsError } = await supabaseAdmin
    .from('assessment_attempts')
    .select('service_scores')
    .eq('user_id', userId)
    .not('service_scores', 'is', null)

  if (attemptsError) throw attemptsError
  if (!attempts || attempts.length === 0) return null

  // 2. Build best-pct map: service_id → best RawServiceScore
  const bestByService = new Map<string, RawServiceScore>()

  for (const attempt of attempts) {
    const scores = attempt.service_scores as Record<string, RawServiceScore>
    if (!scores) continue
    for (const [serviceId, score] of Object.entries(scores)) {
      const existing = bestByService.get(serviceId)
      if (!existing || score.pct > existing.pct) {
        bestByService.set(serviceId, { ...score })
      }
    }
  }

  if (bestByService.size === 0) return null

  // 3. Fetch completed enrollments for the user
  const { data: enrollments, error: enrollmentsError } = await supabaseAdmin
    .from('user_course_enrollments')
    .select('course_id')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)

  if (enrollmentsError) throw enrollmentsError

  const completedCourseIds = (enrollments ?? []).map(e => e.course_id as string)

  // 4. Find which services those completed courses link to
  const completedCountByService = new Map<string, number>()

  if (completedCourseIds.length > 0) {
    const { data: links, error: linksError } = await supabaseAdmin
      .from('service_academy_links')
      .select('service_id')
      .in('course_id', completedCourseIds)

    if (linksError) throw linksError

    for (const link of links ?? []) {
      const sid = link.service_id as string
      completedCountByService.set(sid, (completedCountByService.get(sid) ?? 0) + 1)
    }
  }

  // 5. Resolve missing phase_ids in one batch query
  const missingPhaseIds = Array.from(bestByService.entries())
    .filter(([, s]) => !s.phase_id)
    .map(([serviceId]) => serviceId)

  const phaseByService = new Map<string, string>()

  if (missingPhaseIds.length > 0) {
    const { data: services, error: servicesError } = await supabaseAdmin
      .from('services')
      .select('id, phase_id')
      .in('id', missingPhaseIds)

    if (servicesError) throw servicesError

    for (const svc of services ?? []) {
      if (svc.phase_id) {
        phaseByService.set(svc.id as string, svc.phase_id as string)
      }
    }
  }

  // 6. Apply course completion bonus and build ServiceScore[]
  const serviceScores: ServiceScore[] = []
  const servicesRecord: CompositeScore['services'] = {}

  for (const [serviceId, best] of bestByService.entries()) {
    const phaseId = best.phase_id ?? phaseByService.get(serviceId) ?? ''
    const courseCount = completedCountByService.get(serviceId) ?? 0

    // Apply bonus capped at 100
    const adjustedPct = Math.min(best.pct + 5 * courseCount, 100)

    // Scale earned/max proportionally to reflect the adjusted pct
    // We keep max unchanged and recalculate earned so downstream
    // calculatePhaseScores() produces consistent results.
    const adjustedEarned =
      best.max > 0 ? Math.round((adjustedPct / 100) * best.max) : best.earned

    serviceScores.push({
      service_id: serviceId,
      phase_id: phaseId,
      earned: adjustedEarned,
      max: best.max,
      pct: adjustedPct,
    })

    servicesRecord[serviceId] = {
      earned: adjustedEarned,
      max: best.max,
      pct: adjustedPct,
    }
  }

  // 7. Compute phases and overall using existing helpers
  const phaseScores = calculatePhaseScores(serviceScores)
  const overall = calculateOverallScore(phaseScores)

  const phases: Record<string, number> = {}
  for (const ps of phaseScores) {
    phases[ps.phase_id] = ps.score
  }

  return { overall, phases, services: servicesRecord }
}

/**
 * Average a collection of per-member CompositeScores into a single team average.
 * Null entries (members with no attempts) are excluded from the average.
 */
export function calculateTeamAverages(
  memberScores: (CompositeScore | null)[]
): CompositeScore {
  const valid = memberScores.filter((s): s is CompositeScore => s !== null)

  if (valid.length === 0) {
    return { overall: 0, phases: {}, services: {} }
  }

  const n = valid.length

  // Average overall
  const overall = Math.round(
    valid.reduce((sum, s) => sum + s.overall, 0) / n
  )

  // Average phases
  const phaseTotals = new Map<string, { sum: number; count: number }>()
  for (const score of valid) {
    for (const [phaseId, pct] of Object.entries(score.phases)) {
      const acc = phaseTotals.get(phaseId) ?? { sum: 0, count: 0 }
      acc.sum += pct
      acc.count += 1
      phaseTotals.set(phaseId, acc)
    }
  }

  const phases: Record<string, number> = {}
  for (const [phaseId, { sum, count }] of phaseTotals.entries()) {
    phases[phaseId] = Math.round(sum / count)
  }

  // Average services
  const serviceTotals = new Map<
    string,
    { earnedSum: number; maxSum: number; pctSum: number; count: number }
  >()
  for (const score of valid) {
    for (const [serviceId, svc] of Object.entries(score.services)) {
      const acc = serviceTotals.get(serviceId) ?? {
        earnedSum: 0,
        maxSum: 0,
        pctSum: 0,
        count: 0,
      }
      acc.earnedSum += svc.earned
      acc.maxSum += svc.max
      acc.pctSum += svc.pct
      acc.count += 1
      serviceTotals.set(serviceId, acc)
    }
  }

  const services: CompositeScore['services'] = {}
  for (const [serviceId, { earnedSum, maxSum, pctSum, count }] of serviceTotals.entries()) {
    services[serviceId] = {
      earned: Math.round(earnedSum / count),
      max: Math.round(maxSum / count),
      pct: Math.round(pctSum / count),
    }
  }

  return { overall, phases, services }
}
