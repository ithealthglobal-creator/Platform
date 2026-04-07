'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/auth-context'
import { getMaturityLabel } from '@/lib/scoring'
import type { AssessmentAttempt, Phase, Service } from '@/lib/types'

const PHASE_COLORS: Record<string, string> = {
  Operate: '#1175E4',
  Secure: '#FF246B',
  Streamline: '#133258',
  Accelerate: '#EDB600',
}

function getPhaseColor(phaseName: string): string {
  return PHASE_COLORS[phaseName] ?? '#94a3b8'
}

function getMaturityBadgeStyle(score: number): { bg: string; text: string } {
  if (score <= 25) return { bg: 'bg-red-100', text: 'text-red-700' }
  if (score <= 50) return { bg: 'bg-orange-100', text: 'text-orange-700' }
  if (score <= 75) return { bg: 'bg-yellow-100', text: 'text-yellow-700' }
  return { bg: 'bg-green-100', text: 'text-green-700' }
}

const CIRCUMFERENCE = 2 * Math.PI * 60 // ~376.99

export default function HomePage() {
  const { profile } = useAuth()
  const [attempt, setAttempt] = useState<AssessmentAttempt | null | undefined>(undefined)
  const [phases, setPhases] = useState<Phase[]>([])
  const [services, setServices] = useState<Pick<Service, 'id' | 'name' | 'description' | 'phase_id' | 'status'>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return

    async function fetchData() {
      setLoading(true)
      const [{ data: attemptData }, { data: phasesData }, { data: servicesData }] = await Promise.all([
        supabase
          .from('assessment_attempts')
          .select('*')
          .eq('user_id', profile!.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('phases')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('services')
          .select('id, name, description, phase_id, status')
          .eq('status', 'active'),
      ])

      setAttempt(attemptData ?? null)
      setPhases(phasesData ?? [])
      setServices(servicesData ?? [])
      setLoading(false)
    }

    fetchData()
  }, [profile])

  const firstName = profile?.display_name?.split(' ')[0] ?? 'there'
  const companyName = profile?.company?.name ?? ''

  if (loading) {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Home</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Welcome</h1>
        <div className="mt-6 flex items-center justify-center rounded-xl border border-slate-200 bg-white p-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#1175E4]" />
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb */}
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Home</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">
        Welcome back, {firstName}
        {companyName && (
          <span className="ml-1 font-normal text-slate-500">— {companyName}</span>
        )}
      </h1>

      {/* Main content */}
      <div className="mt-6">
        {attempt === null ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            No assessment taken yet. Complete your IT Health Assessment to see your score here.
          </div>
        ) : (
          <>
            <ScoreCard attempt={attempt!} phases={phases} />
            <RecommendedServices attempt={attempt!} phases={phases} services={services} />
          </>
        )}
      </div>
    </div>
  )
}

function ScoreCard({
  attempt,
  phases,
}: {
  attempt: AssessmentAttempt
  phases: Phase[]
}) {
  const score = attempt.score ?? 0
  const label = getMaturityLabel(score)
  const badge = getMaturityBadgeStyle(score)
  const phaseScores = attempt.phase_scores ?? {}

  const dashOffset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE

  const assessmentDate = attempt.completed_at
    ? new Date(attempt.completed_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : new Date(attempt.created_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-7">
      <div className="flex flex-col gap-8 md:flex-row md:items-start">
        {/* Donut chart */}
        <div className="flex shrink-0 flex-col items-center gap-3">
          <svg
            width="160"
            height="160"
            viewBox="0 0 160 160"
            aria-label={`Score: ${score} out of 100`}
          >
            {/* Background circle */}
            <circle
              cx="80"
              cy="80"
              r="60"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="20"
            />
            {/* Progress arc */}
            <circle
              cx="80"
              cy="80"
              r="60"
              fill="none"
              stroke="#1175E4"
              strokeWidth="20"
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 80 80)"
            />
            {/* Center text */}
            <text
              x="80"
              y="74"
              textAnchor="middle"
              className="font-bold"
              style={{ fontSize: 28, fontWeight: 700, fill: '#0f172a' }}
            >
              {score}
            </text>
            <text
              x="80"
              y="93"
              textAnchor="middle"
              style={{ fontSize: 11, fill: '#94a3b8' }}
            >
              out of 100
            </text>
          </svg>
        </div>

        {/* Phase breakdown */}
        <div className="flex-1">
          {/* Maturity badge */}
          <div className="mb-5 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${badge.bg} ${badge.text}`}
            >
              {label}
            </span>
            <span className="text-sm text-slate-500">IT Maturity Level</span>
          </div>

          {/* Phase bars */}
          <div className="space-y-4">
            {phases.map((phase) => {
              const phaseScore = phaseScores[phase.id] ?? 0
              const color = getPhaseColor(phase.name)
              return (
                <div key={phase.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{phase.name}</span>
                    <span className="text-slate-500">{phaseScore}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(phaseScore, 100)}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-5">
        <p className="text-sm text-slate-400">
          Assessment completed {assessmentDate}
        </p>
        <Link
          href="/journey"
          className="text-sm font-medium text-[#1175E4] transition-colors hover:text-[#0d5fc4]"
        >
          View full report →
        </Link>
      </div>
    </div>
  )
}

function RecommendedServices({
  attempt,
  phases,
  services,
}: {
  attempt: AssessmentAttempt
  phases: Phase[]
  services: Pick<Service, 'id' | 'name' | 'description' | 'phase_id' | 'status'>[]
}) {
  const serviceScores = attempt.service_scores
  if (!serviceScores) return null

  // Filter services below 75% (not Optimised)
  const recommended = services
    .map((s) => ({
      ...s,
      score: serviceScores[s.id]?.pct ?? null,
    }))
    .filter((s) => s.score !== null && s.score < 75)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))

  if (recommended.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-7">
        <h2 className="text-lg font-semibold text-slate-900">Recommended Services</h2>
        <p className="mt-2 text-sm text-green-600">
          Great news — you&apos;re scoring well across all services. Keep it up!
        </p>
      </div>
    )
  }

  // Group by phase
  const grouped = new Map<string, typeof recommended>()
  for (const s of recommended) {
    const list = grouped.get(s.phase_id) || []
    list.push(s)
    grouped.set(s.phase_id, list)
  }

  // Sort phases by sort_order
  const sortedPhases = phases
    .filter((p) => grouped.has(p.id))
    .sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-7">
      <h2 className="text-lg font-semibold text-slate-900">Recommended Services</h2>
      <p className="mt-1 text-sm text-slate-500">
        Based on your assessment, these services can help improve your IT maturity.
      </p>

      <div className="mt-5 space-y-6">
        {sortedPhases.map((phase) => {
          const phaseServices = grouped.get(phase.id) ?? []
          const phaseScore = attempt.phase_scores?.[phase.id] ?? 0
          const maturity = getMaturityLabel(phaseScore)
          const color = getPhaseColor(phase.name)

          return (
            <div key={phase.id}>
              <div className="mb-3 flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm font-semibold text-slate-800">
                  {phase.name}
                </span>
                <span className="text-xs text-slate-500">— {phaseScore}%</span>
                <span
                  className={`ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    phaseScore <= 25
                      ? 'bg-red-100 text-red-700'
                      : phaseScore <= 50
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {maturity}
                </span>
              </div>

              <div className="space-y-2">
                {phaseServices.map((s) => {
                  const bgColor =
                    (s.score ?? 0) <= 25
                      ? 'bg-red-50 border-red-200'
                      : (s.score ?? 0) <= 50
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-slate-50 border-slate-200'

                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 ${bgColor}`}
                    >
                      <div className="min-w-[48px] text-center">
                        <span
                          className={`text-lg font-bold ${
                            (s.score ?? 0) <= 25
                              ? 'text-red-600'
                              : (s.score ?? 0) <= 50
                                ? 'text-orange-600'
                                : 'text-slate-600'
                          }`}
                        >
                          {s.score}%
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {s.name}
                        </p>
                        <p className="text-xs text-slate-500">{s.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
