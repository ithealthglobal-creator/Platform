import type { AssessmentQuestion } from '@/lib/types'

interface Answer {
  question_id: string
  selected_option: string
}

interface PhaseScore {
  phase_id: string
  score: number
  max_points: number
  earned_points: number
}

/**
 * Scoring logic:
 * - Each question has `points` (max points for that question) and `weight` (importance multiplier).
 * - Each option has a `value` field. For maturity assessments, options can have numeric values
 *   representing partial scores (e.g., "0", "1", "2", "3"). For binary assessments, the `correct`
 *   flag determines full points or zero.
 * - Per-phase score = (weighted earned / weighted max) * 100
 */
export function calculatePhaseScores(
  questions: AssessmentQuestion[],
  answers: Answer[]
): PhaseScore[] {
  const answerMap = new Map(answers.map(a => [a.question_id, a.selected_option]))
  const phaseGroups = new Map<string, { weightedEarned: number; weightedMax: number }>()

  for (const q of questions) {
    if (!q.phase_id) continue
    const group = phaseGroups.get(q.phase_id) || { weightedEarned: 0, weightedMax: 0 }
    const maxPoints = q.points || 1
    const weight = q.weight || 1

    group.weightedMax += maxPoints * weight

    const selectedValue = answerMap.get(q.id)
    if (selectedValue) {
      const selectedOption = q.options.find((o: { value: string }) => o.value === selectedValue)
      if (selectedOption) {
        // Try numeric value first (maturity-style), fall back to correct flag (quiz-style)
        const numericValue = Number(selectedValue)
        if (!isNaN(numericValue) && numericValue >= 0) {
          // Maturity scoring: option value is a score (0 to maxPoints)
          group.weightedEarned += Math.min(numericValue, maxPoints) * weight
        } else if (selectedOption.is_correct) {
          // Binary scoring: correct = full points
          group.weightedEarned += maxPoints * weight
        }
      }
    }

    phaseGroups.set(q.phase_id, group)
  }

  return Array.from(phaseGroups.entries()).map(([phase_id, { weightedEarned, weightedMax }]) => ({
    phase_id,
    score: weightedMax > 0 ? Math.round((weightedEarned / weightedMax) * 100) : 0,
    max_points: weightedMax,
    earned_points: weightedEarned,
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
