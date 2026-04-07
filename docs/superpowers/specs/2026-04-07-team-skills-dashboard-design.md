# Team Skills Dashboard — Design Spec

**Date:** 2026-04-07
**Status:** Draft
**Branch:** feature/customer-services-menu

## Overview

A team skills dashboard in the customer portal (`/portal/team`) that lets company admins view their team's collective IT skill levels, invite new members via bulk CSV, and track skill improvement over time. Team members see their own skill profile with anonymized team averages and recommended courses.

## Decisions

- One company = one team (no sub-teams)
- Skill levels aggregate from multiple sources: onboarding assessment, post-course assessments, course completions
- Members see own scores + anonymized team averages (no individual teammate data)
- Trend tracking via event-driven snapshots (30/60/90 day views)
- Hybrid data approach: live scores for current state, snapshots for historical trends
- Bulk invite with CSV + paste; mandatory onboarding assessment before portal access
- Single page with tabs layout (Members / Trends / Invitations)

## User Roles

| Role | Capabilities |
|------|-------------|
| Company admin/owner | Full team dashboard: radar, heatmap, trends, member list. Invite/revoke members. |
| Team member | Own skill profile with anonymized team averages. Access academy. Complete assessments. |

## UI Design

### Admin Team Dashboard (`/portal/team`)

**Header:**
- Breadcrumb: "Team"
- Title: "Your Team — {Company Name}"
- Action button: "+ Invite Members" (opens invite dialog)

**Stats Row (4 cards):**
- Team Members count
- Average Maturity % (with maturity label badge)
- 30-Day Trend (±% change)
- Courses Completed (team total)

**Charts Row (2 panels side by side):**

1. **Phase Radar Chart** (left panel)
   - SVG radar/spider chart with 4 axes for Operate, Secure, Streamline, Accelerate
   - Team average polygon filled with `rgba(17,117,228,0.12)`, stroked `#1175E4`
   - Phase labels colored per phase color scheme
   - Alongside: phase breakdown bars with gradient fills matching phase colors

2. **Service Breakdown** (right panel)
   - Horizontal bar chart showing team average per service
   - Bars colored by their parent phase
   - Sorted by score ascending (weakest first) to highlight gaps

**Tabbed Section (3 tabs):**

#### Members Tab
- Heatmap grid: rows = members, columns = services (grouped by phase)
- Cell colors: green (≥75%), yellow (26-74%), red (≤25%)
- Footer row: team averages per service
- Column headers colored by phase
- Color legend below grid

#### Trends Tab
- Line chart with 30d/60d/90d period selector
- Bold overall trend line (`#1175E4`)
- Dashed per-phase trend lines in phase colors (lower opacity)
- X-axis: weekly date labels
- Y-axis: 0-100% scale
- Data source: `skill_snapshots` table

#### Invitations Tab
- Table: Email, Status, Invited Date, Actions
- Statuses: Invite Sent (indigo), Assessment Pending (amber), Completed (green), Expired (red)
- Actions: Resend, Revoke (context-dependent)

### Invite Dialog (Modal)

**Two input modes (tabs):**

1. **Single** — Email input field, optional display name
2. **Bulk (CSV)** — Drag-and-drop zone for CSV upload + downloadable template. Columns: `email`, `display_name` (optional)

**Below both modes:**
- "Or paste emails directly" — tag-style multi-email input
- Preview section: count of valid invitations, per-email validation status
- Optional personal message textarea
- Actions: Cancel, "Send N Invitations"

### Member View (Team Member's Portal Home)

**Score Card:**
- Donut chart showing personal overall score with maturity badge
- Phase bars with personal score + dashed team-average marker overlay
- Legend: solid = you, dashed = team avg
- Numeric display: "55% (team: 72%)" per phase

**Recommended Courses:**
- Cards for courses linked to member's weakest services (via `service_academy_links`)
- Each card: course name, phase badge, member's score for that service, "Enrol" CTA
- Sorted by score ascending (weakest area first)

## Data Model

### New Tables

#### `team_invitations`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `company_id` | uuid | FK → `companies.id`, NOT NULL |
| `invited_by` | uuid | FK → `profiles.id`, NOT NULL |
| `email` | text | NOT NULL |
| `display_name` | text | Nullable, from CSV |
| `token` | uuid | Unique, default `gen_random_uuid()` |
| `status` | text | `pending` / `accepted` / `expired` / `revoked`, default `pending` |
| `message` | text | Optional personal message |
| `expires_at` | timestamptz | Default `now() + interval '7 days'` |
| `accepted_at` | timestamptz | Nullable, set when user completes signup |
| `created_at` | timestamptz | Default `now()` |
| `updated_at` | timestamptz | Auto-updated trigger |

**Indexes:**
- `UNIQUE(company_id, email) WHERE status = 'pending'` — prevent duplicate pending invites
- `INDEX(token)` — fast lookup during signup

**RLS:**
- Company admins can INSERT/SELECT for their own company
- No public access

#### `skill_snapshots`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `user_id` | uuid | FK → `profiles.id`, NOT NULL |
| `company_id` | uuid | FK → `companies.id`, NOT NULL (denormalized for efficient team queries) |
| `overall_score` | integer | 0-100 |
| `phase_scores` | jsonb | `{ "phase_id": score_pct, ... }` |
| `service_scores` | jsonb | `{ "service_id": { "earned": n, "max": n, "pct": n }, ... }` |
| `source` | text | `onboarding` / `assessment` / `course_completion` |
| `source_id` | uuid | Nullable, FK to the assessment_attempt or enrollment that triggered it |
| `snapshot_at` | timestamptz | Default `now()` |
| `created_at` | timestamptz | Default `now()` |

**Indexes:**
- `INDEX(company_id, snapshot_at)` — team trend queries
- `INDEX(user_id, snapshot_at)` — individual trend queries

**RLS:**
- Users can SELECT their own snapshots
- Company admins can SELECT all snapshots for their company

### Existing Tables — No Schema Changes

- `profiles` — Already has `company_id` and `role`. Members are `role = 'customer'` with matching `company_id`.
- `assessment_attempts` — Already stores `service_scores` and `phase_scores` as jsonb.
- `user_course_enrollments` — Already tracks `completed_at`.
- `service_academy_links` — Already links services to courses.

## Skill Aggregation Logic

### Live Composite Score (Current State)

Calculated server-side via API route, reusing `scoring.ts`:

1. Fetch all `assessment_attempts` for the user (onboarding + post-course)
2. For each service, take the **best** `pct` score across all attempts
3. Fetch completed courses linked to services (via `service_academy_links`)
4. For each service with a completed linked course, apply a **completion bonus**: `min(best_score + 5, 100)` — a 5-point boost per completed course, capped at 100
5. Recalculate phase scores as weighted average of service scores within each phase
6. Overall score = average of phase percentages

### Snapshot (Historical)

Written after these events:
- Assessment attempt completed (onboarding or post-course) — triggered by the assessment completion handler
- Course completed — triggered by the course completion handler

Each snapshot captures the user's full composite score at that moment using the live calculation logic above.

### Team Aggregation

- Team average per phase = mean of all members' phase scores
- Team average per service = mean of all members' service scores
- Team overall = mean of all members' overall scores
- Members with no assessment data are excluded from averages

## API Routes

### `POST /api/team/invite`

**Auth:** Company admin only (check `profile.role` and `profile.company_id`)

**Body:**
```json
{
  "emails": ["john@acme.com", "jane@acme.com"],
  "message": "Welcome to the team!"
}
```

**Logic:**
1. Validate emails (format, not already a member, not already pending invite)
2. Create `team_invitations` rows
3. For each email, call `supabase.auth.admin.inviteUserByEmail()` with redirect URL: `/set-password?invite={token}`
4. Return `{ sent: number, errors: [{ email, reason }] }`

### `GET /api/team/dashboard`

**Auth:** Company admin only

**Query params:** none

**Logic:**
1. Fetch all `profiles` for the company where `is_active = true`
2. For each member, calculate live composite score (best assessment scores + course completion bonuses)
3. Calculate team averages
4. Return `{ members: [...], teamAverages: { overall, phases, services }, stats: { memberCount, avgMaturity, trend30d, coursesCompleted } }`

### `GET /api/team/trends`

**Auth:** Company admin only

**Query params:** `period=30|60|90`

**Logic:**
1. Fetch `skill_snapshots` for the company within the date range
2. Group by week, calculate weekly team averages
3. Return `{ dataPoints: [{ week, overall, phases: {...} }] }`

### `GET /api/team/my-profile`

**Auth:** Any authenticated company member

**Logic:**
1. Calculate user's live composite score
2. Fetch team averages (anonymized — just the numbers)
3. Fetch recommended courses based on weakest services
4. Return `{ myScores: {...}, teamAverages: {...}, recommendedCourses: [...] }`

### `POST /api/team/snapshot`

**Auth:** Internal (called by assessment/course completion handlers)

**Body:** `{ userId, source, sourceId }`

**Logic:**
1. Calculate user's current live composite score
2. Write `skill_snapshots` row

## Invite Flow (End-to-End)

1. Admin opens invite dialog from team dashboard
2. Admin enters emails (single, paste, or CSV upload) + optional message
3. `POST /api/team/invite` → creates invitations + sends Supabase auth invite emails
4. Invitee clicks email link → redirected to `/set-password?invite={token}`
5. Set-password page: creates account, API marks invitation as `accepted`, links profile to company via `company_id`
6. User logs in → customer guard checks for completed onboarding assessment
7. If no assessment: redirect to onboarding assessment (existing flow)
8. User completes assessment → `POST /api/team/snapshot` writes initial snapshot
9. User lands in portal → sees personal score card with team averages

## Component Structure

```
src/components/team/
├── stats-row.tsx           — 4 summary stat cards
├── phase-radar.tsx         — SVG radar chart (team averages)
├── service-bars.tsx        — Service breakdown bar chart
├── members-tab.tsx         — Heatmap grid (members × services)
├── trends-tab.tsx          — Line chart with period selector
├── invitations-tab.tsx     — Invitation tracking table
├── invite-dialog.tsx       — Bulk invite modal with CSV support
└── member-score-card.tsx   — Personal score card with team avg markers
```

**Page files:**
- `src/app/(customer)/portal/team/page.tsx` — Admin team dashboard (replaces stub)
- Member view enhancement to existing `src/app/(customer)/portal/home/page.tsx` — Add team average markers to existing score card

## Styling

- Follows existing patterns: `rounded-xl border border-slate-200 bg-white p-7`
- Phase colors from `phase-colors.ts` and `PHASE_COLORS` constant
- Gradient bars: `linear-gradient(90deg, phaseColor, lighterShade)`
- Heatmap cells: green `#dcfce7`, yellow `#fef3c7`, red `#fee2e2`
- Maturity badges: existing `getMaturityBadgeStyle()` function
- Charts: inline SVG (no external chart library) — consistent with existing donut chart in home page
- Poppins font, Carbon icons per project conventions

## Migration

Single migration file: `supabase/migrations/YYYYMMDDHHMMSS_team_skills.sql`

Contents:
1. Create `team_invitations` table with indexes and RLS
2. Create `skill_snapshots` table with indexes and RLS
3. RLS policies for both tables

## Edge Cases

- **No members yet:** Empty state with prominent invite CTA
- **Members without assessments:** Shown in member list with "Assessment Pending" status, excluded from averages
- **Single member team:** Radar and averages still render (team avg = that member's score)
- **Expired invitations:** Auto-expire via `expires_at` check. Admin can resend (creates new invitation, revokes old)
- **Duplicate invites:** Unique constraint prevents duplicate pending invites to same email in same company
- **Member leaves company:** Deactivating profile (`is_active = false`) removes them from dashboard calculations. Historical snapshots preserved.
