'use client'

import type { TimeUnit, JourneyTimeline } from '@/lib/types'
import { formatDuration } from '@/lib/journey'

interface JourneyHeaderProps {
  timeline: JourneyTimeline
  timeUnit: TimeUnit
  onTimeUnitChange: (unit: TimeUnit) => void
}

const TIME_UNITS: { value: TimeUnit; label: string }[] = [
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
]

export function JourneyHeader({
  timeline,
  timeUnit,
  onTimeUnitChange,
}: JourneyHeaderProps) {
  return (
    <div className="mb-6 flex items-end justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-brand-primary">
          Journey
        </p>
        <h1 className="mt-1 text-2xl font-bold text-brand-dark">
          Your Modernisation Journey
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {timeline.serviceCount} service{timeline.serviceCount !== 1 ? 's' : ''} across{' '}
          {timeline.phaseCount} phase{timeline.phaseCount !== 1 ? 's' : ''} &middot;{' '}
          {formatDuration(timeline.totalMinutes, timeUnit)} total
        </p>
      </div>

      <div className="flex gap-0.5 rounded-lg bg-slate-100 p-0.5">
        {TIME_UNITS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onTimeUnitChange(value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              timeUnit === value
                ? 'bg-brand-primary text-white'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
