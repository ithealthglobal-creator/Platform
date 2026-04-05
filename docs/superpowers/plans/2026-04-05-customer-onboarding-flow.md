# Customer Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a customer onboarding flow: public assessment → account creation → customer portal with score display, plus admin sales kanban and assessment configuration.

**Architecture:** New `(onboarding)` and `(customer)` route groups alongside existing `(admin)` and `(public)`. Public API route handles account creation + invite email via Supabase service role. Customer area has its own blue sidebar layout reading from the same database-driven menu system.

**Tech Stack:** Next.js 16 (App Router), React 19, Supabase (Postgres + Auth), shadcn/ui, Tailwind CSS 4, IBM Carbon icons, TypeScript 5

**Spec:** `docs/superpowers/specs/2026-04-05-customer-onboarding-flow-design.md`

---

## File Structure

### New Files
- `supabase/migrations/20260405000001_company_type_status.sql` — enums + alter companies
- `supabase/migrations/20260405000002_assessment_onboarding.sql` — onboarding columns + partial index
- `supabase/migrations/20260405000003_sales_tables.sql` — sales_stages + sales_leads + seed
- `supabase/migrations/20260405000004_customer_menu_seed.sql` — customer menu items + role access
- `supabase/migrations/20260405000005_onboarding_rls.sql` �� RLS for new tables + public assessment read
- `src/components/customer-guard.tsx` — auth guard for customer role
- `src/components/customer-sidebar.tsx` — blue sidebar with IThealth logo
- `src/app/(customer)/layout.tsx` — customer area layout
- `src/app/(customer)/home/page.tsx` — donut chart + phase breakdown
- `src/app/(customer)/journey/page.tsx` — placeholder
- `src/app/(customer)/academy/page.tsx` — placeholder
- `src/app/(customer)/services/page.tsx` — placeholder
- `src/app/(customer)/team/page.tsx` — placeholder
- `src/app/(customer)/support/page.tsx` — placeholder
- `src/app/(customer)/settings/page.tsx` — placeholder
- `src/app/(auth)/set-password/page.tsx` — invite link landing
- `src/app/(onboarding)/layout.tsx` — minimal layout
- `src/app/(onboarding)/get-started/page.tsx` — public assessment wizard
- `src/app/api/onboarding/route.ts` — account creation + invite
- `src/lib/scoring.ts` — assessment scoring logic
- `src/app/(admin)/sales/page.tsx` — kanban board

### Modified Files
- `src/lib/types.ts` — add CompanyType, CompanyStatus, SalesStage, SalesLead; update Company, Assessment
- `src/lib/icon-map.ts` — add home, roadmap, help icons
- `src/app/(auth)/login/page.tsx` — role-based redirect
- `src/app/(admin)/academy/assessments/new/page.tsx` — onboarding toggle
- `src/app/(admin)/academy/assessments/[id]/edit/page.tsx` — onboarding toggle + fields
- `src/app/(admin)/people/companies/page.tsx` — type/status columns
- `src/app/(admin)/people/companies/[id]/edit/page.tsx` — type/status dropdowns
- `src/app/(admin)/people/companies/new/page.tsx` — type/status fields
- `src/components/public-header.tsx` — add Get Started link
- `src/app/(public)/page.tsx` — add Get Started CTA
- `supabase/config.toml` — add redirect URL

---

## Task 1: Database — Company Type & Status Enums

**Files:**
- Create: `supabase/migrations/20260405000001_company_type_status.sql`

- [ ] **Step 1: Write migration**

```sql
-- Create enums
CREATE TYPE company_type AS ENUM ('admin', 'customer', 'partner');
CREATE TYPE company_status AS ENUM ('prospect', 'active', 'churned', 'pending', 'approved', 'inactive');

-- Add columns with defaults
ALTER TABLE companies ADD COLUMN type company_type NOT NULL DEFAULT 'admin';
ALTER TABLE companies ADD COLUMN status company_status NOT NULL DEFAULT 'active';

-- Migrate existing data: is_active true → active, false → inactive
UPDATE companies SET status = CASE WHEN is_active THEN 'active'::company_status ELSE 'inactive'::company_status END;

-- Drop is_active
ALTER TABLE companies DROP COLUMN is_active;
```

- [ ] **Step 2: Apply migration**

Run: `cd /Users/futuvara/Documents/Claude/Projects/IThealth.ai && npx supabase db reset`
Expected: All migrations applied successfully.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260405000001_company_type_status.sql
git commit -m "feat: add company type/status enums, drop is_active"
```

---

## Task 2: Database — Assessment Onboarding Fields

**Files:**
- Create: `supabase/migrations/20260405000002_assessment_onboarding.sql`

- [ ] **Step 1: Write migration**

```sql
ALTER TABLE assessments ADD COLUMN is_onboarding boolean NOT NULL DEFAULT false;
ALTER TABLE assessments ADD COLUMN welcome_heading text;
ALTER TABLE assessments ADD COLUMN welcome_description text;
ALTER TABLE assessments ADD COLUMN completion_heading text;
ALTER TABLE assessments ADD COLUMN completion_description text;

-- Only one assessment can be the onboarding assessment
CREATE UNIQUE INDEX idx_assessments_onboarding ON assessments (is_onboarding) WHERE is_onboarding = true;
```

- [ ] **Step 2: Apply and verify**

Run: `cd /Users/futuvara/Documents/Claude/Projects/IThealth.ai && npx supabase db reset`
Expected: All migrations applied successfully.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260405000002_assessment_onboarding.sql
git commit -m "feat: add onboarding fields to assessments table"
```

---

## Task 3: Database — Sales Tables

**Files:**
- Create: `supabase/migrations/20260405000003_sales_tables.sql`

- [ ] **Step 1: Write migration**

```sql
-- Sales stages (kanban columns)
CREATE TABLE sales_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#1175E4',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sales_stages ENABLE ROW LEVEL SECURITY;

-- Sales leads (kanban cards)
CREATE TABLE sales_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES sales_stages(id),
  assessment_attempt_id uuid REFERENCES assessment_attempts(id),
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sales_leads ENABLE ROW LEVEL SECURITY;

-- Seed default stage
INSERT INTO sales_stages (name, sort_order, color) VALUES ('New Lead', 1, '#1175E4');
```

- [ ] **Step 2: Apply and verify**

Run: `cd /Users/futuvara/Documents/Claude/Projects/IThealth.ai && npx supabase db reset`
Expected: All migrations applied, sales_stages has 1 row.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260405000003_sales_tables.sql
git commit -m "feat: add sales_stages and sales_leads tables"
```

---

## Task 4: Database — Customer Menu Seed & RLS

**Files:**
- Create: `supabase/migrations/20260405000004_customer_menu_seed.sql`
- Create: `supabase/migrations/20260405000005_onboarding_rls.sql`

- [ ] **Step 1: Write customer menu seed migration**

```sql
-- Customer L1 menu items
INSERT INTO menu_items (id, label, icon, route, sort_order, level, is_active) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Home', 'home', '/home', 1, 1, true),
  ('c0000000-0000-0000-0000-000000000002', 'Journey', 'roadmap', '/journey', 2, 1, true),
  ('c0000000-0000-0000-0000-000000000003', 'Academy', 'education', '/academy', 3, 1, true),
  ('c0000000-0000-0000-0000-000000000004', 'Services', 'tool-kit', '/services', 4, 1, true),
  ('c0000000-0000-0000-0000-000000000005', 'Team', 'user-multiple', '/team', 5, 1, true),
  ('c0000000-0000-0000-0000-000000000006', 'Support', 'help', '/support', 6, 1, true),
  ('c0000000-0000-0000-0000-000000000007', 'Settings', 'settings', '/settings', 7, 1, true)
ON CONFLICT (id) DO NOTHING;

-- Grant customer role access
INSERT INTO role_menu_access (role, menu_item_id) VALUES
  ('customer', 'c0000000-0000-0000-0000-000000000001'),
  ('customer', 'c0000000-0000-0000-0000-000000000002'),
  ('customer', 'c0000000-0000-0000-0000-000000000003'),
  ('customer', 'c0000000-0000-0000-0000-000000000004'),
  ('customer', 'c0000000-0000-0000-0000-000000000005'),
  ('customer', 'c0000000-0000-0000-0000-000000000006'),
  ('customer', 'c0000000-0000-0000-0000-000000000007')
ON CONFLICT DO NOTHING;
```

- [ ] **Step 2: Write RLS migration**

```sql
-- Sales stages: admin full access
CREATE POLICY "Admin full access to sales_stages"
  ON sales_stages FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Sales leads: admin full access
CREATE POLICY "Admin full access to sales_leads"
  ON sales_leads FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Verify RLS is enabled on assessments and assessment_questions (should already be from academy migrations)
-- If not: ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
-- If not: ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;

-- Allow public (anon) read of onboarding assessment + its questions
CREATE POLICY "Public read onboarding assessment"
  ON assessments FOR SELECT
  USING (is_onboarding = true);

CREATE POLICY "Public read onboarding questions"
  ON assessment_questions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM assessments WHERE assessments.id = assessment_questions.assessment_id AND assessments.is_onboarding = true)
  );

-- Allow service_role to insert into all tables (implicit — service_role bypasses RLS)
```

- [ ] **Step 3: Apply and verify**

Run: `cd /Users/futuvara/Documents/Claude/Projects/IThealth.ai && npx supabase db reset`
Expected: All migrations applied, menu_items has customer items, role_menu_access has customer entries.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260405000004_customer_menu_seed.sql supabase/migrations/20260405000005_onboarding_rls.sql
git commit -m "feat: seed customer menu items and add onboarding RLS policies"
```

---

## Task 5: TypeScript Types & Icon Map

**Files:**
- Modify: `src/lib/types.ts` (lines 3–9 Company interface, lines 176–193 Assessment interface)
- Modify: `src/lib/icon-map.ts` (lines 1–36)

- [ ] **Step 1: Update Company type in types.ts**

Replace the Company interface (lines 3–9) with:

```typescript
export type CompanyType = 'admin' | 'customer' | 'partner'
export type CompanyStatus = 'prospect' | 'active' | 'churned' | 'pending' | 'approved' | 'inactive'

export interface Company {
  id: string
  name: string
  type: CompanyType
  status: CompanyStatus
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Update Assessment interface in types.ts**

Add these fields to the Assessment interface (after `is_active` on line ~187):

```typescript
  is_onboarding: boolean
  welcome_heading: string | null
  welcome_description: string | null
  completion_heading: string | null
  completion_description: string | null
```

- [ ] **Step 3: Add SalesStage and SalesLead types**

Add at the end of types.ts:

```typescript
export interface SalesStage {
  id: string
  name: string
  sort_order: number
  color: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SalesLead {
  id: string
  company_id: string
  stage_id: string
  assessment_attempt_id: string | null
  contact_name: string
  contact_email: string
  notes: string | null
  created_at: string
  updated_at: string
  company?: Company
  assessment_attempt?: AssessmentAttempt
}
```

- [ ] **Step 4: Add missing Carbon icons to icon-map.ts**

Add imports at top of `src/lib/icon-map.ts`:

```typescript
import { Home, Roadmap, Help } from '@carbon/icons-react'
```

Add to the iconMap object:

```typescript
  'home': Home,
  'roadmap': Roadmap,
  'help': Help,
```

- [ ] **Step 5: Fix is_active references in companies list page**

In `src/app/(admin)/people/companies/page.tsx`:

Update the CompanyWithCount mapping (lines 42–54): replace `is_active: c.is_active as boolean` with `type: c.type as string` and `status: c.status as string`.

Update the badge rendering (lines 102–104) to show type and status badges:

```typescript
{/* Type badge */}
<Badge variant="outline">
  {company.type.charAt(0).toUpperCase() + company.type.slice(1)}
</Badge>
{/* Status badge */}
<Badge variant={['active', 'approved'].includes(company.status) ? 'default' : 'secondary'}>
  {company.status.charAt(0).toUpperCase() + company.status.slice(1)}
</Badge>
```

Add Type and Status columns to the table header.

- [ ] **Step 6: Update company edit page**

In `src/app/(admin)/people/companies/[id]/edit/page.tsx`:
- Replace `is_active` state (line 36) with `formType` and `formStatus` states
- Replace `is_active` in fetch mapping (line 53) with `type` and `status`
- Replace `is_active` in update payload with `type: formType, status: formStatus`
- Replace the `is_active` checkbox in JSX with two Select dropdowns:

```typescript
<div>
  <Label>Type</Label>
  <Select value={formType} onValueChange={setFormType}>
    <SelectTrigger><SelectValue /></SelectTrigger>
    <SelectContent>
      <SelectItem value="admin">Admin</SelectItem>
      <SelectItem value="customer">Customer</SelectItem>
      <SelectItem value="partner">Partner</SelectItem>
    </SelectContent>
  </Select>
</div>
<div>
  <Label>Status</Label>
  <Select value={formStatus} onValueChange={setFormStatus}>
    <SelectTrigger><SelectValue /></SelectTrigger>
    <SelectContent>
      <SelectItem value="prospect">Prospect</SelectItem>
      <SelectItem value="active">Active</SelectItem>
      <SelectItem value="churned">Churned</SelectItem>
      <SelectItem value="pending">Pending</SelectItem>
      <SelectItem value="approved">Approved</SelectItem>
      <SelectItem value="inactive">Inactive</SelectItem>
    </SelectContent>
  </Select>
</div>
```

- [ ] **Step 6b: Update company new page**

In `src/app/(admin)/people/companies/new/page.tsx`:
- Replace `formActive` state (line 29) with `formType` (default `'customer'`) and `formStatus` (default `'active'`)
- Replace `is_active: formActive` in insert payload with `type: formType, status: formStatus`
- Replace the checkbox in JSX with the same two Select dropdowns as above

- [ ] **Step 6c: Fix company filters in user pages**

In `src/app/(admin)/people/users/new/page.tsx` (line 38) and `src/app/(admin)/people/users/[id]/edit/page.tsx` (line 40):
- Replace `.eq('is_active', true)` with `.in('status', ['active', 'approved'])`

- [ ] **Step 7: Verify build**

Run: `cd /Users/futuvara/Documents/Claude/Projects/IThealth.ai && npm run build`
Expected: Build succeeds with no type errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/types.ts src/lib/icon-map.ts src/app/\(admin\)/people/
git commit -m "feat: add company type/status types, sales types, update icon map, fix is_active refs"
```

---

## Task 6: Supabase Config Update

**Files:**
- Modify: `supabase/config.toml` (line 156)

- [ ] **Step 1: Add set-password redirect URL**

In `supabase/config.toml`:

Update `additional_redirect_urls` (line 156):
```toml
additional_redirect_urls = ["https://127.0.0.1:3000", "http://127.0.0.1:3000/set-password", "http://localhost:3000/set-password"]
```

Update `minimum_password_length` (line 175) from `6` to `8`:
```toml
minimum_password_length = 8
```

- [ ] **Step 2: Commit**

```bash
git add supabase/config.toml
git commit -m "feat: add set-password to Supabase redirect URLs"
```

---

## Task 7: Customer Guard Component

**Files:**
- Create: `src/components/customer-guard.tsx`

- [ ] **Step 1: Create CustomerGuard**

Follow the pattern from `src/components/auth-guard.tsx` but check for `customer` role:

```typescript
'use client'

import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function CustomerGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!profile || profile.role !== 'customer')) {
      router.replace('/login')
    }
  }, [loading, profile, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    )
  }

  if (!profile || profile.role !== 'customer') {
    return null
  }

  return <>{children}</>
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/customer-guard.tsx
git commit -m "feat: add CustomerGuard component"
```

---

## Task 8: Customer Sidebar Component

**Files:**
- Create: `src/components/customer-sidebar.tsx`

- [ ] **Step 1: Create CustomerSidebar**

Build a flat sidebar with IThealth white logo, IBM Carbon icons, flat `#1175E4` background. Reference the admin sidebar pattern at `src/components/sidebar.tsx` but render as an open sidebar (not icon-only).

```typescript
'use client'

import { useAuth } from '@/contexts/auth-context'
import { useMenu } from '@/contexts/menu-context'
import { useRouter, usePathname } from 'next/navigation'
import { iconMap } from '@/lib/icon-map'
import Image from 'next/image'

export function CustomerSidebar() {
  const { signOut } = useAuth()
  const { menuTree } = useMenu()
  const router = useRouter()
  const pathname = usePathname()

  const l1Items = menuTree.filter(item => item.level === 1)

  return (
    <aside className="flex h-screen w-60 flex-col bg-[#1175E4] text-white flex-shrink-0">
      {/* Logo */}
      <div className="border-b border-white/15 px-5 py-5">
        <Image
          src="/logos/ithealth-logo-white.svg"
          alt="IThealth"
          width={140}
          height={17}
          priority
        />
      </div>

      {/* Menu items */}
      <nav className="flex-1 space-y-0.5 p-2 overflow-y-auto">
        {l1Items.map((item) => {
          const isActive = item.route
            ? pathname === item.route || pathname.startsWith(item.route + '/')
            : false
          const Icon = item.icon ? iconMap[item.icon] : null

          return (
            <button
              key={item.id}
              onClick={() => router.push(item.route || '/')}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-[13px] transition-colors ${
                isActive
                  ? 'bg-white/[0.18] font-medium text-white'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              {Icon && <Icon size={18} />}
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-white/15 p-2 pb-4">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-[13px] text-white/50 hover:bg-white/10 hover:text-white/75 transition-colors"
        >
          {iconMap['logout'] && (() => { const LogoutIcon = iconMap['logout']; return <LogoutIcon size={18} /> })()}
          Logout
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/customer-sidebar.tsx
git commit -m "feat: add CustomerSidebar component with IThealth branding"
```

---

## Task 9: Customer Area Layout & Pages

**Files:**
- Create: `src/app/(customer)/layout.tsx`
- Create: `src/app/(customer)/home/page.tsx`
- Create: `src/app/(customer)/journey/page.tsx`
- Create: `src/app/(customer)/academy/page.tsx`
- Create: `src/app/(customer)/services/page.tsx`
- Create: `src/app/(customer)/team/page.tsx`
- Create: `src/app/(customer)/support/page.tsx`
- Create: `src/app/(customer)/settings/page.tsx`

- [ ] **Step 1: Create customer layout**

Follow the admin layout pattern at `src/app/(admin)/layout.tsx` but use CustomerGuard and CustomerSidebar (no MegaMenu):

```typescript
'use client'

import { AuthProvider } from '@/contexts/auth-context'
import { CustomerGuard } from '@/components/customer-guard'
import { MenuProvider } from '@/contexts/menu-context'
import { CustomerSidebar } from '@/components/customer-sidebar'

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CustomerGuard>
        <MenuProvider>
          <div className="flex h-screen">
            <CustomerSidebar />
            <main className="flex-1 overflow-y-auto bg-[#f8fafc] p-7">
              {children}
            </main>
          </div>
        </MenuProvider>
      </CustomerGuard>
    </AuthProvider>
  )
}
```

- [ ] **Step 2: Create placeholder pages**

Create 6 placeholder pages (journey, academy, services, team, support, settings) each following this pattern:

```typescript
'use client'

export default function JourneyPage() {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Journey</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">Your Modernisation Journey</h1>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        Coming soon
      </div>
    </div>
  )
}
```

Adjust the title and breadcrumb label for each page.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(customer\)/
git commit -m "feat: add customer area layout and placeholder pages"
```

---

## Task 10: Scoring Logic

**Files:**
- Create: `src/lib/scoring.ts`

- [ ] **Step 1: Create scoring module**

```typescript
import type { AssessmentQuestion } from '@/lib/types'

interface Answer {
  question_id: string
  selected_option: string
}

interface PhaseScore {
  phase_id: string
  score: number
  max_points: number
  earned_points: number
}

/**
 * Scoring logic:
 * - Each question has `points` (max points for that question) and `weight` (importance multiplier).
 * - Each option has a `value` field. For maturity assessments, options can have numeric values
 *   representing partial scores (e.g., "0", "1", "2", "3"). For binary assessments, the `correct`
 *   flag determines full points or zero.
 * - Per-phase score = (weighted earned / weighted max) * 100
 */
export function calculatePhaseScores(
  questions: AssessmentQuestion[],
  answers: Answer[]
): PhaseScore[] {
  const answerMap = new Map(answers.map(a => [a.question_id, a.selected_option]))
  const phaseGroups = new Map<string, { weightedEarned: number; weightedMax: number }>()

  for (const q of questions) {
    if (!q.phase_id) continue
    const group = phaseGroups.get(q.phase_id) || { weightedEarned: 0, weightedMax: 0 }
    const maxPoints = q.points || 1
    const weight = q.weight || 1

    group.weightedMax += maxPoints * weight

    const selectedValue = answerMap.get(q.id)
    if (selectedValue) {
      const selectedOption = q.options.find((o: { value: string }) => o.value === selectedValue)
      if (selectedOption) {
        // Try numeric value first (maturity-style), fall back to correct flag (quiz-style)
        const numericValue = Number(selectedValue)
        if (!isNaN(numericValue) && numericValue >= 0) {
          // Maturity scoring: option value is a score (0 to maxPoints)
          group.weightedEarned += Math.min(numericValue, maxPoints) * weight
        } else if (selectedOption.correct) {
          // Binary scoring: correct = full points
          group.weightedEarned += maxPoints * weight
        }
      }
    }

    phaseGroups.set(q.phase_id, group)
  }

  return Array.from(phaseGroups.entries()).map(([phase_id, { weightedEarned, weightedMax }]) => ({
    phase_id,
    score: weightedMax > 0 ? Math.round((weightedEarned / weightedMax) * 100) : 0,
    max_points: weightedMax,
    earned_points: weightedEarned,
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

- [ ] **Step 2: Commit**

```bash
git add src/lib/scoring.ts
git commit -m "feat: add assessment scoring logic"
```

---

## Task 11: Customer Home Page

**Files:**
- Create: `src/app/(customer)/home/page.tsx`

- [ ] **Step 1: Build the home page with donut chart + phase breakdown**

```typescript
'use client'

import { useAuth } from '@/contexts/auth-context'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { getMaturityLabel } from '@/lib/scoring'
import type { AssessmentAttempt, Phase } from '@/lib/types'

const PHASE_COLORS: Record<string, string> = {
  'Operate': '#1175E4',
  'Secure': '#FF246B',
  'Streamline': '#133258',
  'Accelerate': '#EDB600',
}

export default function CustomerHomePage() {
  const { profile } = useAuth()
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null)
  const [phases, setPhases] = useState<Phase[]>([])
  const [loading, setLoading] = useState(true)
  // uses singleton import from @/lib/supabase-client

  useEffect(() => {
    async function load() {
      if (!profile) return

      // Fetch latest assessment attempt for this user
      const { data: attemptData } = await supabase
        .from('assessment_attempts')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Fetch phases for labels
      const { data: phaseData } = await supabase
        .from('phases')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      setAttempt(attemptData as AssessmentAttempt | null)
      setPhases((phaseData ?? []) as Phase[])
      setLoading(false)
    }
    load()
  }, [profile])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    )
  }

  const score = attempt?.score ?? 0
  const phaseScores = (attempt?.phase_scores ?? {}) as Record<string, number>
  const maturityLabel = getMaturityLabel(score)
  const circumference = 2 * Math.PI * 60
  const strokeDasharray = `${(score / 100) * circumference} ${circumference}`

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Home</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">
        Welcome back, {profile?.display_name?.split(' ')[0] ?? 'there'}
      </h1>
      {profile?.company && (
        <p className="mt-0.5 text-sm text-slate-500">{profile.company.name}</p>
      )}

      {/* Score card */}
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-7">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Modernisation Maturity</p>

        <div className="mt-5 flex items-center gap-10">
          {/* Donut chart */}
          <div className="relative flex-shrink-0">
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="60" fill="none" stroke="#e2e8f0" strokeWidth="20" />
              <circle
                cx="80" cy="80" r="60" fill="none" stroke="#1175E4" strokeWidth="20"
                strokeDasharray={strokeDasharray}
                strokeLinecap="round"
                transform="rotate(-90 80 80)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-slate-900">{score}</span>
              <span className="text-xs text-slate-400">out of 100</span>
            </div>
          </div>

          {/* Phase breakdown */}
          <div className="flex flex-1 flex-col gap-3.5">
            <span className={`inline-flex self-start rounded-full px-3 py-1 text-xs font-semibold ${
              score <= 25 ? 'bg-red-100 text-red-700' :
              score <= 50 ? 'bg-amber-100 text-amber-700' :
              score <= 75 ? 'bg-blue-100 text-blue-700' :
              'bg-green-100 text-green-700'
            }`}>
              {maturityLabel}
            </span>

            {phases.map((phase) => {
              const phaseScore = phaseScores[phase.id] ?? 0
              const color = PHASE_COLORS[phase.name] ?? '#94a3b8'
              return (
                <div key={phase.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
                      <span className="font-medium text-slate-700">{phase.name}</span>
                    </span>
                    <span className="font-semibold text-slate-500">{phaseScore}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full" style={{ width: `${phaseScore}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs text-slate-400">
            {attempt ? `Assessment taken ${new Date(attempt.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'No assessment taken yet'}
          </span>
          <span className="cursor-pointer text-xs font-medium text-[#1175E4]">View full report →</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(customer\)/home/page.tsx
git commit -m "feat: add customer home page with donut chart and phase breakdown"
```

---

## Task 12: Set Password Page

**Files:**
- Create: `src/app/(auth)/set-password/page.tsx`

- [ ] **Step 1: Create set-password page**

Follow the pattern from `src/app/(auth)/reset-password/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import Image from 'next/image'

export default function SetPasswordPage() {
  const { session, profile, updatePassword, loading: authLoading } = useAuth()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  // Still waiting for Supabase to exchange the invite token via onAuthStateChange
  if (authLoading || (!session && !authLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="mt-4 text-sm text-slate-500">Processing your invite...</p>
        </div>
      </div>
    )
  }

  // Session exists but no profile → partial rollback edge case
  if (session && profile === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription>
              Please contact support or try the assessment again.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    setSaving(true)
    const { error } = await updatePassword(password)
    if (error) {
      toast.error(error.message)
      setSaving(false)
      return
    }
    toast.success('Password set successfully. Please log in.')
    router.replace('/login')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Image src="/logos/ithealth-logo.svg" alt="IThealth" width={160} height={20} />
          </div>
          <CardTitle>Set Your Password</CardTitle>
          <CardDescription>Create a password to access your modernisation dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? 'Setting password...' : 'Set Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(auth\)/set-password/
git commit -m "feat: add set-password page for invite flow"
```

---

## Task 13: Login Page — Role-Based Routing

**Files:**
- Modify: `src/app/(auth)/login/page.tsx` (line 29)

- [ ] **Step 1: Update login redirect to be role-based**

In `src/app/(auth)/login/page.tsx`, replace the hardcoded redirect on line 29 (`router.replace('/dashboard')`) with role-based routing. After the successful `signIn()` call, fetch the profile and route accordingly:

```typescript
const { error } = await signIn(email, password)
if (error) {
  setError(error.message)
  setLoading(false)
  return
}

// Fetch profile to determine redirect
const { data: { user } } = await supabase.auth.getUser()
if (user) {
  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileData?.role === 'customer') {
    router.replace('/home')
  } else {
    router.replace('/dashboard')
  }
} else {
  router.replace('/dashboard')
}
```

Import `createClient` from `@/lib/supabase-client` at the top, and create the client instance in the component.

- [ ] **Step 2: Verify login works for both roles**

Manual test: Log in as admin → should go to `/dashboard`. Log in as customer → should go to `/home`.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/login/page.tsx
git commit -m "feat: role-based login redirect (admin→dashboard, customer→home)"
```

---

## Task 14: Onboarding API Route

**Files:**
- Create: `src/app/api/onboarding/route.ts`

- [ ] **Step 1: Create the onboarding API route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { calculatePhaseScores, calculateOverallScore } from '@/lib/scoring'
import type { AssessmentQuestion } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, company_name, email, assessment_id, answers } = body

    if (!name || !company_name || !email || !assessment_id || !answers) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Rate limiting: check for recent submissions from this email
    const { data: recentAttempt } = await supabaseAdmin
      .from('profiles')
      .select('created_at')
      .eq('email', email)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // 1 hour window
      .maybeSingle()

    if (recentAttempt) {
      return NextResponse.json(
        { error: 'An account with this email was recently created. Please check your email for the invite link.' },
        { status: 429 }
      )
    }

    // 1. Check for existing user
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please log in.' },
        { status: 409 }
      )
    }

    // 2. Create company
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({ name: company_name, type: 'customer', status: 'prospect' })
      .select()
      .single()

    if (companyError) {
      return NextResponse.json({ error: companyError.message }, { status: 400 })
    }

    // 3. Create auth user + send invite
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { company_id: company.id, display_name: name },
      redirectTo: `${origin}/set-password`,
    })

    if (inviteError) {
      // Cleanup company
      await supabaseAdmin.from('companies').delete().eq('id', company.id)
      return NextResponse.json({ error: inviteError.message }, { status: 400 })
    }

    const userId = inviteData.user.id

    // 4. Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email,
        display_name: name,
        company_id: company.id,
        role: 'customer',
      })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      await supabaseAdmin.from('companies').delete().eq('id', company.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    // 5. Calculate scores and save assessment attempt
    const { data: questions } = await supabaseAdmin
      .from('assessment_questions')
      .select('*')
      .eq('assessment_id', assessment_id)

    const phaseScores = calculatePhaseScores(
      (questions ?? []) as AssessmentQuestion[],
      answers
    )
    const overallScore = calculateOverallScore(phaseScores)
    const phaseScoreMap: Record<string, number> = {}
    phaseScores.forEach(ps => { phaseScoreMap[ps.phase_id] = ps.score })

    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('assessment_attempts')
      .insert({
        assessment_id,
        user_id: userId,
        score: overallScore,
        passed: overallScore >= 50,
        answers,
        phase_scores: phaseScoreMap,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (attemptError) {
      await supabaseAdmin.from('profiles').delete().eq('id', userId)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      await supabaseAdmin.from('companies').delete().eq('id', company.id)
      return NextResponse.json({ error: attemptError.message }, { status: 400 })
    }

    // 6. Create sales lead in first active stage
    const { data: firstStage } = await supabaseAdmin
      .from('sales_stages')
      .select('id')
      .eq('is_active', true)
      .order('sort_order')
      .limit(1)
      .single()

    if (firstStage) {
      await supabaseAdmin.from('sales_leads').insert({
        company_id: company.id,
        stage_id: firstStage.id,
        assessment_attempt_id: attempt.id,
        contact_name: name,
        contact_email: email,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Onboarding error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/onboarding/route.ts
git commit -m "feat: add onboarding API route with account creation and scoring"
```

---

## Task 15: Public Assessment Wizard

**Files:**
- Create: `src/app/(onboarding)/layout.tsx`
- Create: `src/app/(onboarding)/get-started/page.tsx`

- [ ] **Step 1: Create onboarding layout**

Minimal layout — no header, no footer, but includes Toaster for toast notifications:

```typescript
import { Toaster } from '@/components/ui/sonner'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}
```

- [ ] **Step 2: Create the assessment wizard page**

This is the largest component. It needs to:
- Fetch the onboarding assessment and its questions (grouped by phase)
- Show one question per screen with phase header
- Track answers in state
- Show progress (current phase + overall)
- After last question, show capture details form
- Submit to `/api/onboarding`
- Show "check your email" confirmation

Key structure:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import Image from 'next/image'
import Link from 'next/link'
import type { Assessment, AssessmentQuestion, Phase } from '@/lib/types'

type WizardStep = 'loading' | 'welcome' | 'assessment' | 'details' | 'confirmation' | 'error'

interface Answer {
  question_id: string
  selected_option: string
}

const PHASE_COLORS: Record<string, string> = {
  'Operate': '#1175E4',
  'Secure': '#FF246B',
  'Streamline': '#133258',
  'Accelerate': '#EDB600',
}

export default function GetStartedPage() {
  // uses singleton import from @/lib/supabase-client
  const [step, setStep] = useState<WizardStep>('loading')
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([])
  const [phases, setPhases] = useState<Phase[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  // Details form
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      // Fetch onboarding assessment
      const { data: assessmentData, error: aErr } = await supabase
        .from('assessments')
        .select('*')
        .eq('is_onboarding', true)
        .maybeSingle()

      if (aErr || !assessmentData) {
        setStep('error')
        return
      }

      // Fetch questions ordered by phase then sort_order
      const { data: questionData } = await supabase
        .from('assessment_questions')
        .select('*')
        .eq('assessment_id', assessmentData.id)
        .order('sort_order')

      // Fetch phases
      const { data: phaseData } = await supabase
        .from('phases')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      setAssessment(assessmentData as Assessment)
      setQuestions((questionData ?? []) as AssessmentQuestion[])
      setPhases((phaseData ?? []) as Phase[])
      setStep('welcome')
    }
    load()
  }, [])

  // Group questions by phase for progress tracking
  const questionsByPhase = new Map<string, AssessmentQuestion[]>()
  for (const q of questions) {
    const key = q.phase_id || 'unassigned'
    const group = questionsByPhase.get(key) || []
    group.push(q)
    questionsByPhase.set(key, group)
  }

  const currentQuestion = questions[currentIndex]
  const currentPhase = phases.find(p => p.id === currentQuestion?.phase_id)
  const progress = questions.length > 0 ? ((currentIndex) / questions.length) * 100 : 0

  function handleAnswer() {
    if (!selectedOption || !currentQuestion) return

    const newAnswers = [...answers.filter(a => a.question_id !== currentQuestion.id), {
      question_id: currentQuestion.id,
      selected_option: selectedOption,
    }]
    setAnswers(newAnswers)
    setSelectedOption(null)

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setStep('details')
    }
  }

  async function handleSubmitDetails(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          company_name: companyName,
          email,
          assessment_id: assessment!.id,
          answers,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Something went wrong')
        setSubmitting(false)
        return
      }

      setStep('confirmation')
    } catch {
      toast.error('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  // Render based on step
  if (step === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-[#1175E4]" />
      </div>
    )
  }

  if (step === 'welcome') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-8">
        <div className="max-w-lg text-center">
          <Image src="/logos/ithealth-logo.svg" alt="IThealth" width={180} height={22} className="mx-auto" />
          <h1 className="mt-8 text-3xl font-bold text-slate-900">
            {assessment?.welcome_heading || 'Discover Your IT Modernisation Maturity'}
          </h1>
          <p className="mt-3 text-slate-500">
            {assessment?.welcome_description || 'Answer a few questions across four phases of modernisation to see where your organisation stands.'}
          </p>
          <Button onClick={() => setStep('assessment')} className="mt-8 bg-[#1175E4] hover:bg-[#0d5fc2] px-8">
            Start Assessment
          </Button>
          <p className="mt-4 text-xs text-slate-400">
            Already have an account? <Link href="/login" className="text-[#1175E4] hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white gap-4">
        <Image src="/logos/ithealth-logo.svg" alt="IThealth" width={180} height={22} />
        <p className="text-slate-500">No assessment is currently available. Please check back later.</p>
      </div>
    )
  }

  if (step === 'confirmation') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white gap-6 px-8">
        <Image src="/logos/ithealth-logo.svg" alt="IThealth" width={180} height={22} />
        <h1 className="text-3xl font-bold text-slate-900">Check Your Email</h1>
        <p className="max-w-md text-center text-slate-500">
          We&apos;ve sent an invite link to <strong>{email}</strong>. Click the link to set your password and access your Modernisation dashboard.
        </p>
        <Link href="/login" className="text-sm font-medium text-[#1175E4] hover:underline">
          Already set your password? Log in →
        </Link>
      </div>
    )
  }

  if (step === 'details') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-8">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <Image src="/logos/ithealth-logo.svg" alt="IThealth" width={180} height={22} className="mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 text-center">
            {assessment?.completion_heading || 'Your Assessment is Complete!'}
          </h1>
          <p className="mt-2 text-center text-slate-500">
            {assessment?.completion_description || 'To receive your Modernisation score and proceed with your modernisation journey, please enter your details below.'}
          </p>
          <form onSubmit={handleSubmitDetails} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full bg-[#1175E4] hover:bg-[#0d5fc2]" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Get My Score'}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-slate-400">
            Already have an account? <Link href="/login" className="text-[#1175E4] hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    )
  }

  // Assessment questions
  const phaseColor = currentPhase ? (PHASE_COLORS[currentPhase.name] ?? '#1175E4') : '#1175E4'

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Progress bar */}
      <div className="h-1 bg-slate-100">
        <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, background: phaseColor }} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4">
        <Image src="/logos/ithealth-logo.svg" alt="IThealth" width={140} height={17} />
        <span className="text-xs text-slate-400">
          {currentIndex + 1} of {questions.length}
        </span>
      </div>

      {/* Phase header */}
      {currentPhase && (
        <div className="px-8 pt-4">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded" style={{ background: phaseColor }} />
            <span className="text-sm font-semibold" style={{ color: phaseColor }}>{currentPhase.name}</span>
          </div>
        </div>
      )}

      {/* Question */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 pb-16">
        <div className="w-full max-w-2xl">
          <h2 className="text-xl font-bold text-slate-900">{currentQuestion?.question_text}</h2>

          <div className="mt-6 space-y-3">
            {(currentQuestion?.options ?? []).map((option: { value: string; label: string }, idx: number) => (
              <button
                key={idx}
                onClick={() => setSelectedOption(option.value)}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                  selectedOption === option.value
                    ? 'border-[#1175E4] bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-sm font-medium text-slate-700">{option.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-8 flex justify-end">
            <Button
              onClick={handleAnswer}
              disabled={!selectedOption}
              className="bg-[#1175E4] hover:bg-[#0d5fc2] px-8"
            >
              {currentIndex < questions.length - 1 ? 'Next' : 'Complete'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(onboarding\)/
git commit -m "feat: add public assessment wizard at /get-started"
```

---

## Task 16: Public Website CTA Links

**Files:**
- Modify: `src/components/public-header.tsx` (lines 47–62 nav section)
- Modify: `src/app/(public)/page.tsx` (hero section)

- [ ] **Step 1: Add "Get Started" to public header**

In `src/components/public-header.tsx`, add a "Get Started" button in the desktop nav (after the Resources dropdown, before existing CTA buttons):

```typescript
<Link
  href="/get-started"
  className="rounded-lg bg-[#1175E4] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d5fc2] transition-colors"
>
  Get Started
</Link>
```

- [ ] **Step 2: Add CTA to homepage hero**

In `src/app/(public)/page.tsx`, find the AnimatedHero section and add a "Get Started" CTA button linking to `/get-started`. Also add a secondary CTA near the JourneySection.

- [ ] **Step 3: Commit**

```bash
git add src/components/public-header.tsx src/app/\(public\)/page.tsx
git commit -m "feat: add Get Started CTAs to public header and homepage"
```

---

## Task 17: Admin — Assessment Editor Onboarding Toggle

**Files:**
- Modify: `src/app/(admin)/academy/assessments/new/page.tsx` (lines 65–75 insert payload)
- Modify: `src/app/(admin)/academy/assessments/[id]/edit/page.tsx` (lines 141–152 update payload)

- [ ] **Step 1: Add onboarding toggle to new assessment page**

In `src/app/(admin)/academy/assessments/new/page.tsx`:

Add state:
```typescript
const [formOnboarding, setFormOnboarding] = useState(false)
const [formWelcomeHeading, setFormWelcomeHeading] = useState('')
const [formWelcomeDescription, setFormWelcomeDescription] = useState('')
const [formCompletionHeading, setFormCompletionHeading] = useState('')
const [formCompletionDescription, setFormCompletionDescription] = useState('')
```

Add to the insert payload (lines 65–75):
```typescript
is_onboarding: formOnboarding,
welcome_heading: formOnboarding ? formWelcomeHeading.trim() || null : null,
welcome_description: formOnboarding ? formWelcomeDescription.trim() || null : null,
completion_heading: formOnboarding ? formCompletionHeading.trim() || null : null,
completion_description: formOnboarding ? formCompletionDescription.trim() || null : null,
```

Add toggle + conditional fields in the form JSX (after the scope select):
```typescript
<div className="flex items-center gap-2">
  <input
    type="checkbox"
    id="onboarding"
    checked={formOnboarding}
    onChange={(e) => setFormOnboarding(e.target.checked)}
    className="rounded"
  />
  <Label htmlFor="onboarding">Use as Onboarding Assessment</Label>
</div>

{formOnboarding && (
  <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
    <p className="text-xs font-medium text-blue-700">Onboarding Screen Text</p>
    <div>
      <Label>Welcome Heading</Label>
      <Input value={formWelcomeHeading} onChange={e => setFormWelcomeHeading(e.target.value)} placeholder="e.g., Discover Your IT Maturity" />
    </div>
    <div>
      <Label>Welcome Description</Label>
      <Input value={formWelcomeDescription} onChange={e => setFormWelcomeDescription(e.target.value)} placeholder="e.g., Answer a few questions..." />
    </div>
    <div>
      <Label>Completion Heading</Label>
      <Input value={formCompletionHeading} onChange={e => setFormCompletionHeading(e.target.value)} placeholder="e.g., Your Assessment is Complete!" />
    </div>
    <div>
      <Label>Completion Description</Label>
      <Input value={formCompletionDescription} onChange={e => setFormCompletionDescription(e.target.value)} placeholder="e.g., Enter your details to see your score" />
    </div>
  </div>
)}
```

- [ ] **Step 2: Add same fields to edit page**

Apply the same changes to `src/app/(admin)/academy/assessments/[id]/edit/page.tsx`:
- Add state variables, populate them from the fetched assessment data
- Add to the update payload
- Add the toggle + fields in the form JSX

- [ ] **Step 3: Commit**

```bash
git add src/app/\(admin\)/academy/assessments/
git commit -m "feat: add onboarding toggle and text fields to assessment editor"
```

---

## Task 18: Admin — Sales Kanban Board

**Files:**
- Create: `src/app/(admin)/sales/page.tsx`

- [ ] **Step 1: Create the sales kanban page**

Build a kanban board that:
- Fetches `sales_stages` (ordered by sort_order) and `sales_leads` (with company and assessment_attempt joins)
- Renders columns with lead cards
- Supports drag-and-drop between columns (use HTML5 drag events — no library needed for MVP)
- Has a settings button that opens a dialog for managing stages (add/edit/reorder/delete)
- Lead cards show: company name, contact name, email, score badge, date

Key structure:

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { SalesStage, SalesLead, Company, AssessmentAttempt } from '@/lib/types'

interface LeadWithRelations extends SalesLead {
  company: Company
  assessment_attempt: AssessmentAttempt | null
}

export default function SalesPage() {
  // uses singleton import from @/lib/supabase-client
  const [stages, setStages] = useState<SalesStage[]>([])
  const [leads, setLeads] = useState<LeadWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null)

  // Stage management state
  const [stageDialogOpen, setStageDialogOpen] = useState(false)
  const [newStageName, setNewStageName] = useState('')
  const [newStageColor, setNewStageColor] = useState('#1175E4')

  const fetchData = useCallback(async () => {
    const [stageRes, leadRes] = await Promise.all([
      supabase.from('sales_stages').select('*').order('sort_order'),
      supabase.from('sales_leads').select('*, company:companies(*), assessment_attempt:assessment_attempts(*)').order('created_at', { ascending: false }),
    ])
    setStages((stageRes.data ?? []) as SalesStage[])
    setLeads((leadRes.data ?? []) as LeadWithRelations[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleDrop(stageId: string) {
    if (!draggedLeadId) return
    const { error } = await supabase
      .from('sales_leads')
      .update({ stage_id: stageId, updated_at: new Date().toISOString() })
      .eq('id', draggedLeadId)
    if (error) {
      toast.error('Failed to move lead')
    } else {
      setLeads(prev => prev.map(l => l.id === draggedLeadId ? { ...l, stage_id: stageId } : l))
    }
    setDraggedLeadId(null)
  }

  async function addStage() {
    if (!newStageName.trim()) return
    const maxOrder = stages.reduce((max, s) => Math.max(max, s.sort_order), 0)
    const { error } = await supabase.from('sales_stages').insert({
      name: newStageName.trim(),
      sort_order: maxOrder + 1,
      color: newStageColor,
    })
    if (error) { toast.error('Failed to add stage'); return }
    toast.success('Stage added')
    setNewStageName('')
    fetchData()
  }

  async function deleteStage(id: string) {
    const leadsInStage = leads.filter(l => l.stage_id === id)
    if (leadsInStage.length > 0) {
      toast.error('Cannot delete a stage that has leads. Move them first.')
      return
    }
    const { error } = await supabase.from('sales_stages').delete().eq('id', id)
    if (error) { toast.error('Failed to delete stage'); return }
    toast.success('Stage deleted')
    fetchData()
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" /></div>
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Sales Pipeline</h1>
        <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">Manage Stages</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Manage Pipeline Stages</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {stages.map(s => (
                <div key={s.id} className="flex items-center justify-between rounded border p-2">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded" style={{ background: s.color }} />
                    <span className="text-sm font-medium">{s.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteStage(s.id)}>Delete</Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input value={newStageName} onChange={e => setNewStageName(e.target.value)} placeholder="Stage name" className="flex-1" />
                <Input type="color" value={newStageColor} onChange={e => setNewStageColor(e.target.value)} className="w-12 p-1" />
                <Button size="sm" onClick={addStage}>Add</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
        {stages.filter(s => s.is_active).map(stage => {
          const stageLeads = leads.filter(l => l.stage_id === stage.id)
          return (
            <div
              key={stage.id}
              className="flex w-72 flex-shrink-0 flex-col rounded-xl bg-slate-100"
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(stage.id)}
            >
              <div className="flex items-center gap-2 p-3 pb-2">
                <span className="h-2.5 w-2.5 rounded" style={{ background: stage.color }} />
                <span className="text-sm font-semibold text-slate-700">{stage.name}</span>
                <Badge variant="secondary" className="ml-auto text-xs">{stageLeads.length}</Badge>
              </div>
              <div className="flex-1 space-y-2 p-2 overflow-y-auto">
                {stageLeads.map(lead => (
                  <Card
                    key={lead.id}
                    draggable
                    onDragStart={() => setDraggedLeadId(lead.id)}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <CardContent className="p-3">
                      <p className="text-sm font-semibold text-slate-900">{lead.company?.name ?? lead.contact_name}</p>
                      <p className="text-xs text-slate-500">{lead.contact_name} · {lead.contact_email}</p>
                      <div className="mt-2 flex items-center justify-between">
                        {lead.assessment_attempt && (
                          <Badge variant="outline" className="text-xs">{lead.assessment_attempt.score}%</Badge>
                        )}
                        <span className="text-xs text-slate-400">
                          {new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(admin\)/sales/page.tsx
git commit -m "feat: add sales kanban board with drag-and-drop and stage management"
```

---

## Task 19: Final Verification

- [ ] **Step 1: Reset database and verify all migrations**

Run: `cd /Users/futuvara/Documents/Claude/Projects/IThealth.ai && npx supabase db reset`
Expected: All migrations applied successfully.

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Manual smoke test**

1. Start Supabase: `npx supabase start`
2. Start dev server: `npm run dev`
3. Create an onboarding assessment in admin at `/academy/assessments/new` (scope: journey, toggle onboarding on, add questions with phase assignments)
4. Visit `/get-started` → complete assessment → enter details → check Inbucket for invite email
5. Click invite link → set password at `/set-password`
6. Log in → verify redirect to `/home` → see donut chart + phase scores
7. Log in as admin → check `/sales` → see the lead on the kanban board
8. Check `/people/companies` → see new company with Customer type and Prospect status

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete customer onboarding flow implementation"
```
