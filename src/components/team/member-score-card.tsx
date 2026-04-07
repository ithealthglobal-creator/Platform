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

const CIRCUMFERENCE = 2 * Math.PI * 52

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

  // Radar chart geometry
  const cx = 120, cy = 110, r = 80
  const n = phases.length
  const angleStep = n > 0 ? (2 * Math.PI) / n : 0
  const startAngle = -Math.PI / 2

  function polarToCart(index: number, value: number): { x: number; y: number } {
    const angle = startAngle + index * angleStep
    const dist = (value / 100) * r
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) }
  }

  const rings = [25, 50, 75, 100]

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-7">
      {/* Title + legend */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">Your Skill Profile</h2>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-[#EDB600]" />
            You
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full border border-dashed border-slate-400" />
            Team Avg
          </span>
        </div>
      </div>

      <div className="flex items-start gap-6">
        {/* Donut chart — brand gold */}
        <div className="flex shrink-0 flex-col items-center gap-2">
          <svg
            width="160"
            height="160"
            viewBox="0 0 140 140"
            aria-label={`Composite score: ${score} out of 100`}
          >
            <circle cx="70" cy="70" r="52" fill="none" stroke="#e2e8f0" strokeWidth="16" />
            <circle
              cx="70" cy="70" r="52" fill="none"
              stroke="#EDB600"
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 70 70)"
            />
            <text x="70" y="66" textAnchor="middle" style={{ fontSize: 24, fontWeight: 700, fill: '#0f172a' }}>
              {score}
            </text>
            <text x="70" y="82" textAnchor="middle" style={{ fontSize: 10, fill: '#94a3b8' }}>
              out of 100
            </text>
          </svg>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.bg} ${badge.text}`}>
            {label}
          </span>
        </div>

        {/* Spider/Radar chart */}
        {n > 0 && (
          <div className="flex-1">
            <svg viewBox="0 0 240 220" className="w-full" style={{ maxHeight: 200 }}>
              {/* Grid rings */}
              {rings.map(pct => {
                const points = phases.map((_, i) => {
                  const p = polarToCart(i, pct)
                  return `${p.x},${p.y}`
                }).join(' ')
                return <polygon key={pct} points={points} fill="none" stroke="#e2e8f0" strokeWidth="1" />
              })}
              {/* Axis lines */}
              {phases.map((_, i) => {
                const p = polarToCart(i, 100)
                return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth="1" />
              })}
              {/* Team average polygon (dashed) */}
              <polygon
                points={phases.map((p, i) => {
                  const teamPct = teamAverages.phases[p.id] ?? 0
                  const pt = polarToCart(i, teamPct)
                  return `${pt.x},${pt.y}`
                }).join(' ')}
                fill="rgba(148,163,184,0.08)"
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              {/* Your score polygon */}
              <polygon
                points={phases.map((p, i) => {
                  const myPct = myScores.phases[p.id] ?? 0
                  const pt = polarToCart(i, myPct)
                  return `${pt.x},${pt.y}`
                }).join(' ')}
                fill="rgba(237,182,0,0.12)"
                stroke="#EDB600"
                strokeWidth="2.5"
              />
              {/* Data points */}
              {phases.map((p, i) => {
                const myPct = myScores.phases[p.id] ?? 0
                const pt = polarToCart(i, myPct)
                return <circle key={i} cx={pt.x} cy={pt.y} r="3.5" fill={getPhaseColor(p.name)} />
              })}
              {/* Labels */}
              {phases.map((p, i) => {
                const labelPos = polarToCart(i, 118)
                const anchor = labelPos.x < cx - 10 ? 'end' : labelPos.x > cx + 10 ? 'start' : 'middle'
                const myPct = myScores.phases[p.id] ?? 0
                const teamPct = teamAverages.phases[p.id] ?? 0
                return (
                  <g key={`label-${i}`}>
                    <text x={labelPos.x} y={labelPos.y - 4} textAnchor={anchor} style={{ fontSize: 10, fill: getPhaseColor(p.name), fontWeight: 700 }}>
                      {p.name}
                    </text>
                    <text x={labelPos.x} y={labelPos.y + 8} textAnchor={anchor} style={{ fontSize: 8, fill: '#64748b' }}>
                      {myPct}% (team: {teamPct}%)
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
