'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import Image from 'next/image'
import Link from 'next/link'
import type { Assessment, AssessmentQuestion, Phase } from '@/lib/types'

type WizardStep = 'loading' | 'welcome' | 'assessment' | 'details' | 'confirmation' | 'error'

const PHASE_COLORS: Record<string, string> = {
  Operate: '#1175E4',
  Secure: '#FF246B',
  Streamline: '#133258',
  Accelerate: '#EDB600',
}

const BRAND_PINK = '#FF246B'

export default function GetStartedPage() {
  const [step, setStep] = useState<WizardStep>('loading')
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([])
  const [phases, setPhases] = useState<Phase[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmedEmail, setConfirmedEmail] = useState('')

  useEffect(() => {
    async function fetchData() {
      const [assessmentRes, phasesRes] = await Promise.all([
        supabase
          .from('assessments')
          .select('*')
          .eq('is_onboarding', true)
          .maybeSingle(),
        supabase
          .from('phases')
          .select('*')
          .eq('is_active', true)
          .order('sort_order'),
      ])

      if (assessmentRes.error || !assessmentRes.data) {
        setStep('error')
        return
      }

      const foundAssessment = assessmentRes.data as Assessment

      const questionsRes = await supabase
        .from('assessment_questions')
        .select('*, service:services(*, phase:phases(*))')
        .eq('assessment_id', foundAssessment.id)
        .eq('is_active', true)
        .order('sort_order')

      if (questionsRes.error) {
        setStep('error')
        return
      }

      setAssessment(foundAssessment)
      setQuestions((questionsRes.data ?? []) as AssessmentQuestion[])
      setPhases((phasesRes.data ?? []) as Phase[])
      setStep('welcome')
    }

    fetchData()
  }, [])

  // Live scoring — calculate phase scores from current answers
  const liveScores = useMemo(() => {
    const phaseGroups = new Map<string, { earned: number; max: number; name: string }>()

    for (const q of questions) {
      const phaseId = q.service?.phase?.id ?? q.service?.phase_id
      if (!phaseId) continue
      const phaseName = q.service?.phase?.name ?? ''
      const group = phaseGroups.get(phaseId) || { earned: 0, max: 0, name: phaseName }
      const maxPoints = q.points || 1

      group.max += maxPoints

      const selectedValue = answers[q.id]
      if (selectedValue !== undefined) {
        const numericValue = Number(selectedValue)
        if (!isNaN(numericValue) && numericValue >= 0) {
          group.earned += Math.min(numericValue, maxPoints)
        }
      }

      phaseGroups.set(phaseId, group)
    }

    const phaseScores = Array.from(phaseGroups.entries()).map(([id, { earned, max, name: pName }]) => ({
      id,
      name: pName,
      score: max > 0 ? Math.round((earned / max) * 100) : 0,
      color: PHASE_COLORS[pName] ?? '#94a3b8',
    }))

    const overall = phaseScores.length > 0
      ? Math.round(phaseScores.reduce((sum, p) => sum + p.score, 0) / phaseScores.length)
      : 0

    return { phaseScores, overall }
  }, [answers, questions])

  const currentQuestion = questions[currentIndex]
  const totalQuestions = questions.length
  const answeredCount = Object.keys(answers).length
  const progressPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0
  const currentPhaseName = currentQuestion?.service?.phase?.name

  function handleSelectOption(value: string) {
    if (!currentQuestion) return
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }))
  }

  function handleNext() {
    if (!currentQuestion) return
    if (!answers[currentQuestion.id]) {
      toast.error('Please select an answer before continuing.')
      return
    }
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      setStep('details')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!assessment) return

    if (!name.trim() || !companyName.trim() || !email.trim()) {
      toast.error('Please fill in all fields.')
      return
    }

    const formattedAnswers = Object.entries(answers).map(([question_id, selected_option]) => ({
      question_id,
      selected_option,
    }))

    setSubmitting(true)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          company_name: companyName,
          email,
          assessment_id: assessment.id,
          answers: formattedAnswers,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      setConfirmedEmail(email)
      setStep('confirmation')
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // --- Donut chart SVG helper ---
  function DonutChart({ score, size = 120 }: { score: number; size?: number }) {
    const r = (size - 20) / 2
    const circumference = 2 * Math.PI * r
    const dash = (score / 100) * circumference
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="10" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="white" strokeWidth="10"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-500"
        />
        <text x={size / 2} y={size / 2 - 6} textAnchor="middle" fill="white" fontSize="28" fontWeight="800">{score}</text>
        <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="10" fontWeight="500">out of 100</text>
      </svg>
    )
  }

  // --- Live scoring panel (left side) ---
  function ScoringPanel() {
    return (
      <div className="hidden lg:flex w-[420px] flex-shrink-0 flex-col bg-[#FF246B] text-white p-10 justify-between relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/[0.05]" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-white/[0.05]" />

        {/* Logo */}
        <div>
          <Image src="/logos/ithealth-logo-white.svg" alt="Logo" width={130} height={16} />
        </div>

        {/* Score */}
        <div className="flex flex-col items-center relative z-10">
          <DonutChart score={liveScores.overall} size={140} />
          <p className="mt-4 text-sm font-medium text-white/70">Your Live Score</p>

          {/* Phase breakdown */}
          <div className="mt-8 w-full space-y-3">
            {liveScores.phaseScores.map(phase => (
              <div key={phase.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-white/90">{phase.name}</span>
                  <span className="text-white/60 font-semibold">{phase.score}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${phase.score}%`, backgroundColor: 'white' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress footer */}
        <div className="relative z-10">
          <div className="flex justify-between text-xs text-white/50 mb-2">
            <span>Progress</span>
            <span>{answeredCount} / {totalQuestions}</span>
          </div>
          <div className="h-1 rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  // --- LOADING ---
  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#FF246B] border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading assessment…</p>
        </div>
      </div>
    )
  }

  // --- ERROR ---
  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="text-center max-w-sm">
          <Image src="/logos/ithealth-logo.svg" alt="Logo" width={160} height={40} className="mx-auto mb-8" />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">No Assessment Available</h1>
          <p className="text-slate-500 text-sm">No assessment is currently available. Please check back later.</p>
        </div>
      </div>
    )
  }

  // --- WELCOME ---
  if (step === 'welcome') {
    return (
      <div className="min-h-screen flex">
        {/* Left: pink panel */}
        <div className="hidden lg:flex w-[420px] flex-shrink-0 flex-col items-center justify-center bg-[#FF246B] text-white p-10 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/[0.05]" />
          <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-white/[0.05]" />
          <div className="relative z-10 text-center">
            <Image src="/logos/ithealth-logo-white.svg" alt="Logo" width={160} height={20} className="mx-auto mb-10" />
            <div className="mx-auto mb-6">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="36" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                <path d="M40 4a36 36 0 0 1 0 72" stroke="white" strokeWidth="8" strokeLinecap="round" />
                <text x="40" y="44" textAnchor="middle" fill="white" fontSize="20" fontWeight="800">?</text>
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Your IT Health Score</h2>
            <p className="text-sm text-white/70">Answer the assessment to see your live maturity score across all four phases.</p>
          </div>
        </div>

        {/* Right: welcome content */}
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="max-w-md w-full">
            <div className="lg:hidden mb-8">
              <Image src="/logos/ithealth-logo.svg" alt="Logo" width={140} height={35} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">
              {assessment?.welcome_heading ?? 'How Healthy Is Your IT?'}
            </h1>
            <p className="text-slate-500 mb-8">
              {assessment?.welcome_description ??
                'Take our free 5-minute assessment and get a personalised IT modernisation roadmap.'}
            </p>
            <ul className="space-y-3 mb-8 text-sm text-slate-600">
              {phases.map(phase => (
                <li key={phase.id} className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: PHASE_COLORS[phase.name] ?? '#94a3b8' }} />
                  <span><span className="font-semibold">{phase.name}</span> — {phase.description?.split('.')[0]}</span>
                </li>
              ))}
            </ul>
            <Button
              className="w-full text-white h-12 text-base"
              style={{ backgroundColor: BRAND_PINK }}
              onClick={() => setStep('assessment')}
            >
              Start Assessment
            </Button>
            <p className="mt-4 text-sm text-slate-400 text-center">
              Already have an account?{' '}
              <Link href="/login" className="text-[#FF246B] hover:underline">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // --- ASSESSMENT (split screen) ---
  if (step === 'assessment' && currentQuestion) {
    const selectedOption = answers[currentQuestion.id]
    const isLast = currentIndex === totalQuestions - 1

    return (
      <div className="min-h-screen flex">
        {/* Left: pink scoring panel */}
        <ScoringPanel />

        {/* Right: question */}
        <div className="flex-1 flex flex-col">
          {/* Mobile progress bar (no left panel on mobile) */}
          <div className="lg:hidden h-1 bg-slate-100">
            <div
              className="h-1 transition-all duration-300 bg-[#FF246B]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="lg:hidden">
              <Image src="/logos/ithealth-logo.svg" alt="Logo" width={100} height={25} />
            </div>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-4">
              {/* Mobile live score badge */}
              <div className="lg:hidden flex items-center gap-2 rounded-full bg-pink-50 px-3 py-1">
                <span className="text-xs font-bold text-[#FF246B]">{liveScores.overall}</span>
                <span className="text-[10px] text-pink-400">/100</span>
              </div>
              <span className="text-sm text-slate-400 font-medium">
                {currentIndex + 1} / {totalQuestions}
              </span>
            </div>
          </div>

          {/* Question area */}
          <div className="flex-1 flex items-center justify-center px-6 py-10">
            <div className="max-w-xl w-full">
              {/* Phase badge */}
              {currentPhaseName && (
                <div className="flex items-center gap-2 mb-5">
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: PHASE_COLORS[currentPhaseName] ?? '#94a3b8' }}
                  />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {currentPhaseName} Phase
                  </span>
                </div>
              )}

              <h2 className="text-xl font-semibold text-slate-900 mb-6">
                {currentQuestion.question_text}
              </h2>

              <div className="space-y-3 mb-8">
                {currentQuestion.options.map(option => {
                  const isSelected = selectedOption === option.value
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleSelectOption(option.value)}
                      className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                        isSelected
                          ? 'border-[#FF246B] bg-pink-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-sm font-medium text-slate-800">{option.label}</span>
                    </button>
                  )
                })}
              </div>

              <div className="flex gap-3">
                {currentIndex > 0 && (
                  <Button
                    variant="outline"
                    className="h-12 px-6"
                    onClick={() => setCurrentIndex(prev => prev - 1)}
                  >
                    Back
                  </Button>
                )}
                <Button
                  className="flex-1 text-white h-12 text-base"
                  style={{ backgroundColor: BRAND_PINK }}
                  onClick={handleNext}
                  disabled={!selectedOption}
                >
                  {isLast ? 'Complete Assessment' : 'Next'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- DETAILS (split screen) ---
  if (step === 'details') {
    return (
      <div className="min-h-screen flex">
        {/* Left: pink panel with final score */}
        <div className="hidden lg:flex w-[420px] flex-shrink-0 flex-col items-center justify-center bg-[#FF246B] text-white p-10 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/[0.05]" />
          <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-white/[0.05]" />
          <div className="relative z-10 text-center">
            <DonutChart score={liveScores.overall} size={160} />
            <p className="mt-4 text-lg font-bold">Your IT Health Score</p>
            <p className="mt-1 text-sm text-white/60">Complete your details to save your results</p>

            <div className="mt-8 w-full space-y-3 text-left">
              {liveScores.phaseScores.map(phase => (
                <div key={phase.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-white/90">{phase.name}</span>
                    <span className="text-white/60 font-semibold">{phase.score}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-white"
                      style={{ width: `${phase.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: details form */}
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="max-w-md w-full">
            <div className="lg:hidden mb-6">
              <Image src="/logos/ithealth-logo.svg" alt="Logo" width={140} height={35} />
              {/* Mobile score preview */}
              <div className="mt-4 flex items-center gap-4 rounded-xl bg-pink-50 p-4">
                <div className="text-3xl font-extrabold text-[#FF246B]">{liveScores.overall}</div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Your Score</p>
                  <p className="text-xs text-slate-500">Save your details to keep your results</p>
                </div>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {assessment?.completion_heading ?? 'Your Assessment is Complete!'}
            </h1>
            <p className="text-slate-500 text-sm mb-8">
              {assessment?.completion_description ??
                'To receive your Modernisation score and proceed with your modernisation journey, please enter your details below.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-slate-700">Full Name</Label>
                <Input
                  id="name" type="text" value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Jane Smith" className="mt-1" required
                />
              </div>
              <div>
                <Label htmlFor="company" className="text-sm font-medium text-slate-700">Company Name</Label>
                <Input
                  id="company" type="text" value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Acme Corp" className="mt-1" required
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email Address</Label>
                <Input
                  id="email" type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jane@acme.com" className="mt-1" required
                />
              </div>

              <Button
                type="submit"
                className="w-full text-white h-12 text-base mt-2"
                style={{ backgroundColor: BRAND_PINK }}
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Get My Score'}
              </Button>
            </form>

            <p className="mt-6 text-sm text-slate-400 text-center">
              Already have an account?{' '}
              <Link href="/login" className="text-[#FF246B] hover:underline">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // --- CONFIRMATION (split screen) ---
  if (step === 'confirmation') {
    return (
      <div className="min-h-screen flex">
        {/* Left: pink panel */}
        <div className="hidden lg:flex w-[420px] flex-shrink-0 flex-col items-center justify-center bg-[#FF246B] text-white p-10 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/[0.05]" />
          <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-white/[0.05]" />
          <div className="relative z-10 text-center">
            <DonutChart score={liveScores.overall} size={160} />
            <p className="mt-4 text-lg font-bold">Score Saved</p>
            <p className="mt-1 text-sm text-white/60">Check your email to access your full results</p>
          </div>
        </div>

        {/* Right: confirmation */}
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="text-center max-w-sm">
            <div className="lg:hidden mb-6">
              <Image src="/logos/ithealth-logo.svg" alt="Logo" width={140} height={35} className="mx-auto" />
            </div>
            <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center mx-auto mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-8 h-8 text-[#FF246B]"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-3">Check Your Email</h1>
            <p className="text-slate-500 text-sm mb-6">
              We&apos;ve sent an invite to{' '}
              <span className="font-semibold text-slate-700">{confirmedEmail}</span>.
              Click the link to set your password and access your full modernisation dashboard.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#FF246B] hover:underline"
            >
              Already set your password? Log in →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return null
}
