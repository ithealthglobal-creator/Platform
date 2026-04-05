# Standalone Assessments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add standalone assessments (scoped to journey/phase/service) as an L2 page under Academy, with per-phase scoring and question weighting, unified with existing course-section assessments.

**Architecture:** Alter the existing assessments/questions/attempts tables to support standalone scope. Create a new L2 list page, plus create/edit pages following the established CRUD pattern. The edit page embeds an enhanced question editor with phase tagging and weight fields.

**Tech Stack:** Next.js App Router, TypeScript, Supabase (Postgres), shadcn/ui, Carbon icons, Sonner toasts

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `supabase/migrations/20260403400001_alter_assessments_standalone.sql` | Schema changes: make section_id nullable, add scope/phase_id/service_id columns |
| Create | `supabase/migrations/20260403400002_alter_questions_weight_phase.sql` | Add weight and phase_id to assessment_questions |
| Create | `supabase/migrations/20260403400003_alter_attempts_phase_scores.sql` | Add phase_scores jsonb to assessment_attempts |
| Create | `supabase/migrations/20260403400004_assessments_menu_item.sql` | Insert Assessments L2 menu item under Academy |
| Modify | `src/lib/types.ts` | Add AssessmentScope type, update Assessment/AssessmentQuestion/AssessmentAttempt interfaces |
| Create | `src/app/(admin)/academy/assessments/page.tsx` | Assessments list page (all scopes unified) |
| Create | `src/app/(admin)/academy/assessments/new/page.tsx` | New standalone assessment form |
| Create | `src/app/(admin)/academy/assessments/[id]/edit/page.tsx` | Edit assessment + question editor with phase/weight |

---

### Task 1: Database Migration — Alter assessments table

**Files:**
- Create: `supabase/migrations/20260403400001_alter_assessments_standalone.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Make section_id nullable for standalone assessments
ALTER TABLE public.assessments ALTER COLUMN section_id DROP NOT NULL;

-- Add scope column with default for existing rows
ALTER TABLE public.assessments ADD COLUMN scope text NOT NULL DEFAULT 'course_section'
  CHECK (scope IN ('journey', 'phase', 'service', 'course_section'));

-- Add phase_id and service_id for scoped assessments
ALTER TABLE public.assessments ADD COLUMN phase_id uuid REFERENCES public.phases(id);
ALTER TABLE public.assessments ADD COLUMN service_id uuid REFERENCES public.services(id);

-- Add check constraint: scope fields must match
ALTER TABLE public.assessments ADD CONSTRAINT chk_assessment_scope CHECK (
  (scope = 'course_section' AND section_id IS NOT NULL) OR
  (scope = 'phase' AND phase_id IS NOT NULL) OR
  (scope = 'service' AND service_id IS NOT NULL) OR
  (scope = 'journey')
);

-- Index for scope-based queries
CREATE INDEX idx_assessments_scope ON public.assessments(scope);
CREATE INDEX idx_assessments_phase ON public.assessments(phase_id) WHERE phase_id IS NOT NULL;
CREATE INDEX idx_assessments_service ON public.assessments(service_id) WHERE service_id IS NOT NULL;
```

- [ ] **Step 2: Apply the migration**

Run: `cd /Users/futuvara/Documents/Claude/Projects/IThealth.ai && npx supabase db push`
Expected: Migration applied successfully

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260403400001_alter_assessments_standalone.sql
git commit -m "feat: alter assessments table for standalone scope support"
```

---

### Task 2: Database Migration — Alter assessment_questions table

**Files:**
- Create: `supabase/migrations/20260403400002_alter_questions_weight_phase.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Add phase tagging for per-phase scoring
ALTER TABLE public.assessment_questions ADD COLUMN phase_id uuid REFERENCES public.phases(id);

-- Add weight for question weighting in scoring
ALTER TABLE public.assessment_questions ADD COLUMN weight integer NOT NULL DEFAULT 1;

-- Index for phase-based scoring queries
CREATE INDEX idx_assessment_questions_phase ON public.assessment_questions(phase_id) WHERE phase_id IS NOT NULL;
```

- [ ] **Step 2: Apply the migration**

Run: `cd /Users/futuvara/Documents/Claude/Projects/IThealth.ai && npx supabase db push`
Expected: Migration applied successfully

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260403400002_alter_questions_weight_phase.sql
git commit -m "feat: add weight and phase_id to assessment questions"
```

---

### Task 3: Database Migration — Alter assessment_attempts table

**Files:**
- Create: `supabase/migrations/20260403400003_alter_attempts_phase_scores.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Add per-phase score breakdown
ALTER TABLE public.assessment_attempts ADD COLUMN phase_scores jsonb;
```

- [ ] **Step 2: Apply the migration**

Run: `cd /Users/futuvara/Documents/Claude/Projects/IThealth.ai && npx supabase db push`
Expected: Migration applied successfully

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260403400003_alter_attempts_phase_scores.sql
git commit -m "feat: add phase_scores to assessment attempts"
```

---

### Task 4: Database Migration — Add Assessments menu item

**Files:**
- Create: `supabase/migrations/20260403400004_assessments_menu_item.sql`

The Academy L1 is `10000000-0000-0000-0000-000000000006`. Existing L2 items under Academy:
- `20000000-0000-0000-0000-000000000011` — Courses (sort_order 1)
- `20000000-0000-0000-0000-000000000012` — Certificates (sort_order 2)

Insert Assessments between them at sort_order 2, bump Certificates to 3.

- [ ] **Step 1: Write the migration**

```sql
-- Add Assessments L2 menu item under Academy
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000006', 'Assessments', NULL, '/academy/assessments', 2, 2)
ON CONFLICT (id) DO NOTHING;

-- Bump Certificates to sort_order 3
UPDATE public.menu_items
SET sort_order = 3
WHERE id = '20000000-0000-0000-0000-000000000012';

-- Grant admin access
INSERT INTO public.role_menu_access (role, menu_item_id)
VALUES ('admin', '20000000-0000-0000-0000-000000000013')
ON CONFLICT (role, menu_item_id) DO NOTHING;
```

- [ ] **Step 2: Apply the migration**

Run: `cd /Users/futuvara/Documents/Claude/Projects/IThealth.ai && npx supabase db push`
Expected: Migration applied, Assessments appears in Academy menu

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260403400004_assessments_menu_item.sql
git commit -m "feat: add Assessments L2 menu item under Academy"
```

---

### Task 5: Update TypeScript types

**Files:**
- Modify: `src/lib/types.ts:126-210`

- [ ] **Step 1: Update types**

Add `AssessmentScope` type and update the `Assessment`, `AssessmentQuestion`, and `AssessmentAttempt` interfaces:

```typescript
// Add after line 126 (after AssessmentType)
export type AssessmentScope = 'journey' | 'phase' | 'service' | 'course_section'
```

Update `Assessment` interface (lines 175-186) to:

```typescript
export interface Assessment {
  id: string
  section_id: string | null
  scope: AssessmentScope
  phase_id: string | null
  service_id: string | null
  type: AssessmentType
  name: string
  description: string | null
  pass_threshold: number
  is_active: boolean
  created_at: string
  updated_at: string
  questions?: AssessmentQuestion[]
  phase?: Phase
  service?: { id: string; name: string }
  section?: { id: string; name: string; course?: { id: string; name: string } }
}
```

Update `AssessmentQuestion` interface (lines 188-198) to:

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

Update `AssessmentAttempt` interface (lines 200-210) to:

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

- [ ] **Step 2: Verify the app still compiles**

Run: `cd /Users/futuvara/Documents/Claude/Projects/IThealth.ai && npx next build 2>&1 | head -30`
Expected: Build succeeds (existing assessment-editor.tsx may need minor fixes for new required fields — if so, update the component's insert payloads to include `scope: 'course_section'`)

- [ ] **Step 3: Fix assessment-editor.tsx if needed**

In `src/components/academy/assessment-editor.tsx`, the `createAssessment` function (line 112) inserts into assessments. Add `scope: 'course_section'` to the payload:

```typescript
const payload = {
  section_id: sectionId,
  type,
  name: label,
  description: null,
  pass_threshold: 80,
  scope: 'course_section',
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/components/academy/assessment-editor.tsx
git commit -m "feat: update types for standalone assessments with scope/weight/phase"
```

---

### Task 6: Assessments List Page

**Files:**
- Create: `src/app/(admin)/academy/assessments/page.tsx`

Reference: `src/app/(admin)/academy/courses/page.tsx` for L2 page pattern

- [ ] **Step 1: Create the list page**

This page fetches all assessments from all scopes, joins phase/service/section names, and aggregates question count and attempt stats.

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Breadcrumb } from '@/components/breadcrumb'
import { Assessment, AssessmentScope } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Add, Edit, TrashCan } from '@carbon/icons-react'

interface AssessmentRow {
  id: string
  name: string
  scope: AssessmentScope
  scope_label: string
  question_count: number
  attempt_count: number
  avg_score: number | null
  is_active: boolean
  is_standalone: boolean
}

function scopeBadgeVariant(scope: AssessmentScope): 'default' | 'secondary' | 'outline' {
  switch (scope) {
    case 'journey': return 'default'
    case 'phase': return 'secondary'
    case 'service': return 'outline'
    default: return 'outline'
  }
}

export default function AssessmentsPage() {
  const router = useRouter()
  const [assessments, setAssessments] = useState<AssessmentRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAssessments = useCallback(async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('assessments')
      .select(`
        id, name, scope, phase_id, service_id, section_id, type, is_active,
        phase:phases(name),
        service:services(name),
        section:course_sections(name, course:courses(name)),
        assessment_questions(count),
        assessment_attempts(count, score)
      `)
      .order('name')

    if (error) {
      toast.error('Failed to load assessments')
      setLoading(false)
      return
    }

    const rows: AssessmentRow[] = (data ?? []).map((a: Record<string, unknown>) => {
      const scope = a.scope as AssessmentScope
      const phase = a.phase as { name: string } | null
      const service = a.service as { name: string } | null
      const section = a.section as { name: string; course: { name: string } | null } | null
      const type = a.type as string

      let scope_label = 'Journey'
      if (scope === 'phase' && phase) scope_label = phase.name
      if (scope === 'service' && service) scope_label = service.name
      if (scope === 'course_section' && section) {
        const courseName = section.course?.name ?? ''
        scope_label = `${courseName} › ${section.name} (${type})`
      }

      const questions = a.assessment_questions as Array<{ count: number }> | undefined
      const attempts = a.assessment_attempts as Array<{ count: number; score: number }> | undefined

      const question_count = questions?.[0]?.count ?? 0
      // For count and avg we need separate aggregation
      const attempt_count = attempts?.length ?? 0
      const avg_score = attempt_count > 0
        ? Math.round(attempts!.reduce((sum, att) => sum + att.score, 0) / attempt_count)
        : null

      return {
        id: a.id as string,
        name: a.name as string,
        scope,
        scope_label,
        question_count,
        attempt_count,
        avg_score,
        is_active: a.is_active as boolean,
        is_standalone: scope !== 'course_section',
      }
    })

    setAssessments(rows)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAssessments()
  }, [fetchAssessments])

  const handleDelete = useCallback(
    async (id: string, name: string) => {
      if (!confirm(`Delete "${name}"? This cannot be undone.`)) return

      const { error } = await supabase
        .from('assessments')
        .delete()
        .eq('id', id)

      if (error) {
        toast.error('Failed to delete assessment')
        return
      }

      toast.success('Assessment deleted')
      fetchAssessments()
    },
    [fetchAssessments]
  )

  return (
    <div>
      <Breadcrumb />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Assessments</h1>
          <p className="text-muted-foreground text-sm">
            Manage assessments across the journey, phases, services, and courses
          </p>
        </div>
        <Button onClick={() => router.push('/academy/assessments/new')}>
          <Add size={16} />
          Add Assessment
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead className="w-[100px]">Questions</TableHead>
              <TableHead className="w-[100px]">Attempts</TableHead>
              <TableHead className="w-[100px]">Avg Score</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : assessments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No assessments found
                </TableCell>
              </TableRow>
            ) : (
              assessments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={scopeBadgeVariant(a.scope)}>
                        {a.scope === 'course_section' ? 'Course' : a.scope.charAt(0).toUpperCase() + a.scope.slice(1)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{a.scope_label}</span>
                    </div>
                  </TableCell>
                  <TableCell>{a.question_count}</TableCell>
                  <TableCell>{a.attempt_count}</TableCell>
                  <TableCell>{a.avg_score != null ? `${a.avg_score}%` : '—'}</TableCell>
                  <TableCell>
                    <Badge variant={a.is_active ? 'default' : 'secondary'}>
                      {a.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {a.is_standalone ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => router.push(`/academy/assessments/${a.id}/edit`)}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(a.id, a.name)}
                        >
                          <TrashCan size={16} />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Via course</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the page renders**

Run: `cd /Users/futuvara/Documents/Claude/Projects/IThealth.ai && npm run dev`
Navigate to: `http://localhost:3000/academy/assessments`
Expected: Page loads with table showing existing course-section assessments (if any)

- [ ] **Step 3: Commit**

```bash
git add src/app/\(admin\)/academy/assessments/page.tsx
git commit -m "feat: add assessments list page under Academy"
```

---

### Task 7: New Assessment Page

**Files:**
- Create: `src/app/(admin)/academy/assessments/new/page.tsx`

Reference: `src/app/(admin)/services/products/new/page.tsx` for create page pattern

- [ ] **Step 1: Create the new assessment page**

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Breadcrumb } from '@/components/breadcrumb'
import { Phase, Service, AssessmentScope } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowLeft, Save } from '@carbon/icons-react'

const SCOPE_OPTIONS: { value: AssessmentScope; label: string }[] = [
  { value: 'journey', label: 'Entire Journey' },
  { value: 'phase', label: 'Phase' },
  { value: 'service', label: 'Service' },
]

export default function NewAssessmentPage() {
  const router = useRouter()
  const [phases, setPhases] = useState<Phase[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [formScope, setFormScope] = useState<AssessmentScope>('journey')
  const [formPhaseId, setFormPhaseId] = useState<string>('')
  const [formServiceId, setFormServiceId] = useState<string>('')
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPassThreshold, setFormPassThreshold] = useState('80')
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchOptions = useCallback(async () => {
    const [pRes, sRes] = await Promise.all([
      supabase.from('phases').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('services').select('*, phase:phases(name)').eq('is_active', true).order('name'),
    ])

    if (pRes.data) setPhases(pRes.data as Phase[])
    if (sRes.data) setServices(sRes.data as Service[])
  }, [])

  useEffect(() => {
    fetchOptions()
  }, [fetchOptions])

  async function handleSave() {
    if (!formName.trim()) {
      toast.error('Assessment name is required')
      return
    }
    if (formScope === 'phase' && !formPhaseId) {
      toast.error('Please select a phase')
      return
    }
    if (formScope === 'service' && !formServiceId) {
      toast.error('Please select a service')
      return
    }

    setSaving(true)

    const { error } = await supabase.from('assessments').insert({
      name: formName.trim(),
      description: formDescription.trim() || null,
      pass_threshold: Number(formPassThreshold) || 80,
      is_active: formActive,
      scope: formScope,
      type: 'pre',
      phase_id: formScope === 'phase' ? formPhaseId : null,
      service_id: formScope === 'service' ? formServiceId : null,
      section_id: null,
    })

    if (error) {
      toast.error('Failed to create assessment')
      setSaving(false)
      return
    }

    toast.success('Assessment created')
    router.push('/academy/assessments')
  }

  return (
    <div>
      <Breadcrumb />
      <div className="mb-6">
        <button
          onClick={() => router.push('/academy/assessments')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} /> Back to Assessments
        </button>
      </div>
      <h1 className="text-2xl font-bold mb-6">New Assessment</h1>

      <div className="grid gap-4 max-w-lg">
        <div className="grid gap-2">
          <Label>Scope</Label>
          <Select value={formScope} onValueChange={(v) => setFormScope(v as AssessmentScope)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCOPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formScope === 'phase' && (
          <div className="grid gap-2">
            <Label>Phase</Label>
            <Select value={formPhaseId} onValueChange={(v) => setFormPhaseId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select phase" />
              </SelectTrigger>
              <SelectContent>
                {phases.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {formScope === 'service' && (
          <div className="grid gap-2">
            <Label>Service</Label>
            <Select value={formServiceId} onValueChange={(v) => setFormServiceId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}{s.phase ? ` (${s.phase.name})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="assessment-name">Name</Label>
          <Input
            id="assessment-name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Assessment name"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="assessment-description">Description</Label>
          <textarea
            id="assessment-description"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Assessment description"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="assessment-threshold">Pass Threshold (%)</Label>
          <Input
            id="assessment-threshold"
            type="number"
            value={formPassThreshold}
            onChange={(e) => setFormPassThreshold(e.target.value)}
            min={0}
            max={100}
            className="w-28"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="assessment-active"
            checked={formActive}
            onChange={(e) => setFormActive(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <Label htmlFor="assessment-active">Active</Label>
        </div>

        <div>
          <Button onClick={handleSave} disabled={saving}>
            <Save size={16} className="mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the page renders**

Navigate to: `http://localhost:3000/academy/assessments/new`
Expected: Form with scope selector, conditional phase/service dropdowns, name, description, threshold, active

- [ ] **Step 3: Commit**

```bash
git add src/app/\(admin\)/academy/assessments/new/page.tsx
git commit -m "feat: add new assessment page with scope selection"
```

---

### Task 8: Edit Assessment Page with Question Editor

**Files:**
- Create: `src/app/(admin)/academy/assessments/[id]/edit/page.tsx`

This is the most complex page. It combines the assessment metadata form (like the new page) with an inline question editor (adapted from `assessment-editor.tsx`) that adds **phase dropdown** and **weight field** per question.

- [ ] **Step 1: Create the edit page**

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Breadcrumb } from '@/components/breadcrumb'
import { Assessment, AssessmentQuestion, Phase, Service, AssessmentScope, QuestionOption } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowLeft, Save, Add, Edit, TrashCan } from '@carbon/icons-react'

const SCOPE_OPTIONS: { value: AssessmentScope; label: string }[] = [
  { value: 'journey', label: 'Entire Journey' },
  { value: 'phase', label: 'Phase' },
  { value: 'service', label: 'Service' },
]

const defaultOptions: QuestionOption[] = [
  { label: 'A', value: '', is_correct: true },
  { label: 'B', value: '', is_correct: false },
  { label: 'C', value: '', is_correct: false },
  { label: 'D', value: '', is_correct: false },
]

interface QuestionForm {
  question_text: string
  options: QuestionOption[]
  points: string
  weight: string
  phase_id: string
  sort_order: string
}

const emptyQuestionForm: QuestionForm = {
  question_text: '',
  options: defaultOptions,
  points: '1',
  weight: '1',
  phase_id: '',
  sort_order: '',
}

export default function EditAssessmentPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  // Assessment metadata
  const [phases, setPhases] = useState<Phase[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [formScope, setFormScope] = useState<AssessmentScope>('journey')
  const [formPhaseId, setFormPhaseId] = useState<string>('')
  const [formServiceId, setFormServiceId] = useState<string>('')
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPassThreshold, setFormPassThreshold] = useState('80')
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Questions
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([])
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [questionForm, setQuestionForm] = useState<QuestionForm>(emptyQuestionForm)
  const [savingQuestion, setSavingQuestion] = useState(false)

  const fetchOptions = useCallback(async () => {
    const [pRes, sRes] = await Promise.all([
      supabase.from('phases').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('services').select('*, phase:phases(name)').eq('is_active', true).order('name'),
    ])
    if (pRes.data) setPhases(pRes.data as Phase[])
    if (sRes.data) setServices(sRes.data as Service[])
  }, [])

  const fetchQuestions = useCallback(async () => {
    const { data, error } = await supabase
      .from('assessment_questions')
      .select('*')
      .eq('assessment_id', id)
      .order('sort_order')

    if (error) {
      toast.error('Failed to load questions')
      return
    }
    setQuestions((data as AssessmentQuestion[]) ?? [])
  }, [id])

  useEffect(() => {
    async function fetchAssessment() {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        toast.error('Failed to load assessment')
        router.push('/academy/assessments')
        return
      }

      const a = data as Assessment
      setFormScope(a.scope)
      setFormPhaseId(a.phase_id ?? '')
      setFormServiceId(a.service_id ?? '')
      setFormName(a.name)
      setFormDescription(a.description ?? '')
      setFormPassThreshold(String(a.pass_threshold))
      setFormActive(a.is_active)
      setLoading(false)
    }

    fetchAssessment()
    fetchOptions()
    fetchQuestions()
  }, [id, router, fetchOptions, fetchQuestions])

  async function handleSave() {
    if (!formName.trim()) {
      toast.error('Assessment name is required')
      return
    }
    if (formScope === 'phase' && !formPhaseId) {
      toast.error('Please select a phase')
      return
    }
    if (formScope === 'service' && !formServiceId) {
      toast.error('Please select a service')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('assessments')
      .update({
        name: formName.trim(),
        description: formDescription.trim() || null,
        pass_threshold: Number(formPassThreshold) || 80,
        is_active: formActive,
        scope: formScope,
        phase_id: formScope === 'phase' ? formPhaseId : null,
        service_id: formScope === 'service' ? formServiceId : null,
      })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update assessment')
      setSaving(false)
      return
    }

    toast.success('Assessment updated')
    setSaving(false)
  }

  // Question form helpers
  function startAddQuestion() {
    setEditingQuestionId(null)
    setQuestionForm({ ...emptyQuestionForm, sort_order: String(questions.length + 1) })
    setShowAddQuestion(true)
  }

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

  function cancelQuestionForm() {
    setShowAddQuestion(false)
    setEditingQuestionId(null)
    setQuestionForm(emptyQuestionForm)
  }

  function setOptionValue(index: number, value: string) {
    const opts = [...questionForm.options]
    opts[index] = { ...opts[index], value }
    setQuestionForm({ ...questionForm, options: opts })
  }

  function setCorrectOption(index: number) {
    const opts = questionForm.options.map((opt, i) => ({ ...opt, is_correct: i === index }))
    setQuestionForm({ ...questionForm, options: opts })
  }

  async function saveQuestion() {
    const trimmedText = questionForm.question_text.trim()
    if (!trimmedText) {
      toast.error('Question text is required')
      return
    }
    if (questionForm.options.some((o) => !o.value.trim())) {
      toast.error('All options must have text')
      return
    }

    setSavingQuestion(true)

    const payload = {
      assessment_id: id,
      question_text: trimmedText,
      options: questionForm.options.map((o) => ({ ...o, value: o.value.trim() })),
      points: Number(questionForm.points) || 1,
      weight: Number(questionForm.weight) || 1,
      phase_id: questionForm.phase_id || null,
      sort_order: Number(questionForm.sort_order) || 0,
    }

    if (editingQuestionId) {
      const { error } = await supabase.from('assessment_questions').update(payload).eq('id', editingQuestionId)
      if (error) { toast.error('Failed to update question'); setSavingQuestion(false); return }
      toast.success('Question updated')
    } else {
      const { error } = await supabase.from('assessment_questions').insert(payload)
      if (error) { toast.error('Failed to create question'); setSavingQuestion(false); return }
      toast.success('Question created')
    }

    setSavingQuestion(false)
    cancelQuestionForm()
    fetchQuestions()
  }

  async function deleteQuestion(qId: string) {
    if (!confirm('Delete this question?')) return
    const { error } = await supabase.from('assessment_questions').delete().eq('id', qId)
    if (error) { toast.error('Failed to delete question'); return }
    toast.success('Question deleted')
    fetchQuestions()
  }

  function renderQuestionForm() {
    return (
      <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
        <div className="grid gap-2">
          <Label>Question Text *</Label>
          <textarea
            value={questionForm.question_text}
            onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
            placeholder="Enter question text"
            rows={3}
            className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          />
        </div>
        <div className="space-y-2">
          <Label>Options (select correct answer)</Label>
          {questionForm.options.map((opt, i) => (
            <div key={opt.label} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct-option"
                checked={opt.is_correct}
                onChange={() => setCorrectOption(i)}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium w-6">{opt.label}.</span>
              <Input
                value={opt.value}
                onChange={(e) => setOptionValue(i, e.target.value)}
                placeholder={`Option ${opt.label}`}
                className="flex-1"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-4">
          <div className="grid gap-2">
            <Label>Phase Tag</Label>
            <Select
              value={questionForm.phase_id || 'none'}
              onValueChange={(v) => setQuestionForm({ ...questionForm, phase_id: v === 'none' ? '' : v })}
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
          <div className="grid gap-2">
            <Label>Weight</Label>
            <Input
              type="number"
              value={questionForm.weight}
              onChange={(e) => setQuestionForm({ ...questionForm, weight: e.target.value })}
              className="w-24"
              min={1}
            />
          </div>
          <div className="grid gap-2">
            <Label>Points</Label>
            <Input
              type="number"
              value={questionForm.points}
              onChange={(e) => setQuestionForm({ ...questionForm, points: e.target.value })}
              className="w-24"
              min={1}
            />
          </div>
          <div className="grid gap-2">
            <Label>Sort Order</Label>
            <Input
              type="number"
              value={questionForm.sort_order}
              onChange={(e) => setQuestionForm({ ...questionForm, sort_order: e.target.value })}
              className="w-24"
            />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button onClick={saveQuestion} disabled={savingQuestion} size="sm">
            {savingQuestion ? 'Saving...' : 'Save'}
          </Button>
          <Button onClick={cancelQuestionForm} variant="outline" size="sm">
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        <Breadcrumb />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div>
      <Breadcrumb />
      <div className="mb-6">
        <button
          onClick={() => router.push('/academy/assessments')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} /> Back to Assessments
        </button>
      </div>
      <h1 className="text-2xl font-bold mb-6">Edit Assessment</h1>

      {/* Assessment metadata */}
      <div className="grid gap-4 max-w-lg mb-8">
        <div className="grid gap-2">
          <Label>Scope</Label>
          <Select value={formScope} onValueChange={(v) => setFormScope(v as AssessmentScope)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCOPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formScope === 'phase' && (
          <div className="grid gap-2">
            <Label>Phase</Label>
            <Select value={formPhaseId} onValueChange={(v) => setFormPhaseId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select phase" />
              </SelectTrigger>
              <SelectContent>
                {phases.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {formScope === 'service' && (
          <div className="grid gap-2">
            <Label>Service</Label>
            <Select value={formServiceId} onValueChange={(v) => setFormServiceId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}{s.phase ? ` (${s.phase.name})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="assessment-name">Name</Label>
          <Input
            id="assessment-name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Assessment name"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="assessment-description">Description</Label>
          <textarea
            id="assessment-description"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Assessment description"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="assessment-threshold">Pass Threshold (%)</Label>
          <Input
            id="assessment-threshold"
            type="number"
            value={formPassThreshold}
            onChange={(e) => setFormPassThreshold(e.target.value)}
            min={0}
            max={100}
            className="w-28"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="assessment-active"
            checked={formActive}
            onChange={(e) => setFormActive(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <Label htmlFor="assessment-active">Active</Label>
        </div>

        <div>
          <Button onClick={handleSave} disabled={saving}>
            <Save size={16} className="mr-2" />
            {saving ? 'Saving...' : 'Save Assessment'}
          </Button>
        </div>
      </div>

      {/* Questions section */}
      <div className="max-w-2xl">
        <h2 className="text-lg font-semibold mb-4">Questions</h2>

        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q.id}>
              {editingQuestionId === q.id ? (
                renderQuestionForm()
              ) : (
                <div className="rounded-lg border px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5 flex-1">
                      <p className="text-sm font-medium">{q.question_text}</p>
                      <div className="grid grid-cols-2 gap-1">
                        {q.options.map((opt) => (
                          <span
                            key={opt.label}
                            className={`text-xs px-2 py-1 rounded ${
                              opt.is_correct
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 font-medium'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {opt.label}. {opt.value}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Phase: {phases.find((p) => p.id === q.phase_id)?.name ?? 'None'}
                        {' | '}Weight: {q.weight}
                        {' | '}Points: {q.points}
                        {' | '}Order: {q.sort_order}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button variant="ghost" size="sm" onClick={() => startEditQuestion(q)}>
                        <Edit size={16} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteQuestion(q.id)}>
                        <TrashCan size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {showAddQuestion && renderQuestionForm()}

          {!showAddQuestion && !editingQuestionId && (
            <Button variant="outline" size="sm" onClick={startAddQuestion}>
              <Add size={16} />
              Add Question
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the page renders**

Navigate to: `http://localhost:3000/academy/assessments/new` → create an assessment → click Edit
Expected: Assessment metadata loads, questions section shows with phase tag and weight fields

- [ ] **Step 3: Commit**

```bash
git add src/app/\(admin\)/academy/assessments/\[id\]/edit/page.tsx
git commit -m "feat: add edit assessment page with phase-tagged weighted questions"
```

---

### Task 9: Smoke Test & Final Verification

- [ ] **Step 1: Run all migrations**

Run: `cd /Users/futuvara/Documents/Claude/Projects/IThealth.ai && npx supabase db push`
Expected: All 4 new migrations applied

- [ ] **Step 2: Verify menu shows Assessments**

Navigate to Academy in the sidebar. Expected: Courses, **Assessments**, Certificates (in that order)

- [ ] **Step 3: Create a journey assessment**

1. Go to `/academy/assessments` → click "Add Assessment"
2. Set Scope = "Entire Journey", Name = "IT Maturity Onboarding"
3. Save → redirected to list page → assessment appears with Journey badge

- [ ] **Step 4: Add phase-tagged questions**

1. Click Edit on the new assessment
2. Add a question, tag it to "Operate", weight = 2
3. Add another question, tag it to "Secure", weight = 1
4. Verify questions display with phase/weight metadata

- [ ] **Step 5: Verify course-section assessments appear**

If any course-section assessments exist, they should appear in the list as read-only rows with "Course" badge and "Via course" in the Actions column.

- [ ] **Step 6: Verify the build compiles**

Run: `cd /Users/futuvara/Documents/Claude/Projects/IThealth.ai && npx next build 2>&1 | tail -10`
Expected: Build succeeds with no errors

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: standalone assessments with per-phase scoring and question weighting"
```
