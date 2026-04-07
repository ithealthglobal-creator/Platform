'use client'

import { useState } from 'react'
import { CheckmarkFilled, CloseOutline, ArrowRight } from '@carbon/icons-react'
import { supabase } from '@/lib/supabase-client'
import type { Assessment, AssessmentQuestion } from '@/lib/types'

interface AssessmentTakerProps {
  assessment: Assessment & { questions: AssessmentQuestion[] }
  userId: string
  phaseColor: string
  onComplete: (passed: boolean, score: number) => void
}

type View = 'welcome' | 'questions' | 'results'

export function AssessmentTaker({
  assessment,
  userId,
  phaseColor,
  onComplete,
}: AssessmentTakerProps) {
  const hasWelcome = Boolean(assessment.welcome_heading)
  const [view, setView] = useState<View>(hasWelcome ? 'welcome' : 'questions')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null)

  const sortedQuestions = [...(assessment.questions ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  )

  async function handleSubmit() {
    setSubmitting(true)
    const startedAt = new Date().toISOString()

    // Calculate score
    let earnedPoints = 0
    let totalPoints = 0
    const answerLog: { question_id: string; selected_option: string; correct: boolean }[] = []

    for (const question of sortedQuestions) {
      const selectedValue = answers[question.id] ?? null
      const selectedOption = question.options.find(o => o.value === selectedValue) ?? null
      const correct = selectedOption?.is_correct === true
      if (correct) earnedPoints += question.points
      totalPoints += question.points
      answerLog.push({
        question_id: question.id,
        selected_option: selectedValue ?? '',
        correct,
      })
    }

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
    const passed = score >= assessment.pass_threshold
    const completedAt = new Date().toISOString()

    await supabase.from('assessment_attempts').insert({
      assessment_id: assessment.id,
      user_id: userId,
      score,
      passed,
      answers: answerLog,
      started_at: startedAt,
      completed_at: completedAt,
    })

    setResult({ score, passed })
    setView('results')
    setSubmitting(false)
  }

  // ── Welcome screen ──────────────────────────────────────────────────────────
  if (view === 'welcome') {
    return (
      <div
        className="bg-white p-8 max-w-2xl mx-auto"
        style={{ borderRadius: '16px 0 16px 16px' }}
      >
        <h2 className="text-2xl font-bold text-slate-800 mb-3">
          {assessment.welcome_heading}
        </h2>
        {assessment.welcome_description && (
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            {assessment.welcome_description}
          </p>
        )}
        <div className="flex items-center gap-4 text-sm text-slate-500 mb-8">
          <span>{sortedQuestions.length} questions</span>
          <span>·</span>
          <span>Pass at {assessment.pass_threshold}%</span>
        </div>
        <button
          onClick={() => setView('questions')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: phaseColor, borderRadius: '8px 0 8px 8px' }}
        >
          Begin
          <ArrowRight size={16} />
        </button>
      </div>
    )
  }

  // ── Results screen ──────────────────────────────────────────────────────────
  if (view === 'results' && result) {
    const passed = result.passed
    return (
      <div
        className="bg-white p-8 max-w-2xl mx-auto"
        style={{ borderRadius: '16px 0 16px 16px' }}
      >
        <div className="flex items-center gap-4 mb-6">
          {passed ? (
            <CheckmarkFilled size={40} className="text-emerald-500 flex-shrink-0" />
          ) : (
            <CloseOutline size={40} className="text-red-400 flex-shrink-0" />
          )}
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {passed ? 'Passed!' : 'Not quite'}
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Your score: <span className="font-semibold text-slate-700">{result.score}%</span>
              {' '}· Pass threshold: {assessment.pass_threshold}%
            </p>
          </div>
        </div>

        {assessment.completion_heading && (
          <div className="mb-6">
            <h3 className="font-semibold text-slate-700 mb-1">
              {assessment.completion_heading}
            </h3>
            {assessment.completion_description && (
              <p className="text-slate-500 text-sm leading-relaxed">
                {assessment.completion_description}
              </p>
            )}
          </div>
        )}

        {!passed && (
          <p className="text-sm text-slate-500 mb-6">
            Review the material and try again when you&apos;re ready.
          </p>
        )}

        <button
          onClick={() => onComplete(passed, result.score)}
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: phaseColor, borderRadius: '8px 0 8px 8px' }}
        >
          Continue
          <ArrowRight size={16} />
        </button>
      </div>
    )
  }

  // ── Questions screen ────────────────────────────────────────────────────────
  const allAnswered = sortedQuestions.every(q => answers[q.id] !== undefined)

  return (
    <div
      className="bg-white p-8 max-w-2xl mx-auto"
      style={{ borderRadius: '16px 0 16px 16px' }}
    >
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-800">{assessment.name}</h2>
        {assessment.description && (
          <p className="text-slate-500 text-sm mt-1">{assessment.description}</p>
        )}
      </div>

      <div className="space-y-8">
        {sortedQuestions.map((question, index) => {
          const selectedValue = answers[question.id]

          return (
            <div key={question.id}>
              <p className="text-sm font-semibold text-slate-800 mb-3">
                <span
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs mr-2 flex-shrink-0"
                  style={{ backgroundColor: phaseColor }}
                >
                  {index + 1}
                </span>
                {question.question_text}
              </p>

              <div className="space-y-2 ml-8">
                {question.options.map(option => {
                  const isSelected = selectedValue === option.value

                  return (
                    <label
                      key={option.value}
                      className={[
                        'flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all text-sm',
                        isSelected
                          ? 'border-2'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                      ].join(' ')}
                      style={
                        isSelected
                          ? { borderColor: phaseColor, backgroundColor: `${phaseColor}10` }
                          : undefined
                      }
                    >
                      {/* Custom radio */}
                      <span
                        className={[
                          'w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors',
                        ].join(' ')}
                        style={
                          isSelected
                            ? { borderColor: phaseColor }
                            : { borderColor: '#CBD5E1' }
                        }
                      >
                        {isSelected && (
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: phaseColor }}
                          />
                        )}
                      </span>

                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option.value}
                        checked={isSelected}
                        onChange={() =>
                          setAnswers(prev => ({ ...prev, [question.id]: option.value }))
                        }
                        className="sr-only"
                      />

                      <span
                        className={isSelected ? 'font-medium' : 'text-slate-600'}
                        style={isSelected ? { color: phaseColor } : undefined}
                      >
                        {option.label}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <p className="text-xs text-slate-400">
          {Object.keys(answers).length} of {sortedQuestions.length} answered
        </p>
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || submitting}
          className={[
            'inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white transition-all',
            !allAnswered || submitting ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90',
          ].join(' ')}
          style={{ backgroundColor: phaseColor, borderRadius: '8px 0 8px 8px' }}
        >
          {submitting ? 'Submitting…' : 'Submit'}
          {!submitting && <ArrowRight size={16} />}
        </button>
      </div>
    </div>
  )
}
