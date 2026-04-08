'use client'

import { getMaturityLabel } from '@/lib/scoring'

interface PhaseRadarPhase {
  id: string
  name: string
  score: number
  color: string
}

interface PhaseRadarProps {
  phases: PhaseRadarPhase[]
  overall: number
}

function polarToCartesian(cx: number, cy: number, radius: number, angleRad: number) {
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  }
}

export function PhaseRadar({ phases, overall }: PhaseRadarProps) {
  const cx = 150
  const cy = 140
  const maxRadius = 110
  const count = phases.length

  // Angles: start from top (-PI/2), evenly distributed
  const angles = phases.map((_, i) => -Math.PI / 2 + (2 * Math.PI * i) / count)

  // Concentric grid rings at 25/50/75/100%
  const rings = [25, 50, 75, 100]

  // Build data polygon points
  const dataPoints = phases.map((phase, i) => {
    const r = (phase.score / 100) * maxRadius
    return polarToCartesian(cx, cy, r, angles[i])
  })
  const polygonPoints = dataPoints.map(p => `${p.x},${p.y}`).join(' ')

  // Label positions slightly beyond max radius
  const labelOffset = maxRadius + 22

  return (
    <div className="flex gap-6">
      {/* SVG Radar */}
      <div className="shrink-0">
        <svg viewBox="0 0 300 280" width={300} height={280} className="overflow-visible">
          {/* Concentric grid rings */}
          {rings.map(ring => {
            const r = (ring / 100) * maxRadius
            const ringPoints = angles
              .map(a => polarToCartesian(cx, cy, r, a))
              .map(p => `${p.x},${p.y}`)
              .join(' ')
            return (
              <polygon
                key={ring}
                points={ringPoints}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="1"
              />
            )
          })}

          {/* Ring % labels */}
          {rings.map(ring => (
            <text
              key={`label-${ring}`}
              x={cx + 3}
              y={cy - (ring / 100) * maxRadius + 4}
              fontSize="8"
              fill="#94a3b8"
            >
              {ring}%
            </text>
          ))}

          {/* Axis lines from center to vertices */}
          {angles.map((angle, i) => {
            const outer = polarToCartesian(cx, cy, maxRadius, angle)
            return (
              <line
                key={`axis-${i}`}
                x1={cx}
                y1={cy}
                x2={outer.x}
                y2={outer.y}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
            )
          })}

          {/* Data polygon */}
          {phases.length > 0 && (
            <polygon
              points={polygonPoints}
              fill="rgba(17,117,228,0.12)"
              stroke="#1175E4"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          )}

          {/* Colored data points */}
          {dataPoints.map((pt, i) => (
            <circle
              key={`dot-${i}`}
              cx={pt.x}
              cy={pt.y}
              r={5}
              fill={phases[i].color}
              stroke="white"
              strokeWidth="1.5"
            />
          ))}

          {/* Phase labels */}
          {phases.map((phase, i) => {
            const labelPt = polarToCartesian(cx, cy, labelOffset, angles[i])
            // Determine text anchor based on x position
            const anchor =
              labelPt.x < cx - 10 ? 'end' : labelPt.x > cx + 10 ? 'start' : 'middle'
            return (
              <g key={`label-${i}`}>
                <text
                  x={labelPt.x}
                  y={labelPt.y - 6}
                  textAnchor={anchor}
                  fontSize="11"
                  fontWeight="600"
                  fill={phase.color}
                >
                  {phase.name}
                </text>
                <text
                  x={labelPt.x}
                  y={labelPt.y + 8}
                  textAnchor={anchor}
                  fontSize="10"
                  fill="#64748b"
                >
                  {phase.score}%
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Phase breakdown bars + overall */}
      <div className="flex flex-1 flex-col justify-center gap-3">
        {phases.map(phase => (
          <div key={phase.id}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: phase.color }}>
                {phase.name}
              </span>
              <span className="text-xs font-medium text-slate-600">{phase.score}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${phase.score}%`,
                  background: `linear-gradient(90deg, ${phase.color}, ${phase.color}88)`,
                }}
              />
            </div>
          </div>
        ))}

        {/* Overall score */}
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Overall</p>
          <p className="mt-0.5 text-2xl font-bold" style={{ color: '#1175E4' }}>
            {overall}%
          </p>
          <span
            className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold text-white"
            style={{ backgroundColor: '#1175E4' }}
          >
            {getMaturityLabel(overall)}
          </span>
        </div>
      </div>
    </div>
  )
}
