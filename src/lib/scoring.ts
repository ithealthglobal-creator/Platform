import type { AssessmentQuestion } from '@/lib/types'

interface Answer {
  question_id: string
  selected_option: string
}

export interface ServiceScore {
  service_id: string
  phase_id: string
  earned: number
  max: number
  pct: number
}

interface PhaseScore {
  phase_id: string
  score: number
  max_points: number
  earned_points: number
}

/**
 * Bottom-up scoring: questions → services → phases → overall
 *
 * Each question has `points` (max) and `weight` (importance multiplier).
 * Options have numeric `value` (maturity-style: 0-3) or `is_correct` flag (binary).
 * Service score = (weighted earned / weighted max) * 100
 * Phase score = (sum of service earned within phase / sum of service max within phase) * 100
 * Overall score = average of phase percentages
 */
export function calculateServiceScores(
  questions: AssessmentQuestion[],
  answers: Answer[]
): ServiceScore[] {
  const answerMap = new Map(answers.map(a => [a.question_id, a.selected_option]))
  const serviceGroups = new Map<string, { phase_id: string; weightedEarned: number; weightedMax: number }>()

  for (const q of questions) {
    if (!q.service_id) continue
    // Get phase_id from the service relation
    const phaseId = q.service?.phase_id ?? q.service?.phase?.id ?? ''
    const group = serviceGroups.get(q.service_id) || { phase_id: phaseId, weightedEarned: 0, weightedMax: 0 }
    const maxPoints = q.points || 1
    const weight = q.weight || 1

    group.weightedMax += maxPoints * weight

    const selectedValue = answerMap.get(q.id)
    if (selectedValue) {
      const selectedOption = q.options.find((o: { value: string }) => o.value === selectedValue)
      if (selectedOption) {
        const numericValue = Number(selectedValue)
        if (!isNaN(numericValue) && numericValue >= 0) {
          group.weightedEarned += Math.min(numericValue, maxPoints) * weight
        } else if (selectedOption.is_correct) {
          group.weightedEarned += maxPoints * weight
        }
      }
    }

    serviceGroups.set(q.service_id, group)
  }

  return Array.from(serviceGroups.entries()).map(([service_id, { phase_id, weightedEarned, weightedMax }]) => ({
    service_id,
    phase_id,
    earned: weightedEarned,
    max: weightedMax,
    pct: weightedMax > 0 ? Math.round((weightedEarned / weightedMax) * 100) : 0,
  }))
}

export function calculatePhaseScores(serviceScores: ServiceScore[]): PhaseScore[] {
  const phaseGroups = new Map<string, { earned: number; max: number }>()

  for (const ss of serviceScores) {
    if (!ss.phase_id) continue
    const group = phaseGroups.get(ss.phase_id) || { earned: 0, max: 0 }
    group.earned += ss.earned
    group.max += ss.max
    phaseGroups.set(ss.phase_id, group)
  }

  return Array.from(phaseGroups.entries()).map(([phase_id, { earned, max }]) => ({
    phase_id,
    score: max > 0 ? Math.round((earned / max) * 100) : 0,
    max_points: max,
    earned_points: earned,
  }))
}

export function calculateOverallScore(phaseScores: PhaseScore[]): number {
  if (phaseScores.length === 0) return 0
  const sum = phaseScores.reduce((acc, ps) => acc + ps.score, 0)
  return Math.round(sum / phaseScores.length)
}

export function getMaturityLabel(score: number): string {
  if (score <= 25) return 'Foundational'
  if (score <= 50) return 'Developing'
  if (score <= 75) return 'Maturing'
  return 'Optimised'
}
