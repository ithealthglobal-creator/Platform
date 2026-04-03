# Layer 2: Academy Foundations — Design Spec

## Overview

Layer 2 introduces the Academy system — a learning management feature that allows admins to create courses with structured learning paths, assessments, and certifications. Courses are linked to services and phases in the IT modernisation journey.

The Academy flow for a learner is: **Pre-assessment → Adaptive course (YouTube modules) → Post-assessment → Certificate**

This is the second of three layers:
- **Layer 1 (done):** Reference data tables and CRUD pages
- **Layer 2 (this spec):** Academy foundations (Courses, Sections, Assessments, Modules, Certificates)
- **Layer 3:** Services list + tabbed create/edit form

## Context

IThealth's modernisation journey has 4 phases (Operate, Secure, Streamline, Accelerate). Each service belongs to a phase. The Academy provides training courses tied to services and phases. Partners and admin users take courses to become certified in delivering specific services.

## Menu Structure

Academy L1 already exists in the sidebar. Add L2 items:

| L1 | L2 | Route |
|---|---|---|
| Academy | Courses | /academy/courses |
| Academy | Certificates | /academy/certificates |

The existing L2 items (Courses, Certifications) from the seed data are reused. "Certifications" is renamed to "Certificates" for clarity.

Assessments are managed within the course editor (not a separate top-level page), since assessments only exist in the context of a course section.

## Database Schema

### `courses`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | |
| name | text | NOT NULL | Course title |
| description | text | | Course overview |
| phase_id | uuid | FK to phases, nullable | Linked modernisation phase |
| service_id | uuid | FK to services, nullable | Linked service (Layer 3, nullable until services exist) |
| thumbnail_url | text | | Course thumbnail (Supabase Storage) |
| is_published | boolean | NOT NULL, DEFAULT false | Only published courses are visible to learners |
| is_active | boolean | NOT NULL, DEFAULT true | Soft delete |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

Note: `service_id` FK is added as a nullable column now. The actual `services` table doesn't exist yet (Layer 3). The FK constraint will be added via a migration in Layer 3. For now, this column is just a uuid field with no FK.

### `course_sections`

Courses are divided into topic sections. Each section groups related assessment questions and video modules.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | |
| course_id | uuid | FK to courses, NOT NULL, ON DELETE CASCADE | |
| name | text | NOT NULL | Section/topic name |
| description | text | | What this section covers |
| sort_order | integer | NOT NULL, DEFAULT 0 | Order within the course |
| is_active | boolean | NOT NULL, DEFAULT true | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

### `course_modules`

YouTube videos within a section.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | |
| section_id | uuid | FK to course_sections, NOT NULL, ON DELETE CASCADE | |
| title | text | NOT NULL | Video/module title |
| description | text | | What this module covers |
| youtube_url | text | NOT NULL | YouTube video URL |
| duration_minutes | integer | | Estimated video length |
| sort_order | integer | NOT NULL, DEFAULT 0 | Order within the section |
| is_active | boolean | NOT NULL, DEFAULT true | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

### `assessments`

Pre and post assessments per section.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | |
| section_id | uuid | FK to course_sections, NOT NULL, ON DELETE CASCADE | |
| type | text | NOT NULL, CHECK (type IN ('pre', 'post')) | Pre or post assessment |
| name | text | NOT NULL | Assessment title |
| description | text | | Instructions/overview |
| pass_threshold | integer | NOT NULL, DEFAULT 80 | Percentage needed to pass (0-100) |
| is_active | boolean | NOT NULL, DEFAULT true | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

Unique constraint on `(section_id, type)` — one pre and one post per section.

### `assessment_questions`

Multiple choice questions within an assessment.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | |
| assessment_id | uuid | FK to assessments, NOT NULL, ON DELETE CASCADE | |
| question_text | text | NOT NULL | The question |
| options | jsonb | NOT NULL | Array of {label, value, is_correct} |
| sort_order | integer | NOT NULL, DEFAULT 0 | Order within assessment |
| points | integer | NOT NULL, DEFAULT 1 | Points for correct answer |
| is_active | boolean | NOT NULL, DEFAULT true | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

The `options` JSONB structure:
```json
[
  {"label": "A", "value": "Option text here", "is_correct": false},
  {"label": "B", "value": "Another option", "is_correct": true},
  {"label": "C", "value": "Third option", "is_correct": false},
  {"label": "D", "value": "Fourth option", "is_correct": false}
]
```

### `assessment_attempts`

Records of users taking assessments.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | |
| assessment_id | uuid | FK to assessments, NOT NULL | |
| user_id | uuid | FK to auth.users, NOT NULL | |
| score | integer | NOT NULL | Percentage score (0-100) |
| passed | boolean | NOT NULL | Whether score >= threshold |
| answers | jsonb | NOT NULL | Array of {question_id, selected_option, correct} |
| started_at | timestamptz | NOT NULL, DEFAULT now() | |
| completed_at | timestamptz | | Null if abandoned |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

### `certificates`

Issued when a user passes all post-assessments for a course.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | |
| course_id | uuid | FK to courses, NOT NULL | |
| user_id | uuid | FK to auth.users, NOT NULL | |
| certificate_number | text | NOT NULL, UNIQUE | Auto-generated (e.g., CERT-2026-00001) |
| issued_at | timestamptz | NOT NULL, DEFAULT now() | |
| score | integer | NOT NULL | Overall course score (average of post-assessments) |
| pdf_url | text | | URL to generated PDF in Supabase Storage |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

Unique constraint on `(course_id, user_id)` — one certificate per user per course.

### `user_section_progress`

Tracks which sections a user needs to complete (based on pre-assessment) and their completion status.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | |
| user_id | uuid | FK to auth.users, NOT NULL | |
| section_id | uuid | FK to course_sections, NOT NULL | |
| required | boolean | NOT NULL, DEFAULT true | True if pre-assessment indicated this section is needed |
| modules_completed | jsonb | DEFAULT '[]' | Array of completed module IDs |
| pre_assessment_passed | boolean | DEFAULT false | |
| post_assessment_passed | boolean | DEFAULT false | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

Unique constraint on `(user_id, section_id)`.

## Adaptive Learning Flow

1. User starts a course
2. For each section, user takes the **pre-assessment**
3. If pre-assessment score >= threshold → section is marked as not required (user already knows this)
4. If pre-assessment score < threshold → section is required, user must watch all modules in that section
5. After completing required modules, user takes the **post-assessment** for each required section
6. If post-assessment score >= threshold → section passed
7. Once all sections are passed (or skipped via pre-assessment) → **certificate issued**

## RLS Policies

All tables follow the existing pattern:
- **Admins:** Full CRUD on all tables
- **Authenticated users:** Can read published courses, sections, modules, assessments (questions excluded until taking). Can create assessment_attempts and read their own. Can read their own certificates and progress.

## Pages

### `/academy/courses` — Course Management (Admin)

List page:
| Column | Notes |
|---|---|
| Name | Course title |
| Phase | Phase name (from FK) |
| Sections | Count of sections |
| Published | Yes/No badge |
| Status | Active/Inactive badge |
| Actions | Edit, Delete |

**Course Editor** — navigates to `/academy/courses/[id]/edit` (or dialog if simple enough). Given the complexity (sections, modules, assessments, questions), this should be a **full page editor** not a dialog:

- **Course details tab**: name, description, phase dropdown, thumbnail upload, published toggle
- **Sections tab**: ordered list of sections. Each section expands to show:
  - Section name + description
  - Pre-assessment: questions list with add/edit/delete
  - Modules: ordered YouTube video list with add/edit/delete
  - Post-assessment: questions list with add/edit/delete

### `/academy/certificates` — Certificate Management (Admin)

List page:
| Column | Notes |
|---|---|
| Certificate # | CERT-YYYY-NNNNN format |
| User | User display name |
| Course | Course name |
| Score | Overall percentage |
| Issued | Date |
| Actions | View PDF, Revoke |

## Certificate PDF Generation

- Server-side generation using a basic HTML template rendered to PDF
- Template: IThealth branding, user name, course name, date, score, certificate number
- Generated on certificate creation and stored in Supabase Storage
- Route Handler at `/api/certificates/generate` using the service_role client
- Uses a library like `puppeteer` or `@react-pdf/renderer` — choose the simpler option for this phase
- Basic fixed template for now; customisable templates are a future enhancement

## Indexes

- `course_sections`: index on `(course_id, sort_order)`
- `course_modules`: index on `(section_id, sort_order)`
- `assessments`: index on `(section_id, type)`
- `assessment_questions`: index on `(assessment_id, sort_order)`
- `assessment_attempts`: index on `(assessment_id, user_id)`
- `certificates`: index on `(course_id, user_id)`
- `user_section_progress`: index on `(user_id, section_id)`

## Out of Scope

- Learner-facing course viewer/player (this spec covers admin management only)
- Custom certificate templates
- Video hosting (YouTube only)
- SCORM/xAPI compliance
- Grading curves or weighted scoring
- Course categories/tags
- Course prerequisites
- Discussion/comments on courses
- Partner-specific course assignments
