# Customer Journey Gantt Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a collapsible SVG Gantt chart on the Customer Journey page that visualizes the customer's IT modernisation implementation timeline based on their assessment scores.

**Architecture:** Custom SVG-based Gantt chart with a 3-level collapsible hierarchy (Phase → Service → Runbook Steps). Data is derived from the customer's latest onboarding assessment attempt — services scoring below a configurable threshold are included. Academy learning appears as the first line item per service spanning its full duration.

**Tech Stack:** Next.js App Router, React (client components), Supabase (Postgres + PostgREST), TypeScript, Tailwind CSS, IBM Carbon icons, Poppins font, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-04-07-customer-journey-gantt-design.md`

---

## File Structure

```
supabase/migrations/
  20260407200001_add_journey_threshold.sql  — ALTER TABLE assessments ADD COLUMN journey_threshold

src/lib/
  types.ts                                  — Add JourneyTimeline types (modify existing)
  journey.ts                                — Data fetching + timeline calculation logic (new)

src/components/journey/
  journey-empty-state.tsx                   — No assessment / all above threshold states (new)
  gantt-chart.tsx                           — GanttChart container with SVG defs + grid (new)
  gantt-time-axis.tsx                       — Time axis header row (new)
  gantt-phase-row.tsx                       — Collapsible phase row with gradient bar (new)
  gantt-service-row.tsx                     — Collapsible service row with bar (new)
  gantt-academy-row.tsx                     — Academy learning row with striped bar (new)
  gantt-step-row.tsx                        — Runbook step row with bar (new)
  gantt-summary-footer.tsx                  — Total implementation summary row (new)
  journey-header.tsx                        — Page header + time unit toggle (new)

src/app/(customer)/portal/journey/
  page.tsx                                  — JourneyPage main component (modify existing)

src/app/(admin)/academy/assessments/
  new/page.tsx                              — Add journey_threshold field (modify existing)
  [id]/page.tsx                             — Add journey_threshold field (modify existing)
```

---

### Task 1: Database Migration — Add `journey_threshold` Column

**Files:**
- Create: `supabase/migrations/20260407200001_add_journey_threshold.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Add configurable threshold for customer journey Gantt chart.
-- Services where the customer's assessment score % < this value are included.
ALTER TABLE public.assessments
  ADD COLUMN journey_threshold integer NOT NULL DEFAULT 80;
```

- [ ] **Step 2: Apply migration**

Run: `npx supabase db push`
Expected: Migration applied successfully

- [ ] **Step 3: Verify column exists**

Run: `npx supabase db reset` (to also update seed data)
Expected: Reset completes without error

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260407200001_add_journey_threshold.sql
git commit -m "feat: add journey_threshold column to assessments table"
```

---

### Task 2: TypeScript Types — Add Journey Timeline Types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add types at the end of the file**

Append after the last type definition in `src/lib/types.ts`:

```typescript
// ---------------------------------------------------------------------------
// Journey Gantt Chart
// ---------------------------------------------------------------------------
export type TimeUnit = 'hours' | 'days' | 'weeks'

export interface JourneyTimelineStep {
  id: string
  title: string
  description: string | null
  durationMinutes: number
  role: string | null
  startMinute: number // cumulative offset from timeline start
}

export interface JourneyAcademyCourse {
  courseId: string
  courseName: string
  isRequired: boolean
}

export interface JourneyTimelineService {
  id: string
  name: string
  description: string | null
  phaseId: string
  score: number // customer's assessment score percentage for this service
  durationMinutes: number // sum of all runbook step durations
  startMinute: number // cumulative offset from timeline start
  academyCourses: JourneyAcademyCourse[]
  steps: JourneyTimelineStep[]
}

export interface JourneyTimelinePhase {
  id: string
  name: string
  sortOrder: number
  durationMinutes: number // sum of all services' durations
  startMinute: number // cumulative offset from timeline start
  services: JourneyTimelineService[]
}

export interface JourneyTimeline {
  phases: JourneyTimelinePhase[]
  totalMinutes: number
  serviceCount: number
  phaseCount: number
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add Journey Gantt chart TypeScript types"
```

---

### Task 3: Data Fetching & Timeline Calculation — `src/lib/journey.ts`

**Files:**
- Create: `src/lib/journey.ts`

This is the core business logic — fetches data from Supabase and builds the `JourneyTimeline` model.

- [ ] **Step 1: Create the journey data module**

```typescript
import { supabase } from '@/lib/supabase-client'
import type {
  JourneyTimeline,
  JourneyTimelinePhase,
  JourneyTimelineService,
  JourneyTimelineStep,
  JourneyAcademyCourse,
  TimeUnit,
} from '@/lib/types'

const MINUTES_PER_DAY = 480 // 8-hour business day
const MINUTES_PER_WEEK = 2400 // 5 × 8-hour days

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch the customer's latest onboarding assessment attempt and build a
 * journey timeline from services that scored below the threshold.
 * Returns null if no attempt exists.
 */
export async function fetchJourneyTimeline(
  userId: string
): Promise<{ timeline: JourneyTimeline | null; allAboveThreshold: boolean }> {
  // 1. Get the onboarding assessment + its journey_threshold
  const { data: assessment } = await supabase
    .from('assessments')
    .select('id, journey_threshold')
    .eq('is_onboarding', true)
    .single()

  if (!assessment) return { timeline: null, allAboveThreshold: false }

  // 2. Get latest attempt for this user on this assessment
  const { data: attempt } = await supabase
    .from('assessment_attempts')
    .select('service_scores')
    .eq('assessment_id', assessment.id)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!attempt?.service_scores) return { timeline: null, allAboveThreshold: false }

  const serviceScores = attempt.service_scores as Record<
    string,
    { earned: number; max: number; pct: number }
  >

  // 3. Filter services below threshold
  const belowThreshold = Object.entries(serviceScores).filter(
    ([, s]) => s.pct < assessment.journey_threshold
  )

  if (belowThreshold.length === 0) {
    return { timeline: null, allAboveThreshold: true }
  }

  const serviceIds = belowThreshold.map(([id]) => id)
  const scoreMap = new Map(belowThreshold.map(([id, s]) => [id, s.pct]))

  // 4. Fetch services with phase, runbook steps, and academy links
  const [{ data: services }, { data: runbookSteps }, { data: academyLinks }] =
    await Promise.all([
      supabase
        .from('services')
        .select('id, name, description, phase_id, phase:phases(id, name, sort_order)')
        .in('id', serviceIds)
        .eq('is_active', true),
      supabase
        .from('service_runbook_steps')
        .select('id, service_id, title, description, estimated_minutes, role, sort_order')
        .in('service_id', serviceIds)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('service_academy_links')
        .select('service_id, is_required, course:courses(id, name)')
        .in('service_id', serviceIds),
    ])

  if (!services?.length) return { timeline: null, allAboveThreshold: false }

  // 5. Build lookup maps
  const stepsByService = new Map<string, typeof runbookSteps>()
  for (const step of runbookSteps ?? []) {
    const list = stepsByService.get(step.service_id) ?? []
    list.push(step)
    stepsByService.set(step.service_id, list)
  }

  const coursesByService = new Map<string, JourneyAcademyCourse[]>()
  for (const link of academyLinks ?? []) {
    const course = link.course as unknown as { id: string; name: string } | null
    if (!course) continue
    const list = coursesByService.get(link.service_id) ?? []
    list.push({
      courseId: course.id,
      courseName: course.name,
      isRequired: link.is_required,
    })
    coursesByService.set(link.service_id, list)
  }

  // 6. Group services by phase, order phases by sort_order, services by name
  const phaseMap = new Map<
    string,
    { id: string; name: string; sortOrder: number; services: typeof services }
  >()

  for (const svc of services) {
    const phase = svc.phase as unknown as { id: string; name: string; sort_order: number }
    if (!phase) continue
    const existing = phaseMap.get(phase.id) ?? {
      id: phase.id,
      name: phase.name,
      sortOrder: phase.sort_order,
      services: [],
    }
    existing.services.push(svc)
    phaseMap.set(phase.id, existing)
  }

  const sortedPhases = Array.from(phaseMap.values()).sort(
    (a, b) => a.sortOrder - b.sortOrder
  )

  // 7. Build timeline with cumulative offsets
  let cursor = 0 // minutes from start
  const phases: JourneyTimelinePhase[] = []

  for (const phaseGroup of sortedPhases) {
    const phaseStart = cursor
    const sortedServices = phaseGroup.services.sort((a, b) =>
      a.name.localeCompare(b.name)
    )

    const timelineServices: JourneyTimelineService[] = []

    for (const svc of sortedServices) {
      const serviceStart = cursor
      const steps = stepsByService.get(svc.id) ?? []
      let stepCursor = cursor
      const timelineSteps: JourneyTimelineStep[] = []

      for (const step of steps) {
        const duration = step.estimated_minutes ?? 0
        timelineSteps.push({
          id: step.id,
          title: step.title,
          description: step.description,
          durationMinutes: duration,
          role: step.role,
          startMinute: stepCursor,
        })
        stepCursor += duration
      }

      const serviceDuration = stepCursor - serviceStart

      // Sort academy courses: required first
      const courses = coursesByService.get(svc.id) ?? []
      courses.sort((a, b) => (a.isRequired === b.isRequired ? 0 : a.isRequired ? -1 : 1))

      timelineServices.push({
        id: svc.id,
        name: svc.name,
        description: svc.description,
        phaseId: phaseGroup.id,
        score: scoreMap.get(svc.id) ?? 0,
        durationMinutes: serviceDuration,
        startMinute: serviceStart,
        academyCourses: courses,
        steps: timelineSteps,
      })

      cursor = stepCursor
    }

    phases.push({
      id: phaseGroup.id,
      name: phaseGroup.name,
      sortOrder: phaseGroup.sortOrder,
      durationMinutes: cursor - phaseStart,
      startMinute: phaseStart,
      services: timelineServices,
    })
  }

  return {
    timeline: {
      phases,
      totalMinutes: cursor,
      serviceCount: serviceIds.length,
      phaseCount: phases.length,
    },
    allAboveThreshold: false,
  }
}

// ── Time Conversion Helpers ─────────────────────────────────────────────────

export function minutesToUnit(minutes: number, unit: TimeUnit): number {
  switch (unit) {
    case 'hours':
      return minutes / 60
    case 'days':
      return minutes / MINUTES_PER_DAY
    case 'weeks':
      return minutes / MINUTES_PER_WEEK
  }
}

export function formatDuration(minutes: number, unit: TimeUnit): string {
  const value = minutesToUnit(minutes, unit)
  if (value === 0) return '0'
  if (unit === 'hours') {
    if (value < 1) return `${minutes}m`
    return `${value.toFixed(1)}h`
  }
  if (unit === 'days') return `${value.toFixed(1)}d`
  return `${value.toFixed(1)}w`
}

export function getTimeAxisLabels(
  totalMinutes: number,
  unit: TimeUnit
): string[] {
  const total = minutesToUnit(totalMinutes, unit)
  const count = Math.max(1, Math.ceil(total))
  const labels: string[] = []
  const prefix = unit === 'hours' ? 'Hour' : unit === 'days' ? 'Day' : 'Week'
  for (let i = 1; i <= count; i++) {
    labels.push(`${prefix} ${i}`)
  }
  return labels
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/journey.ts
git commit -m "feat: add journey timeline data fetching and calculation logic"
```

---

### Task 4: Empty State Component

**Files:**
- Create: `src/components/journey/journey-empty-state.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Roadmap, CheckmarkOutline } from '@carbon/icons-react'

interface JourneyEmptyStateProps {
  type: 'no-assessment' | 'all-above-threshold'
}

export function JourneyEmptyState({ type }: JourneyEmptyStateProps) {
  const router = useRouter()

  if (type === 'all-above-threshold') {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-center">
        <CheckmarkOutline size={48} className="mb-4 text-green-500" />
        <h2 className="text-lg font-semibold text-slate-900">
          Outstanding IT Maturity
        </h2>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          Your IT maturity scores are above the threshold across all services.
          Great work!
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-center">
      <Roadmap size={48} className="mb-4 text-slate-300" />
      <h2 className="text-lg font-semibold text-slate-900">
        No Journey Data Yet
      </h2>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        Complete your IT Modernisation Assessment to see your personalised
        implementation journey.
      </p>
      <Button
        className="mt-6"
        onClick={() => router.push('/portal/home')}
      >
        Go to Assessment
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/journey/journey-empty-state.tsx
git commit -m "feat: add journey empty state component"
```

---

### Task 5: Journey Header + Time Unit Toggle

**Files:**
- Create: `src/components/journey/journey-header.tsx`

- [ ] **Step 1: Create the component**

```typescript
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
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Journey
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Your Modernisation Journey
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {timeline.serviceCount} service{timeline.serviceCount !== 1 ? 's' : ''} across{' '}
          {timeline.phaseCount} phase{timeline.phaseCount !== 1 ? 's' : ''} &middot;{' '}
          {formatDuration(timeline.totalMinutes, timeUnit)} total
        </p>
      </div>

      {/* Time unit toggle */}
      <div className="flex gap-0.5 rounded-lg bg-slate-100 p-0.5">
        {TIME_UNITS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onTimeUnitChange(value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              timeUnit === value
                ? 'bg-slate-900 text-white'
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/journey/journey-header.tsx
git commit -m "feat: add journey header with time unit toggle"
```

---

### Task 6: Gantt Chart — SVG Definitions & Phase Colors

**Files:**
- Create: `src/components/journey/gantt-chart.tsx`

This is the main chart container. It defines SVG gradient/pattern `<defs>`, renders the time axis, rows, and footer.

- [ ] **Step 1: Create the component**

```typescript
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
const ROW_HEIGHT = 36
const PHASE_ROW_HEIGHT = 40
const STEP_ROW_HEIGHT = 30
const BAR_PADDING = 6

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
  // Ensure at least 1 column width
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

export { LABEL_WIDTH, ROW_HEIGHT, PHASE_ROW_HEIGHT, STEP_ROW_HEIGHT, BAR_PADDING }
```

- [ ] **Step 2: Commit (will verify compile after all chart components exist)**

```bash
git add src/components/journey/gantt-chart.tsx
git commit -m "feat: add Gantt chart container with SVG defs and phase colors"
```

---

### Task 7: Gantt Time Axis

**Files:**
- Create: `src/components/journey/gantt-time-axis.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

interface GanttTimeAxisProps {
  labels: string[]
  labelWidth: number
}

export function GanttTimeAxis({ labels, labelWidth }: GanttTimeAxisProps) {
  return (
    <div className="flex border-b-2 border-slate-200 bg-slate-50">
      <div
        className="shrink-0 px-4 py-2.5 text-sm font-semibold text-slate-700"
        style={{ width: labelWidth }}
      >
        Task
      </div>
      <div className="flex flex-1">
        {labels.map((label) => (
          <div
            key={label}
            className="flex-1 border-l border-slate-200 px-2 py-2.5 text-center text-xs text-slate-500"
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/journey/gantt-time-axis.tsx
git commit -m "feat: add Gantt time axis component"
```

---

### Task 8: Gantt Step Row

**Files:**
- Create: `src/components/journey/gantt-step-row.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import type { JourneyTimelineStep, TimeUnit } from '@/lib/types'
import { formatDuration, minutesToUnit } from '@/lib/journey'

interface GanttStepRowProps {
  step: JourneyTimelineStep
  index: number
  totalMinutes: number
  labelWidth: number
  timeUnit: TimeUnit
  barColor: string
}

export function GanttStepRow({
  step,
  index,
  totalMinutes,
  labelWidth,
  timeUnit,
  barColor,
}: GanttStepRowProps) {
  const leftPct = totalMinutes > 0 ? (step.startMinute / totalMinutes) * 100 : 0
  const widthPct = totalMinutes > 0 ? (step.durationMinutes / totalMinutes) * 100 : 0

  return (
    <div className="flex border-b border-slate-50 bg-white">
      <div
        className="flex shrink-0 items-center gap-1.5 px-4 py-1"
        style={{ width: labelWidth, paddingLeft: 56 }}
      >
        <span className="text-xs text-slate-400">{index + 1}.</span>
        <span className="truncate text-xs text-slate-600">{step.title}</span>
        <span className="ml-auto shrink-0 text-[10px] text-slate-400">
          {formatDuration(step.durationMinutes, timeUnit)}
        </span>
      </div>
      <div className="relative flex flex-1 items-center">
        {step.durationMinutes > 0 && (
          <div
            className="absolute h-3.5 rounded-sm"
            style={{
              left: `${leftPct}%`,
              width: `${Math.max(widthPct, 0.3)}%`,
              backgroundColor: barColor,
            }}
            title={`${step.title} — ${formatDuration(step.durationMinutes, timeUnit)}${step.role ? ` (${step.role})` : ''}`}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/journey/gantt-step-row.tsx
git commit -m "feat: add Gantt runbook step row component"
```

---

### Task 9: Gantt Academy Row

**Files:**
- Create: `src/components/journey/gantt-academy-row.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import type { JourneyAcademyCourse } from '@/lib/types'
import { Education } from '@carbon/icons-react'

interface GanttAcademyRowProps {
  course: JourneyAcademyCourse
  serviceStartMinute: number
  serviceDurationMinutes: number
  totalMinutes: number
  labelWidth: number
}

export function GanttAcademyRow({
  course,
  serviceStartMinute,
  serviceDurationMinutes,
  totalMinutes,
  labelWidth,
}: GanttAcademyRowProps) {
  const leftPct = totalMinutes > 0 ? (serviceStartMinute / totalMinutes) * 100 : 0
  const widthPct =
    totalMinutes > 0 ? (serviceDurationMinutes / totalMinutes) * 100 : 0

  return (
    <div className="flex border-b border-slate-50 bg-amber-50/50">
      <div
        className="flex shrink-0 items-center gap-1.5 px-4 py-1"
        style={{ width: labelWidth, paddingLeft: 56 }}
      >
        <Education size={14} className="shrink-0 text-amber-600" />
        <span className="truncate text-xs italic text-amber-800">
          {course.courseName}
        </span>
        {course.isRequired && (
          <span className="ml-auto shrink-0 rounded bg-amber-200 px-1 py-0.5 text-[9px] font-medium text-amber-800">
            Required
          </span>
        )}
      </div>
      <div className="relative flex flex-1 items-center">
        {serviceDurationMinutes > 0 && (
          <svg
            className="absolute h-3.5"
            style={{
              left: `${leftPct}%`,
              width: `${Math.max(widthPct, 0.3)}%`,
            }}
          >
            <rect
              width="100%"
              height="100%"
              rx="2"
              fill="url(#academy-stripe)"
              opacity="0.8"
            />
          </svg>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/journey/gantt-academy-row.tsx
git commit -m "feat: add Gantt academy learning row component"
```

---

### Task 10: Gantt Service Row

**Files:**
- Create: `src/components/journey/gantt-service-row.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import type { JourneyTimelineService, TimeUnit } from '@/lib/types'
import { formatDuration } from '@/lib/journey'
import { ChevronRight, ChevronDown } from '@carbon/icons-react'
import { GanttAcademyRow } from './gantt-academy-row'
import { GanttStepRow } from './gantt-step-row'

interface GanttServiceRowProps {
  service: JourneyTimelineService
  timeUnit: TimeUnit
  totalMinutes: number
  labelWidth: number
  expanded: boolean
  onToggle: () => void
  stepBarColor: string
}

export function GanttServiceRow({
  service,
  timeUnit,
  totalMinutes,
  labelWidth,
  expanded,
  onToggle,
  stepBarColor,
}: GanttServiceRowProps) {
  const leftPct =
    totalMinutes > 0 ? (service.startMinute / totalMinutes) * 100 : 0
  const widthPct =
    totalMinutes > 0 ? (service.durationMinutes / totalMinutes) * 100 : 0

  const ChevronIcon = expanded ? ChevronDown : ChevronRight

  return (
    <>
      {/* Service header row */}
      <div
        className="flex cursor-pointer border-b border-slate-100 bg-white hover:bg-slate-50/50"
        onClick={onToggle}
      >
        <div
          className="flex shrink-0 items-center gap-2 px-4 py-2"
          style={{ width: labelWidth, paddingLeft: 36 }}
        >
          <ChevronIcon size={14} className="shrink-0 text-slate-400" />
          <span className="truncate text-sm font-medium text-slate-700">
            {service.name}
          </span>
          <span className="ml-auto shrink-0 text-xs text-slate-400">
            {formatDuration(service.durationMinutes, timeUnit)}
          </span>
        </div>
        <div className="relative flex flex-1 items-center">
          {service.durationMinutes > 0 && (
            <div
              className="absolute h-5 rounded"
              style={{
                left: `${leftPct}%`,
                width: `${Math.max(widthPct, 0.3)}%`,
                backgroundColor: stepBarColor,
                opacity: 0.6,
              }}
              title={`${service.name} — ${formatDuration(service.durationMinutes, timeUnit)}`}
            />
          )}
          {service.durationMinutes === 0 && (
            <span
              className="absolute text-xs italic text-slate-400"
              style={{ left: `${leftPct}%`, paddingLeft: 4 }}
            >
              Runbook pending
            </span>
          )}
        </div>
      </div>

      {/* Expanded children: academy courses then runbook steps */}
      {expanded && (
        <>
          {service.academyCourses.map((course) => (
            <GanttAcademyRow
              key={course.courseId}
              course={course}
              serviceStartMinute={service.startMinute}
              serviceDurationMinutes={service.durationMinutes}
              totalMinutes={totalMinutes}
              labelWidth={labelWidth}
            />
          ))}
          {service.steps.map((step, i) => (
            <GanttStepRow
              key={step.id}
              step={step}
              index={i}
              totalMinutes={totalMinutes}
              labelWidth={labelWidth}
              timeUnit={timeUnit}
              barColor={stepBarColor}
            />
          ))}
        </>
      )}
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/journey/gantt-service-row.tsx
git commit -m "feat: add Gantt service row component with collapse"
```

---

### Task 11: Gantt Phase Row

**Files:**
- Create: `src/components/journey/gantt-phase-row.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import type { JourneyTimelinePhase, TimeUnit } from '@/lib/types'
import { formatDuration } from '@/lib/journey'
import { PHASE_COLORS } from './gantt-chart'
import { ChevronRight, ChevronDown } from '@carbon/icons-react'
import { GanttServiceRow } from './gantt-service-row'

interface GanttPhaseRowProps {
  phase: JourneyTimelinePhase
  timeUnit: TimeUnit
  totalMinutes: number
  labelWidth: number
  expanded: boolean
  expandedServices: Record<string, boolean>
  onTogglePhase: (phaseId: string) => void
  onToggleService: (serviceId: string) => void
}

export function GanttPhaseRow({
  phase,
  timeUnit,
  totalMinutes,
  labelWidth,
  expanded,
  expandedServices,
  onTogglePhase,
  onToggleService,
}: GanttPhaseRowProps) {
  const colors = PHASE_COLORS[phase.name.toLowerCase()] ?? PHASE_COLORS.operate
  const leftPct =
    totalMinutes > 0 ? (phase.startMinute / totalMinutes) * 100 : 0
  const widthPct =
    totalMinutes > 0 ? (phase.durationMinutes / totalMinutes) * 100 : 0

  const ChevronIcon = expanded ? ChevronDown : ChevronRight

  return (
    <>
      {/* Phase header row */}
      <div
        className="flex cursor-pointer border-b border-slate-200"
        style={{ backgroundColor: colors.bg }}
        onClick={() => onTogglePhase(phase.id)}
      >
        <div
          className="flex shrink-0 items-center gap-2 px-4 py-2.5"
          style={{ width: labelWidth }}
        >
          <ChevronIcon size={14} style={{ color: colors.barFrom }} />
          <span
            className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
            style={{ backgroundColor: colors.barFrom }}
          >
            {phase.name}
          </span>
          {!expanded && (
            <span className="ml-auto text-xs text-slate-500">
              {phase.services.length} service{phase.services.length !== 1 ? 's' : ''}{' '}
              &middot; {formatDuration(phase.durationMinutes, timeUnit)}
            </span>
          )}
        </div>
        <div className="relative flex flex-1 items-center">
          {phase.durationMinutes > 0 && (
            <svg
              className="absolute h-6"
              style={{
                left: `${leftPct}%`,
                width: `${Math.max(widthPct, 0.5)}%`,
              }}
            >
              <rect
                width="100%"
                height="100%"
                rx="4"
                fill={`url(#grad-${phase.name.toLowerCase()})`}
              />
              <text
                x="8"
                y="50%"
                dominantBaseline="central"
                fill="white"
                fontSize="10"
                fontWeight="600"
                fontFamily="Poppins, sans-serif"
              >
                {formatDuration(phase.durationMinutes, timeUnit)}
              </text>
            </svg>
          )}
        </div>
      </div>

      {/* Expanded services */}
      {expanded &&
        phase.services.map((service) => (
          <GanttServiceRow
            key={service.id}
            service={service}
            timeUnit={timeUnit}
            totalMinutes={totalMinutes}
            labelWidth={labelWidth}
            expanded={!!expandedServices[service.id]}
            onToggle={() => onToggleService(service.id)}
            stepBarColor={colors.stepBar}
          />
        ))}
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/journey/gantt-phase-row.tsx
git commit -m "feat: add Gantt phase row component with collapse and gradient bar"
```

---

### Task 12: Gantt Summary Footer

**Files:**
- Create: `src/components/journey/gantt-summary-footer.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import type { JourneyTimeline, TimeUnit } from '@/lib/types'
import { formatDuration } from '@/lib/journey'

interface GanttSummaryFooterProps {
  timeline: JourneyTimeline
  timeUnit: TimeUnit
  labelWidth: number
}

export function GanttSummaryFooter({
  timeline,
  timeUnit,
  labelWidth,
}: GanttSummaryFooterProps) {
  return (
    <div className="flex border-t-2 border-slate-200 bg-slate-50">
      <div
        className="shrink-0 px-4 py-3 text-sm font-semibold text-slate-900"
        style={{ width: labelWidth }}
      >
        Total Implementation
      </div>
      <div className="flex flex-1 items-center gap-4 px-4 py-3">
        <span className="text-sm font-semibold text-slate-900">
          {formatDuration(timeline.totalMinutes, timeUnit)}
          {timeUnit === 'days' && ' business days'}
          {timeUnit === 'weeks' && ' weeks'}
          {timeUnit === 'hours' && ' hours'}
        </span>
        <span className="text-xs text-slate-500">
          {timeline.serviceCount} service{timeline.serviceCount !== 1 ? 's' : ''} across{' '}
          {timeline.phaseCount} phase{timeline.phaseCount !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/journey/gantt-summary-footer.tsx
git commit -m "feat: add Gantt summary footer component"
```

---

### Task 13: Journey Page — Wire Everything Together

**Files:**
- Modify: `src/app/(customer)/portal/journey/page.tsx`

- [ ] **Step 1: Replace the placeholder page**

Replace the entire contents of `src/app/(customer)/portal/journey/page.tsx` with:

```typescript
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
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Journey
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
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
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Journey
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
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
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Verify dev server loads the page**

Run: `npm run dev` (if not already running)
Navigate to the customer portal at `/portal/journey` and verify:
- Loading skeleton appears briefly
- If the seeded customer user has an assessment attempt with service_scores, the Gantt chart renders
- If no attempt, the empty state shows

- [ ] **Step 4: Commit**

```bash
git add src/app/\(customer\)/portal/journey/page.tsx
git commit -m "feat: wire up Journey page with Gantt chart and empty states"
```

---

### Task 14: Admin Assessment Editor — Add `journey_threshold` Field

**Files:**
- Modify: `src/app/(admin)/academy/assessments/new/page.tsx`
- Modify: `src/app/(admin)/academy/assessments/[id]/page.tsx`

- [ ] **Step 1: Update the new assessment form**

In `src/app/(admin)/academy/assessments/new/page.tsx`:

Add state variable after the `formPassThreshold` state:
```typescript
const [formJourneyThreshold, setFormJourneyThreshold] = useState('80')
```

Add the field in the form JSX, immediately after the Pass Threshold input field group:
```typescript
<div>
  <Label htmlFor="journeyThreshold">Journey Threshold (%)</Label>
  <Input
    id="journeyThreshold"
    type="number"
    min={0}
    max={100}
    value={formJourneyThreshold}
    onChange={(e) => setFormJourneyThreshold(e.target.value)}
  />
  <p className="mt-1 text-xs text-slate-500">
    Services scoring below this % appear in the customer journey
  </p>
</div>
```

Add `journey_threshold: Number(formJourneyThreshold)` to the insert payload in the save handler.

- [ ] **Step 2: Update the edit assessment form**

In `src/app/(admin)/academy/assessments/[id]/page.tsx`:

Apply the same pattern — add `formJourneyThreshold` state, initialise it from the fetched assessment data (`assessment.journey_threshold`), add the form field, and include it in the update payload.

- [ ] **Step 3: Update the Assessment type**

In `src/lib/types.ts`, add `journey_threshold` to the `Assessment` interface:

```typescript
journey_threshold: number
```

Add it after the `pass_threshold` field.

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/app/\(admin\)/academy/assessments/new/page.tsx \
       src/app/\(admin\)/academy/assessments/\[id\]/page.tsx \
       src/lib/types.ts
git commit -m "feat: add journey_threshold field to assessment editor"
```

---

### Task 15: Visual QA & Polish

**Files:**
- May modify any `src/components/journey/*.tsx` file

- [ ] **Step 1: Manual visual QA**

Open the customer portal with the seeded customer user. Navigate to `/portal/journey`. Verify:

1. Gantt chart renders with correct phase order (Operate → Secure → Streamline → Accelerate)
2. Phase colors match the spec (green, blue, purple, amber)
3. Collapsing/expanding phases works — click phase row to toggle
4. Collapsing/expanding services works — click service row to toggle
5. Academy learning rows show with striped amber bar spanning full service duration
6. Runbook steps show with correct sequential positioning
7. Time unit toggle switches between Hours/Days/Weeks correctly
8. Summary footer shows correct totals
9. Empty states work (test by removing assessment_attempts for the user)

- [ ] **Step 2: Fix any visual issues found**

Address spacing, alignment, overflow, or color issues found in step 1.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A src/components/journey/
git commit -m "fix: Gantt chart visual polish from QA pass"
```

---

### Task 16: Final Integration Commit

- [ ] **Step 1: Verify clean build**

Run: `npx tsc --noEmit --pretty`
Expected: No type errors

- [ ] **Step 2: Verify full page flow**

1. Log in as admin → go to assessment editor → verify journey_threshold field exists and defaults to 80
2. Log in as customer → go to `/portal/journey` → verify Gantt chart renders correctly
3. Verify all three time units work (Hours, Days, Weeks)
4. Collapse all phases → expand one → expand a service → verify academy + runbook steps show

- [ ] **Step 3: Final commit if needed**

```bash
git add -A
git commit -m "feat: complete Customer Journey Gantt chart feature"
```
