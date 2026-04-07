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

- Add column: `service_id UUID NOT NULL REFERENCES services(id)`
- Remove column: `phase_id` (phase is derived from `services.phase_id`)
- Each question must be linked to exactly one service (required, not optional)
- Update existing 16 seed questions to map to the 8 services (~2 per service)

### 2. `assessment_attempts` — add `service_scores`

- Add column: `service_scores JSONB`
- Structure:
  ```json
  {
    "<service-uuid>": { "earned": 6, "max": 9, "pct": 67 },
    "<service-uuid>": { "earned": 3, "max": 9, "pct": 33 }
  }
  ```
- Existing `phase_scores` JSONB is now derived by aggregating service scores within each phase (sum of earned / sum of max per phase)
- Both `service_scores` and `phase_scores` are stored at submission time for fast reads

### 3. Scoring logic (`src/lib/scoring.ts`)

Bottom-up computation on assessment submission:

1. Group answered questions by `service_id`
2. For each service: `service_pct = (sum of weighted earned) / (sum of weighted max) * 100`
3. Group services by their `phase_id`: `phase_pct = (sum of service earned across phase) / (sum of service max across phase) * 100`
4. Overall score: average of all phase percentages (preserving current behavior)
5. Store `service_scores`, `phase_scores`, and `score` (overall) in `assessment_attempts`

## Customer Dashboard

### Recommended Services Card

Located below the existing assessment score card on `/portal/home`.

**Layout:** Phase-grouped cards (Option B from brainstorming)

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

### Assessment Question Editor

- Replace the `phase_id` dropdown with a `service_id` dropdown
- Service options grouped by phase for easy selection (e.g., "Secure > Cyber Security Essentials")
- Phase displayed as read-only text, derived from the selected service
- `service_id` is required — cannot save a question without selecting a service

## Onboarding Flow Changes

### Live Scoring Panel (`/get-started`)

- Update real-time scoring to compute bottom-up: questions → services → phases
- No visible change to the customer — they still see phase progress bars
- Service-level scores are computed but not displayed during onboarding

### API Route (`/api/onboarding`)

- Update scoring computation to group by `service_id` first
- Aggregate service scores to phase scores
- Store both `service_scores` and `phase_scores` in the `assessment_attempts` record

## What Does NOT Change

- Assessment list/admin pages
- Sales leads (still linked to assessment attempts)
- Customer portal navigation or layout structure
- Services admin interface
- The 4 phases (Operate, Secure, Streamline, Accelerate)

## Threshold

- **Recommend below 75%** — any service where the customer is not yet "Optimised"
- This uses the existing maturity framework: Foundational (≤25%), Developing (≤50%), Maturing (≤75%), Optimised (>75%)

## Future Considerations (Out of Scope)

- Service detail page (`/portal/services`) — will be built separately
- "Learn more" drill-through from dashboard recommendations
- Service request/purchase flow
- Admin-configurable recommendation thresholds per service
