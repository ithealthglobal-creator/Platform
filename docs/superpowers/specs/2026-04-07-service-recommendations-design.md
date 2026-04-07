# Service Recommendations from Assessment Scores

## Overview

Link assessment questions to services so that customer assessment scores drive service recommendations on the dashboard. Scoring rolls up bottom-up: **questions → service scores → phase scores → overall score**. Services where the customer scores below 75% (not yet "Optimised") appear as recommendations on the customer dashboard, grouped by phase.

## Context

- The assessment framework, services (8 seeded), phases (4), and customer dashboard already exist
- Assessment questions currently link to `phase_id` but not to a specific service
- The customer services page is a placeholder — this feature surfaces recommendations on the dashboard without requiring that page yet
- All mappings are dynamic: admins add/change services and tag questions to them; scoring rolls up automatically

## Data Model Changes

### 1. `assessment_questions` — replace `phase_id` with `service_id`

- Add column: `service_id UUID REFERENCES services(id)` (initially nullable)
- Backfill `service_id` for all existing questions using the seed mapping below
- Alter column to `NOT NULL` after backfill
- Drop column: `phase_id` (phase is derived from `services.phase_id`)
- Drop index: `idx_assessment_questions_phase`
- Create index: `idx_assessment_questions_service` on `service_id`
- Each question must be linked to exactly one service (required, not optional)

**Migration strategy (single migration file, sequential steps):**

```sql
-- Step 1: Add nullable service_id
ALTER TABLE assessment_questions ADD COLUMN service_id UUID REFERENCES services(id);

-- Step 2: Backfill from seed mapping (see Question-to-Service Mapping below)
UPDATE assessment_questions SET service_id = ... WHERE ...;

-- Step 3: Set NOT NULL
ALTER TABLE assessment_questions ALTER COLUMN service_id SET NOT NULL;

-- Step 4: Drop phase_id and its index
DROP INDEX IF EXISTS idx_assessment_questions_phase;
ALTER TABLE assessment_questions DROP COLUMN phase_id;

-- Step 5: Add new index
CREATE INDEX idx_assessment_questions_service ON assessment_questions(service_id);
```

### 2. `assessment_attempts` — add `service_scores`

- Add column: `service_scores JSONB`
- Structure:
  ```json
  {
    "<service-uuid>": { "earned": 6, "max": 9, "pct": 67 },
    "<service-uuid>": { "earned": 3, "max": 9, "pct": 33 }
  }
  ```
- **`phase_scores` keeps its current `Record<string, number>` format** (percentage only) for backward compatibility with existing attempts. No format change.
- Both `service_scores` and `phase_scores` are stored at submission time for fast reads

### 3. Scoring logic (`src/lib/scoring.ts`)

Bottom-up computation on assessment submission:

1. Group answered questions by `service_id`
2. For each service: `service_pct = (sum of weighted earned) / (sum of weighted max) * 100`
3. Group services by their `phase_id` (from the service relation): `phase_pct = (sum of service earned across phase) / (sum of service max across phase) * 100`
4. Overall score: average of all phase percentages (preserving current behavior)
5. Store `service_scores`, `phase_scores`, and `score` (overall) in `assessment_attempts`

**Important:** The scoring functions currently receive `AssessmentQuestion[]` with `phase_id`. After this change, questions must be fetched with a join through services to get the phase: `.select('*, service:services(*, phase:phases(*))'))`. The scoring functions will read `q.service_id` and `q.service.phase_id` instead of `q.phase_id`.

## Question-to-Service Mapping (Seed Data)

The 16 existing onboarding questions mapped to the 8 services (2 per service):

**Operate Phase:**
| Question | Service |
|----------|---------|
| IT monitoring tools? | Managed IT Support |
| IT support request handling? | Managed IT Support |
| IT documentation? | Backup & Disaster Recovery |
| Patching & updates? | Backup & Disaster Recovery |

**Secure Phase:**
| Question | Service |
|----------|---------|
| Antivirus/endpoint protection? | Cyber Security Essentials |
| Employee security training? | Cyber Security Essentials |
| Data backup procedures? | Compliance & Governance |
| Compliance requirements? | Compliance & Governance |

**Streamline Phase:**
| Question | Service |
|----------|---------|
| Cloud services adoption? | Cloud Migration |
| Remote work infrastructure? | Cloud Migration |
| Business process automation? | Process Automation |
| Software integration? | Process Automation |

**Accelerate Phase:**
| Question | Service |
|----------|---------|
| Data analytics usage? | AI & Analytics |
| Customer data insights? | AI & Analytics |
| Digital transformation strategy? | Digital Transformation Strategy |
| Innovation/emerging tech? | Digital Transformation Strategy |

## TypeScript Type Changes (`src/lib/types.ts`)

- `AssessmentQuestion` interface: remove `phase_id`, add `service_id: string`, replace `phase?: Phase` relation with `service?: Service & { phase?: Phase }`
- `AssessmentAttempt` interface: add `service_scores: Record<string, { earned: number; max: number; pct: number }> | null`
- `phase_scores` type remains `Record<string, number> | null` (no change)

## Customer Dashboard

### Recommended Services Card

Located below the existing assessment score card on `/portal/home`.

**Layout:** Phase-grouped cards

- Title: "Recommended Services"
- Services grouped under their phase header
- Each phase group shows:
  - Phase name, phase score percentage, maturity label
  - Individual service cards: service name, score %, short description
- Color coding by maturity:
  - **Foundational (≤25%):** red background
  - **Developing (≤50%):** amber background
  - **Maturing (≤75%):** neutral/light background
- Services scoring **≥75% (Optimised)** are **hidden entirely**
- Phases with no recommended services are hidden
- If all services are Optimised: show congratulatory message

**Data flow:**

1. Fetch latest `assessment_attempts` for the logged-in user
2. Read `service_scores` JSONB
3. Join `services` for names, descriptions, `phase_id`
4. Join `phases` for phase names and `sort_order`
5. Filter out services with `pct >= 75`
6. Group by phase, sort phases by `sort_order`, services by score ascending (worst first)

### No "Learn more" action

Service cards are display-only for now. No drill-through to a detail page.

## Admin Changes

### Standalone Assessment Question Editor (`/academy/assessments/[id]/edit`)

This is the editor that currently has the "Phase Tag" dropdown on questions. Changes:

- Replace the `phase_id` dropdown with a `service_id` dropdown
- Service options grouped by phase for easy selection (e.g., "Secure > Cyber Security Essentials")
- Phase displayed as read-only text, derived from the selected service
- `service_id` is required — cannot save a question without selecting a service

### Course-Section Assessment Editor (`assessment-editor.tsx`)

This editor does not currently have phase tagging. **No changes needed** — course-section assessments are scoped differently and do not participate in service-level scoring.

## Onboarding Flow Changes

### Live Scoring Panel (`/get-started`)

- Fetch questions with service+phase join: `.select('*, service:services(*, phase:phases(*))')`
- Update `liveScores` useMemo to compute bottom-up: group by `q.service_id`, get phase from `q.service.phase_id`
- No visible change to the customer — they still see phase progress bars
- Service-level scores are computed but not displayed during onboarding

### API Route (`/api/onboarding`)

- Fetch questions with service join to get `phase_id` through the service relation
- Update scoring computation to group by `service_id` first
- Aggregate service scores to phase scores
- Store both `service_scores` and `phase_scores` in the `assessment_attempts` record

## Edge Cases

- **Services with no questions:** Excluded from `service_scores` and not shown on dashboard. A service must have at least one question to generate a score and recommendation.
- **New services added by admin:** No recommendations appear until questions are tagged to the service.
- **Existing assessment attempts:** Older attempts will have `service_scores: null`. Dashboard should handle this gracefully — show "No service data available" or fall back to phase-only display.

## RLS Considerations

- The existing RLS policies on `assessment_questions` reference `phase_id` indirectly through the `get_menu_tree` security definer — but assessment questions are accessed via assessment-level queries, not menu queries. No RLS policy changes needed for swapping `phase_id` → `service_id`.
- The new `services` FK does not introduce cross-table RLS issues because services are read-only for non-admins.

## What Does NOT Change

- Assessment list/admin pages (beyond the question editor dropdown)
- Sales leads (still linked to assessment attempts)
- Customer portal navigation or layout structure
- Services admin interface
- The 4 phases (Operate, Secure, Streamline, Accelerate)
- `phase_scores` JSONB format on `assessment_attempts`

## Files Impacted

- `supabase/migrations/` — new migration for schema changes
- `supabase/seed.sql` — update question seed data with `service_id` instead of `phase_id`
- `src/lib/types.ts` — `AssessmentQuestion` and `AssessmentAttempt` type updates
- `src/lib/scoring.ts` — rewrite to compute bottom-up (service → phase → overall)
- `src/app/api/onboarding/route.ts` — updated scoring computation and storage
- `src/app/(onboarding)/get-started/page.tsx` — question fetch join and live scoring logic
- `src/app/(customer)/portal/home/page.tsx` — new Recommended Services card
- `src/app/(admin)/academy/assessments/[id]/edit/page.tsx` — phase dropdown → service dropdown

## Threshold

- **Recommend below 75%** — any service where the customer is not yet "Optimised"
- This uses the existing maturity framework: Foundational (≤25%), Developing (≤50%), Maturing (≤75%), Optimised (>75%)

## Future Considerations (Out of Scope)

- Service detail page (`/portal/services`) — will be built separately
- "Learn more" drill-through from dashboard recommendations
- Service request/purchase flow
- Admin-configurable recommendation thresholds per service
