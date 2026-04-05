# Standalone Assessments — Design Spec

## Overview

Extend the Academy module with a standalone Assessments feature. Assessments can be scoped to the **entire journey** (customer onboarding maturity assessment), a **specific phase**, or a **specific service** — independent of courses. The existing course-section assessments remain and are surfaced in the same list view. Questions are tagged to phases with individual weighting, producing per-phase score breakdowns.

## Goals

- Unified L2 page under Academy listing all assessments (standalone + course-section)
- Lightweight customer onboarding assessments that score across the 4 phases
- Per-phase scoring with question weighting
- Live scoring stored on attempts (overall + per-phase breakdown)
- CRUD for standalone assessments via create/edit pages

## Data Model Changes

### Alter `assessments` table

| Change | Detail |
|--------|--------|
| `section_id` | Make nullable (standalone assessments have no section) |
| Add `scope` | `text CHECK (scope IN ('journey', 'phase', 'service', 'course_section'))` default `'course_section'` |
| Add `phase_id` | `uuid REFERENCES phases(id)` nullable — used when scope = `'phase'` |
| Add `service_id` | `uuid REFERENCES services(id)` nullable — used when scope = `'service'` |

Backfill: all existing assessments get `scope = 'course_section'`.

Constraint: `section_id` required when scope = `'course_section'`, `phase_id` required when scope = `'phase'`, `service_id` required when scope = `'service'`. Journey scope requires none of these.

### Alter `assessment_questions` table

| Change | Detail |
|--------|--------|
| Add `phase_id` | `uuid REFERENCES phases(id)` nullable — tags question to a phase for scoring |
| Add `weight` | `integer DEFAULT 1` — question weighting for scoring |

### Alter `assessment_attempts` table

| Change | Detail |
|--------|--------|
| Add `phase_scores` | `jsonb` nullable — e.g. `{"operate": 72, "secure": 45, "streamline": 60, "accelerate": 30}` |

## TypeScript Type Changes

```typescript
// Updated Assessment type
type AssessmentScope = 'journey' | 'phase' | 'service' | 'course_section'

interface Assessment {
  id: string
  section_id: string | null      // nullable now
  scope: AssessmentScope          // new
  phase_id: string | null         // new
  service_id: string | null       // new
  type: AssessmentType
  name: string
  description: string | null
  pass_threshold: number
  is_active: boolean
  created_at: string
  updated_at: string
  questions?: AssessmentQuestion[]
  // Joined fields for list view
  phase?: Phase
  service?: { id: string; name: string }
  section?: { id: string; name: string; course: { id: string; name: string } }
}

// Updated AssessmentQuestion type
interface AssessmentQuestion {
  id: string
  assessment_id: string
  question_text: string
  options: QuestionOption[]
  sort_order: number
  points: number
  weight: number                  // new
  phase_id: string | null         // new
  is_active: boolean
  created_at: string
  updated_at: string
  phase?: Phase                   // joined
}

// Updated AssessmentAttempt type
interface AssessmentAttempt {
  id: string
  assessment_id: string
  user_id: string
  score: number
  passed: boolean
  answers: { question_id: string; selected_option: string; correct: boolean }[]
  phase_scores: Record<string, number> | null  // new
  started_at: string
  completed_at: string | null
  created_at: string
}
```

## Pages

### Assessments List — `/academy/assessments/page.tsx`

L2 page under Academy. Fetches all assessments with joins for scope context and attempt aggregates.

**Table columns:**

| Column | Source |
|--------|--------|
| Name | `assessment.name` |
| Scope | Badge from `scope` + phase/service/course-section name |
| Questions | Count from `assessment_questions` |
| Attempts | Count from `assessment_attempts` |
| Avg Score | Mean of `assessment_attempts.score` |
| Status | Badge: Active/Inactive from `is_active` |
| Actions | Edit button for standalone; disabled for course-section assessments |

- "Add Assessment" button in header → routes to `/academy/assessments/new`
- Edit button → routes to `/academy/assessments/{id}/edit`
- Course-section assessments are read-only rows (managed from course editor)

### New Assessment — `/academy/assessments/new/page.tsx`

Form fields:
- **Scope** — radio group: Journey / Phase / Service
- **Phase** dropdown (visible when scope = Phase)
- **Service** dropdown grouped by phase (visible when scope = Service)
- **Name** — text input
- **Description** — textarea
- **Pass Threshold** — number input (%)
- **Active** — checkbox

Saves via Supabase insert to `assessments` with appropriate scope fields.

### Edit Assessment — `/academy/assessments/[id]/edit/page.tsx`

Same form as create, pre-populated from fetched data. Below the form:

**Questions section** — follows the pattern from `assessment-editor.tsx`:
- List of questions with options, phase tag, weight, sort order
- Add/edit/delete questions
- Each question form includes:
  - Question text (textarea)
  - 4 options with correct answer radio
  - **Phase dropdown** — tags question to a phase
  - **Weight** — integer input
  - Points, Sort Order
  - Save/Cancel

## Scoring Model

When an attempt is submitted:

1. **Per-phase calculation**: For each phase, sum `(weight × points_earned)` / sum `(weight × points_possible)` across questions tagged to that phase → percentage
2. **Overall score**: Sum of all `(weight × points_earned)` / sum of all `(weight × points_possible)` → percentage
3. **Passed**: overall score >= `pass_threshold`
4. Store `score` (overall %) and `phase_scores` (jsonb with per-phase %) on the attempt

## Menu Update

Add "Assessments" as L2 menu item under Academy, between Courses and Certificates. Migration inserts into `menu_items` and `role_menu_access` for admin role.

## RLS Policies

Standalone assessments follow the same RLS pattern as existing assessments:
- Admins: full CRUD
- Authenticated users: SELECT active assessments

No new policies needed — the existing assessment RLS applies to all rows regardless of scope.

## Out of Scope

- Learner-facing assessment player/viewer (admin management only for now)
- Real-time websocket scoring (page-load aggregates are sufficient)
- Assessment analytics/reporting dashboards
- Question banks or question reuse across assessments
- Conditional logic / branching questions
- Time limits on assessments
