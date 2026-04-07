# Team Skills Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a team skills dashboard in the customer portal with charts showing team skill levels, bulk member invitations, skill trend tracking, and individual member views with anonymized team averages.

**Architecture:** Hybrid data approach — live composite scores calculated server-side via API routes (reusing `scoring.ts`), event-driven `skill_snapshots` for trend tracking. Single page with tabs (Members/Trends/Invitations). New `is_company_admin` boolean on `profiles` distinguishes company admins from regular members.

**Tech Stack:** Next.js App Router, TypeScript, Supabase (Postgres + GoTrue auth), React client components, inline SVG charts, shadcn/ui, Tailwind CSS, Carbon icons, Poppins font.

**Spec:** `docs/superpowers/specs/2026-04-07-team-skills-dashboard-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `supabase/migrations/20260407500000_team_skills.sql` | Migration: `is_company_admin` on profiles, `team_invitations` table, `skill_snapshots` table, RLS policies |
| `src/lib/composite-scoring.ts` | `calculateCompositeScore()` — best-across-attempts + course bonus logic, composes existing scoring functions |
| `src/app/api/team/invite/route.ts` | POST: bulk invite — validate emails, create invitations, send Supabase auth invite emails |
| `src/app/api/team/accept-invite/route.ts` | POST: accept invite — validate token, set company_id on profile, mark invitation accepted |
| `src/app/api/team/dashboard/route.ts` | GET: team dashboard data — all members' live scores, team averages, stats |
| `src/app/api/team/trends/route.ts` | GET: trend data — skill_snapshots grouped by week for date range |
| `src/app/api/team/my-profile/route.ts` | GET: member's own composite score + anonymized team averages + recommended courses |
| `src/app/api/team/snapshot/route.ts` | POST: write skill_snapshot row (service-role only) |
| `src/components/team/stats-row.tsx` | 4 summary stat cards (members, avg maturity, 30d trend, courses completed) |
| `src/components/team/phase-radar.tsx` | SVG radar/spider chart for phase averages |
| `src/components/team/service-bars.tsx` | Horizontal bar chart for service-level scores |
| `src/components/team/members-tab.tsx` | Heatmap grid: members × services with color coding |
| `src/components/team/trends-tab.tsx` | SVG line chart with 30/60/90d period selector |
| `src/components/team/invitations-tab.tsx` | Invitation tracking table with resend/revoke actions |
| `src/components/team/invite-dialog.tsx` | Bulk invite modal with CSV upload + email paste |
| `src/components/team/member-score-card.tsx` | Personal score card with team average markers |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/types.ts:14-25` | Add `is_company_admin` to `Profile` interface; add `TeamInvitation`, `SkillSnapshot` types |
| `src/app/(auth)/set-password/page.tsx:27-34` | After password set, check for `invite` URL param and call accept-invite API |
| `src/app/(customer)/portal/team/page.tsx` | Replace stub with full admin dashboard |
| `src/app/(customer)/portal/home/page.tsx:113-247` | Enhance ScoreCard to show team average markers when user has company members |

---

## Tasks

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260407500000_team_skills.sql`

- [ ] **Step 1: Write migration SQL**

```sql
-- 1. Add is_company_admin to profiles
ALTER TABLE profiles ADD COLUMN is_company_admin boolean DEFAULT false;

-- 2. Create team_invitations table
CREATE TABLE team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  token uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  message text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate pending invites to same email in same company
CREATE UNIQUE INDEX idx_team_invitations_pending ON team_invitations (company_id, email) WHERE status = 'pending';
-- Fast token lookup during signup
CREATE INDEX idx_team_invitations_token ON team_invitations (token);

-- Auto-update updated_at
CREATE TRIGGER set_team_invitations_updated_at
  BEFORE UPDATE ON team_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can manage their invitations"
  ON team_invitations FOR ALL
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p
      WHERE p.id = auth.uid() AND p.is_company_admin = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT p.company_id FROM profiles p
      WHERE p.id = auth.uid() AND p.is_company_admin = true
    )
  );

-- 3. Create skill_snapshots table
CREATE TABLE skill_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  overall_score integer NOT NULL DEFAULT 0,
  phase_scores jsonb NOT NULL DEFAULT '{}',
  service_scores jsonb NOT NULL DEFAULT '{}',
  source text NOT NULL CHECK (source IN ('onboarding', 'assessment', 'course_completion')),
  source_id uuid,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Team trend queries
CREATE INDEX idx_skill_snapshots_company ON skill_snapshots (company_id, snapshot_at);
-- Individual trend queries
CREATE INDEX idx_skill_snapshots_user ON skill_snapshots (user_id, snapshot_at);

-- RLS
ALTER TABLE skill_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own snapshots"
  ON skill_snapshots FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Company admins can read team snapshots"
  ON skill_snapshots FOR SELECT
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p
      WHERE p.id = auth.uid() AND p.is_company_admin = true
    )
  );

-- Service role can insert snapshots (for server-side snapshot writes)
CREATE POLICY "Service role can insert snapshots"
  ON skill_snapshots FOR INSERT
  WITH CHECK (true);
```

- [ ] **Step 2: Apply migration**

Run: `npx supabase db push`
Expected: Migration applies successfully, no errors.

- [ ] **Step 3: Verify tables exist**

Run: `npx supabase db reset` (to test full migration chain)
Expected: All migrations apply cleanly. Tables `team_invitations` and `skill_snapshots` exist. `profiles.is_company_admin` column exists.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260407500000_team_skills.sql
git commit -m "feat(db): add team_invitations, skill_snapshots tables and is_company_admin column"
```

---

### Task 2: TypeScript Types

**Files:**
- Modify: `src/lib/types.ts:14-25`

- [ ] **Step 1: Add `is_company_admin` to Profile interface**

In `src/lib/types.ts`, add `is_company_admin: boolean` to the `Profile` interface after `is_active`:

```typescript
// Add after line 21 (is_active: boolean)
is_company_admin: boolean
```

- [ ] **Step 2: Add new type interfaces at end of file**

Append to `src/lib/types.ts` (after the existing `JourneyTimeline` interface near line 698):

```typescript
// ---------------------------------------------------------------------------
// Team Skills Dashboard
// ---------------------------------------------------------------------------
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked'

export interface TeamInvitation {
  id: string
  company_id: string
  invited_by: string
  email: string
  display_name: string | null
  token: string
  status: InvitationStatus
  message: string | null
  expires_at: string
  accepted_at: string | null
  created_at: string
  updated_at: string
}

export interface SkillSnapshot {
  id: string
  user_id: string
  company_id: string
  overall_score: number
  phase_scores: Record<string, number>
  service_scores: Record<string, { earned: number; max: number; pct: number }>
  source: 'onboarding' | 'assessment' | 'course_completion'
  source_id: string | null
  snapshot_at: string
  created_at: string
}

export interface CompositeScore {
  overall: number
  phases: Record<string, number>
  services: Record<string, { earned: number; max: number; pct: number }>
}

export interface TeamDashboardData {
  members: {
    id: string
    display_name: string
    email: string
    is_company_admin: boolean
    scores: CompositeScore | null
    coursesCompleted: number
  }[]
  teamAverages: CompositeScore
  stats: {
    memberCount: number
    avgMaturity: number
    trend30d: number
    coursesCompleted: number
  }
}

export interface TeamTrendPoint {
  week: string
  overall: number
  phases: Record<string, number>
}

export interface MemberProfile {
  myScores: CompositeScore
  teamAverages: CompositeScore
  recommendedCourses: {
    id: string
    name: string
    phase_name: string
    phase_color: string
    service_name: string
    service_score: number
  }[]
}
```

- [ ] **Step 3: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): add team dashboard types — TeamInvitation, SkillSnapshot, CompositeScore"
```

---

### Task 3: Profile Type Update & Auth Context

**Files:**
- Modify: `src/contexts/auth-context.tsx` (or wherever `useAuth` is defined)

- [ ] **Step 1: Ensure `is_company_admin` is fetched in auth context**

Find the auth context file and ensure the profile query includes `is_company_admin`. The profile select query should include all columns or explicitly include `is_company_admin`.

Check the existing profile fetch query. If it uses `select('*')` it will automatically include the new column. If it uses specific columns, add `is_company_admin` to the select list.

- [ ] **Step 2: Verify auth context includes the new field**

Run: `npm run dev`
In browser devtools, verify `profile.is_company_admin` is present on the auth context.

- [ ] **Step 3: Commit (if changes needed)**

```bash
git add src/contexts/auth-context.tsx
git commit -m "feat(auth): include is_company_admin in profile fetch"
```

---

### Task 4: Composite Scoring Logic

**Files:**
- Create: `src/lib/composite-scoring.ts`

- [ ] **Step 1: Create composite scoring module**

```typescript
import { supabaseAdmin } from '@/lib/supabase-server'
import { calculatePhaseScores, calculateOverallScore } from '@/lib/scoring'
import type { ServiceScore } from '@/lib/scoring'
import type { CompositeScore } from '@/lib/types'

/**
 * Calculate a user's composite skill score from all sources:
 * 1. Best assessment score per service (across all attempts)
 * 2. Course completion bonus (+5 per completed linked course, capped at 100)
 * 3. Phase scores from weighted service scores
 * 4. Overall from phase averages
 */
export async function calculateCompositeScore(userId: string): Promise<CompositeScore | null> {
  // Fetch all assessment attempts for this user
  const { data: attempts } = await supabaseAdmin
    .from('assessment_attempts')
    .select('service_scores')
    .eq('user_id', userId)
    .not('service_scores', 'is', null)

  if (!attempts || attempts.length === 0) {
    return null
  }

  // Build best score per service across all attempts
  const bestByService = new Map<string, { earned: number; max: number; pct: number; phase_id?: string }>()

  for (const attempt of attempts) {
    const scores = attempt.service_scores as Record<string, { earned: number; max: number; pct: number; phase_id?: string }>
    if (!scores) continue
    for (const [serviceId, score] of Object.entries(scores)) {
      const existing = bestByService.get(serviceId)
      if (!existing || score.pct > existing.pct) {
        bestByService.set(serviceId, score)
      }
    }
  }

  // Fetch completed courses linked to services
  const { data: completedEnrollments } = await supabaseAdmin
    .from('user_course_enrollments')
    .select('course_id')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)

  if (completedEnrollments && completedEnrollments.length > 0) {
    const completedCourseIds = completedEnrollments.map(e => e.course_id)

    // Find which services these courses link to
    const { data: academyLinks } = await supabaseAdmin
      .from('service_academy_links')
      .select('service_id, course_id')
      .in('course_id', completedCourseIds)

    if (academyLinks) {
      // Count completions per service
      const bonusPerService = new Map<string, number>()
      for (const link of academyLinks) {
        bonusPerService.set(link.service_id, (bonusPerService.get(link.service_id) || 0) + 1)
      }

      // Apply bonuses
      for (const [serviceId, count] of bonusPerService) {
        const existing = bestByService.get(serviceId)
        if (existing) {
          existing.pct = Math.min(existing.pct + 5 * count, 100)
        }
      }
    }
  }

  // Build service scores array for phase calculation
  const serviceScoresArray: ServiceScore[] = Array.from(bestByService.entries()).map(
    ([service_id, { earned, max, pct, phase_id }]) => ({
      service_id,
      phase_id: phase_id || '',
      earned,
      max,
      pct,
    })
  )

  // We need phase_ids for each service — fetch if missing
  const missingPhaseServices = serviceScoresArray.filter(s => !s.phase_id)
  if (missingPhaseServices.length > 0) {
    const { data: services } = await supabaseAdmin
      .from('services')
      .select('id, phase_id')
      .in('id', missingPhaseServices.map(s => s.service_id))

    if (services) {
      const phaseMap = new Map(services.map(s => [s.id, s.phase_id]))
      for (const ss of serviceScoresArray) {
        if (!ss.phase_id) {
          ss.phase_id = phaseMap.get(ss.service_id) || ''
        }
      }
    }
  }

  const phaseScores = calculatePhaseScores(serviceScoresArray)
  const overall = calculateOverallScore(phaseScores)

  return {
    overall,
    phases: Object.fromEntries(phaseScores.map(p => [p.phase_id, p.score])),
    services: Object.fromEntries(
      serviceScoresArray.map(s => [s.service_id, { earned: s.earned, max: s.max, pct: s.pct }])
    ),
  }
}

/**
 * Calculate team averages from an array of member composite scores.
 * Members with null scores (no assessments) are excluded.
 */
export function calculateTeamAverages(
  memberScores: (CompositeScore | null)[]
): CompositeScore {
  const valid = memberScores.filter((s): s is CompositeScore => s !== null)

  if (valid.length === 0) {
    return { overall: 0, phases: {}, services: {} }
  }

  // Average overall
  const overall = Math.round(valid.reduce((sum, s) => sum + s.overall, 0) / valid.length)

  // Average phases
  const phaseIds = new Set(valid.flatMap(s => Object.keys(s.phases)))
  const phases: Record<string, number> = {}
  for (const phaseId of phaseIds) {
    const scores = valid.filter(s => s.phases[phaseId] !== undefined).map(s => s.phases[phaseId])
    phases[phaseId] = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  }

  // Average services
  const serviceIds = new Set(valid.flatMap(s => Object.keys(s.services)))
  const services: Record<string, { earned: number; max: number; pct: number }> = {}
  for (const serviceId of serviceIds) {
    const scores = valid.filter(s => s.services[serviceId]).map(s => s.services[serviceId])
    if (scores.length > 0) {
      services[serviceId] = {
        earned: Math.round(scores.reduce((a, b) => a + b.earned, 0) / scores.length),
        max: Math.round(scores.reduce((a, b) => a + b.max, 0) / scores.length),
        pct: Math.round(scores.reduce((a, b) => a + b.pct, 0) / scores.length),
      }
    }
  }

  return { overall, phases, services }
}
```

- [ ] **Step 2: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/composite-scoring.ts
git commit -m "feat(scoring): add composite scoring — best-across-attempts + course completion bonus"
```

---

### Task 5: API Routes — Dashboard, Trends, My-Profile, Snapshot

**Files:**
- Create: `src/app/api/team/dashboard/route.ts`
- Create: `src/app/api/team/trends/route.ts`
- Create: `src/app/api/team/my-profile/route.ts`
- Create: `src/app/api/team/snapshot/route.ts`

- [ ] **Step 1: Create dashboard API route**

Create `src/app/api/team/dashboard/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-server'
import { calculateCompositeScore, calculateTeamAverages } from '@/lib/composite-scoring'
import type { TeamDashboardData } from '@/lib/types'

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify company admin
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, company_id, is_company_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_company_admin || !profile.company_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch all active company members
  const { data: members } = await supabaseAdmin
    .from('profiles')
    .select('id, display_name, email, is_company_admin')
    .eq('company_id', profile.company_id)
    .eq('is_active', true)

  if (!members) {
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }

  // Calculate composite scores for each member
  const memberScores = await Promise.all(
    members.map(async (m) => {
      const scores = await calculateCompositeScore(m.id)

      // Count completed courses
      const { count } = await supabaseAdmin
        .from('user_course_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', m.id)
        .not('completed_at', 'is', null)

      return {
        id: m.id,
        display_name: m.display_name,
        email: m.email,
        is_company_admin: m.is_company_admin,
        scores,
        coursesCompleted: count || 0,
      }
    })
  )

  const teamAverages = calculateTeamAverages(memberScores.map(m => m.scores))

  // 30-day trend: compare current avg to avg 30 days ago
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: oldSnapshots } = await supabaseAdmin
    .from('skill_snapshots')
    .select('overall_score')
    .eq('company_id', profile.company_id)
    .lte('snapshot_at', thirtyDaysAgo)
    .order('snapshot_at', { ascending: false })
    .limit(members.length)

  let trend30d = 0
  if (oldSnapshots && oldSnapshots.length > 0) {
    const oldAvg = Math.round(oldSnapshots.reduce((s, r) => s + r.overall_score, 0) / oldSnapshots.length)
    trend30d = teamAverages.overall - oldAvg
  }

  const totalCourses = memberScores.reduce((s, m) => s + m.coursesCompleted, 0)

  const data: TeamDashboardData = {
    members: memberScores,
    teamAverages,
    stats: {
      memberCount: members.length,
      avgMaturity: teamAverages.overall,
      trend30d,
      coursesCompleted: totalCourses,
    },
  }

  return NextResponse.json(data)
}
```

- [ ] **Step 2: Create trends API route**

Create `src/app/api/team/trends/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-server'
import type { TeamTrendPoint } from '@/lib/types'

export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('company_id, is_company_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_company_admin || !profile.company_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const period = parseInt(request.nextUrl.searchParams.get('period') || '30', 10)
  const validPeriods = [30, 60, 90]
  const days = validPeriods.includes(period) ? period : 30

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data: snapshots } = await supabaseAdmin
    .from('skill_snapshots')
    .select('overall_score, phase_scores, snapshot_at')
    .eq('company_id', profile.company_id)
    .gte('snapshot_at', since)
    .order('snapshot_at', { ascending: true })

  if (!snapshots || snapshots.length === 0) {
    return NextResponse.json({ dataPoints: [] })
  }

  // Group by week (ISO week start = Monday)
  const weekMap = new Map<string, { overalls: number[]; phases: Map<string, number[]> }>()

  for (const snap of snapshots) {
    const date = new Date(snap.snapshot_at)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - ((date.getDay() + 6) % 7)) // Monday
    const weekKey = weekStart.toISOString().split('T')[0]

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { overalls: [], phases: new Map() })
    }
    const week = weekMap.get(weekKey)!
    week.overalls.push(snap.overall_score)

    const phaseScores = snap.phase_scores as Record<string, number>
    for (const [phaseId, score] of Object.entries(phaseScores)) {
      if (!week.phases.has(phaseId)) week.phases.set(phaseId, [])
      week.phases.get(phaseId)!.push(score)
    }
  }

  const dataPoints: TeamTrendPoint[] = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, { overalls, phases }]) => ({
      week,
      overall: Math.round(overalls.reduce((a, b) => a + b, 0) / overalls.length),
      phases: Object.fromEntries(
        Array.from(phases.entries()).map(([id, scores]) => [
          id,
          Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        ])
      ),
    }))

  return NextResponse.json({ dataPoints })
}
```

- [ ] **Step 3: Create my-profile API route**

Create `src/app/api/team/my-profile/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-server'
import { calculateCompositeScore, calculateTeamAverages } from '@/lib/composite-scoring'
import type { MemberProfile } from '@/lib/types'

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    return NextResponse.json({ error: 'No company' }, { status: 404 })
  }

  // Calculate user's own score
  const myScores = await calculateCompositeScore(user.id)
  if (!myScores) {
    return NextResponse.json({ error: 'No assessment data' }, { status: 404 })
  }

  // Calculate team averages (anonymized)
  const { data: teamMembers } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('company_id', profile.company_id)
    .eq('is_active', true)

  const allScores = await Promise.all(
    (teamMembers || []).map(m => calculateCompositeScore(m.id))
  )
  const teamAverages = calculateTeamAverages(allScores)

  // Find recommended courses based on weakest services
  const weakServices = Object.entries(myScores.services)
    .sort(([, a], [, b]) => a.pct - b.pct)
    .slice(0, 6)
    .map(([id]) => id)

  const { data: academyLinks } = await supabaseAdmin
    .from('service_academy_links')
    .select('service_id, course:courses(id, name, phase:phases(name))')
    .in('service_id', weakServices)

  // Get service names
  const { data: services } = await supabaseAdmin
    .from('services')
    .select('id, name, phase:phases(name)')
    .in('id', weakServices)

  const serviceMap = new Map((services || []).map(s => [s.id, s]))

  const recommendedCourses = (academyLinks || [])
    .filter(l => l.course)
    .map(l => {
      const svc = serviceMap.get(l.service_id)
      const course = l.course as { id: string; name: string; phase: { name: string } | null }
      const phaseName = course.phase?.name || svc?.phase?.name || ''
      return {
        id: course.id,
        name: course.name,
        phase_name: phaseName,
        phase_color: '',
        service_name: svc?.name || '',
        service_score: myScores.services[l.service_id]?.pct || 0,
      }
    })
    .sort((a, b) => a.service_score - b.service_score)
    .slice(0, 3)

  const data: MemberProfile = { myScores, teamAverages, recommendedCourses }
  return NextResponse.json(data)
}
```

- [ ] **Step 4: Create snapshot API route**

Create `src/app/api/team/snapshot/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { calculateCompositeScore } from '@/lib/composite-scoring'

export async function POST(request: NextRequest) {
  // Service-role only — verify via header or internal call
  const authHeader = request.headers.get('authorization')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, source, sourceId } = await request.json()

  if (!userId || !source) {
    return NextResponse.json({ error: 'Missing userId or source' }, { status: 400 })
  }

  // Get user's company_id
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .single()

  if (!profile?.company_id) {
    return NextResponse.json({ error: 'User has no company' }, { status: 404 })
  }

  // Calculate current composite score
  const scores = await calculateCompositeScore(userId)
  if (!scores) {
    return NextResponse.json({ error: 'No scores to snapshot' }, { status: 404 })
  }

  const { error } = await supabaseAdmin.from('skill_snapshots').insert({
    user_id: userId,
    company_id: profile.company_id,
    overall_score: scores.overall,
    phase_scores: scores.phases,
    service_scores: scores.services,
    source,
    source_id: sourceId || null,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 5: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No new errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/team/dashboard/route.ts src/app/api/team/trends/route.ts src/app/api/team/my-profile/route.ts src/app/api/team/snapshot/route.ts
git commit -m "feat(api): add team dashboard, trends, my-profile, and snapshot API routes"
```

---

### Task 6: API Routes — Invite and Accept-Invite

**Files:**
- Create: `src/app/api/team/invite/route.ts`
- Create: `src/app/api/team/accept-invite/route.ts`

- [ ] **Step 1: Create invite API route**

Create `src/app/api/team/invite/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-server'

interface Invitee {
  email: string
  display_name?: string
}

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, company_id, is_company_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_company_admin || !profile.company_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { invitees, message }: { invitees: Invitee[]; message?: string } = await request.json()

  if (!invitees || invitees.length === 0) {
    return NextResponse.json({ error: 'No invitees provided' }, { status: 400 })
  }

  // Validate and filter
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const errors: { email: string; reason: string }[] = []
  const validInvitees: Invitee[] = []

  // Check existing members
  const { data: existingMembers } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('company_id', profile.company_id)
    .eq('is_active', true)

  const existingEmails = new Set((existingMembers || []).map(m => m.email.toLowerCase()))

  // Check pending invites
  const { data: pendingInvites } = await supabaseAdmin
    .from('team_invitations')
    .select('email')
    .eq('company_id', profile.company_id)
    .eq('status', 'pending')

  const pendingEmails = new Set((pendingInvites || []).map(i => i.email.toLowerCase()))

  for (const invitee of invitees) {
    const email = invitee.email.toLowerCase().trim()
    if (!emailRegex.test(email)) {
      errors.push({ email, reason: 'Invalid email format' })
    } else if (existingEmails.has(email)) {
      errors.push({ email, reason: 'Already a team member' })
    } else if (pendingEmails.has(email)) {
      errors.push({ email, reason: 'Invite already pending' })
    } else {
      validInvitees.push({ ...invitee, email })
    }
  }

  let sent = 0
  for (const invitee of validInvitees) {
    // Create invitation record
    const { data: invitation, error: insertError } = await supabaseAdmin
      .from('team_invitations')
      .insert({
        company_id: profile.company_id,
        invited_by: profile.id,
        email: invitee.email,
        display_name: invitee.display_name || null,
        message: message || null,
      })
      .select('id, token')
      .single()

    if (insertError) {
      errors.push({ email: invitee.email, reason: insertError.message })
      continue
    }

    // Send Supabase auth invite email
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/set-password?invite=${invitation.token}`
    const { error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(invitee.email, {
      redirectTo,
      data: { display_name: invitee.display_name || invitee.email.split('@')[0] },
    })

    if (authError) {
      errors.push({ email: invitee.email, reason: authError.message })
      // Clean up the invitation
      await supabaseAdmin.from('team_invitations').delete().eq('id', invitation.id)
    } else {
      sent++
    }
  }

  return NextResponse.json({ sent, errors })
}
```

- [ ] **Step 2: Create accept-invite API route**

Create `src/app/api/team/accept-invite/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await request.json()
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  // Find valid invitation
  const { data: invitation } = await supabaseAdmin
    .from('team_invitations')
    .select('id, company_id, display_name, companies(name)')
    .eq('token', token)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!invitation) {
    return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 })
  }

  // Update profile with company_id
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      company_id: invitation.company_id,
      is_company_admin: false,
      display_name: invitation.display_name || user.email?.split('@')[0] || 'Team Member',
    })
    .eq('id', user.id)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  // Mark invitation as accepted
  await supabaseAdmin
    .from('team_invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  const company = invitation.companies as { name: string } | null

  return NextResponse.json({
    companyId: invitation.company_id,
    companyName: company?.name || '',
  })
}
```

- [ ] **Step 3: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/team/invite/route.ts src/app/api/team/accept-invite/route.ts
git commit -m "feat(api): add team invite and accept-invite API routes"
```

---

### Task 7: Set-Password Page — Invite Token Handling

**Files:**
- Modify: `src/app/(auth)/set-password/page.tsx:27-34`

- [ ] **Step 1: Add invite token handling after password set**

In `src/app/(auth)/set-password/page.tsx`, modify the `handleSubmit` function (lines 20-35) to check for an invite token after password is set:

Replace the success handler (lines 31-34):

```typescript
// Old:
    } else {
      toast.success('Password set successfully. Please log in.')
      router.replace('/login')
    }
```

With:

```typescript
    } else {
      // Check for invite token in URL
      const params = new URLSearchParams(window.location.search)
      const inviteToken = params.get('invite')
      if (inviteToken) {
        try {
          const res = await fetch('/api/team/accept-invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: inviteToken }),
          })
          if (res.ok) {
            toast.success('Welcome to the team! Please log in to continue.')
          } else {
            toast.success('Password set. Invite link may have expired — contact your admin.')
          }
        } catch {
          toast.success('Password set successfully. Please log in.')
        }
      } else {
        toast.success('Password set successfully. Please log in.')
      }
      router.replace('/login')
    }
```

- [ ] **Step 2: Verify the page still renders correctly**

Run: `npm run dev`
Navigate to `/set-password` — should still render the password form without errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(auth)/set-password/page.tsx
git commit -m "feat(auth): handle invite token on set-password page"
```

---

### Task 8: Team Dashboard Page — Stats Row & Charts

**Files:**
- Create: `src/components/team/stats-row.tsx`
- Create: `src/components/team/phase-radar.tsx`
- Create: `src/components/team/service-bars.tsx`
- Modify: `src/app/(customer)/portal/team/page.tsx`

- [ ] **Step 1: Create stats-row component**

Create `src/components/team/stats-row.tsx`:

```typescript
'use client'

import { getMaturityLabel } from '@/lib/scoring'

interface StatsRowProps {
  memberCount: number
  avgMaturity: number
  trend30d: number
  coursesCompleted: number
}

export function StatsRow({ memberCount, avgMaturity, trend30d, coursesCompleted }: StatsRowProps) {
  const maturityLabel = getMaturityLabel(avgMaturity)

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="text-2xl font-bold text-slate-900">{memberCount}</div>
        <div className="text-xs text-slate-500">Team Members</div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="text-2xl font-bold text-[#1175E4]">{avgMaturity}%</div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Avg Maturity</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
            {maturityLabel}
          </span>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className={`text-2xl font-bold ${trend30d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend30d >= 0 ? '+' : ''}{trend30d}%
        </div>
        <div className="text-xs text-slate-500">30-Day Trend</div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="text-2xl font-bold text-[#EDB600]">{coursesCompleted}</div>
        <div className="text-xs text-slate-500">Courses Completed</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create phase-radar component**

Create `src/components/team/phase-radar.tsx`:

```typescript
'use client'

import { getMaturityLabel } from '@/lib/scoring'

interface PhaseData {
  id: string
  name: string
  score: number
  color: string
}

interface PhaseRadarProps {
  phases: PhaseData[]
  overall: number
}

export function PhaseRadar({ phases, overall }: PhaseRadarProps) {
  const maturityLabel = getMaturityLabel(overall)
  const cx = 150, cy = 140, r = 100
  const n = phases.length
  if (n === 0) return null

  // Calculate points on radar
  const angleStep = (2 * Math.PI) / n
  const startAngle = -Math.PI / 2

  function polarToCart(index: number, value: number): { x: number; y: number } {
    const angle = startAngle + index * angleStep
    const dist = (value / 100) * r
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) }
  }

  // Grid rings at 25%, 50%, 75%, 100%
  const rings = [25, 50, 75, 100]

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-2 text-sm font-semibold text-slate-900">Phase Overview</div>
      <div className="flex items-start gap-6">
        <svg viewBox="0 0 300 280" width="240" height="224" className="shrink-0">
          {/* Grid rings */}
          {rings.map(pct => {
            const points = phases.map((_, i) => {
              const p = polarToCart(i, pct)
              return `${p.x},${p.y}`
            }).join(' ')
            return <polygon key={pct} points={points} fill="none" stroke="#e2e8f0" strokeWidth="1" />
          })}
          {/* Axis lines */}
          {phases.map((_, i) => {
            const p = polarToCart(i, 100)
            return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth="1" />
          })}
          {/* Data polygon */}
          <polygon
            points={phases.map((p, i) => {
              const pt = polarToCart(i, p.score)
              return `${pt.x},${pt.y}`
            }).join(' ')}
            fill="rgba(17,117,228,0.12)"
            stroke="#1175E4"
            strokeWidth="2.5"
          />
          {/* Data points */}
          {phases.map((p, i) => {
            const pt = polarToCart(i, p.score)
            return <circle key={i} cx={pt.x} cy={pt.y} r="4" fill={p.color} />
          })}
          {/* Labels */}
          {phases.map((p, i) => {
            const labelPos = polarToCart(i, 115)
            const anchor = labelPos.x < cx - 10 ? 'end' : labelPos.x > cx + 10 ? 'start' : 'middle'
            return (
              <g key={`label-${i}`}>
                <text x={labelPos.x} y={labelPos.y - 4} textAnchor={anchor} style={{ fontSize: 11, fill: p.color, fontWeight: 700 }}>
                  {p.name}
                </text>
                <text x={labelPos.x} y={labelPos.y + 10} textAnchor={anchor} style={{ fontSize: 9, fill: '#64748b' }}>
                  {p.score}%
                </text>
              </g>
            )
          })}
        </svg>

        {/* Phase bars */}
        <div className="flex-1 pt-1">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-lg font-bold text-slate-900">{overall}%</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{maturityLabel}</span>
          </div>
          <div className="space-y-3">
            {phases.map(p => (
              <div key={p.id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold" style={{ color: p.color }}>{p.name}</span>
                  <span className="text-slate-500">{p.score}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(p.score, 100)}%`, background: `linear-gradient(90deg, ${p.color}, ${p.color}88)` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create service-bars component**

Create `src/components/team/service-bars.tsx`:

```typescript
'use client'

interface ServiceBarData {
  id: string
  name: string
  pct: number
  phaseColor: string
}

interface ServiceBarsProps {
  services: ServiceBarData[]
}

export function ServiceBars({ services }: ServiceBarsProps) {
  // Sort by score ascending (weakest first)
  const sorted = [...services].sort((a, b) => a.pct - b.pct)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4 text-sm font-semibold text-slate-900">Service Breakdown</div>
      <div className="space-y-3">
        {sorted.map(s => (
          <div key={s.id}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-slate-700">{s.name}</span>
              <span className="text-slate-500">{s.pct}%</span>
            </div>
            <div className="h-[6px] rounded-full bg-slate-200">
              <div
                className="h-[6px] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(s.pct, 100)}%`, backgroundColor: s.phaseColor }}
              />
            </div>
          </div>
        ))}
        {services.length === 0 && (
          <p className="text-xs text-slate-400">No service data yet</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create the team dashboard page (initial — stats + charts only)**

Replace `src/app/(customer)/portal/team/page.tsx` with:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase-client'
import { getPhaseColor } from '@/lib/phase-colors'
import { StatsRow } from '@/components/team/stats-row'
import { PhaseRadar } from '@/components/team/phase-radar'
import { ServiceBars } from '@/components/team/service-bars'
import type { TeamDashboardData, Phase, Service } from '@/lib/types'

export default function TeamPage() {
  const { profile } = useAuth()
  const [data, setData] = useState<TeamDashboardData | null>(null)
  const [phases, setPhases] = useState<Phase[]>([])
  const [services, setServices] = useState<Pick<Service, 'id' | 'name' | 'phase_id'>[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'members' | 'trends' | 'invitations'>('members')

  useEffect(() => {
    if (!profile) return

    async function fetchData() {
      setLoading(true)
      const [dashRes, phasesRes, servicesRes] = await Promise.all([
        fetch('/api/team/dashboard'),
        supabase.from('phases').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('services').select('id, name, phase_id').eq('status', 'active'),
      ])

      if (dashRes.ok) {
        setData(await dashRes.json())
      }
      setPhases(phasesRes.data || [])
      setServices(servicesRes.data || [])
      setLoading(false)
    }

    fetchData()
  }, [profile])

  if (loading) {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Team</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Your Team</h1>
        <div className="mt-6 flex items-center justify-center rounded-xl border border-slate-200 bg-white p-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#1175E4]" />
        </div>
      </div>
    )
  }

  if (!data || !profile?.is_company_admin) {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Team</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Your Team</h1>
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          {!profile?.is_company_admin
            ? 'Team dashboard is available to company administrators.'
            : 'No team data available yet. Invite members to get started.'}
        </div>
      </div>
    )
  }

  const companyName = profile?.company?.name ?? ''

  // Build phase data for radar
  const phaseData = phases.map(p => ({
    id: p.id,
    name: p.name,
    score: data.teamAverages.phases[p.id] ?? 0,
    color: getPhaseColor(p.name),
  }))

  // Build service data for bars
  const serviceData = services.map(s => ({
    id: s.id,
    name: s.name,
    pct: data.teamAverages.services[s.id]?.pct ?? 0,
    phaseColor: getPhaseColor(phases.find(p => p.id === s.phase_id)?.name),
  }))

  const tabs = [
    { key: 'members' as const, label: 'Members' },
    { key: 'trends' as const, label: 'Trends' },
    { key: 'invitations' as const, label: 'Invitations' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Team</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Your Team{companyName && <span className="ml-1 font-normal text-slate-500">— {companyName}</span>}
          </h1>
        </div>
        <button
          className="rounded-lg bg-[#1175E4] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d5fc4]"
          onClick={() => {/* TODO: open invite dialog — Task 10 */}}
        >
          + Invite Members
        </button>
      </div>

      {/* Stats */}
      <div className="mt-6">
        <StatsRow
          memberCount={data.stats.memberCount}
          avgMaturity={data.stats.avgMaturity}
          trend30d={data.stats.trend30d}
          coursesCompleted={data.stats.coursesCompleted}
        />
      </div>

      {/* Charts */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <PhaseRadar phases={phaseData} overall={data.stats.avgMaturity} />
        <ServiceBars services={serviceData} />
      </div>

      {/* Tabs */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white">
        <div className="flex gap-4 border-b border-slate-200 px-6 pt-4">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === t.key
                  ? 'border-b-2 border-[#1175E4] text-[#1175E4]'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {activeTab === 'members' && <div className="text-sm text-slate-500">Members tab — Task 9</div>}
          {activeTab === 'trends' && <div className="text-sm text-slate-500">Trends tab — Task 9</div>}
          {activeTab === 'invitations' && <div className="text-sm text-slate-500">Invitations tab — Task 10</div>}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify dev server renders the page**

Run: `npm run dev`
Navigate to `/portal/team` as a company admin. Should show loading → stats + charts (or empty state if no data).

- [ ] **Step 6: Commit**

```bash
git add src/components/team/stats-row.tsx src/components/team/phase-radar.tsx src/components/team/service-bars.tsx src/app/(customer)/portal/team/page.tsx
git commit -m "feat(team): add team dashboard page with stats row, radar chart, and service bars"
```

---

### Task 9: Members Tab & Trends Tab

**Files:**
- Create: `src/components/team/members-tab.tsx`
- Create: `src/components/team/trends-tab.tsx`
- Modify: `src/app/(customer)/portal/team/page.tsx`

- [ ] **Step 1: Create members-tab (heatmap)**

Create `src/components/team/members-tab.tsx`:

```typescript
'use client'

import type { Phase, Service } from '@/lib/types'
import type { CompositeScore } from '@/lib/types'
import { getPhaseColor } from '@/lib/phase-colors'

interface Member {
  id: string
  display_name: string
  scores: CompositeScore | null
  coursesCompleted: number
}

interface MembersTabProps {
  members: Member[]
  phases: Phase[]
  services: Pick<Service, 'id' | 'name' | 'phase_id'>[]
  teamAverages: CompositeScore
}

function getCellStyle(pct: number): { bg: string; text: string } {
  if (pct >= 75) return { bg: 'bg-green-100', text: 'text-green-700' }
  if (pct >= 26) return { bg: 'bg-amber-100', text: 'text-amber-700' }
  return { bg: 'bg-red-100', text: 'text-red-700' }
}

export function MembersTab({ members, phases, services, teamAverages }: MembersTabProps) {
  // Group services by phase, in phase sort order
  const servicesByPhase = phases
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(p => ({
      phase: p,
      services: services.filter(s => s.phase_id === p.id),
    }))
    .filter(g => g.services.length > 0)

  const allServices = servicesByPhase.flatMap(g => g.services)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          {/* Phase header row */}
          <tr>
            <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-semibold text-slate-700" />
            {servicesByPhase.map(g => (
              <th
                key={g.phase.id}
                colSpan={g.services.length}
                className="px-2 py-1 text-center font-semibold"
                style={{ color: getPhaseColor(g.phase.name) }}
              >
                {g.phase.name}
              </th>
            ))}
            <th className="px-3 py-2 text-center font-semibold text-slate-700">Courses</th>
          </tr>
          {/* Service header row */}
          <tr className="border-b border-slate-200">
            <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-medium text-slate-600">Name</th>
            {allServices.map(s => (
              <th key={s.id} className="px-2 py-2 text-center font-medium text-slate-600" style={{ minWidth: 72 }}>
                {s.name}
              </th>
            ))}
            <th className="px-3 py-2 text-center font-medium text-slate-600">#</th>
          </tr>
        </thead>
        <tbody>
          {members.map(m => (
            <tr key={m.id} className="border-b border-slate-100">
              <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-slate-800">{m.display_name}</td>
              {allServices.map(s => {
                const pct = m.scores?.services[s.id]?.pct
                if (pct === undefined) {
                  return <td key={s.id} className="px-2 py-2 text-center text-slate-300">—</td>
                }
                const style = getCellStyle(pct)
                return (
                  <td key={s.id} className="px-1 py-1">
                    <div className={`rounded px-2 py-1.5 text-center font-bold ${style.bg} ${style.text}`}>
                      {pct}%
                    </div>
                  </td>
                )
              })}
              <td className="px-3 py-2 text-center text-slate-600">{m.coursesCompleted}</td>
            </tr>
          ))}
          {/* Team average footer */}
          <tr className="border-t-2 border-slate-200 bg-slate-50">
            <td className="sticky left-0 z-10 bg-slate-50 px-3 py-2 font-bold text-slate-900">Team Avg</td>
            {allServices.map(s => {
              const pct = teamAverages.services[s.id]?.pct ?? 0
              return (
                <td key={s.id} className="px-2 py-2 text-center font-bold text-slate-900">
                  {pct}%
                </td>
              )
            })}
            <td className="px-3 py-2 text-center font-bold text-slate-900">
              {members.reduce((s, m) => s + m.coursesCompleted, 0)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Legend */}
      <div className="mt-3 flex gap-4 text-[10px] text-slate-500">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-green-100" />≥ 75% Optimised</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-amber-100" />26-74% Developing</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-red-100" />≤ 25% Foundational</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create trends-tab (line chart)**

Create `src/components/team/trends-tab.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import type { TeamTrendPoint, Phase } from '@/lib/types'
import { getPhaseColor } from '@/lib/phase-colors'

interface TrendsTabProps {
  phases: Phase[]
}

export function TrendsTab({ phases }: TrendsTabProps) {
  const [period, setPeriod] = useState(30)
  const [points, setPoints] = useState<TeamTrendPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTrends() {
      setLoading(true)
      const res = await fetch(`/api/team/trends?period=${period}`)
      if (res.ok) {
        const { dataPoints } = await res.json()
        setPoints(dataPoints)
      }
      setLoading(false)
    }
    fetchTrends()
  }, [period])

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[#1175E4]" />
      </div>
    )
  }

  if (points.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">No trend data yet. Data will appear as team members complete assessments and courses.</p>
  }

  // Chart dimensions
  const W = 600, H = 200, PL = 40, PR = 20, PT = 10, PB = 30
  const chartW = W - PL - PR, chartH = H - PT - PB

  function yPos(pct: number): number {
    return PT + chartH - (pct / 100) * chartH
  }

  function xPos(i: number): number {
    return PL + (points.length === 1 ? chartW / 2 : (i / (points.length - 1)) * chartW)
  }

  const overallLine = points.map((p, i) => `${xPos(i)},${yPos(p.overall)}`).join(' ')

  const periods = [30, 60, 90]

  return (
    <div>
      {/* Period selector */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">Team Maturity Over Time</div>
        <div className="flex gap-1">
          {periods.map(d => (
            <button
              key={d}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                period === d ? 'bg-[#eef5fd] text-[#1175E4]' : 'text-slate-400 hover:text-slate-600'
              }`}
              onClick={() => setPeriod(d)}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(pct => (
          <g key={pct}>
            <line x1={PL} y1={yPos(pct)} x2={W - PR} y2={yPos(pct)} stroke="#f1f5f9" strokeWidth="1" strokeDasharray={pct === 0 ? '' : '4'} />
            <text x={PL - 4} y={yPos(pct) + 3} textAnchor="end" style={{ fontSize: 9, fill: '#94a3b8' }}>{pct}%</text>
          </g>
        ))}
        {/* X axis labels */}
        {points.map((p, i) => (
          <text key={i} x={xPos(i)} y={H - 6} textAnchor="middle" style={{ fontSize: 9, fill: '#94a3b8' }}>
            {new Date(p.week).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </text>
        ))}
        {/* Phase lines (dashed, lower opacity) */}
        {phases.map(phase => {
          const line = points
            .filter(p => p.phases[phase.id] !== undefined)
            .map((p, i) => `${xPos(i)},${yPos(p.phases[phase.id])}`)
            .join(' ')
          if (!line) return null
          return (
            <polyline key={phase.id} points={line} fill="none" stroke={getPhaseColor(phase.name)} strokeWidth="1" strokeDasharray="4" opacity="0.5" />
          )
        })}
        {/* Overall line (bold) */}
        <polyline points={overallLine} fill="none" stroke="#1175E4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Current value dot */}
        {points.length > 0 && (
          <circle cx={xPos(points.length - 1)} cy={yPos(points[points.length - 1].overall)} r="5" fill="#1175E4" stroke="white" strokeWidth="2" />
        )}
      </svg>

      {/* Legend */}
      <div className="mt-2 flex justify-center gap-5 text-[10px]">
        <span className="font-semibold text-[#1175E4]">━ Overall</span>
        {phases.map(p => (
          <span key={p.id} style={{ color: getPhaseColor(p.name), opacity: 0.6 }}>┈ {p.name}</span>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Wire tabs into team page**

In `src/app/(customer)/portal/team/page.tsx`, add imports for `MembersTab` and `TrendsTab`, and replace the placeholder tab content:

Add imports:
```typescript
import { MembersTab } from '@/components/team/members-tab'
import { TrendsTab } from '@/components/team/trends-tab'
```

Replace the tab content div (the three lines with placeholder text) with:
```typescript
{activeTab === 'members' && (
  <MembersTab
    members={data.members}
    phases={phases}
    services={services}
    teamAverages={data.teamAverages}
  />
)}
{activeTab === 'trends' && <TrendsTab phases={phases} />}
{activeTab === 'invitations' && <div className="text-sm text-slate-500">Invitations tab — Task 10</div>}
```

- [ ] **Step 4: Verify dev server renders tabs**

Run: `npm run dev`
Navigate to `/portal/team`, click through Members and Trends tabs. Should render heatmap grid and trend chart (or empty states).

- [ ] **Step 5: Commit**

```bash
git add src/components/team/members-tab.tsx src/components/team/trends-tab.tsx src/app/(customer)/portal/team/page.tsx
git commit -m "feat(team): add members heatmap tab and trends line chart tab"
```

---

### Task 10: Invitations Tab & Invite Dialog

**Files:**
- Create: `src/components/team/invitations-tab.tsx`
- Create: `src/components/team/invite-dialog.tsx`
- Modify: `src/app/(customer)/portal/team/page.tsx`

- [ ] **Step 1: Create invitations-tab**

Create `src/components/team/invitations-tab.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { toast } from 'sonner'
import type { TeamInvitation } from '@/lib/types'

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Invite Sent' },
  accepted: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
  expired: { bg: 'bg-red-100', text: 'text-red-700', label: 'Expired' },
  revoked: { bg: 'bg-slate-100', text: 'text-slate-500', label: 'Revoked' },
}

interface InvitationsTabProps {
  companyId: string
}

export function InvitationsTab({ companyId }: InvitationsTabProps) {
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchInvitations() {
    setLoading(true)
    const { data } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    // Check for expired — mark as expired if past expiry and still pending
    const now = new Date()
    const processed = (data || []).map(inv => {
      if (inv.status === 'pending' && new Date(inv.expires_at) < now) {
        return { ...inv, status: 'expired' as const }
      }
      return inv
    })

    setInvitations(processed)
    setLoading(false)
  }

  useEffect(() => { fetchInvitations() }, [companyId])

  async function handleResend(invitation: TeamInvitation) {
    // Revoke old invitation first, then re-invite via API
    await supabase
      .from('team_invitations')
      .update({ status: 'revoked' })
      .eq('id', invitation.id)

    const res = await fetch('/api/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invitees: [{ email: invitation.email, display_name: invitation.display_name }],
      }),
    })
    if (res.ok) {
      toast.success(`Invite resent to ${invitation.email}`)
      fetchInvitations()
    } else {
      toast.error('Failed to resend invite')
    }
  }

  async function handleRevoke(invitation: TeamInvitation) {
    const { error } = await supabase
      .from('team_invitations')
      .update({ status: 'revoked' })
      .eq('id', invitation.id)

    if (error) {
      toast.error('Failed to revoke invite')
    } else {
      toast.success(`Invite to ${invitation.email} revoked`)
      fetchInvitations()
    }
  }

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[#1175E4]" />
      </div>
    )
  }

  if (invitations.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">No invitations sent yet.</p>
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-600">
          <th className="px-3 py-2">Email</th>
          <th className="px-3 py-2">Status</th>
          <th className="px-3 py-2">Invited</th>
          <th className="px-3 py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {invitations.map(inv => {
          const style = STATUS_STYLES[inv.status] || STATUS_STYLES.pending
          return (
            <tr key={inv.id} className="border-b border-slate-100">
              <td className="px-3 py-2 text-slate-800">{inv.email}</td>
              <td className="px-3 py-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
              </td>
              <td className="px-3 py-2 text-slate-500">
                {new Date(inv.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </td>
              <td className="px-3 py-2">
                {(inv.status === 'pending' || inv.status === 'expired') && (
                  <div className="flex gap-2">
                    <button onClick={() => handleResend(inv)} className="text-xs text-[#1175E4] hover:underline">
                      Resend
                    </button>
                    {inv.status === 'pending' && (
                      <button onClick={() => handleRevoke(inv)} className="text-xs text-red-500 hover:underline">
                        Revoke
                      </button>
                    )}
                  </div>
                )}
                {inv.status === 'accepted' && <span className="text-xs text-slate-300">—</span>}
                {inv.status === 'revoked' && <span className="text-xs text-slate-300">—</span>}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 2: Create invite-dialog**

Create `src/components/team/invite-dialog.tsx`:

```typescript
'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface Invitee {
  email: string
  display_name?: string
  valid: boolean
  reason?: string
}

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvitesSent: () => void
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function InviteDialog({ open, onOpenChange, onInvitesSent }: InviteDialogProps) {
  const [mode, setMode] = useState<'single' | 'bulk'>('single')
  const [invitees, setInvitees] = useState<Invitee[]>([])
  const [emailInput, setEmailInput] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function addEmail(raw: string) {
    const email = raw.toLowerCase().trim()
    if (!email) return
    const valid = EMAIL_REGEX.test(email)
    const exists = invitees.some(i => i.email === email)
    if (exists) return
    setInvitees(prev => [...prev, { email, valid, reason: valid ? undefined : 'Invalid format' }])
  }

  function removeEmail(email: string) {
    setInvitees(prev => prev.filter(i => i.email !== email))
  }

  function handleEmailKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault()
      addEmail(emailInput)
      setEmailInput('')
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    const emails = text.split(/[\n,;\s]+/).filter(Boolean)
    for (const email of emails) addEmail(email)
    setEmailInput('')
  }

  function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      // Skip header if it contains "email"
      const startIdx = lines[0]?.toLowerCase().includes('email') ? 1 : 0
      for (let i = startIdx; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''))
        const email = parts[0]
        const display_name = parts[1] || undefined
        if (email) {
          const valid = EMAIL_REGEX.test(email.toLowerCase())
          setInvitees(prev => {
            if (prev.some(inv => inv.email === email.toLowerCase())) return prev
            return [...prev, { email: email.toLowerCase(), display_name, valid, reason: valid ? undefined : 'Invalid format' }]
          })
        }
      }
    }
    reader.readAsText(file)
    // Reset file input
    if (fileRef.current) fileRef.current.value = ''
  }

  function downloadTemplate() {
    const csv = 'email,display_name\njohn@example.com,John Smith\njane@example.com,Jane Doe\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'invite-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleSend() {
    const validInvitees = invitees.filter(i => i.valid)
    if (validInvitees.length === 0) {
      toast.error('No valid emails to send')
      return
    }

    setSending(true)
    const res = await fetch('/api/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invitees: validInvitees.map(i => ({ email: i.email, display_name: i.display_name })),
        message: message || undefined,
      }),
    })

    const result = await res.json()
    setSending(false)

    if (res.ok) {
      toast.success(`${result.sent} invitation${result.sent !== 1 ? 's' : ''} sent`)
      if (result.errors?.length > 0) {
        for (const err of result.errors) {
          toast.error(`${err.email}: ${err.reason}`)
        }
      }
      setInvitees([])
      setMessage('')
      onOpenChange(false)
      onInvitesSent()
    } else {
      toast.error(result.error || 'Failed to send invitations')
    }
  }

  const validCount = invitees.filter(i => i.valid).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite Team Members</DialogTitle>
        </DialogHeader>

        {/* Mode tabs */}
        <div className="flex gap-0 border-b border-slate-200">
          <button
            className={`px-4 py-2 text-sm font-medium ${mode === 'single' ? 'border-b-2 border-[#1175E4] text-[#1175E4]' : 'text-slate-400'}`}
            onClick={() => setMode('single')}
          >
            Single
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium ${mode === 'bulk' ? 'border-b-2 border-[#1175E4] text-[#1175E4]' : 'text-slate-400'}`}
            onClick={() => setMode('bulk')}
          >
            Bulk (CSV)
          </button>
        </div>

        {mode === 'bulk' && (
          <div className="mt-3">
            {/* CSV upload */}
            <div
              className="cursor-pointer rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition-colors hover:border-[#1175E4]"
              onClick={() => fileRef.current?.click()}
            >
              <div className="text-sm font-semibold text-slate-600">Drop CSV file here or click to browse</div>
              <div className="mt-1 text-xs text-slate-400">Columns: email, display_name (optional)</div>
              <button onClick={(e) => { e.stopPropagation(); downloadTemplate() }} className="mt-2 text-xs text-[#1175E4] underline">
                Download template CSV
              </button>
            </div>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} className="hidden" />
          </div>
        )}

        {/* Email tags input */}
        <div className="mt-3">
          {mode === 'bulk' && <div className="mb-2 text-center text-xs text-slate-400">— or paste emails directly —</div>}
          <div className="min-h-[56px] rounded-lg border border-slate-200 bg-white p-2">
            <div className="flex flex-wrap gap-1.5">
              {invitees.map(i => (
                <span
                  key={i.email}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                    i.valid ? 'bg-[#eef5fd] text-[#1175E4]' : 'bg-red-50 text-red-600'
                  }`}
                >
                  {i.email}
                  <button onClick={() => removeEmail(i.email)} className="hover:opacity-70">✕</button>
                </span>
              ))}
              <Input
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                onKeyDown={handleEmailKeyDown}
                onPaste={handlePaste}
                onBlur={() => { if (emailInput) { addEmail(emailInput); setEmailInput('') } }}
                placeholder={invitees.length === 0 ? 'Type or paste emails...' : ''}
                className="!min-h-0 flex-1 border-0 !p-0 text-xs shadow-none focus-visible:ring-0"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        {invitees.length > 0 && (
          <div className="mt-2 rounded-lg bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-600">
              Preview: {validCount} valid invitation{validCount !== 1 ? 's' : ''}
              {invitees.length - validCount > 0 && (
                <span className="text-red-500"> ({invitees.length - validCount} invalid)</span>
              )}
            </div>
          </div>
        )}

        {/* Message */}
        <div className="mt-2">
          <div className="mb-1 text-xs font-semibold text-slate-600">Personal message (optional)</div>
          <Textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Welcome to the team! Please complete your IT skills assessment..."
            rows={2}
            className="text-xs"
          />
        </div>

        {/* Actions */}
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={validCount === 0 || sending}>
            {sending ? 'Sending...' : `Send ${validCount} Invitation${validCount !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Wire invitations tab and invite dialog into team page**

In `src/app/(customer)/portal/team/page.tsx`:

Add imports:
```typescript
import { InvitationsTab } from '@/components/team/invitations-tab'
import { InviteDialog } from '@/components/team/invite-dialog'
```

Add state for invite dialog:
```typescript
const [inviteOpen, setInviteOpen] = useState(false)
```

Add a `refreshData` function that re-fetches dashboard data (extract the fetch logic from `useEffect` into a named function).

Replace the invite button `onClick` with:
```typescript
onClick={() => setInviteOpen(true)}
```

Replace the invitations tab placeholder with:
```typescript
{activeTab === 'invitations' && <InvitationsTab companyId={profile.company_id} />}
```

Add the dialog before the closing `</div>`:
```typescript
<InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} onInvitesSent={refreshData} />
```

- [ ] **Step 4: Verify invite dialog and invitations tab**

Run: `npm run dev`
Navigate to `/portal/team`, click "+ Invite Members" — dialog should open. Switch to Invitations tab — should show empty state or invitation list.

- [ ] **Step 5: Commit**

```bash
git add src/components/team/invitations-tab.tsx src/components/team/invite-dialog.tsx src/app/(customer)/portal/team/page.tsx
git commit -m "feat(team): add invitations tab and bulk invite dialog with CSV support"
```

---

### Task 11: Member Score Card with Team Averages

**Files:**
- Create: `src/components/team/member-score-card.tsx`
- Modify: `src/app/(customer)/portal/home/page.tsx:113-247`

- [ ] **Step 1: Create member-score-card component**

Create `src/components/team/member-score-card.tsx`:

```typescript
'use client'

import { getMaturityLabel } from '@/lib/scoring'
import { getPhaseColor } from '@/lib/phase-colors'
import type { CompositeScore, Phase } from '@/lib/types'

interface MemberScoreCardProps {
  myScores: CompositeScore
  teamAverages: CompositeScore
  phases: Phase[]
}

const CIRCUMFERENCE = 2 * Math.PI * 52

export function MemberScoreCard({ myScores, teamAverages, phases }: MemberScoreCardProps) {
  const score = myScores.overall
  const label = getMaturityLabel(score)
  const dashOffset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE

  const badgeStyle = score <= 25 ? 'bg-red-100 text-red-700'
    : score <= 50 ? 'bg-orange-100 text-orange-700'
    : score <= 75 ? 'bg-yellow-100 text-yellow-700'
    : 'bg-green-100 text-green-700'

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-7">
      <div className="flex items-start gap-8">
        {/* Donut */}
        <div className="flex shrink-0 flex-col items-center gap-2">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="52" fill="none" stroke="#e2e8f0" strokeWidth="16" />
            <circle
              cx="70" cy="70" r="52" fill="none" stroke="#1175E4" strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 70 70)"
            />
            <text x="70" y="65" textAnchor="middle" style={{ fontSize: 24, fontWeight: 700, fill: '#0f172a' }}>{score}</text>
            <text x="70" y="80" textAnchor="middle" style={{ fontSize: 10, fill: '#94a3b8' }}>out of 100</text>
          </svg>
          <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${badgeStyle}`}>{label}</span>
        </div>

        {/* Phase bars with team average markers */}
        <div className="flex-1">
          <div className="mb-4 flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-900">Your Skill Profile</span>
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="inline-block h-0.5 w-3 bg-slate-900" /> You
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-0.5 w-3 border-t border-dashed border-slate-400" /> Team Avg
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {phases.map(phase => {
              const myPct = myScores.phases[phase.id] ?? 0
              const teamPct = teamAverages.phases[phase.id] ?? 0
              const color = getPhaseColor(phase.name)

              return (
                <div key={phase.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold" style={{ color }}>{phase.name}</span>
                    <span className="text-slate-500">
                      {myPct}% <span className="text-slate-400">(team: {teamPct}%)</span>
                    </span>
                  </div>
                  <div className="relative h-2 rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(myPct, 100)}%`, background: `linear-gradient(90deg, ${color}, ${color}88)` }}
                    />
                    {/* Team average marker */}
                    <div
                      className="absolute -top-0.5 h-3 w-0.5 rounded-sm bg-slate-400"
                      style={{ left: `${Math.min(teamPct, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Integrate member score card into home page**

In `src/app/(customer)/portal/home/page.tsx`, add logic to fetch team profile data when user has a `company_id`:

Add import:
```typescript
import { MemberScoreCard } from '@/components/team/member-score-card'
import type { MemberProfile } from '@/lib/types'
```

Add state:
```typescript
const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null)
```

In the `useEffect` `fetchData` function, add after the existing `Promise.all`:
```typescript
// Fetch team profile if user has a company
if (profile!.company_id) {
  const teamRes = await fetch('/api/team/my-profile')
  if (teamRes.ok) {
    setMemberProfile(await teamRes.json())
  }
}
```

In the render, after `<ScoreCard>`, add:
```typescript
{memberProfile && (
  <div className="mt-6">
    <MemberScoreCard
      myScores={memberProfile.myScores}
      teamAverages={memberProfile.teamAverages}
      phases={phases}
    />
  </div>
)}
```

- [ ] **Step 3: Verify home page shows team comparison**

Run: `npm run dev`
Navigate to `/portal/home` as a team member with assessment data. Should see the team average markers on the phase bars.

- [ ] **Step 4: Commit**

```bash
git add src/components/team/member-score-card.tsx src/app/(customer)/portal/home/page.tsx
git commit -m "feat(team): add member score card with team average markers on home dashboard"
```

---

### Task 12: Recommended Courses for Members

**Files:**
- Modify: `src/app/(customer)/portal/home/page.tsx`

- [ ] **Step 1: Add recommended courses section based on team profile**

In `src/app/(customer)/portal/home/page.tsx`, after the `MemberScoreCard`, add a recommended courses section using `memberProfile.recommendedCourses`:

```typescript
{memberProfile && memberProfile.recommendedCourses.length > 0 && (
  <div className="mt-6 rounded-xl border border-slate-200 bg-white p-7">
    <h2 className="text-lg font-semibold text-slate-900">Recommended for You</h2>
    <p className="mt-1 text-sm text-slate-500">Courses to help you improve in your weakest areas</p>
    <div className="mt-4 grid grid-cols-3 gap-4">
      {memberProfile.recommendedCourses.map(c => (
        <Link
          key={c.id}
          href={`/portal/academy/courses/${c.id}`}
          className="overflow-hidden rounded-lg border border-slate-200 transition-shadow hover:shadow-md"
        >
          <div className="h-16 bg-gradient-to-br from-slate-100 to-slate-200" />
          <div className="p-3">
            <div className="text-sm font-semibold text-slate-900">{c.name}</div>
            <div className="mt-0.5 text-xs" style={{ color: c.phase_color || '#64748b' }}>
              {c.phase_name} · Your score: {c.service_score}%
            </div>
          </div>
        </Link>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 2: Verify recommended courses render**

Run: `npm run dev`
Check home page shows recommended courses based on weakest service scores.

- [ ] **Step 3: Commit**

```bash
git add src/app/(customer)/portal/home/page.tsx
git commit -m "feat(team): add recommended courses section on member home page"
```

---

### Task 13: Final Integration & Smoke Test

**Files:** All previously created/modified files

- [ ] **Step 1: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 2: Run dev server and test full flow**

Run: `npm run dev`

Test as company admin:
1. Navigate to `/portal/team` — should see dashboard with stats, radar chart, service bars
2. Click "+ Invite Members" — dialog opens, can add emails, send invitations
3. Click Members tab — heatmap grid shows
4. Click Trends tab — line chart shows (or empty state)
5. Click Invitations tab — sent invitations visible

Test as team member:
1. Navigate to `/portal/home` — should see personal score card with team average markers
2. Recommended courses should appear below

- [ ] **Step 3: Commit any remaining fixes**

```bash
git add -A
git commit -m "feat(team): final integration and polish"
```
