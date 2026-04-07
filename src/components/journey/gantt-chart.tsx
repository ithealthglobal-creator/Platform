'use client'

import { useState } from 'react'
import type { JourneyTimeline, TimeUnit } from '@/lib/types'
import { getTimeAxisLabels, minutesToUnit } from '@/lib/journey'
import { GanttTimeAxis } from './gantt-time-axis'
import { GanttPhaseRow } from './gantt-phase-row'
import { GanttSummaryFooter } from './gantt-summary-footer'

// Phase color config keyed by phase name (lowercase)
export const PHASE_COLORS: Record<
  string,
  { bg: string; barFrom: string; barTo: string; text: string; stepBar: string }
> = {
  operate: {
    bg: '#f0fdf4',
    barFrom: '#16a34a',
    barTo: '#4ade80',
    text: '#166534',
    stepBar: '#86efac',
  },
  secure: {
    bg: '#eff6ff',
    barFrom: '#2563eb',
    barTo: '#60a5fa',
    text: '#1e40af',
    stepBar: '#93c5fd',
  },
  streamline: {
    bg: '#faf5ff',
    barFrom: '#9333ea',
    barTo: '#c084fc',
    text: '#6b21a8',
    stepBar: '#d8b4fe',
  },
  accelerate: {
    bg: '#fffbeb',
    barFrom: '#d97706',
    barTo: '#fbbf24',
    text: '#92400e',
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
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
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
              <rect width="4" height="8" fill="#fbbf24" />
              <rect x="4" width="4" height="8" fill="#fde68a" />
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
