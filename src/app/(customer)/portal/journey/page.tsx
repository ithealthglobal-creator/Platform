'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import type { JourneyTimeline, TimeUnit } from '@/lib/types'
import { fetchJourneyTimeline } from '@/lib/journey'
import { JourneyHeader } from '@/components/journey/journey-header'
import { GanttChart } from '@/components/journey/gantt-chart'
import { JourneyEmptyState } from '@/components/journey/journey-empty-state'

export default function JourneyPage() {
  const [timeline, setTimeline] = useState<JourneyTimeline | null>(null)
  const [allAboveThreshold, setAllAboveThreshold] = useState(false)
  const [loading, setLoading] = useState(true)
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('days')

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const result = await fetchJourneyTimeline(user.id)
      setTimeline(result.timeline)
      setAllAboveThreshold(result.allAboveThreshold)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-brand-primary">
          Journey
        </p>
        <h1 className="mt-1 text-2xl font-bold text-brand-dark">
          Your Modernisation Journey
        </h1>
        <div className="mt-6 space-y-3">
          <div className="h-10 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
        </div>
      </div>
    )
  }

  if (!timeline) {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-brand-primary">
          Journey
        </p>
        <h1 className="mt-1 text-2xl font-bold text-brand-dark">
          Your Modernisation Journey
        </h1>
        <div className="mt-6">
          <JourneyEmptyState
            type={allAboveThreshold ? 'all-above-threshold' : 'no-assessment'}
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <JourneyHeader
        timeline={timeline}
        timeUnit={timeUnit}
        onTimeUnitChange={setTimeUnit}
      />
      <GanttChart timeline={timeline} timeUnit={timeUnit} />
    </div>
  )
}
