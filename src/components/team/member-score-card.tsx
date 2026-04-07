'use client'

import { getMaturityLabel } from '@/lib/scoring'
import { getPhaseColor } from '@/lib/phase-colors'
import type { CompositeScore } from '@/lib/types'
import type { Phase } from '@/lib/types'

export interface MemberScoreCardProps {
  myScores: CompositeScore
  teamAverages: CompositeScore
  phases: Phase[]
}

const CIRCUMFERENCE = 2 * Math.PI * 52 // radius 52

function getMaturityBadgeStyle(score: number): { bg: string; text: string } {
  if (score <= 25) return { bg: 'bg-red-100', text: 'text-red-700' }
  if (score <= 50) return { bg: 'bg-orange-100', text: 'text-orange-700' }
  if (score <= 75) return { bg: 'bg-yellow-100', text: 'text-yellow-700' }
  return { bg: 'bg-green-100', text: 'text-green-700' }
}

export function MemberScoreCard({ myScores, teamAverages, phases }: MemberScoreCardProps) {
  const score = myScores.overall
  const label = getMaturityLabel(score)
  const badge = getMaturityBadgeStyle(score)
  const dashOffset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-7">
      <div className="flex flex-col gap-8 md:flex-row md:items-start">
        {/* Donut chart */}
        <div className="flex shrink-0 flex-col items-center gap-3">
          <svg
            width="140"
            height="140"
            viewBox="0 0 140 140"
            aria-label={`Composite score: ${score} out of 100`}
          >
            {/* Background circle */}
            <circle
              cx="70"
              cy="70"
              r="52"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="16"
            />
            {/* Progress arc */}
            <circle
              cx="70"
              cy="70"
              r="52"
              fill="none"
              stroke="#1175E4"
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 70 70)"
            />
            {/* Center score */}
            <text
              x="70"
              y="66"
              textAnchor="middle"
              style={{ fontSize: 24, fontWeight: 700, fill: '#0f172a' }}
            >
              {score}
            </text>
            {/* "out of 100" label */}
            <text
              x="70"
              y="82"
              textAnchor="middle"
              style={{ fontSize: 10, fill: '#94a3b8' }}
            >
              out of 100
            </text>
          </svg>

          {/* Maturity badge below chart */}
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${badge.bg} ${badge.text}`}
          >
            {label}
          </span>
        </div>

        {/* Phase bars */}
        <div className="flex-1">
          {/* Title + legend */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">Your Skill Profile</h2>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-5 rounded bg-slate-700" />
                You
              </span>
              <span className="flex items-center gap-1.5">
                {/* Dashed line indicator */}
                <svg width="20" height="2" aria-hidden="true">
                  <line
                    x1="0"
                    y1="1"
                    x2="20"
                    y2="1"
                    stroke="#94a3b8"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                </svg>
                Team Avg
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {phases.map((phase) => {
              const myPct = myScores.phases[phase.id] ?? 0
              const teamPct = teamAverages.phases[phase.id] ?? 0
              const color = getPhaseColor(phase.name)

              return (
                <div key={phase.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium" style={{ color }}>
                      {phase.name}
                    </span>
                    <span className="text-slate-500">
                      {myPct}%{' '}
                      <span className="text-xs text-slate-400">(team: {teamPct}%)</span>
                    </span>
                  </div>

                  {/* Bar track */}
                  <div className="relative h-2 rounded-full bg-slate-200">
                    {/* Gradient fill bar */}
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(myPct, 100)}%`,
                        background: `linear-gradient(to right, ${color}99, ${color})`,
                      }}
                    />
                    {/* Team average marker */}
                    {teamPct > 0 && (
                      <div
                        className="absolute top-[-2px] h-3 w-0.5 rounded-sm bg-slate-400"
                        style={{ left: `${Math.min(teamPct, 100)}%` }}
                        title={`Team average: ${teamPct}%`}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
