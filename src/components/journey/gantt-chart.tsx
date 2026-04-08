'use client'

import { useState } from 'react'
import type { JourneyTimeline, TimeUnit } from '@/lib/types'
import { getTimeAxisLabels, minutesToUnit } from '@/lib/journey'
import { GanttTimeAxis } from './gantt-time-axis'
import { GanttPhaseRow } from './gantt-phase-row'
import { GanttSummaryFooter } from './gantt-summary-footer'

// Phase color config keyed by phase name (lowercase) — IThealth brand palette
// Operate    = Brand Primary (#1175E4) — foundational, core IT operations
// Secure     = Brand Secondary (#FF246B) — security & compliance
// Streamline = Brand Dark Navy (#133258) — optimisation, process efficiency
// Accelerate = Brand Gold (#EDB600) — innovation, growth, forward momentum
export const PHASE_COLORS: Record<
  string,
  { bg: string; barFrom: string; barTo: string; text: string; stepBar: string }
> = {
  operate: {
    bg: '#eef5fd',
    barFrom: '#1175E4',
    barTo: '#5aa0f0',
    text: '#0d5bb5',
    stepBar: '#a3ccf7',
  },
  secure: {
    bg: '#fff0f4',
    barFrom: '#FF246B',
    barTo: '#ff6e9b',
    text: '#c41a52',
    stepBar: '#ffb3cb',
  },
  streamline: {
    bg: '#ebedf4',
    barFrom: '#133258',
    barTo: '#2a5080',
    text: '#0e2440',
    stepBar: '#8ea4c4',
  },
  accelerate: {
    bg: '#fef8e6',
    barFrom: '#EDB600',
    barTo: '#f5ce42',
    text: '#8a6a10',
    stepBar: '#fde68a',
  },
}

const LABEL_WIDTH = 280

interface GanttChartProps {
  timeline: JourneyTimeline
  timeUnit: TimeUnit
}

export function GanttChart({ timeline, timeUnit }: GanttChartProps) {
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>(
    () => {
      // Default: first phase expanded
      const first = timeline.phases[0]
      return first ? { [first.id]: true } : {}
    }
  )
  const [expandedServices, setExpandedServices] = useState<Record<string, boolean>>({})

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => ({ ...prev, [phaseId]: !prev[phaseId] }))
  }

  const toggleService = (serviceId: string) => {
    setExpandedServices((prev) => ({ ...prev, [serviceId]: !prev[serviceId] }))
  }

  const labels = getTimeAxisLabels(timeline.totalMinutes, timeUnit)
  const totalUnits = minutesToUnit(timeline.totalMinutes, timeUnit)
  const chartColumns = Math.max(1, Math.ceil(totalUnits))

  return (
    <div className="overflow-x-auto rounded-xl border border-brand-primary/15 bg-white">
      <div style={{ minWidth: LABEL_WIDTH + chartColumns * 100 }}>
        {/* SVG defs for gradients and patterns (hidden) */}
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            {Object.entries(PHASE_COLORS).map(([name, colors]) => (
              <linearGradient
                key={name}
                id={`grad-${name}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor={colors.barFrom} />
                <stop offset="100%" stopColor={colors.barTo} />
              </linearGradient>
            ))}
            <pattern
              id="academy-stripe"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="4" height="8" fill="#FF246B" />
              <rect x="4" width="4" height="8" fill="#ff6e9b" />
            </pattern>
          </defs>
        </svg>

        <GanttTimeAxis labels={labels} labelWidth={LABEL_WIDTH} />

        {timeline.phases.map((phase) => (
          <GanttPhaseRow
            key={phase.id}
            phase={phase}
            timeUnit={timeUnit}
            totalMinutes={timeline.totalMinutes}
            labelWidth={LABEL_WIDTH}
            expanded={!!expandedPhases[phase.id]}
            expandedServices={expandedServices}
            onTogglePhase={togglePhase}
            onToggleService={toggleService}
          />
        ))}

        <GanttSummaryFooter
          timeline={timeline}
          timeUnit={timeUnit}
          labelWidth={LABEL_WIDTH}
        />
      </div>
    </div>
  )
}
