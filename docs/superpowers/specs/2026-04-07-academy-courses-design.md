# Academy Courses — Customer Portal Design Spec

**Date:** 2026-04-07
**Status:** Approved

## Overview

Add a customer-facing Academy experience to the portal. Customers can browse a marketplace of published courses, self-enroll, take courses with adaptive learning, complete assessments, and earn certificates with PDF download.

## Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/portal/academy/courses` | Courses Marketplace | Browse all published courses as phase-colored card grid, filterable by phase |
| `/portal/academy` | My Courses Dashboard | Stats bar (enrolled, in-progress, completed, certificates) + enrolled course list with progress tracking |
| `/portal/academy/courses/[id]` | Course Detail | Course overview with section breakdown and enroll/start button |
| `/portal/academy/courses/[id]/learn` | Course Player | Sidebar with sections/modules + YouTube video player + adaptive progress |
| `/portal/academy/certificates/[id]` | Certificate View | On-screen certificate with PDF download and share link |

## Menu Structure

Two new L2 items under the existing Academy L1 menu item in the customer portal:

| Label | Route | Level | Parent |
|-------|-------|-------|--------|
| Courses | `/portal/academy/courses` | 2 | Academy (L1) |
| My Courses | `/portal/academy` | 2 | Academy (L1) |

Access granted to `customer` role via `role_menu_access`.

## Core Flows

### 1. Browse & Enroll

1. User navigates to Courses marketplace via L2 menu
2. Sees card grid of all published courses (`is_published = true`)
3. Each card shows: phase-colored header with Carbon icon, phase label, course name, section count, video count
4. Phase filter pills at top (All, Operate, Secure, Streamline, Accelerate)
5. Card states: "Start Course" (not enrolled), "Continue" with progress bar (enrolled/in-progress), "View Certificate" (completed)
6. Clicking "Start Course" creates `user_section_progress` rows for all sections and redirects to course player
7. Clicking "Continue" goes to course player at last active module

### 2. Adaptive Learning Flow

For each section in a course:

1. **Pre-assessment** — User takes pre-assessment for the section
2. **Score evaluation** — If score >= section's threshold (from `assessments.pass_threshold`), section is marked `required = false` (optional)
3. **Required sections** — User must watch all videos and pass post-assessment
4. **Optional sections** — Dimmed in sidebar, user can skip or optionally complete them
5. **Sequential unlock** — Sections unlock in order; completing one unlocks the next

### 3. Course Player

**Layout:** Top navigation bar + left sidebar (300px) + main content area

**Top bar:**
- Back to My Courses link
- Course name + phase badge
- Overall progress bar

**Sidebar (section list):**
- Each section shows state: Completed (green check), Active (phase color, expanded), Optional (dimmed with pre-assessment score), Locked (lock icon)
- Active section expands to show: Pre-assessment, Module list (videos), Post-assessment
- Module states: Completed (check), Now Playing (phase color highlight), Not Started (grey dot)
- Post-assessment locked until all section videos are watched

**Main content:**
- Embedded YouTube player (iframe)
- Video title, duration, section context, position (e.g., "Video 2 of 3")
- Video description
- Previous / Next navigation buttons

**When showing assessment:** Main area switches to assessment UI (questions with multiple choice options, submit button)

### 4. Course Completion & Certificate

1. User completes all required sections (all post-assessments passed)
2. Final score calculated as weighted average of post-assessment scores
3. Certificate auto-generated:
   - Create `certificates` row with unique `certificate_number`, `score`, `issued_at`
   - Generate PDF certificate and store URL in `pdf_url`
4. User sees congratulations screen with link to certificate
5. Certificate page shows:
   - Phase-colored header band with gradient
   - "Certificate of Completion" + course name
   - Awarded to: user name + company name
   - Details: Phase (with color dot), Score, Date Issued
   - Certificate number (monospace)
   - IThealth.ai branding
   - Download PDF + Share Link buttons
   - Course summary stats below (sections, videos, assessments, time spent)

### 5. My Courses Dashboard

**Stats row (4 cards):**
- Enrolled (total courses)
- In Progress (active courses)
- Completed (finished courses)
- Certificates (earned count)

**Enrolled courses list:**
- Each row: phase-colored icon, course name, phase badge, progress info, action button
- In-progress: shows "X of Y sections completed", last active time, progress bar in phase color, "Continue" button
- Completed: shows "All sections completed", score, completion date, green 100% bar, "Certificate" button
- Filter pills: All / In Progress / Completed

## Database

### Existing Tables Used (no schema changes needed)

- `courses` — course metadata, `phase_id` for phase color association
- `course_sections` — sections within courses, `sort_order` for sequential unlock
- `course_modules` — YouTube video modules within sections
- `assessments` — pre/post assessments per section (scope = `course_section`)
- `assessment_questions` — multiple choice questions
- `assessment_attempts` — user attempt records with scores
- `user_section_progress` — tracks `modules_completed`, `pre_assessment_passed`, `post_assessment_passed`, `required`
- `certificates` — issued certificates with `certificate_number`, `score`, `pdf_url`

### New Database Objects

**`user_course_enrollments` table** — tracks when a user enrolls in a course:

```sql
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
```

RLS: Users can manage their own enrollments. Admins have full access.

### Menu Seed Data

```sql
-- Customer Academy L2 menu items
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000006', 'Courses', 'education', '/portal/academy/courses', 1, 2),
  ('20000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000006', 'My Courses', 'education', '/portal/academy', 2, 2);

-- Grant access to customer role
INSERT INTO public.role_menu_access (role, menu_item_id) VALUES
  ('customer', '20000000-0000-0000-0000-000000000020'),
  ('customer', '20000000-0000-0000-0000-000000000021');
```

## Design Language

### Phase Colors

| Phase | Color | Usage |
|-------|-------|-------|
| Operate | `#1175E4` | Card header, badge, buttons, progress bar |
| Secure | `#FF246B` | Card header, badge, buttons, progress bar |
| Streamline | `#133258` | Card header, badge, buttons, progress bar |
| Accelerate | `#EDB600` | Card header, badge, buttons, progress bar |

### Signature Corners

All rounded elements use `border-radius: Xpx 0 Xpx Xpx` — top-right corner is always 0px (sharp).

- Cards: `16px 0 16px 16px`
- Buttons: `10px 0 10px 10px`
- Badges/pills: `8px 0 8px 8px`
- Icon containers: `12px 0 12px 12px`
- Stat cards: `16px 0 16px 16px`

### Icons

IBM Carbon icons exclusively. No emoji, no Lucide.

### Typography

Poppins font family throughout.

## Components

### New Components

| Component | Path | Purpose |
|-----------|------|---------|
| `CourseCard` | `src/components/academy/course-card.tsx` | Marketplace card with phase color, enrollment state |
| `CoursePlayer` | `src/components/academy/course-player.tsx` | Main player layout with sidebar + video |
| `CourseSidebar` | `src/components/academy/course-sidebar.tsx` | Section/module navigation sidebar |
| `VideoPlayer` | `src/components/academy/video-player.tsx` | YouTube iframe embed wrapper |
| `AssessmentTaker` | `src/components/academy/assessment-taker.tsx` | Take an assessment (questions UI, submit, results) |
| `CertificateView` | `src/components/academy/certificate-view.tsx` | On-screen certificate display |
| `CertificatePdf` | `src/components/academy/certificate-pdf.tsx` | PDF generation for certificate |
| `StatsCard` | `src/components/academy/stats-card.tsx` | Reusable stat card for dashboard |

### Shared Utilities

| Utility | Purpose |
|---------|---------|
| `getPhaseColor(phaseName)` | Return hex color for phase name — consolidate existing duplicates |
| `calculateCourseProgress(enrollment, sections)` | Compute % complete from section progress |
| `generateCertificateNumber()` | Create unique cert number (format: `CERT-YYYY-XXX-NNNNN`) |

## PDF Generation

Use `@react-pdf/renderer` to generate certificate PDFs on-demand client-side:

- Render certificate layout matching the on-screen design
- Phase-colored header band
- User name, company, course name, score, date, certificate number
- IThealth.ai branding
- Download button triggers PDF generation in-browser and initiates download
- No server-side storage — PDF is generated fresh each time (`pdf_url` field unused for now)

## Error Handling

- **Enrollment failure** — Toast error, button remains "Start Course"
- **Assessment submission failure** — Toast error, answers preserved, retry button
- **Video load failure** — Show placeholder with retry option
- **PDF generation failure** — Toast error with fallback to on-screen certificate only

## Empty States

- **Marketplace with no courses** — "No courses available yet. Check back soon."
- **Marketplace filtered with no results** — "No courses found for this phase."
- **My Courses with no enrollments** — "You haven't enrolled in any courses yet." + link to marketplace
- **Certificate not found** — "Certificate not found." + back to My Courses

## Data Fetching Patterns

All pages are client components (`"use client"`) following existing patterns:

- `useState` for data + loading state
- `useCallback` for async fetch functions
- `useEffect` to trigger fetches
- Direct Supabase client queries with nested selects
- Skeleton loaders during loading
- Toast notifications for CRUD operations
