'use client'
import { useEffect, useState } from 'react'
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

function getPhaseColor(phaseName: string | undefined): string {
  if (!phaseName) return '#1175E4'
  return PHASE_COLORS[phaseName] ?? '#1175E4'
}

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
        .select('*, phase:phases(*)')
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

  const currentQuestion = questions[currentIndex]
  const totalQuestions = questions.length
  const progressPercent = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0
  const currentPhaseName = currentQuestion?.phase?.name
  const currentPhaseColor = getPhaseColor(currentPhaseName)

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

  // --- LOADING ---
  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#1175E4] border-t-transparent rounded-full animate-spin" />
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
          <Image
            src="/logos/ithealth-logo.svg"
            alt="IThealth"
            width={160}
            height={40}
            className="mx-auto mb-8"
          />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">No Assessment Available</h1>
          <p className="text-slate-500 text-sm">
            No assessment is currently available. Please check back later.
          </p>
        </div>
      </div>
    )
  }

  // --- WELCOME ---
  if (step === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="text-center max-w-md w-full">
          <Image
            src="/logos/ithealth-logo.svg"
            alt="IThealth"
            width={160}
            height={40}
            className="mx-auto mb-10"
          />
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            {assessment?.welcome_heading ?? 'How Healthy Is Your IT?'}
          </h1>
          <p className="text-slate-500 mb-8">
            {assessment?.welcome_description ??
              'Take our free 5-minute assessment and get a personalised IT modernisation roadmap.'}
          </p>
          <Button
            className="w-full bg-[#1175E4] hover:bg-[#0d5fc2] text-white h-12 text-base"
            onClick={() => setStep('assessment')}
          >
            Start Assessment
          </Button>
          <p className="mt-4 text-sm text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-[#1175E4] hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    )
  }

  // --- ASSESSMENT ---
  if (step === 'assessment' && currentQuestion) {
    const selectedOption = answers[currentQuestion.id]
    const isLast = currentIndex === totalQuestions - 1

    return (
      <div className="min-h-screen flex flex-col bg-white">
        {/* Progress bar */}
        <div className="h-1 bg-slate-100 w-full">
          <div
            className="h-1 transition-all duration-300"
            style={{ width: `${progressPercent}%`, backgroundColor: currentPhaseColor }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <Image
            src="/logos/ithealth-logo.svg"
            alt="IThealth"
            width={120}
            height={32}
          />
          <span className="text-sm text-slate-400 font-medium">
            {currentIndex + 1} of {totalQuestions}
          </span>
        </div>

        {/* Question area */}
        <div className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="max-w-xl w-full">
            {/* Phase badge */}
            {currentPhaseName && (
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: currentPhaseColor }}
                />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {currentPhaseName}
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
                    className={`w-full text-left rounded-xl border-2 p-4 transition-colors ${
                      isSelected
                        ? 'border-[#1175E4] bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-sm font-medium text-slate-800">{option.label}</span>
                  </button>
                )
              })}
            </div>

            <Button
              className="w-full bg-[#1175E4] hover:bg-[#0d5fc2] text-white h-12 text-base"
              onClick={handleNext}
              disabled={!selectedOption}
            >
              {isLast ? 'Complete' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // --- DETAILS ---
  if (step === 'details') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="max-w-md w-full">
          <Image
            src="/logos/ithealth-logo.svg"
            alt="IThealth"
            width={160}
            height={40}
            className="mx-auto mb-8"
          />
          <h1 className="text-2xl font-bold text-slate-900 mb-2 text-center">
            {assessment?.completion_heading ?? 'Your Assessment is Complete!'}
          </h1>
          <p className="text-slate-500 text-sm mb-8 text-center">
            {assessment?.completion_description ??
              'Enter your details below and we\'ll send you a personalised IT health score and roadmap.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jane Smith"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="company" className="text-sm font-medium text-slate-700">
                Company Name
              </Label>
              <Input
                id="company"
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Acme Corp"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jane@acme.com"
                className="mt-1"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#1175E4] hover:bg-[#0d5fc2] text-white h-12 text-base mt-2"
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Get My Score'}
            </Button>
          </form>

          <p className="mt-6 text-sm text-slate-400 text-center">
            Already have an account?{' '}
            <Link href="/login" className="text-[#1175E4] hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    )
  }

  // --- CONFIRMATION ---
  if (step === 'confirmation') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="text-center max-w-sm">
          <Image
            src="/logos/ithealth-logo.svg"
            alt="IThealth"
            width={160}
            height={40}
            className="mx-auto mb-8"
          />
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 text-[#1175E4]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Check Your Email</h1>
          <p className="text-slate-500 text-sm mb-6">
            We&apos;ve sent your IT health score to{' '}
            <span className="font-semibold text-slate-700">{confirmedEmail}</span>. Check your
            inbox to see your personalised results.
          </p>
          <Link href="/login" className="text-sm text-[#1175E4] hover:underline">
            Log in to your account
          </Link>
        </div>
      </div>
    )
  }

  // Fallback (shouldn't reach here)
  return null
}
