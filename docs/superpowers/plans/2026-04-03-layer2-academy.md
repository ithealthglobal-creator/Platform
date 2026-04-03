# Layer 2: Academy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Academy system — courses with sections, pre/post assessments (MCQ), YouTube modules, adaptive learning paths, and PDF certificate generation. Admin management pages at `/academy/courses` and `/academy/certificates`.

**Architecture:** 8 new database tables with RLS, a course list page, a full-page course editor with nested sections/modules/assessments, a certificates list page, and a PDF generation API route. Follows existing CRUD patterns (Companies/Phases pages) for list views, with a more complex nested editor for course creation.

**Tech Stack:** Next.js (App Router), React, TypeScript, shadcn/ui, Tailwind CSS, @carbon/icons-react, Supabase, Sonner, @react-pdf/renderer (for certificate PDFs)

**Spec:** `docs/superpowers/specs/2026-04-03-layer2-academy-design.md`

---

## File Map

```
IThealth.ai/
├── supabase/
│   ├── migrations/
│   │   ├── 20260403100001_create_courses.sql
│   │   ├── 20260403100002_create_course_sections.sql
│   │   ├── 20260403100003_create_course_modules.sql
│   │   ├── 20260403100004_create_assessments.sql
│   │   ├── 20260403100005_create_assessment_questions.sql
│   │   ├── 20260403100006_create_assessment_attempts.sql
│   │   ├── 20260403100007_create_certificates.sql
│   │   ├── 20260403100008_create_user_section_progress.sql
│   │   ├── 20260403100009_academy_rls_policies.sql
│   │   └── 20260403100010_academy_menu_update.sql
│   └── seed.sql                                         # Modified: rename Certifications→Certificates
├── src/
│   ├── lib/
│   │   └── types.ts                                     # Modified: add Academy interfaces
│   ├── app/
│   │   ├── api/
│   │   │   └── certificates/
│   │   │       └── generate/route.ts                    # New: PDF generation endpoint
│   │   └── (admin)/
│   │       └── academy/
│   │           ├── courses/
│   │           │   ├── page.tsx                          # New: Courses list
│   │           │   └── [id]/
│   │           │       └── edit/
│   │           │           └── page.tsx                  # New: Course editor (full page)
│   │           └── certificates/
│   │               └── page.tsx                          # New: Certificates list
│   └── components/
│       └── academy/
│           ├── section-editor.tsx                        # New: Section with modules + assessments
│           ├── assessment-editor.tsx                     # New: Assessment questions editor
│           └── module-editor.tsx                         # New: YouTube module list editor
```

---

## Task 1: Database Migrations — Tables

**Files:**
- Create: `supabase/migrations/20260403100001_create_courses.sql`
- Create: `supabase/migrations/20260403100002_create_course_sections.sql`
- Create: `supabase/migrations/20260403100003_create_course_modules.sql`
- Create: `supabase/migrations/20260403100004_create_assessments.sql`
- Create: `supabase/migrations/20260403100005_create_assessment_questions.sql`
- Create: `supabase/migrations/20260403100006_create_assessment_attempts.sql`
- Create: `supabase/migrations/20260403100007_create_certificates.sql`
- Create: `supabase/migrations/20260403100008_create_user_section_progress.sql`

- [ ] **Step 1: Create courses migration**

`supabase/migrations/20260403100001_create_courses.sql`:

```sql
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  phase_id uuid REFERENCES public.phases(id),
  service_id uuid,
  thumbnail_url text,
  is_published boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_courses_phase_id ON public.courses(phase_id);
CREATE INDEX idx_courses_is_published ON public.courses(is_published);

CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

Note: `service_id` is a plain uuid with no FK — the `services` table doesn't exist yet (Layer 3 will add the FK constraint).

- [ ] **Step 2: Create course_sections migration**

`supabase/migrations/20260403100002_create_course_sections.sql`:

```sql
CREATE TABLE public.course_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_course_sections_course_sort ON public.course_sections(course_id, sort_order);

CREATE TRIGGER course_sections_updated_at
  BEFORE UPDATE ON public.course_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 3: Create course_modules migration**

`supabase/migrations/20260403100003_create_course_modules.sql`:

```sql
CREATE TABLE public.course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  youtube_url text NOT NULL,
  duration_minutes integer,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_course_modules_section_sort ON public.course_modules(section_id, sort_order);

CREATE TRIGGER course_modules_updated_at
  BEFORE UPDATE ON public.course_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 4: Create assessments migration**

`supabase/migrations/20260403100004_create_assessments.sql`:

```sql
CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('pre', 'post')),
  name text NOT NULL,
  description text,
  pass_threshold integer NOT NULL DEFAULT 80,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_assessments_section_type ON public.assessments(section_id, type);
CREATE INDEX idx_assessments_section ON public.assessments(section_id);

CREATE TRIGGER assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 5: Create assessment_questions migration**

`supabase/migrations/20260403100005_create_assessment_questions.sql`:

```sql
CREATE TABLE public.assessment_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  options jsonb NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_assessment_questions_assessment_sort ON public.assessment_questions(assessment_id, sort_order);

CREATE TRIGGER assessment_questions_updated_at
  BEFORE UPDATE ON public.assessment_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 6: Create assessment_attempts migration**

`supabase/migrations/20260403100006_create_assessment_attempts.sql`:

```sql
CREATE TABLE public.assessment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer NOT NULL,
  passed boolean NOT NULL,
  answers jsonb NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_assessment_attempts_assessment_user ON public.assessment_attempts(assessment_id, user_id);
```

- [ ] **Step 7: Create certificates migration**

`supabase/migrations/20260403100007_create_certificates.sql`:

```sql
CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certificate_number text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  score integer NOT NULL,
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_certificates_course_user ON public.certificates(course_id, user_id);
CREATE INDEX idx_certificates_user ON public.certificates(user_id);
```

- [ ] **Step 8: Create user_section_progress migration**

`supabase/migrations/20260403100008_create_user_section_progress.sql`:

```sql
CREATE TABLE public.user_section_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
  required boolean NOT NULL DEFAULT true,
  modules_completed jsonb DEFAULT '[]',
  pre_assessment_passed boolean DEFAULT false,
  post_assessment_passed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_section_progress ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_user_section_progress_user_section ON public.user_section_progress(user_id, section_id);

CREATE TRIGGER user_section_progress_updated_at
  BEFORE UPDATE ON public.user_section_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/20260403100*.sql
git commit -m "feat: add layer 2 academy table migrations"
```

---

## Task 2: RLS Policies & Menu Update

**Files:**
- Create: `supabase/migrations/20260403100009_academy_rls_policies.sql`
- Create: `supabase/migrations/20260403100010_academy_menu_update.sql`

- [ ] **Step 1: Create RLS policies**

`supabase/migrations/20260403100009_academy_rls_policies.sql`:

```sql
-- Courses: admins full CRUD, authenticated read published
CREATE POLICY "Admins full access to courses"
  ON public.courses FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated read published courses"
  ON public.courses FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_published = true);

-- Course sections: admins full CRUD, authenticated read
CREATE POLICY "Admins full access to course_sections"
  ON public.course_sections FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated read course_sections"
  ON public.course_sections FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Course modules: admins full CRUD, authenticated read
CREATE POLICY "Admins full access to course_modules"
  ON public.course_modules FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated read course_modules"
  ON public.course_modules FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Assessments: admins full CRUD, authenticated read
CREATE POLICY "Admins full access to assessments"
  ON public.assessments FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated read assessments"
  ON public.assessments FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Assessment questions: admins full CRUD, authenticated read
CREATE POLICY "Admins full access to assessment_questions"
  ON public.assessment_questions FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated read assessment_questions"
  ON public.assessment_questions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Assessment attempts: admins full CRUD, users manage own
CREATE POLICY "Admins full access to assessment_attempts"
  ON public.assessment_attempts FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Users insert own attempts"
  ON public.assessment_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own attempts"
  ON public.assessment_attempts FOR SELECT
  USING (auth.uid() = user_id);

-- Certificates: admins full CRUD, users read own
CREATE POLICY "Admins full access to certificates"
  ON public.certificates FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Users read own certificates"
  ON public.certificates FOR SELECT
  USING (auth.uid() = user_id);

-- User section progress: admins full CRUD, users manage own
CREATE POLICY "Admins full access to user_section_progress"
  ON public.user_section_progress FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Users manage own progress"
  ON public.user_section_progress FOR ALL
  USING (auth.uid() = user_id);
```

- [ ] **Step 2: Create menu update migration**

`supabase/migrations/20260403100010_academy_menu_update.sql`:

```sql
-- Rename "Certifications" to "Certificates" in menu_items
UPDATE public.menu_items
SET label = 'Certificates', route = '/academy/certificates'
WHERE label = 'Certifications' AND route = '/academy/certifications';

-- If route was already /academy/certificates, just ensure label is correct
UPDATE public.menu_items
SET label = 'Certificates'
WHERE route = '/academy/certificates' AND label != 'Certificates';
```

Note: The existing seed data already has Courses and Certifications L2 items under Academy. This migration just renames Certifications→Certificates. If the seed data already says "Certificates", this is a no-op.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260403100009_academy_rls_policies.sql supabase/migrations/20260403100010_academy_menu_update.sql
git commit -m "feat: add academy RLS policies and menu update"
```

---

## Task 3: TypeScript Types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add Academy interfaces to types.ts**

Append to `src/lib/types.ts`:

```typescript
export type AssessmentType = 'pre' | 'post'

export interface QuestionOption {
  label: string
  value: string
  is_correct: boolean
}

export interface Course {
  id: string
  name: string
  description: string | null
  phase_id: string | null
  service_id: string | null
  thumbnail_url: string | null
  is_published: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  phase?: Phase
  sections?: CourseSection[]
}

export interface CourseSection {
  id: string
  course_id: string
  name: string
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  modules?: CourseModule[]
  assessments?: Assessment[]
}

export interface CourseModule {
  id: string
  section_id: string
  title: string
  description: string | null
  youtube_url: string
  duration_minutes: number | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Assessment {
  id: string
  section_id: string
  type: AssessmentType
  name: string
  description: string | null
  pass_threshold: number
  is_active: boolean
  created_at: string
  updated_at: string
  questions?: AssessmentQuestion[]
}

export interface AssessmentQuestion {
  id: string
  assessment_id: string
  question_text: string
  options: QuestionOption[]
  sort_order: number
  points: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AssessmentAttempt {
  id: string
  assessment_id: string
  user_id: string
  score: number
  passed: boolean
  answers: { question_id: string; selected_option: string; correct: boolean }[]
  started_at: string
  completed_at: string | null
  created_at: string
}

export interface Certificate {
  id: string
  course_id: string
  user_id: string
  certificate_number: string
  issued_at: string
  revoked_at: string | null
  score: number
  pdf_url: string | null
  created_at: string
  course?: Course
  user?: Profile
}

export interface UserSectionProgress {
  id: string
  user_id: string
  section_id: string
  required: boolean
  modules_completed: string[]
  pre_assessment_passed: boolean
  post_assessment_passed: boolean
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add academy TypeScript types"
```

---

## Task 4: Courses List Page

**Files:**
- Create: `src/app/(admin)/academy/courses/page.tsx`

This replaces the existing Academy placeholder. Follows the Companies page pattern.

- [ ] **Step 1: Create courses list page**

`src/app/(admin)/academy/courses/page.tsx`:

Table columns: Name, Phase, Sections (count), Published (badge), Status (badge), Actions (Edit, Delete).

Features:
- Fetch courses with phase join: `supabase.from('courses').select('*, phase:phases(name), course_sections(count)').order('name')`
- "Add Course" button navigates to `/academy/courses/new/edit`
- Edit button navigates to `/academy/courses/[id]/edit`
- Delete with confirmation
- Published badge (Yes/No)
- Active/Inactive badge
- Uses Carbon icons: `Add`, `Edit`, `TrashCan`
- Do NOT use lucide-react

Follow the exact patterns from `src/app/(admin)/services/phases/page.tsx` for the list view structure: `useCallback` for fetch, loading state, table layout, toast notifications.

- [ ] **Step 2: Commit**

```bash
git add "src/app/(admin)/academy/courses/page.tsx"
git commit -m "feat: add academy courses list page"
```

---

## Task 5: Course Editor — Details Tab

**Files:**
- Create: `src/app/(admin)/academy/courses/[id]/edit/page.tsx`

This is a full-page editor with two tabs: Details and Sections. Start with the Details tab — the course metadata form.

- [ ] **Step 1: Create the course editor page**

`src/app/(admin)/academy/courses/[id]/edit/page.tsx`:

This is a `'use client'` page that:
- Takes `params.id` from the URL (`new` for creation, uuid for editing)
- Has two tabs using shadcn Tabs component: "Details" and "Sections"
- Details tab: name (text input, required), description (textarea), phase (select dropdown fetched from phases table), is_published (checkbox), is_active (checkbox)
- On save: insert or update the course in Supabase
- After creating a new course, replace URL with `/academy/courses/[new-id]/edit` using `router.replace`
- Toast notifications for success/error
- "Back to Courses" link at top

The Sections tab will be built in Task 6.

- [ ] **Step 2: Commit**

```bash
git add "src/app/(admin)/academy/courses/[id]/edit/"
git commit -m "feat: add course editor page with details tab"
```

---

## Task 6: Course Editor — Sections Tab with Nested Components

**Files:**
- Create: `src/components/academy/section-editor.tsx`
- Create: `src/components/academy/module-editor.tsx`
- Create: `src/components/academy/assessment-editor.tsx`
- Modify: `src/app/(admin)/academy/courses/[id]/edit/page.tsx` (add Sections tab content)

This is the most complex task. The Sections tab shows an ordered list of sections. Each section expands (accordion-style) to show:
- Section name + description fields
- Pre-assessment editor (questions)
- Modules editor (YouTube videos)
- Post-assessment editor (questions)

- [ ] **Step 1: Create module-editor component**

`src/components/academy/module-editor.tsx`:

A component that manages YouTube video modules for a section.

Props: `{ sectionId: string }`

Features:
- Fetches modules for the section from `course_modules` table
- "Add Module" button opens inline form (or dialog): title, youtube_url, description, duration_minutes, sort_order
- Edit and delete buttons per module
- Saves to `course_modules` via Supabase client
- Displays YouTube URL as a link
- Uses Carbon icons: `Add`, `Edit`, `TrashCan`

- [ ] **Step 2: Create assessment-editor component**

`src/components/academy/assessment-editor.tsx`:

A component that manages an assessment (pre or post) for a section.

Props: `{ sectionId: string; type: 'pre' | 'post' }`

Features:
- Fetches or creates the assessment for this section+type from `assessments` table
- Shows assessment name, description, pass_threshold fields (editable inline)
- Lists questions from `assessment_questions` ordered by sort_order
- "Add Question" opens a dialog/inline form with: question_text (textarea), options (4 text inputs with radio for correct answer), points, sort_order
- Edit and delete buttons per question
- Options are stored as JSONB array: `[{label: "A", value: "text", is_correct: boolean}, ...]`
- Uses Carbon icons: `Add`, `Edit`, `TrashCan`

- [ ] **Step 3: Create section-editor component**

`src/components/academy/section-editor.tsx`:

A component for a single course section that contains the module and assessment editors.

Props: `{ section: CourseSection; onUpdate: () => void; onDelete: (id: string) => void }`

Features:
- Collapsible/expandable (accordion) showing section name + sort_order in header
- When expanded shows:
  - Section name (editable) + description (editable) + sort_order + save button
  - Pre-Assessment section: `<AssessmentEditor sectionId={section.id} type="pre" />`
  - Modules section: `<ModuleEditor sectionId={section.id} />`
  - Post-Assessment section: `<AssessmentEditor sectionId={section.id} type="post" />`
- Delete section button (with confirmation)

- [ ] **Step 4: Wire sections tab in course editor**

Modify `src/app/(admin)/academy/courses/[id]/edit/page.tsx`:

In the "Sections" tab:
- Fetch sections for the course: `supabase.from('course_sections').select('*').eq('course_id', courseId).order('sort_order')`
- "Add Section" button: creates a new section with a default name
- Render a `<SectionEditor>` for each section
- Sections are displayed as a vertical list of expandable cards

- [ ] **Step 5: Commit**

```bash
git add src/components/academy/ "src/app/(admin)/academy/courses/"
git commit -m "feat: add course sections editor with modules and assessments"
```

---

## Task 7: Certificates List Page

**Files:**
- Create: `src/app/(admin)/academy/certificates/page.tsx`

- [ ] **Step 1: Create certificates list page**

`src/app/(admin)/academy/certificates/page.tsx`:

Table columns: Certificate # (CERT-YYYY-NNNNN), User, Course, Score, Issued (date), Status (active/revoked), Actions (View PDF, Revoke).

Features:
- Fetch certificates with joins: `supabase.from('certificates').select('*, course:courses(name), user:profiles!certificates_user_id_fkey(display_name)').order('issued_at', { ascending: false })`
  - Note: the join to profiles needs the explicit FK hint since user_id references auth.users, not profiles. Use a Supabase RPC or a two-step fetch if the join doesn't work directly. Alternative: fetch certificates then fetch profiles separately by user_id.
- "View PDF" button: opens `pdf_url` in new tab (or disabled if no PDF)
- "Revoke" button: sets `revoked_at` to current timestamp, with confirmation dialog
- Status column shows "Active" or "Revoked" based on `revoked_at`
- No "Add Certificate" button — certificates are auto-generated (future learner flow)
- Uses Carbon icons: `View`, `Close` (for revoke) from @carbon/icons-react

- [ ] **Step 2: Commit**

```bash
git add "src/app/(admin)/academy/certificates/page.tsx"
git commit -m "feat: add certificates list page"
```

---

## Task 8: Certificate PDF Generation API

**Files:**
- Create: `src/app/api/certificates/generate/route.ts`

- [ ] **Step 1: Install @react-pdf/renderer**

```bash
npm install @react-pdf/renderer
```

- [ ] **Step 2: Create the PDF generation route handler**

`src/app/api/certificates/generate/route.ts`:

This Route Handler:
- Accepts POST with `{ certificate_id }` in the body
- Verifies the caller is an admin (same pattern as `/api/admin/users/route.ts`)
- Fetches the certificate with course and user details using `supabaseAdmin`
- Generates a PDF using `@react-pdf/renderer` with:
  - IThealth branding header
  - "Certificate of Completion"
  - User's display name
  - Course name
  - Score percentage
  - Certificate number
  - Issue date
  - Simple, clean layout
- Uploads the PDF to Supabase Storage bucket `certificates` at path `certificates/{certificate_id}.pdf`
- Updates the certificate row with the `pdf_url`
- Returns the URL

Uses `supabaseAdmin` from `@/lib/supabase-server`.

If `@react-pdf/renderer` has SSR issues in Next.js Route Handlers, fall back to generating a simple HTML string and converting with a lighter approach. The key requirement is producing a downloadable PDF.

- [ ] **Step 3: Create Supabase Storage bucket**

The `certificates` bucket needs to be created. Add a migration or create it via the setup script:

```sql
-- This can be added as a migration or run manually
INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', true)
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/certificates/ package.json package-lock.json
git commit -m "feat: add certificate PDF generation API"
```

---

## Task 9: Apply Migrations & Verify

**Files:** None (verification only)

- [ ] **Step 1: Apply migrations to running Supabase**

If Supabase is running, either:
- `npx supabase db reset` (resets and re-applies all migrations + seed)
- Or apply new migrations individually via psql

- [ ] **Step 2: Verify tables exist**

```bash
PGPASSWORD=postgres psql -h localhost -p 54342 -U postgres -d postgres -c "\dt public.*" | grep -E "courses|sections|modules|assessments|questions|attempts|certificates|progress"
```

Expected: 8 new tables.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: all new routes compile without errors, including:
- `/academy/courses`
- `/academy/courses/[id]/edit`
- `/academy/certificates`
- `/api/certificates/generate`

- [ ] **Step 4: Smoke test**

Navigate through:
1. `/academy/courses` — list page renders
2. Click "Add Course" — editor opens with Details tab
3. Fill in name + phase, save — course created
4. Switch to Sections tab — "Add Section" works
5. Expand section — module editor, assessment editors render
6. Add a question to pre-assessment — saves correctly
7. Add a YouTube module — saves correctly
8. `/academy/certificates` — list page renders (empty)

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "feat: complete layer 2 academy foundations"
```
