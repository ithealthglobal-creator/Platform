# Service Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Link assessment questions to services so scoring rolls up bottom-up (questions → services → phases → overall) and recommend services on the customer dashboard based on low scores.

**Architecture:** Add `service_id` FK to `assessment_questions`, store per-service scores in `assessment_attempts.service_scores` JSONB, rewrite scoring logic to compute bottom-up, and add a Recommended Services card to the customer dashboard that shows services grouped by phase where the customer scored below 75%.

**Tech Stack:** Next.js App Router, TypeScript, Supabase (Postgres), shadcn/ui, Tailwind CSS, Carbon icons, Poppins font

**Spec:** `docs/superpowers/specs/2026-04-07-service-recommendations-design.md`

---

### Task 1: Database Migration — Add `service_id` to questions, `service_scores` to attempts

**Files:**
- Create: `supabase/migrations/20260407000001_questions_service_id.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Add service_id to assessment_questions (replace phase_id)
ALTER TABLE public.assessment_questions
  ADD COLUMN service_id uuid REFERENCES public.services(id);

-- Backfill existing questions using phase_id → service mapping
-- Operate phase: Q1,Q2 → Managed IT Support, Q3,Q4 → Backup & DR
UPDATE public.assessment_questions
SET service_id = 'b0000000-0000-0000-0000-000000000001'
WHERE phase_id = 'a0000000-0000-0000-0000-000000000001' AND sort_order IN (1, 2);

UPDATE public.assessment_questions
SET service_id = 'b0000000-0000-0000-0000-000000000002'
WHERE phase_id = 'a0000000-0000-0000-0000-000000000001' AND sort_order IN (3, 4);

-- Secure phase: Q5 (endpoint protection), Q6 (authentication) → Cyber Security Essentials
-- Q7 (security training), Q8 (backup/recovery) → Compliance & Governance
-- Note: spec text labels don't exactly match seed question text, but the sort_order
-- mapping (5,6 → first service, 7,8 → second service) is the intended grouping.
UPDATE public.assessment_questions
SET service_id = 'b0000000-0000-0000-0000-000000000003'
WHERE phase_id = 'a0000000-0000-0000-0000-000000000002' AND sort_order IN (5, 6);

UPDATE public.assessment_questions
SET service_id = 'b0000000-0000-0000-0000-000000000004'
WHERE phase_id = 'a0000000-0000-0000-0000-000000000002' AND sort_order IN (7, 8);

-- Streamline phase: Q9,Q10 → Cloud Migration, Q11,Q12 → Process Automation
UPDATE public.assessment_questions
SET service_id = 'b0000000-0000-0000-0000-000000000005'
WHERE phase_id = 'a0000000-0000-0000-0000-000000000003' AND sort_order IN (9, 10);

UPDATE public.assessment_questions
SET service_id = 'b0000000-0000-0000-0000-000000000006'
WHERE phase_id = 'a0000000-0000-0000-0000-000000000003' AND sort_order IN (11, 12);

-- Accelerate phase: Q13,Q14 → AI & Analytics, Q15,Q16 → Digital Transformation Strategy
UPDATE public.assessment_questions
SET service_id = 'b0000000-0000-0000-0000-000000000007'
WHERE phase_id = 'a0000000-0000-0000-0000-000000000004' AND sort_order IN (13, 14);

UPDATE public.assessment_questions
SET service_id = 'b0000000-0000-0000-0000-000000000008'
WHERE phase_id = 'a0000000-0000-0000-0000-000000000004' AND sort_order IN (15, 16);

-- Set NOT NULL after backfill
ALTER TABLE public.assessment_questions
  ALTER COLUMN service_id SET NOT NULL;

-- Drop phase_id and its index
DROP INDEX IF EXISTS idx_assessment_questions_phase;
ALTER TABLE public.assessment_questions DROP COLUMN phase_id;

-- Add index on service_id
CREATE INDEX idx_assessment_questions_service ON public.assessment_questions(service_id);

-- Add service_scores JSONB to assessment_attempts
ALTER TABLE public.assessment_attempts
  ADD COLUMN service_scores jsonb;
```

- [ ] **Step 2: Apply the migration**

Run: `npx supabase db push`
Expected: Migration applies successfully, no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260407000001_questions_service_id.sql
git commit -m "feat: add service_id to assessment_questions, service_scores to attempts"
```

---

### Task 2: Update Seed Data — Questions use `service_id` instead of `phase_id`

**Files:**
- Modify: `supabase/seed.sql:358-427`

- [ ] **Step 1: Update the seed INSERT to use `service_id` instead of `phase_id`**

Replace the assessment questions INSERT block (lines 360-427) with `service_id` references instead of `phase_id`. The column list changes from `(assessment_id, question_text, options, sort_order, points, weight, phase_id)` to `(assessment_id, question_text, options, sort_order, points, weight, service_id)`.

Mapping:
- Sort order 1,2 → `'b0000000-0000-0000-0000-000000000001'` (Managed IT Support)
- Sort order 3,4 → `'b0000000-0000-0000-0000-000000000002'` (Backup & DR)
- Sort order 5,6 → `'b0000000-0000-0000-0000-000000000003'` (Cyber Security Essentials)
- Sort order 7,8 → `'b0000000-0000-0000-0000-000000000004'` (Compliance & Governance)
- Sort order 9,10 → `'b0000000-0000-0000-0000-000000000005'` (Cloud Migration)
- Sort order 11,12 → `'b0000000-0000-0000-0000-000000000006'` (Process Automation)
- Sort order 13,14 → `'b0000000-0000-0000-0000-000000000007'` (AI & Analytics)
- Sort order 15,16 → `'b0000000-0000-0000-0000-000000000008'` (Digital Transformation Strategy)

For example, line 360 changes from:
```sql
INSERT INTO public.assessment_questions (assessment_id, question_text, options, sort_order, points, weight, phase_id) VALUES
  ('f0000000-...', 'How would you describe your IT monitoring...', '[...]', 1, 3, 1, 'a0000000-0000-0000-0000-000000000001'),
```
to:
```sql
INSERT INTO public.assessment_questions (assessment_id, question_text, options, sort_order, points, weight, service_id) VALUES
  ('f0000000-...', 'How would you describe your IT monitoring...', '[...]', 1, 3, 1, 'b0000000-0000-0000-0000-000000000001'),
```

All 16 questions follow the same pattern — just swap the column name and the UUID references per the mapping above.

- [ ] **Step 2: Verify the full reset works**

Run: `npx supabase db reset`
Expected: Reset completes successfully — migrations apply, seed data inserts without errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat: update seed questions to use service_id instead of phase_id"
```

---

### Task 3: Update TypeScript Types

**Files:**
- Modify: `src/lib/types.ts:204-230`

- [ ] **Step 1: Read the current types file**

Read `src/lib/types.ts` to see the full `AssessmentQuestion` and `AssessmentAttempt` interfaces and the `Service` interface (needed for the relation type).

- [ ] **Step 2: Update `AssessmentQuestion` interface**

In `src/lib/types.ts`, find the `AssessmentQuestion` interface (around line 204). Replace `phase_id: string | null` with `service_id: string` and replace `phase?: Phase` with `service?: Service & { phase?: Phase }`.

Before:
```typescript
export interface AssessmentQuestion {
  id: string
  assessment_id: string
  question_text: string
  options: QuestionOption[]
  sort_order: number
  points: number
  weight: number
  phase_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  phase?: Phase
}
```

After:
```typescript
export interface AssessmentQuestion {
  id: string
  assessment_id: string
  question_text: string
  options: QuestionOption[]
  sort_order: number
  points: number
  weight: number
  service_id: string
  is_active: boolean
  created_at: string
  updated_at: string
  service?: Service & { phase?: Phase }
}
```

- [ ] **Step 3: Update `AssessmentAttempt` interface**

In the same file, find `AssessmentAttempt` (around line 219). Add `service_scores` field.

Before:
```typescript
export interface AssessmentAttempt {
  id: string
  assessment_id: string
  user_id: string
  score: number
  passed: boolean
  answers: { question_id: string; selected_option: string; correct: boolean }[]
  phase_scores: Record<string, number> | null
  started_at: string
  completed_at: string | null
  created_at: string
}
```

After:
```typescript
export interface AssessmentAttempt {
  id: string
  assessment_id: string
  user_id: string
  score: number
  passed: boolean
  answers: { question_id: string; selected_option: string; correct: boolean }[]
  phase_scores: Record<string, number> | null
  service_scores: Record<string, { earned: number; max: number; pct: number }> | null
  started_at: string
  completed_at: string | null
  created_at: string
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: update AssessmentQuestion and AssessmentAttempt types for service scoring"
```

---

### Task 4: Rewrite Scoring Logic — Bottom-Up (Service → Phase → Overall)

**Files:**
- Modify: `src/lib/scoring.ts` (full rewrite of `calculatePhaseScores`, add `calculateServiceScores`)

- [ ] **Step 1: Read the current scoring file**

Read `src/lib/scoring.ts` to see the full current implementation.

- [ ] **Step 2: Rewrite scoring.ts**

Replace the contents of `src/lib/scoring.ts` with bottom-up scoring. The key changes:
- New `calculateServiceScores()` function that groups questions by `service_id`
- `calculatePhaseScores()` now takes service scores + a service-to-phase mapping and aggregates
- `calculateOverallScore()` remains the same
- `getMaturityLabel()` remains the same

```typescript
import type { AssessmentQuestion } from '@/lib/types'

interface Answer {
  question_id: string
  selected_option: string
}

export interface ServiceScore {
  service_id: string
  phase_id: string
  earned: number
  max: number
  pct: number
}

interface PhaseScore {
  phase_id: string
  score: number
  max_points: number
  earned_points: number
}

/**
 * Bottom-up scoring: questions → services → phases → overall
 *
 * Each question has `points` (max) and `weight` (importance multiplier).
 * Options have numeric `value` (maturity-style: 0-3) or `is_correct` flag (binary).
 * Service score = (weighted earned / weighted max) * 100
 * Phase score = (sum of service earned within phase / sum of service max within phase) * 100
 * Overall score = average of phase percentages
 */
export function calculateServiceScores(
  questions: AssessmentQuestion[],
  answers: Answer[]
): ServiceScore[] {
  const answerMap = new Map(answers.map(a => [a.question_id, a.selected_option]))
  const serviceGroups = new Map<string, { phase_id: string; weightedEarned: number; weightedMax: number }>()

  for (const q of questions) {
    if (!q.service_id) continue
    // Get phase_id from the service relation
    const phaseId = q.service?.phase_id ?? q.service?.phase?.id ?? ''
    const group = serviceGroups.get(q.service_id) || { phase_id: phaseId, weightedEarned: 0, weightedMax: 0 }
    const maxPoints = q.points || 1
    const weight = q.weight || 1

    group.weightedMax += maxPoints * weight

    const selectedValue = answerMap.get(q.id)
    if (selectedValue) {
      const selectedOption = q.options.find((o: { value: string }) => o.value === selectedValue)
      if (selectedOption) {
        const numericValue = Number(selectedValue)
        if (!isNaN(numericValue) && numericValue >= 0) {
          group.weightedEarned += Math.min(numericValue, maxPoints) * weight
        } else if (selectedOption.is_correct) {
          group.weightedEarned += maxPoints * weight
        }
      }
    }

    serviceGroups.set(q.service_id, group)
  }

  return Array.from(serviceGroups.entries()).map(([service_id, { phase_id, weightedEarned, weightedMax }]) => ({
    service_id,
    phase_id,
    earned: weightedEarned,
    max: weightedMax,
    pct: weightedMax > 0 ? Math.round((weightedEarned / weightedMax) * 100) : 0,
  }))
}

export function calculatePhaseScores(serviceScores: ServiceScore[]): PhaseScore[] {
  const phaseGroups = new Map<string, { earned: number; max: number }>()

  for (const ss of serviceScores) {
    if (!ss.phase_id) continue
    const group = phaseGroups.get(ss.phase_id) || { earned: 0, max: 0 }
    group.earned += ss.earned
    group.max += ss.max
    phaseGroups.set(ss.phase_id, group)
  }

  return Array.from(phaseGroups.entries()).map(([phase_id, { earned, max }]) => ({
    phase_id,
    score: max > 0 ? Math.round((earned / max) * 100) : 0,
    max_points: max,
    earned_points: earned,
  }))
}

export function calculateOverallScore(phaseScores: PhaseScore[]): number {
  if (phaseScores.length === 0) return 0
  const sum = phaseScores.reduce((acc, ps) => acc + ps.score, 0)
  return Math.round(sum / phaseScores.length)
}

export function getMaturityLabel(score: number): string {
  if (score <= 25) return 'Foundational'
  if (score <= 50) return 'Developing'
  if (score <= 75) return 'Maturing'
  return 'Optimised'
}
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors related to scoring.ts (there may be other pre-existing errors — focus on scoring-related ones).

- [ ] **Step 4: Commit**

```bash
git add src/lib/scoring.ts
git commit -m "feat: rewrite scoring logic for bottom-up service → phase → overall"
```

---

### Task 5: Update Onboarding API Route — Store Service Scores

**Files:**
- Modify: `src/app/api/onboarding/route.ts:115-150`

- [ ] **Step 1: Read the current onboarding route**

Read `src/app/api/onboarding/route.ts` to see the full current implementation, especially lines 115-166.

- [ ] **Step 2: Update the question fetch query**

At line 115-120, change the query to join through services to get phase_id:

Before:
```typescript
const { data: questions, error: questionsError } = await supabaseAdmin
  .from('assessment_questions')
  .select('*')
  .eq('assessment_id', assessment_id)
  .eq('is_active', true)
  .order('sort_order')
```

After:
```typescript
const { data: questions, error: questionsError } = await supabaseAdmin
  .from('assessment_questions')
  .select('*, service:services(id, phase_id)')
  .eq('assessment_id', assessment_id)
  .eq('is_active', true)
  .order('sort_order')
```

- [ ] **Step 3: Update the scoring computation**

At lines 130-138, update to use the new bottom-up scoring:

Before:
```typescript
const typedQuestions = (questions ?? []) as AssessmentQuestion[]
const phaseScores = calculatePhaseScores(typedQuestions, answers)
const overallScore = calculateOverallScore(phaseScores)

const phaseScoresMap: Record<string, number> = {}
for (const ps of phaseScores) {
  phaseScoresMap[ps.phase_id] = ps.score
}
```

After:
```typescript
const typedQuestions = (questions ?? []) as AssessmentQuestion[]
const serviceScores = calculateServiceScores(typedQuestions, answers)
const phaseScores = calculatePhaseScores(serviceScores)
const overallScore = calculateOverallScore(phaseScores)

// Build phase_scores map: { [phase_id]: score }
const phaseScoresMap: Record<string, number> = {}
for (const ps of phaseScores) {
  phaseScoresMap[ps.phase_id] = ps.score
}

// Build service_scores map: { [service_id]: { earned, max, pct } }
const serviceScoresMap: Record<string, { earned: number; max: number; pct: number }> = {}
for (const ss of serviceScores) {
  serviceScoresMap[ss.service_id] = { earned: ss.earned, max: ss.max, pct: ss.pct }
}
```

- [ ] **Step 4: Update the import statement**

At line 1, update the import from scoring.ts:

Before:
```typescript
import { calculatePhaseScores, calculateOverallScore } from '@/lib/scoring'
```

After:
```typescript
import { calculateServiceScores, calculatePhaseScores, calculateOverallScore } from '@/lib/scoring'
```

- [ ] **Step 5: Update the assessment attempt insert**

At lines 142-155, add `service_scores` to the insert:

Before:
```typescript
const { data: attempt, error: attemptError } = await supabaseAdmin
  .from('assessment_attempts')
  .insert({
    assessment_id,
    user_id: authUserId,
    score: overallScore,
    passed: false,
    answers,
    phase_scores: phaseScoresMap,
    started_at: now,
    completed_at: now,
  })
```

After:
```typescript
const { data: attempt, error: attemptError } = await supabaseAdmin
  .from('assessment_attempts')
  .insert({
    assessment_id,
    user_id: authUserId,
    score: overallScore,
    passed: false,
    answers,
    phase_scores: phaseScoresMap,
    service_scores: serviceScoresMap,
    started_at: now,
    completed_at: now,
  })
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/onboarding/route.ts
git commit -m "feat: store service_scores in assessment attempts on onboarding"
```

---

### Task 6: Update Onboarding Live Scoring Panel

**Files:**
- Modify: `src/app/(onboarding)/get-started/page.tsx:58-114`

- [ ] **Step 1: Read the current onboarding page**

Read `src/app/(onboarding)/get-started/page.tsx` to see the full question fetch and liveScores useMemo.

- [ ] **Step 2: Update the question fetch query**

Find the questions fetch query (around line 58-63). Change from:
```typescript
const questionsRes = await supabase
  .from('assessment_questions')
  .select('*, phase:phases(*)')
  .eq('assessment_id', foundAssessment.id)
  .eq('is_active', true)
  .order('sort_order')
```

To:
```typescript
const questionsRes = await supabase
  .from('assessment_questions')
  .select('*, service:services(*, phase:phases(*))')
  .eq('assessment_id', foundAssessment.id)
  .eq('is_active', true)
  .order('sort_order')
```

- [ ] **Step 3: Update the liveScores useMemo**

Find the `liveScores` useMemo (around line 79-114). Update to derive phase from the service relation:

Before:
```typescript
const liveScores = useMemo(() => {
  const phaseGroups = new Map<string, { earned: number; max: number; name: string }>()

  for (const q of questions) {
    if (!q.phase_id) continue
    const phaseName = (q as AssessmentQuestion & { phase?: Phase }).phase?.name ?? ''
    const group = phaseGroups.get(q.phase_id) || { earned: 0, max: 0, name: phaseName }
    // ... rest
    phaseGroups.set(q.phase_id, group)
  }
  // ...
}, [answers, questions])
```

After:
```typescript
const liveScores = useMemo(() => {
  const phaseGroups = new Map<string, { earned: number; max: number; name: string }>()

  for (const q of questions) {
    const phaseId = q.service?.phase?.id ?? q.service?.phase_id
    if (!phaseId) continue
    const phaseName = q.service?.phase?.name ?? ''
    const group = phaseGroups.get(phaseId) || { earned: 0, max: 0, name: phaseName }
    const maxPoints = q.points || 1

    group.max += maxPoints

    const selectedValue = answers[q.id]
    if (selectedValue !== undefined) {
      const numericValue = Number(selectedValue)
      if (!isNaN(numericValue) && numericValue >= 0) {
        group.earned += Math.min(numericValue, maxPoints)
      }
    }

    phaseGroups.set(phaseId, group)
  }

  const phaseScores = Array.from(phaseGroups.entries()).map(([id, { earned, max, name: pName }]) => ({
    id,
    name: pName,
    score: max > 0 ? Math.round((earned / max) * 100) : 0,
    color: PHASE_COLORS[pName] ?? '#94a3b8',
  }))

  const overall = phaseScores.length > 0
    ? Math.round(phaseScores.reduce((sum, p) => sum + p.score, 0) / phaseScores.length)
    : 0

  return { phaseScores, overall }
}, [answers, questions])
```

- [ ] **Step 4: Update `currentPhaseName` derivation**

At line 120 of the onboarding page, update the phase name derivation to use the service relation:

Before:
```typescript
const currentPhaseName = currentQuestion?.phase?.name
```

After:
```typescript
const currentPhaseName = currentQuestion?.service?.phase?.name
```

This is used for the phase badge display above each question. Without this fix, the badge will be blank after removing the direct `phase` relation.

- [ ] **Step 5: Keep the separate phases fetch**

The onboarding page fetches phases separately at lines 45-49. This fetch is still needed because `phases` is used on the welcome screen (lines 319-324) to list the four phases. Do NOT remove it.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(onboarding)/get-started/page.tsx"
git commit -m "feat: update onboarding live scoring to derive phase from service relation"
```

---

### Task 7: Update Admin Assessment Editor — Phase Dropdown → Service Dropdown

**Files:**
- Modify: `src/app/(admin)/academy/assessments/[id]/edit/page.tsx:29-36, 296-313`

- [ ] **Step 1: Read the current editor page**

Read `src/app/(admin)/academy/assessments/[id]/edit/page.tsx` to see the full QuestionForm interface, data fetching, and the phase dropdown UI.

- [ ] **Step 2: Update the `QuestionForm` interface**

Find the `QuestionForm` interface (around line 29-36). Replace `phase_id` with `service_id`:

Before:
```typescript
interface QuestionForm {
  question_text: string
  options: QuestionOption[]
  points: string
  weight: string
  phase_id: string
  sort_order: string
}
```

After:
```typescript
interface QuestionForm {
  question_text: string
  options: QuestionOption[]
  points: string
  weight: string
  service_id: string
  sort_order: string
}
```

- [ ] **Step 3: Update the existing services fetch query**

The component already fetches services at line 80. Update to include `phase_id`:

Before (line 80):
```typescript
supabase.from('services').select('*, phase:phases(name)').eq('is_active', true).order('name'),
```

After:
```typescript
supabase.from('services').select('*, phase:phases(id, name)').eq('status', 'active').order('name'),
```

Note: The `services` table uses `status` column (not `is_active`). Check the current code and use whichever filter is correct.

- [ ] **Step 4: Update `emptyQuestionForm` constant**

At line 38-45, update the constant:

Before:
```typescript
const emptyQuestionForm: QuestionForm = {
  question_text: '',
  options: defaultOptions,
  points: '1',
  weight: '1',
  phase_id: '',
  sort_order: '',
}
```

After:
```typescript
const emptyQuestionForm: QuestionForm = {
  question_text: '',
  options: defaultOptions,
  points: '1',
  weight: '1',
  service_id: '',
  sort_order: '',
}
```

- [ ] **Step 4b: Update `startEditQuestion` function**

At line 186-197, update the edit initialisation:

Before:
```typescript
function startEditQuestion(q: AssessmentQuestion) {
  setShowAddQuestion(false)
  setEditingQuestionId(q.id)
  setQuestionForm({
    question_text: q.question_text,
    options: q.options.length === 4 ? q.options : defaultOptions,
    points: String(q.points),
    weight: String(q.weight),
    phase_id: q.phase_id ?? '',
    sort_order: String(q.sort_order),
  })
}
```

After:
```typescript
function startEditQuestion(q: AssessmentQuestion) {
  setShowAddQuestion(false)
  setEditingQuestionId(q.id)
  setQuestionForm({
    question_text: q.question_text,
    options: q.options.length === 4 ? q.options : defaultOptions,
    points: String(q.points),
    weight: String(q.weight),
    service_id: q.service_id ?? '',
    sort_order: String(q.sort_order),
  })
}
```

- [ ] **Step 5: Replace the Phase Tag dropdown with a Service dropdown**

Find the Phase Tag Select component (around lines 296-313). Replace with a service selector grouped by phase:

Before:
```tsx
<div className="grid gap-2">
  <Label>Phase Tag</Label>
  <Select
    value={questionForm.phase_id || 'none'}
    onValueChange={(v) => setQuestionForm({ ...questionForm, phase_id: v === 'none' ? '' : v ?? '' })}
  >
    <SelectTrigger className="w-[180px]">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="none">No phase</SelectItem>
      {phases.map((p) => (
        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

After:
```tsx
<div className="grid gap-2">
  <Label>Service</Label>
  <Select
    value={questionForm.service_id || 'none'}
    onValueChange={(v) => setQuestionForm({ ...questionForm, service_id: v === 'none' ? '' : v ?? '' })}
  >
    <SelectTrigger className="w-[220px]">
      <SelectValue placeholder="Select a service" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="none">No service</SelectItem>
      {services.map((s) => (
        <SelectItem key={s.id} value={s.id}>
          {s.phase?.name ? `${s.phase.name} > ` : ''}{s.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

Note: `service_id` is required per the spec, but the dropdown allows "No service" for UX — the save handler should validate that a service is selected before saving.

- [ ] **Step 6: Update the `saveQuestion` function**

At line 216-252, update the payload and add validation.

Add validation after line 225 (the "All options must have text" check):
```typescript
if (!questionForm.service_id) {
  toast.error('A service must be selected')
  return
}
```

Update the payload at lines 229-237:

Before:
```typescript
const payload = {
  assessment_id: id,
  question_text: trimmedText,
  options: questionForm.options.map((o) => ({ ...o, value: o.value.trim() })),
  points: Number(questionForm.points) || 1,
  weight: Number(questionForm.weight) || 1,
  phase_id: questionForm.phase_id || null,
  sort_order: Number(questionForm.sort_order) || 0,
}
```

After:
```typescript
const payload = {
  assessment_id: id,
  question_text: trimmedText,
  options: questionForm.options.map((o) => ({ ...o, value: o.value.trim() })),
  points: Number(questionForm.points) || 1,
  weight: Number(questionForm.weight) || 1,
  service_id: questionForm.service_id,
  sort_order: Number(questionForm.sort_order) || 0,
}
```

- [ ] **Step 7: Update the `fetchQuestions` query**

At line 86-98, update the select to include the service relation:

Before:
```typescript
const { data, error } = await supabase
  .from('assessment_questions')
  .select('*')
  .eq('assessment_id', id)
  .order('sort_order')
```

After:
```typescript
const { data, error } = await supabase
  .from('assessment_questions')
  .select('*, service:services(id, name, phase:phases(id, name))')
  .eq('assessment_id', id)
  .order('sort_order')
```

- [ ] **Step 8: Commit**

```bash
git add "src/app/(admin)/academy/assessments/[id]/edit/page.tsx"
git commit -m "feat: replace phase dropdown with service dropdown in assessment editor"
```

---

### Task 8: Add Recommended Services Card to Customer Dashboard

**Files:**
- Modify: `src/app/(customer)/portal/home/page.tsx`

- [ ] **Step 1: Read the current dashboard page**

Read `src/app/(customer)/portal/home/page.tsx` to see the full current implementation.

- [ ] **Step 2: Update the data fetching to include services**

In the `fetchData` function (around line 39-62), add a services fetch to the `Promise.all`:

Before:
```typescript
const [{ data: attemptData }, { data: phasesData }] = await Promise.all([
  supabase
    .from('assessment_attempts')
    .select('*')
    .eq('user_id', profile!.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle(),
  supabase
    .from('phases')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true }),
])
```

After:
```typescript
const [{ data: attemptData }, { data: phasesData }, { data: servicesData }] = await Promise.all([
  supabase
    .from('assessment_attempts')
    .select('*')
    .eq('user_id', profile!.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle(),
  supabase
    .from('phases')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true }),
  supabase
    .from('services')
    .select('id, name, description, phase_id, status')
    .eq('status', 'active'),
])
```

- [ ] **Step 3: Add services state**

Add state for services and set it in fetchData:

```typescript
const [services, setServices] = useState<Service[]>([])
```

And in fetchData: `setServices(servicesData ?? [])`

Update the import at the top of the file to include `Service`:
```typescript
import type { AssessmentAttempt, Phase, Service } from '@/lib/types'
```

- [ ] **Step 4: Pass services to the new component**

After the existing `<ScoreCard>` component (line 97), add the `<RecommendedServices>` component:

```tsx
{attempt === null ? (
  <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
    No assessment taken yet. Complete your IT Health Assessment to see your score here.
  </div>
) : (
  <>
    <ScoreCard attempt={attempt!} phases={phases} />
    <RecommendedServices attempt={attempt!} phases={phases} services={services} />
  </>
)}
```

- [ ] **Step 5: Build the `RecommendedServices` component**

Add the component at the bottom of the same file, after the `ScoreCard` function:

```tsx
function RecommendedServices({
  attempt,
  phases,
  services,
}: {
  attempt: AssessmentAttempt
  phases: Phase[]
  services: Service[]
}) {
  const serviceScores = attempt.service_scores
  if (!serviceScores) return null

  // Filter services below 75% (not Optimised)
  const recommended = services
    .map((s) => ({
      ...s,
      score: serviceScores[s.id]?.pct ?? null,
    }))
    .filter((s) => s.score !== null && s.score < 75)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))

  if (recommended.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-7">
        <h2 className="text-lg font-semibold text-slate-900">Recommended Services</h2>
        <p className="mt-2 text-sm text-green-600">
          Great news — you&apos;re scoring well across all services. Keep it up!
        </p>
      </div>
    )
  }

  // Group by phase
  const phaseMap = new Map(phases.map((p) => [p.id, p]))
  const grouped = new Map<string, typeof recommended>()
  for (const s of recommended) {
    const list = grouped.get(s.phase_id) || []
    list.push(s)
    grouped.set(s.phase_id, list)
  }

  // Sort phases by sort_order
  const sortedPhases = phases
    .filter((p) => grouped.has(p.id))
    .sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-7">
      <h2 className="text-lg font-semibold text-slate-900">Recommended Services</h2>
      <p className="mt-1 text-sm text-slate-500">
        Based on your assessment, these services can help improve your IT maturity.
      </p>

      <div className="mt-5 space-y-6">
        {sortedPhases.map((phase) => {
          const phaseServices = grouped.get(phase.id) ?? []
          const phaseScore = attempt.phase_scores?.[phase.id] ?? 0
          const maturity = getMaturityLabel(phaseScore)
          const color = getPhaseColor(phase.name)

          return (
            <div key={phase.id}>
              <div className="mb-3 flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm font-semibold text-slate-800">
                  {phase.name}
                </span>
                <span className="text-xs text-slate-500">— {phaseScore}%</span>
                <span
                  className={`ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    phaseScore <= 25
                      ? 'bg-red-100 text-red-700'
                      : phaseScore <= 50
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {maturity}
                </span>
              </div>

              <div className="space-y-2">
                {phaseServices.map((s) => {
                  const bgColor =
                    (s.score ?? 0) <= 25
                      ? 'bg-red-50 border-red-200'
                      : (s.score ?? 0) <= 50
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-slate-50 border-slate-200'

                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 ${bgColor}`}
                    >
                      <div className="min-w-[48px] text-center">
                        <span
                          className={`text-lg font-bold ${
                            (s.score ?? 0) <= 25
                              ? 'text-red-600'
                              : (s.score ?? 0) <= 50
                                ? 'text-orange-600'
                                : 'text-slate-600'
                          }`}
                        >
                          {s.score}%
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {s.name}
                        </p>
                        <p className="text-xs text-slate-500">{s.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Verify the page renders**

Run: `npm run dev`
Navigate to the customer dashboard. If there's an existing assessment attempt with `service_scores`, the recommended services card should appear. If the attempt has no `service_scores` (pre-migration data), the card should gracefully not render.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(customer)/portal/home/page.tsx"
git commit -m "feat: add Recommended Services card to customer dashboard"
```

---

### Task 9: End-to-End Verification

**Files:** None (testing only)

- [ ] **Step 1: Reset the database**

Run: `npx supabase db reset`
Expected: Clean reset with updated seed data using `service_id`.

- [ ] **Step 2: Test the onboarding flow**

Run: `npm run dev`
1. Navigate to `/get-started`
2. Complete the assessment with mixed scores (e.g., low on Secure questions, high on Operate)
3. Verify the live scoring panel shows phase bars updating correctly
4. Submit the assessment with contact details

Expected: Account created, redirected to set-password flow.

- [ ] **Step 3: Verify the assessment attempt data**

Open Supabase Studio (`http://localhost:54323`) and check the `assessment_attempts` table:
- `phase_scores` should have 4 phase entries with percentages
- `service_scores` should have 8 service entries with `{ earned, max, pct }` objects
- `score` should be the overall average

- [ ] **Step 4: Check the customer dashboard**

Log in as the new customer and navigate to `/portal/home`:
- The ScoreCard should display as before (donut + phase bars)
- Below it, the Recommended Services card should show services grouped by phase
- Services with score ≥75% should be hidden
- Services should be color-coded: red (≤25%), orange (≤50%), neutral (≤75%)
- If all services are ≥75%, a congratulatory message should appear instead

- [ ] **Step 5: Test the admin editor**

Log in as admin and navigate to edit an assessment:
- The question form should show a "Service" dropdown instead of "Phase Tag"
- Services should be listed with their phase prefix (e.g., "Secure > Cyber Security Essentials")
- Editing an existing question should show its current service selected
- Saving a question should persist the `service_id`

- [ ] **Step 6: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address issues found during end-to-end verification"
```
