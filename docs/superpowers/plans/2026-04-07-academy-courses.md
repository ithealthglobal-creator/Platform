# Academy Courses — Customer Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add customer-facing Academy pages — courses marketplace, my courses dashboard, adaptive course player, and certificate view with PDF download.

**Architecture:** New pages under `(customer)/portal/academy/` following existing customer portal patterns (client components, Supabase client queries, CustomerGuard auth). One new DB table (`user_course_enrollments`) for enrollment tracking. Customer sidebar extended to show L2 menu items. Reuses existing `jsPDF` certificate generation API route with a new customer-facing endpoint.

**Tech Stack:** Next.js App Router, React 19, Supabase, shadcn/ui, Tailwind CSS, IBM Carbon icons (`@carbon/icons-react`), jsPDF, Poppins font

**Design spec:** `docs/superpowers/specs/2026-04-07-academy-courses-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `supabase/migrations/20260407300001_create_user_course_enrollments.sql` | Enrollments table + RLS policies |
| `supabase/migrations/20260407300002_seed_customer_academy_menu.sql` | L2 menu items for customer Academy |
| `src/lib/phase-colors.ts` | Consolidated phase color utility (replaces duplicated constants) |
| `src/components/academy/course-card.tsx` | Marketplace course card with phase coloring |
| `src/components/academy/stats-card.tsx` | Reusable stat card for dashboard |
| `src/components/academy/course-sidebar.tsx` | Course player sidebar (sections/modules nav) |
| `src/components/academy/video-player.tsx` | YouTube iframe embed wrapper |
| `src/components/academy/assessment-taker.tsx` | Assessment question UI for course-taking |
| `src/components/academy/certificate-view.tsx` | On-screen certificate display |
| `src/app/(customer)/portal/academy/courses/page.tsx` | Courses marketplace page |
| `src/app/(customer)/portal/academy/courses/[id]/page.tsx` | Course detail / enrollment page |
| `src/app/(customer)/portal/academy/courses/[id]/learn/page.tsx` | Course player page |
| `src/app/(customer)/portal/academy/certificates/[id]/page.tsx` | Certificate view page |
| `src/app/api/certificates/download/route.ts` | Customer-facing certificate PDF endpoint |

### Modified Files

| File | Changes |
|------|---------|
| `src/lib/types.ts` | Add `UserCourseEnrollment` interface |
| `src/components/customer-sidebar.tsx` | Show L2 children when L1 has sub-items |
| `src/app/(customer)/portal/academy/page.tsx` | Replace placeholder with My Courses dashboard |
| `supabase/seed.sql` | Add sample courses + enrollments for testing |

---

## Tasks

### Task 1: Database — Enrollments Table & RLS

**Files:**
- Create: `supabase/migrations/20260407300001_create_user_course_enrollments.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- User course enrollments
CREATE TABLE public.user_course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  last_module_id uuid REFERENCES public.course_modules(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Indexes
CREATE INDEX idx_user_course_enrollments_user ON public.user_course_enrollments(user_id);
CREATE INDEX idx_user_course_enrollments_course ON public.user_course_enrollments(course_id);

-- Updated at trigger
CREATE TRIGGER user_course_enrollments_updated_at
  BEFORE UPDATE ON public.user_course_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.user_course_enrollments ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access to enrollments"
  ON public.user_course_enrollments
  FOR ALL
  USING (public.get_my_role() = 'admin');

-- Users can read their own enrollments
CREATE POLICY "Users can read own enrollments"
  ON public.user_course_enrollments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own enrollments
CREATE POLICY "Users can enroll themselves"
  ON public.user_course_enrollments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own enrollments
CREATE POLICY "Users can update own enrollments"
  ON public.user_course_enrollments
  FOR UPDATE
  USING (auth.uid() = user_id);
```

- [ ] **Step 2: Apply migration**

Run: `npx supabase db push`
Expected: Migration applied successfully

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260407300001_create_user_course_enrollments.sql
git commit -m "feat: add user_course_enrollments table with RLS"
```

---

### Task 2: Database — Customer Academy Menu Items

**Files:**
- Create: `supabase/migrations/20260407300002_seed_customer_academy_menu.sql`

- [ ] **Step 1: Create the migration file**

L2 items under the existing customer Academy L1 (`c0000000-0000-0000-0000-000000000003`).

```sql
-- Customer Academy L2 menu items
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Courses', 'education', '/portal/academy/courses', 1, 2),
  ('c1000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'My Courses', 'education', '/portal/academy', 2, 2)
ON CONFLICT (id) DO NOTHING;

-- Grant access to customer role
INSERT INTO public.role_menu_access (role, menu_item_id) VALUES
  ('customer', 'c1000000-0000-0000-0000-000000000001'),
  ('customer', 'c1000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;
```

- [ ] **Step 2: Apply migration**

Run: `npx supabase db push`
Expected: Migration applied successfully

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260407300002_seed_customer_academy_menu.sql
git commit -m "feat: seed customer Academy L2 menu items"
```

---

### Task 3: Type Definition — UserCourseEnrollment

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add the interface**

Add after the existing `UserSectionProgress` interface (around line 258):

```typescript
export interface UserCourseEnrollment {
  id: string
  user_id: string
  course_id: string
  enrolled_at: string
  completed_at: string | null
  last_active_at: string
  last_module_id: string | null
  created_at: string
  updated_at: string
  course?: Course
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add UserCourseEnrollment type"
```

---

### Task 4: Utility — Phase Colors

**Files:**
- Create: `src/lib/phase-colors.ts`

Currently phase colors are duplicated in at least 3 files. Create a single source of truth.

- [ ] **Step 1: Create the utility**

```typescript
/** Canonical phase color map — single source of truth */
export const PHASE_COLORS: Record<string, string> = {
  Operate: '#1175E4',
  Secure: '#FF246B',
  Streamline: '#133258',
  Accelerate: '#EDB600',
}

/** Get the hex color for a phase name (case-insensitive first letter match). Falls back to slate. */
export function getPhaseColor(phaseName: string | undefined | null): string {
  if (!phaseName) return '#94a3b8'
  // Try exact match first, then title-case
  return PHASE_COLORS[phaseName]
    ?? PHASE_COLORS[phaseName.charAt(0).toUpperCase() + phaseName.slice(1).toLowerCase()]
    ?? '#94a3b8'
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/phase-colors.ts
git commit -m "feat: add consolidated phase colors utility"
```

---

### Task 5: Customer Sidebar — Show L2 Children

**Files:**
- Modify: `src/components/customer-sidebar.tsx`

The customer sidebar currently only renders L1 items. Extend it to show L2 children indented under the active L1 when that L1 has sub-items.

- [ ] **Step 1: Update the sidebar to show L2 items**

The `menuTree` from `useMenu()` is a flat list. We need to find L2 items whose `parent_id` matches the L1 item's `id`. The `menuTree` context already includes all levels returned by `get_menu_tree()`.

Modify the `nav` section of `customer-sidebar.tsx` to render L2 children after each L1 item when it's active and has children. Use the `flatMenu` from the menu context (which contains all items including L2).

Replace the existing `nav` rendering in the component. The key changes:
1. Import `useMenu` to also get `flatMenu` (flat list of all menu items)
2. After each L1 button, check if there are L2 items with `parent_id === item.id`
3. If the L1 is active and has L2 children, render them indented below

```typescript
// Inside the nav map, after the L1 button, add:
{isActive && (() => {
  const children = flatMenu.filter(
    (child) => child.parent_id === item.id && child.level === 2
  )
  if (children.length === 0) return null
  return (
    <div className="ml-6 mt-0.5 space-y-0.5">
      {children.map((child) => {
        const childActive = child.route
          ? pathname === child.route
          : false
        const ChildIcon = child.icon ? iconMap[child.icon] : null
        return (
          <button
            key={child.id}
            onClick={() => router.push(child.route || '/')}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] transition-colors ${
              childActive
                ? 'bg-white/[0.18] font-medium text-white'
                : 'text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            {ChildIcon && <ChildIcon size={16} />}
            {child.label}
          </button>
        )
      })}
    </div>
  )
})()}
```

Important: The `useMenu()` hook provides both `menuTree` and `flatMenu`. Currently the component only uses `menuTree`. Destructure `flatMenu` too:

```typescript
const { menuTree, flatMenu } = useMenu()
```

- [ ] **Step 2: Verify the sidebar renders L2 items**

Run: `npm run dev`
Log in as customer, navigate to Academy — should see "Courses" and "My Courses" as indented sub-items.

- [ ] **Step 3: Commit**

```bash
git add src/components/customer-sidebar.tsx
git commit -m "feat: show L2 sub-items in customer sidebar"
```

---

### Task 6: Component — CourseCard

**Files:**
- Create: `src/components/academy/course-card.tsx`

Marketplace card component showing course info with phase coloring and enrollment state.

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { getPhaseColor } from '@/lib/phase-colors'
import type { Course, UserCourseEnrollment } from '@/lib/types'
import { useRouter } from 'next/navigation'
// Import relevant Carbon icons: Education, Time, Checkmark, CheckmarkFilled
import { Education, Time, CheckmarkFilled } from '@carbon/icons-react'

interface CourseCardProps {
  course: Course & { section_count: number; module_count: number }
  enrollment?: UserCourseEnrollment | null
  progress?: number // 0-100
}

export function CourseCard({ course, enrollment, progress }: CourseCardProps) {
  const router = useRouter()
  const phaseName = course.phase?.name ?? ''
  const phaseColor = getPhaseColor(phaseName)
  const isCompleted = enrollment?.completed_at != null
  const isEnrolled = enrollment != null

  function handleClick() {
    if (isCompleted) {
      // Navigate to certificate (need to look up certificate)
      router.push(`/portal/academy/courses/${course.id}`)
    } else if (isEnrolled) {
      router.push(`/portal/academy/courses/${course.id}/learn`)
    } else {
      router.push(`/portal/academy/courses/${course.id}`)
    }
  }

  return (
    <div
      className="bg-white overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      style={{ borderRadius: '16px 0 16px 16px' }}
      onClick={handleClick}
    >
      {/* Phase-colored header */}
      <div
        className="h-24 flex items-center justify-center relative"
        style={{ background: phaseColor, borderRadius: '16px 0 0 0' }}
      >
        <Education size={40} className="text-white" />
        {isEnrolled && !isCompleted && (
          <span
            className="absolute top-2 right-2 bg-white/90 text-[10px] font-semibold px-2.5 py-0.5 flex items-center gap-1"
            style={{ borderRadius: '8px 0 8px 8px', color: phaseColor }}
          >
            <Time size={12} />
            In Progress
          </span>
        )}
        {isCompleted && (
          <span
            className="absolute top-2 right-2 bg-white/90 text-[10px] font-semibold px-2.5 py-0.5 flex items-center gap-1 text-green-700"
            style={{ borderRadius: '8px 0 8px 8px' }}
          >
            <CheckmarkFilled size={12} className="text-green-600" />
            Completed
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="p-3.5">
        <div
          className="text-[11px] font-semibold uppercase tracking-wide mb-1"
          style={{ color: phaseColor }}
        >
          {phaseName}
        </div>
        <div className="text-[15px] font-semibold text-slate-900 mb-1.5">
          {course.name}
        </div>
        <div className="text-xs text-slate-500 mb-3 flex items-center gap-2">
          <span>{course.section_count} sections</span>
          <span>·</span>
          <span>{course.module_count} videos</span>
        </div>

        {/* Progress bar for in-progress */}
        {isEnrolled && !isCompleted && progress != null && (
          <>
            <div className="bg-slate-100 rounded h-1.5 mb-1">
              <div
                className="rounded h-1.5"
                style={{ width: `${progress}%`, background: phaseColor }}
              />
            </div>
            <div className="text-[10px] text-slate-400 text-right mb-2">
              {progress}% complete
            </div>
          </>
        )}

        {/* Action button */}
        {isCompleted ? (
          <button
            className="w-full py-2 text-xs font-semibold border border-slate-200 bg-white text-slate-900"
            style={{ borderRadius: '10px 0 10px 10px' }}
            onClick={(e) => { e.stopPropagation(); router.push(`/portal/academy/courses/${course.id}`) }}
          >
            View Certificate
          </button>
        ) : isEnrolled ? (
          <button
            className="w-full py-2 text-xs font-semibold text-white border-0"
            style={{ background: phaseColor, borderRadius: '10px 0 10px 10px' }}
            onClick={(e) => { e.stopPropagation(); router.push(`/portal/academy/courses/${course.id}/learn`) }}
          >
            Continue
          </button>
        ) : (
          <button
            className="w-full py-2 text-xs font-semibold text-white border-0"
            style={{ background: phaseColor, borderRadius: '10px 0 10px 10px' }}
            onClick={(e) => { e.stopPropagation(); router.push(`/portal/academy/courses/${course.id}`) }}
          >
            Start Course
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/academy/course-card.tsx
git commit -m "feat: add CourseCard component for marketplace"
```

---

### Task 7: Component — StatsCard

**Files:**
- Create: `src/components/academy/stats-card.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import type { CarbonIconType } from '@carbon/icons-react'

interface StatsCardProps {
  label: string
  value: number
  icon: CarbonIconType
  iconBg: string  // tailwind bg class e.g. "bg-blue-50"
  iconColor: string  // hex color for icon
}

export function StatsCard({ label, value, icon: Icon, iconBg, iconColor }: StatsCardProps) {
  return (
    <div
      className="bg-white p-4 shadow-sm flex items-center gap-3"
      style={{ borderRadius: '16px 0 16px 16px' }}
    >
      <div
        className={`w-11 h-11 flex items-center justify-center ${iconBg}`}
        style={{ borderRadius: '12px 0 12px 12px' }}
      >
        <Icon size={22} style={{ color: iconColor }} />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900 leading-none">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/academy/stats-card.tsx
git commit -m "feat: add StatsCard component for dashboard"
```

---

### Task 8: Courses Marketplace Page

**Files:**
- Create: `src/app/(customer)/portal/academy/courses/page.tsx`

- [ ] **Step 1: Create the marketplace page**

Fetches all published courses + user's enrollments + section progress. Renders a card grid with phase filter pills.

Key queries:
- `courses` where `is_published = true` and `is_active = true`, joined with `phases(name)`, with section and module counts
- `user_course_enrollments` for current user
- `user_section_progress` for progress calculation

The page should:
1. Fetch courses with `supabase.from('courses').select('*, phase:phases(name), course_sections(id, course_modules(id))').eq('is_published', true).eq('is_active', true)`
2. Fetch user enrollments with `supabase.from('user_course_enrollments').select('*').eq('user_id', profile.id)`
3. Map courses to include `section_count` and `module_count` from the nested data
4. Render phase filter pills (All + each phase from courses)
5. Render `CourseCard` grid filtered by selected phase
6. Use skeleton loader during loading

Pattern reference: `src/app/(customer)/portal/home/page.tsx` for data fetching and layout.

- [ ] **Step 2: Verify the page renders**

Run: `npm run dev`
Navigate to `/portal/academy/courses` — should show course cards (may be empty if no published courses yet).

- [ ] **Step 3: Commit**

```bash
git add src/app/(customer)/portal/academy/courses/page.tsx
git commit -m "feat: add courses marketplace page"
```

---

### Task 9: Course Detail & Enrollment Page

**Files:**
- Create: `src/app/(customer)/portal/academy/courses/[id]/page.tsx`

- [ ] **Step 1: Create the course detail page**

This page serves dual purpose:
- If not enrolled: shows course overview with section breakdown, description, "Start Course" button
- If enrolled and completed: shows completion summary with link to certificate

Key queries:
- Course with full details: `courses` joined with `phases(name)`, `course_sections(*, course_modules(*), assessments(*))`
- Enrollment: `user_course_enrollments` for current user + this course
- Certificate (if completed): `certificates` for current user + this course

Enrollment action:
1. Insert into `user_course_enrollments` with `user_id` and `course_id`
2. Insert `user_section_progress` rows for each active section (with `required = true` initially)
3. Redirect to `/portal/academy/courses/[id]/learn`

Section breakdown should show:
- Section name, description, module count, assessment count
- Phase-colored accent

- [ ] **Step 2: Test enrollment flow**

Run: `npm run dev`
Navigate to a course detail page, click "Start Course", verify enrollment creates progress rows and redirects to player.

- [ ] **Step 3: Commit**

```bash
git add src/app/(customer)/portal/academy/courses/[id]/page.tsx
git commit -m "feat: add course detail and enrollment page"
```

---

### Task 10: Component — CourseSidebar

**Files:**
- Create: `src/components/academy/course-sidebar.tsx`

- [ ] **Step 1: Create the sidebar component**

Left sidebar for the course player. Shows all sections with their modules and assessment states.

Props:
- `course`: Course with sections, modules, assessments
- `sectionProgress`: `UserSectionProgress[]` for current user
- `activeModuleId`: currently playing module ID
- `activeAssessmentId`: currently taking assessment ID (if any)
- `onSelectModule(moduleId: string)`: callback
- `onSelectAssessment(assessmentId: string)`: callback
- `phaseColor`: hex color for accent

Section states derived from `sectionProgress`:
- **Completed**: `post_assessment_passed === true`
- **Active**: first section where `post_assessment_passed === false` and `required === true`
- **Optional**: `required === false` (scored well on pre-assessment)
- **Locked**: later section that isn't unlocked yet (sequential order)

Module states within active section:
- **Completed**: module ID is in `modules_completed[]` array
- **Now Playing**: matches `activeModuleId`
- **Not Started**: not in `modules_completed` and not active

Use Carbon icons: `CheckmarkFilled`, `PlayFilledAlt`, `CircleDash`, `Locked`, `WarningAlt`, `Time`.

Width: `w-[300px]` fixed, scrollable overflow.

- [ ] **Step 2: Commit**

```bash
git add src/components/academy/course-sidebar.tsx
git commit -m "feat: add course player sidebar component"
```

---

### Task 11: Component — VideoPlayer

**Files:**
- Create: `src/components/academy/video-player.tsx`

- [ ] **Step 1: Create the component**

YouTube iframe embed. Extracts video ID from various YouTube URL formats.

```typescript
'use client'

interface VideoPlayerProps {
  youtubeUrl: string
  title: string
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export function VideoPlayer({ youtubeUrl, title }: VideoPlayerProps) {
  // Video completion is tracked at the page level via Next button clicks
  const videoId = extractYouTubeId(youtubeUrl)

  if (!videoId) {
    return (
      <div
        className="bg-slate-100 aspect-video flex items-center justify-center text-slate-500 text-sm"
        style={{ borderRadius: '16px 0 16px 16px' }}
      >
        Invalid video URL
      </div>
    )
  }

  return (
    <div style={{ borderRadius: '16px 0 16px 16px', overflow: 'hidden' }}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title}
        className="w-full aspect-video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/academy/video-player.tsx
git commit -m "feat: add YouTube video player component"
```

---

### Task 12: Component — AssessmentTaker

**Files:**
- Create: `src/components/academy/assessment-taker.tsx`

- [ ] **Step 1: Create the component**

UI for taking an assessment: shows questions one at a time (or all at once), multiple choice options, submit, and results.

Props:
- `assessment`: Assessment with `questions`
- `userId`: current user ID
- `phaseColor`: hex for accent
- `onComplete(passed: boolean, score: number)`: callback after submission

Flow:
1. Show welcome screen if `welcome_heading` set, else jump to questions
2. Display questions with radio-button options (using `question.options` jsonb array)
3. On submit: calculate score, insert `assessment_attempts` row, call `onComplete`
4. Show results: passed/failed with score, completion message if `completion_heading` set

Questions have `options: [{label, value, is_correct}]`. Score = (correct answers * points) / total points * 100. Passed = score >= `assessment.pass_threshold`.

Use Carbon icons for question numbering and result states.

- [ ] **Step 2: Commit**

```bash
git add src/components/academy/assessment-taker.tsx
git commit -m "feat: add assessment taker component"
```

---

### Task 13: Course Player Page

**Files:**
- Create: `src/app/(customer)/portal/academy/courses/[id]/learn/page.tsx`

- [ ] **Step 1: Create the course player page**

This is the main learning experience. Layout: top bar + sidebar + main content.

Data fetching:
1. Course with all sections, modules, assessments: `supabase.from('courses').select('*, phase:phases(name), course_sections(*, course_modules(*), assessments(*, assessment_questions(*)))').eq('id', courseId).single()`
2. Enrollment: `supabase.from('user_course_enrollments').select('*').eq('user_id', profile.id).eq('course_id', courseId).single()`
3. Section progress: `supabase.from('user_section_progress').select('*').eq('user_id', profile.id)`

State management:
- `activeView`: `'video' | 'assessment'`
- `activeModuleId`: current module being watched
- `activeAssessmentId`: current assessment being taken
- `sectionProgress`: array of progress records

Logic for initial active module:
- If enrollment has `last_module_id`, resume there
- Else start at first module of first required section

When a video completes (user clicks Next or manual mark):
1. Add module ID to section's `modules_completed` array via `supabase.from('user_section_progress').update()`
2. Update `user_course_enrollments.last_module_id` and `last_active_at`
3. If all modules in section done, show post-assessment
4. If post-assessment not yet done, switch to assessment view

When pre-assessment completes:
1. Update `user_section_progress.pre_assessment_passed = true`
2. If score >= threshold, set `required = false` (section becomes optional)

When post-assessment completes:
1. Update `user_section_progress.post_assessment_passed = true`
2. Check if all required sections are completed
3. If course complete: create certificate, update enrollment `completed_at`, show congratulations

Certificate creation on completion:
1. Calculate final score (weighted average of post-assessment scores)
2. Generate certificate number: `CERT-${year}-${phaseAbbrev}-${random5digits}`
3. Insert into `certificates` table
4. Update `user_course_enrollments.completed_at`
5. Show congratulations with link to certificate page

Render:
- Top bar: back button, course name, phase badge, progress bar
- `CourseSidebar` on left
- Main area: `VideoPlayer` or `AssessmentTaker` depending on `activeView`
- Previous/Next navigation below video

- [ ] **Step 2: Test the full learning flow**

Run: `npm run dev`
Enroll in a course, take pre-assessment, watch videos, take post-assessment, verify section completion and progress tracking.

- [ ] **Step 3: Commit**

```bash
git add src/app/(customer)/portal/academy/courses/[id]/learn/page.tsx
git commit -m "feat: add course player page with adaptive learning"
```

---

### Task 14: My Courses Dashboard Page

**Files:**
- Modify: `src/app/(customer)/portal/academy/page.tsx`

- [ ] **Step 1: Replace placeholder with dashboard**

Queries:
1. Enrollments: `supabase.from('user_course_enrollments').select('*, course:courses(*, phase:phases(name))').eq('user_id', profile.id).order('last_active_at', { ascending: false })`
2. Section progress for all enrolled courses: `supabase.from('user_section_progress').select('*').eq('user_id', profile.id)`
3. Certificates: `supabase.from('certificates').select('id, course_id').eq('user_id', profile.id)`

Compute stats:
- Enrolled = enrollments.length
- In Progress = enrollments where `completed_at` is null
- Completed = enrollments where `completed_at` is not null
- Certificates = certificates.length

Render:
- Stats row with 4 `StatsCard` components
- Filter pills: All / In Progress / Completed
- Enrolled course list (rows, not cards):
  - Phase-colored icon square, course name + phase badge, progress info, action button
  - In-progress: sections completed count, last active time, progress bar, "Continue" button
  - Completed: score, completion date, green bar, "Certificate" button

Use Carbon icons: `Document`, `Time`, `CheckmarkFilled`, `Certificate`.

- [ ] **Step 2: Verify the dashboard renders**

Run: `npm run dev`
Navigate to `/portal/academy` — should show stats and enrolled courses.

- [ ] **Step 3: Commit**

```bash
git add src/app/(customer)/portal/academy/page.tsx
git commit -m "feat: add My Courses dashboard page"
```

---

### Task 15: Component — CertificateView

**Files:**
- Create: `src/components/academy/certificate-view.tsx`

- [ ] **Step 1: Create the component**

On-screen certificate display matching the approved mockup design.

Props:
- `certificate`: Certificate with `course` and `user` (profile) joined
- `phaseName`: string
- `companyName`: string

Renders:
- Phase-colored gradient header band
- Certificate icon + "Certificate of Completion" + course name
- "Awarded To" section: user display name + company name
- Details grid: Phase (with color dot), Score (%), Date Issued
- Certificate number in monospace
- IThealth.ai branding
- Download PDF + Share Link buttons
- Course summary stats below

Download PDF button calls `/api/certificates/download?id={certificate_id}` which generates and returns the PDF.

Share Link button copies a public URL to clipboard (toast confirmation).

- [ ] **Step 2: Commit**

```bash
git add src/components/academy/certificate-view.tsx
git commit -m "feat: add certificate view component"
```

---

### Task 16: Certificate View Page

**Files:**
- Create: `src/app/(customer)/portal/academy/certificates/[id]/page.tsx`

- [ ] **Step 1: Create the page**

Fetches certificate with joined course and profile data, renders `CertificateView`.

Query: `supabase.from('certificates').select('*, course:courses(*, phase:phases(name))').eq('id', certId).eq('user_id', profile.id).single()`

Also fetch company name from profile: `profile.company?.name`

Handle error states:
- Certificate not found: show message + back to My Courses link
- Certificate revoked: show revoked message

- [ ] **Step 2: Commit**

```bash
git add src/app/(customer)/portal/academy/certificates/[id]/page.tsx
git commit -m "feat: add certificate view page"
```

---

### Task 17: API — Customer Certificate PDF Download

**Files:**
- Create: `src/app/api/certificates/download/route.ts`

- [ ] **Step 1: Create the API route**

Adapted from existing `/api/certificates/generate/route.ts` but accessible to the certificate owner (not admin-only). Note: the spec mentions `@react-pdf/renderer` client-side, but we use the existing server-side `jsPDF` approach since it's already proven in the codebase and avoids adding a new dependency.

Key differences from the admin route:
- Verifies the requesting user owns the certificate (not admin check)
- Uses same jsPDF generation logic
- Returns the PDF as a downloadable response (not upload to storage)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'

export async function GET(request: NextRequest) {
  const certId = request.nextUrl.searchParams.get('id')
  if (!certId) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  // Auth: get user from token
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch certificate — only if owned by requesting user
  const { data: certificate, error: certError } = await supabaseAdmin
    .from('certificates')
    .select('*, courses(name, phase:phases(name)), profiles:user_id(display_name, email, company:companies(name))')
    .eq('id', certId)
    .eq('user_id', user.id)
    .single()

  if (certError || !certificate) {
    return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
  }

  // Generate PDF — adapted from /api/certificates/generate/route.ts
  const userName = certificate.profiles?.display_name || certificate.profiles?.email || 'Unknown User'
  const courseName = certificate.courses?.name || 'Unknown Course'
  const phaseName = certificate.courses?.phase?.name || ''
  const companyName = certificate.profiles?.company?.name || ''
  const score = certificate.score
  const certificateNumber = certificate.certificate_number
  const issuedAt = new Date(certificate.issued_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Border
  doc.setDrawColor(0, 102, 153)
  doc.setLineWidth(2)
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20)
  doc.setLineWidth(0.5)
  doc.rect(14, 14, pageWidth - 28, pageHeight - 28)

  // Header
  doc.setFontSize(16)
  doc.setTextColor(0, 102, 153)
  doc.text('IThealth.ai', pageWidth / 2, 32, { align: 'center' })

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text('Your IT Modernisation Champion', pageWidth / 2, 40, { align: 'center' })

  doc.setDrawColor(0, 102, 153)
  doc.setLineWidth(0.5)
  doc.line(60, 46, pageWidth - 60, 46)

  doc.setFontSize(28)
  doc.setTextColor(40, 40, 40)
  doc.text('Certificate of Completion', pageWidth / 2, 62, { align: 'center' })

  doc.setFontSize(12)
  doc.setTextColor(100, 100, 100)
  doc.text('This is to certify that', pageWidth / 2, 78, { align: 'center' })

  doc.setFontSize(24)
  doc.setTextColor(0, 51, 102)
  doc.text(userName, pageWidth / 2, 92, { align: 'center' })

  if (companyName) {
    doc.setFontSize(12)
    doc.setTextColor(100, 100, 100)
    doc.text(companyName, pageWidth / 2, 100, { align: 'center' })
  }

  doc.setFontSize(12)
  doc.setTextColor(100, 100, 100)
  doc.text('has successfully completed', pageWidth / 2, 110, { align: 'center' })

  doc.setFontSize(18)
  doc.setTextColor(40, 40, 40)
  doc.text(courseName, pageWidth / 2, 124, { align: 'center' })

  if (phaseName) {
    doc.setFontSize(11)
    doc.setTextColor(100, 100, 100)
    doc.text(`Phase: ${phaseName}`, pageWidth / 2, 132, { align: 'center' })
  }

  doc.setFontSize(14)
  doc.setTextColor(0, 102, 153)
  doc.text(`Score: ${score}%`, pageWidth / 2, 142, { align: 'center' })

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Certificate No: ${certificateNumber}`, pageWidth / 2, 158, { align: 'center' })
  doc.text(`Issued: ${issuedAt}`, pageWidth / 2, 165, { align: 'center' })

  const pdfArrayBuffer = doc.output('arraybuffer')
  return new NextResponse(pdfArrayBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="certificate-${certificate.certificate_number}.pdf"`,
    },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/certificates/download/route.ts
git commit -m "feat: add customer certificate PDF download endpoint"
```

---

### Task 18: Seed Data — Sample Courses for Testing

**Files:**
- Modify: `supabase/seed.sql`

- [ ] **Step 1: Add sample courses, sections, modules, and assessments**

Add at the end of seed.sql (before any ON CONFLICT clauses):
- 2-3 published courses linked to different phases
- 2-3 sections per course with sort_order
- 2-3 modules per section with YouTube URLs (use official YouTube test/demo videos)
- Pre and post assessments per section with 3-5 questions each
- Sample enrollment + progress for the test customer user

This provides a working dataset for testing the full flow.

- [ ] **Step 2: Reset database to verify seed**

Run: `npx supabase db reset`
Expected: All data seeded, courses visible in admin, customer can see published courses.

- [ ] **Step 3: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat: seed sample academy courses for testing"
```

---

### Task 19: Integration — End-to-End Verification

- [ ] **Step 1: Verify marketplace**

Run: `npm run dev`
Login as customer (`customer@acmesolutions.co.za`). Navigate to Academy > Courses. Verify:
- Phase filter pills work
- Course cards show with correct phase colors
- Cards show correct section/module counts

- [ ] **Step 2: Verify enrollment**

Click "Start Course" on a course. Verify:
- Enrollment created in `user_course_enrollments`
- Section progress rows created in `user_section_progress`
- Redirected to course player

- [ ] **Step 3: Verify course player**

In the course player, verify:
- Sidebar shows sections with correct states
- YouTube video plays in main area
- Can navigate between modules
- Pre-assessment shows before section content
- Marking videos as complete updates progress

- [ ] **Step 4: Verify adaptive learning**

Take a pre-assessment and score above threshold. Verify:
- Section marked as optional in sidebar
- Can skip to next section

- [ ] **Step 5: Verify course completion**

Complete all required sections. Verify:
- Certificate auto-created
- Congratulations shown
- Certificate visible on certificate page
- PDF download works

- [ ] **Step 6: Verify My Courses dashboard**

Navigate to Academy > My Courses. Verify:
- Stats cards show correct counts
- Enrolled courses list shows with progress
- Filter pills work
- Completed courses show certificate button

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete Academy courses customer portal feature"
```
