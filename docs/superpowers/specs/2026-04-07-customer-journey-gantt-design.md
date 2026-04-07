# Customer Journey Gantt Chart — Design Spec

**Date:** 2026-04-07
**Status:** Draft
**Feature:** Collapsible Gantt chart on the Customer Journey page displaying phases, services, runbook steps, and academy learning based on the customer's assessment results.

---

## Overview

The Customer Journey page (`/portal/journey`) displays a read-only, collapsible Gantt chart that visualizes the customer's IT modernisation implementation timeline. The chart is derived from the customer's onboarding assessment scores — services where the customer scored below a configurable threshold are included as recommended services to implement.

Services run sequentially (one completes before the next begins), ordered by phase sort order (Operate → Secure → Streamline → Accelerate), then by service sort order within each phase. Each service's duration is the sum of its runbook step `estimated_minutes`. Academy learning for each service appears as the first line item, spanning the full service duration.

## Data Sources

No new database tables are required. The Gantt chart is a read-only view composed from existing data:

| Table | Purpose |
|---|---|
| `assessment_attempts` | Customer's latest attempt provides `service_scores` (per-service percentage) |
| `assessments` | Holds the `journey_threshold` (new column) to filter which services appear |
| `services` + `phases` | Service names, descriptions, phase grouping, sort order |
| `service_runbook_steps` | Step titles, descriptions, `estimated_minutes`, role, sort order |
| `service_academy_links` + `courses` | Academy courses linked to each service |

### New Column

Add `journey_threshold` (integer, default 80) to the `assessments` table. This configurable threshold determines which services appear in the journey — any service where the customer's score percentage is below this value is included.

Admins edit this value in the existing assessment editor UI.

## Data Flow

1. Page loads → fetch the customer's latest `assessment_attempt` for the onboarding assessment (scope = 'journey', is_onboarding = true)
2. Read the `journey_threshold` from the associated `assessments` record
3. Extract `service_scores` from the attempt → filter services where `pct < journey_threshold`
4. Fetch those services with their `phase`, `service_runbook_steps` (ordered by sort_order), and `service_academy_links` joined with `courses`
5. Build the timeline model:
   - Group services by phase, ordered by `phases.sort_order`
   - Within each phase, order services by `services.sort_order` (TBD — may need a sort_order column on services, or use name alphabetically)
   - Each service's duration = sum of its runbook steps' `estimated_minutes`
   - Each service starts where the previous service ends (sequential)
   - Each phase's duration = sum of its services' durations
   - Academy learning row(s) per service span the full service duration
6. Convert minutes to the selected time unit using 8-hour business days (480 minutes = 1 day)

## Gantt Chart Structure

### 3-Level Collapsible Hierarchy

```
Phase (Operate)                    [====== phase bar ======]
  ├── Service (Managed IT Support)   [=== service bar ===]
  │     ├── 🎓 Academy: IT Security  [≋≋≋≋ striped amber ≋≋≋≋]
  │     ├── 1. Initial Site Survey    [==]
  │     ├── 2. Deploy RMM Agents       [=]
  │     └── 3. Configure Alerting        [=]
  └── Service (Backup & DR)                [=== service bar ===]
        ├── 🎓 Academy: Cloud Readiness     [≋≋≋≋ striped amber ≋≋≋≋]
        └── ...runbook steps
Phase (Secure)                                    [====== phase bar ======]
  └── ...
```

- **Phase rows** — collapsible, colored by phase theme, show phase name + total duration
- **Service rows** — collapsible, show service name + duration, nested under phase
- **Academy learning rows** — first item under each service, striped amber bar spanning full service duration, one row per linked course (ordered: `is_required` first)
- **Runbook step rows** — sequential bars showing each step's duration, with step number, title, and time label

### Phase Color Scheme

| Phase | Background | Bar Gradient | Text |
|---|---|---|---|
| Operate | `#f0fdf4` | `#16a34a` → `#4ade80` | `#166534` |
| Secure | `#eff6ff` | `#2563eb` → `#60a5fa` | `#1e40af` |
| Streamline | `#faf5ff` | `#9333ea` → `#c084fc` | `#6b21a8` |
| Accelerate | `#fffbeb` | `#d97706` → `#fbbf24` | `#92400e` |

### Academy Learning Row Style

- Background: `#fefce8` (light amber)
- Bar: striped pattern using `repeating-linear-gradient(45deg, #fbbf24, #fbbf24 4px, #fde68a 4px, #fde68a 8px)`
- Visually distinct from runbook step bars

## Component Architecture

```
JourneyPage (client component)
├── JourneyHeader
│   ├── Title: "Your Modernisation Journey"
│   ├── Summary: total duration, service count, phase count
│   └── TimeUnitToggle (Hours / Days* / Weeks) — Days is default
├── GanttChart
│   ├── GanttTimeAxis (column headers based on selected time unit)
│   ├── GanttPhaseRow[] (one per phase with services below threshold)
│   │   ├── GanttServiceRow[] (one per service in the phase)
│   │   │   ├── GanttAcademyRow[] (one per linked course)
│   │   │   └── GanttStepRow[] (one per runbook step)
│   └── GanttSummaryFooter (total implementation time)
```

### State Management

All state is local React state within `JourneyPage`:

- `expandedPhases: Record<string, boolean>` — which phases are expanded (default: first phase expanded)
- `expandedServices: Record<string, boolean>` — which services are expanded (default: all collapsed)
- `timeUnit: 'hours' | 'days' | 'weeks'` — selected time unit (default: 'days')

### SVG Implementation

The chart uses a custom SVG-based renderer:

- **Left panel** (fixed width ~280px): task labels with indentation per hierarchy level, rendered as HTML alongside the SVG
- **Right panel** (flexible): SVG canvas with time-axis grid lines and positioned bars
- Bars are `<rect>` elements positioned by calculating `x` from cumulative start time and `width` from duration
- Phase bars use gradient fills (`<linearGradient>`)
- Academy bars use a striped SVG pattern (`<pattern>`)
- Hover tooltips show step details (title, duration, role)

### Time Unit Conversion

- **Hours**: raw `estimated_minutes / 60`
- **Days**: `estimated_minutes / 480` (8-hour business day)
- **Weeks**: `estimated_minutes / 2400` (5 × 8-hour days)

The time axis adjusts its column count and labels based on the selected unit.

## Edge Cases

### No Assessment Attempt

Display a centered message: "Complete your IT Modernisation Assessment to see your journey" with a button linking to the assessment page. No Gantt chart rendered.

### All Services Above Threshold

Display a congratulatory state: "Your IT maturity scores are above the threshold across all services. Great work!" No Gantt chart rendered.

### Service Has No Runbook Steps

Show the service bar with a "Runbook pending" label and 0 duration. Excluded from timeline calculation (the next service starts immediately).

### Service Has No Academy Links

Omit the academy learning row for that service. Runbook steps start immediately under the service row.

### Multiple Academy Courses Per Service

Show one academy row per linked course. All span the full service duration. Ordered with `is_required = true` courses first.

## Out of Scope

- No drag-and-drop or editing — read-only for the customer
- No progress tracking (marking steps as complete) — future feature
- No dependency lines between services — purely sequential
- No export or print functionality
- No mobile/responsive layout (desktop-only per project conventions)

## File Structure

```
src/
  app/(customer)/portal/journey/
    page.tsx                    — JourneyPage (main page component)
  components/journey/
    gantt-chart.tsx             — GanttChart container
    gantt-time-axis.tsx         — Time axis header with grid
    gantt-phase-row.tsx         — Phase row (collapsible)
    gantt-service-row.tsx       — Service row (collapsible)
    gantt-academy-row.tsx       — Academy learning row
    gantt-step-row.tsx          — Runbook step row
    gantt-summary-footer.tsx    — Total implementation summary
    journey-header.tsx          — Page header with time unit toggle
    journey-empty-state.tsx     — Empty/congratulatory states
  lib/
    journey.ts                  — Data fetching and timeline calculation logic
  types/
    index.ts                    — Add JourneyTimeline types (extend existing)
```

## Database Migration

```sql
ALTER TABLE public.assessments
  ADD COLUMN journey_threshold integer NOT NULL DEFAULT 80;
```

No RLS changes needed — the customer reads their own assessment attempt (existing policy), and the services/phases/runbook data is read-accessible to authenticated users.
