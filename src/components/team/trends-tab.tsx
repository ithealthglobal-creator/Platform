'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { getPhaseColor } from '@/lib/phase-colors'
import type { Phase, TeamTrendPoint } from '@/lib/types'

interface TrendsTabProps {
  phases: Phase[]
}

const CHART_WIDTH = 600
const CHART_HEIGHT = 200
const PADDING = { top: 10, right: 20, bottom: 30, left: 36 }

function xPos(i: number, total: number): number {
  if (total <= 1) return PADDING.left + (CHART_WIDTH - PADDING.left - PADDING.right) / 2
  return PADDING.left + (i / (total - 1)) * (CHART_WIDTH - PADDING.left - PADDING.right)
}

function yPos(pct: number): number {
  return PADDING.top + ((100 - pct) / 100) * (CHART_HEIGHT - PADDING.top - PADDING.bottom)
}

export function TrendsTab({ phases }: TrendsTabProps) {
  const [period, setPeriod] = useState<30 | 60 | 90>(30)
  const [points, setPoints] = useState<TeamTrendPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const res = await fetch(`/api/team/trends?period=${period}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setPoints(Array.isArray(data) ? data : [])
      } else {
        setPoints([])
      }
      setLoading(false)
    }
    load()
  }, [period])

  const chartInnerWidth = CHART_WIDTH - PADDING.left - PADDING.right
  const chartInnerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom
  const gridYs = [0, 25, 50, 75, 100]

  return (
    <div>
      {/* Period selector */}
      <div className="mb-4 flex items-center gap-2">
        {([30, 60, 90] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              period === p
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {p}d
          </button>
        ))}
      </div>

      {loading && (
        <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
      )}

      {!loading && points.length === 0 && (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No trend data yet...
        </div>
      )}

      {!loading && points.length > 0 && (
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="w-full"
          style={{ height: 200 }}
          aria-label="Team trend chart"
        >
          {/* Grid lines */}
          {gridYs.map(pct => {
            const y = yPos(pct)
            return (
              <g key={pct}>
                <line
                  x1={PADDING.left}
                  y1={y}
                  x2={CHART_WIDTH - PADDING.right}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                />
                <text
                  x={PADDING.left - 4}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={9}
                  fill="#94a3b8"
                >
                  {pct}%
                </text>
              </g>
            )
          })}

          {/* X-axis date labels */}
          {points.map((p, i) => {
            if (i !== 0 && i !== points.length - 1 && i !== Math.floor(points.length / 2)) return null
            return (
              <text
                key={i}
                x={xPos(i, points.length)}
                y={CHART_HEIGHT - PADDING.bottom + 16}
                textAnchor="middle"
                fontSize={9}
                fill="#94a3b8"
              >
                {new Date(p.week).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
              </text>
            )
          })}

          {/* Phase trend lines (dashed, lower opacity) */}
          {phases.map(phase => {
            const linePoints = points
              .map((p, i) =>
                p.phases[phase.id] !== undefined
                  ? `${xPos(i, points.length)},${yPos(p.phases[phase.id])}`
                  : null
              )
              .filter(Boolean)
              .join(' ')

            if (!linePoints) return null

            return (
              <polyline
                key={phase.id}
                points={linePoints}
                fill="none"
                stroke={getPhaseColor(phase.name)}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                strokeOpacity={0.5}
              />
            )
          })}

          {/* Overall trend line */}
          {(() => {
            const overallPoints = points
              .map((p, i) => `${xPos(i, points.length)},${yPos(p.overall)}`)
              .join(' ')

            const lastPt = points[points.length - 1]
            const lastX = xPos(points.length - 1, points.length)
            const lastY = yPos(lastPt.overall)

            return (
              <>
                <polyline
                  points={overallPoints}
                  fill="none"
                  stroke="#1175E4"
                  strokeWidth={2.5}
                />
                <circle cx={lastX} cy={lastY} r={4} fill="#1175E4" />
              </>
            )
          })()}
        </svg>
      )}

      {/* Legend */}
      {!loading && points.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <svg width="20" height="8">
              <line x1="0" y1="4" x2="20" y2="4" stroke="#1175E4" strokeWidth="2.5" />
            </svg>
            Overall
          </span>
          {phases.map(phase => (
            <span key={phase.id} className="flex items-center gap-1.5">
              <svg width="20" height="8">
                <line
                  x1="0"
                  y1="4"
                  x2="20"
                  y2="4"
                  stroke={getPhaseColor(phase.name)}
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  strokeOpacity="0.5"
                />
              </svg>
              {phase.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
