# Customer Onboarding Flow — Design Spec

**Date:** 2026-04-05
**Status:** Approved

## Overview

A customer onboarding journey that starts with a public-facing Modernisation Assessment, captures user details, creates accounts, and lands the customer in a branded Customer Area where they see their maturity score. The flow also creates admin-side records: a company (Customer/Prospect), a user profile, and a sales lead on a configurable kanban board.

## Onboarding Flow

### Step 1: Public Assessment (`/get-started`)

- No authentication required
- Reached via a "Get Started" CTA button on the public homepage hero section AND a "Get Started" link in the public header navigation
- Uses its own layout (no PublicHeader/PublicFooter) — a full-screen wizard experience. Place under a new `(onboarding)/` route group to avoid inheriting the `(public)` layout
- Fetches the assessment marked `is_onboarding = true` from the database (public read via anon key — RLS policy allows unauthenticated reads of onboarding assessments)
- Marketing-style wizard: one question per screen, grouped by phase (Operate, Secure, Streamline, Accelerate)
- Each phase section has a visual header with the phase icon, colour, and name
- Progress indicator shows current phase and overall completion
- All questions required (no skip) for accurate scoring
- Answers stored in browser local state
- If user already has an account (returns to `/get-started`), show a message: "Already have an account? Log in" with a link to `/login`

### Step 2: Capture Details Screen

After the final question:

- Teaser message: "Your assessment is complete! To receive your Modernisation score and proceed with your modernisation journey..."
- Form fields: Full name, Company name, Email address
- Submit button: "Get My Score"

### Step 3: Backend Processing (`POST /api/onboarding`)

This is a **public API route** (no authentication required) that uses the service role key server-side. It must include rate limiting (e.g., check for duplicate emails within a time window) to prevent abuse.

On form submission:

1. **Check for existing user** — query `profiles` by email. If found, return error: "An account with this email already exists. Please log in."
2. **Create company** — insert into `companies` (type: `customer`, status: `prospect`)
3. **Create auth user + send invite** — use `auth.admin.inviteUserByEmail(email, { data: { company_id, display_name }, redirectTo: '${siteUrl}/set-password' })` where `siteUrl` is computed from the request `Origin` header or `process.env.NEXT_PUBLIC_SUPABASE_URL`'s origin, falling back to `process.env.NEXT_PUBLIC_SITE_URL`. This creates the auth user AND sends the invite email in a single call. The `redirectTo` URL must be added to `additional_redirect_urls` in Supabase config.
4. **Create profile** — insert into `profiles` (role: `customer`, linked to new company, using the user ID returned from step 3)
5. **Save assessment attempt** — insert into `assessment_attempts` with answers and phase scores (requires the user ID from step 3)
6. **Create sales lead** — insert into `sales_leads` in the first active sales stage (by sort_order)
7. **Return success** → frontend shows "Check your email" confirmation screen

**Error handling:** If any step after company creation fails, clean up previous records. Specifically: if profile creation fails, delete the auth user (following the pattern in the existing `/api/admin/users/route.ts`). If assessment attempt or sales lead creation fails, delete profile and auth user. Log errors server-side for debugging.

### Step 4: Set Password (`/set-password`)

- Supabase invite link redirects here (configured via `redirectTo` in step 3)
- Supabase automatically exchanges the token on page load via the hash fragment — the `AuthProvider` wrapping `(auth)` layout detects the session via `onAuthStateChange` (same mechanism as existing `/reset-password` page)
- Once session is detected, show form: password + confirm password (min 8 chars — align with existing `/reset-password` page; update Supabase config `minimum_password_length` to 8 if needed)
- If session exists but profile is null (edge case from partial rollback), show a message: "Something went wrong. Please contact support or try the assessment again."
- Calls `auth.updateUser({ password })` to set the password
- On success → redirect to `/login` with a toast "Password set successfully. Please log in."

### Step 5: Login → Customer Area

- **Modify the existing login page** (`/src/app/(auth)/login/page.tsx`): after successful `signIn()`, fetch the user's profile and check `profile.role`. If `admin` → `router.replace('/dashboard')`. If `customer` → `router.replace('/home')`. Currently the login page hardcodes `router.replace('/dashboard')` — this must be changed to role-based routing.
- Customer layout loads sidebar with menu items from `get_menu_tree('customer')`

## Database Changes

### Extend `companies` table

Add two new columns and deprecate `is_active`:

- `type`: enum `company_type` — values: `admin`, `customer`, `partner`
- `status`: enum `company_status` — values: `prospect`, `active`, `churned`, `pending`, `approved`, `inactive`
- **Deprecate `is_active`**: the `status` column replaces it. `active` and `approved` statuses mean the company is active; all others mean inactive. Update existing queries that use `is_active` to use `status` instead. Migrate existing data: `is_active = true` → `status = 'active'`, `is_active = false` → `status = 'inactive'`. Then drop the `is_active` column.

### Extend `assessments` table

Add columns for onboarding configuration:

- `is_onboarding` (boolean, default false) — enforced unique via partial index: `CREATE UNIQUE INDEX idx_assessments_onboarding ON assessments (is_onboarding) WHERE is_onboarding = true`
- `welcome_heading` (text, nullable) — heading shown on the first screen of `/get-started`
- `welcome_description` (text, nullable) — description shown on the first screen
- `completion_heading` (text, nullable) — heading shown on the capture details screen
- `completion_description` (text, nullable) — description shown on the capture details screen

### New table: `sales_stages`

Configurable kanban columns for the sales pipeline.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| name | text | Stage name (e.g., "New Lead") |
| sort_order | integer | Column position |
| color | text | Hex colour for the column header |
| is_active | boolean | Default true |
| created_at | timestamptz | Default now() |
| updated_at | timestamptz | Default now() |

RLS: Admin full access. Note: `is_active` is acceptable here (simple on/off toggle) unlike `companies` which needs a multi-state lifecycle.

**Default seed data:** Insert one default stage: "New Lead" (sort_order: 1, color: `#1175E4`, is_active: true). Additional stages can be configured later via the admin settings modal.

### New table: `sales_leads`

Individual lead cards on the kanban board.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| company_id | uuid | FK → companies.id |
| stage_id | uuid | FK → sales_stages.id |
| assessment_attempt_id | uuid | FK → assessment_attempts.id, nullable |
| contact_name | text | From onboarding form |
| contact_email | text | From onboarding form |
| notes | text | Nullable, for admin notes |
| created_at | timestamptz | Default now() |
| updated_at | timestamptz | Default now() |

RLS: Admin full access.

### Customer menu items seed

Seed into `menu_items` with `role_menu_access` for the `customer` role:

| Label | Icon (Carbon name) | Route | Sort Order |
|-------|-------------------|-------|------------|
| Home | home | /home | 1 |
| Journey | roadmap | /journey | 2 |
| Academy | education | /academy | 3 |
| Services | tool-kit | /services | 4 |
| Team | user-multiple | /team | 5 |
| Support | help | /support | 6 |
| Settings | settings | /settings | 7 |

The icon names must match entries in `/src/lib/icon-map.ts`. Add any missing icons (`home`, `roadmap`, `help`) to the icon map.

## Route Structure

```
src/app/
├── (onboarding)/
│   ├── layout.tsx                    # Minimal layout (no header/footer)
│   └── get-started/page.tsx          # Public assessment wizard
├── (public)/
│   └── ...existing (add CTA link to /get-started)
├── (auth)/
│   ├── set-password/page.tsx         # New — invite link landing
│   └── ...existing
├── (admin)/
│   ├── sales/page.tsx                # New — kanban board
│   └── ...existing (assessment editor extended)
├── (customer)/                       # NEW route group
│   ├── layout.tsx                    # CustomerGuard + blue sidebar
│   ├── home/page.tsx                 # Donut chart + phase breakdown
│   ├── journey/page.tsx              # Placeholder
│   ├── academy/page.tsx              # Placeholder
│   ├── services/page.tsx             # Placeholder
│   ├── team/page.tsx                 # Placeholder
│   ├── support/page.tsx              # Placeholder
│   └── settings/page.tsx             # Placeholder
├── api/
│   └── onboarding/route.ts           # Assessment submit + account creation
```

## Customer Area Layout

- **Sidebar:** Flat `#1175E4` blue background, white IThealth logo (SVG from `/public/logos/ithealth-logo-white.svg`), IBM Carbon icons, white text
- **Active item:** `rgba(255,255,255,0.18)` background highlight
- **Inactive items:** `rgba(255,255,255,0.75)` text
- **Logout:** Bottom of sidebar, separated by border, muted text
- **Main content:** `#f8fafc` background, white cards with `#e2e8f0` border
- **CustomerGuard:** Checks `profile.role === 'customer'`, redirects to `/login` if not

### Home Page Score Display

- **Donut chart** (left): SVG circle showing overall journey percentage with score in centre
- **Phase breakdown** (right): Maturity label badge + 4 horizontal progress bars:
  - Operate: `#1175E4`
  - Secure: `#FF246B`
  - Streamline: `#133258`
  - Accelerate: `#EDB600`
- Footer: assessment date + "View full report" link

## Admin Features

### Assessment Editor Extension

- New toggle: "Use as Onboarding Assessment" (only one active at a time)
- When enabled, shows fields for welcome and completion screen text
- Questions must be assigned to a phase via existing `phase_id`

### Sales Kanban Board (`/sales`)

- Header: "Sales Pipeline"
- Configurable stages via settings modal (add/edit/reorder/delete)
- Kanban columns with lead cards
- Card content: company name, contact name, email, assessment score, date
- Click to view details (company link, assessment results, notes)
- Drag-and-drop between columns

### People Extensions

- Companies list: add Type and Status columns with coloured badges
- Company edit form: add Type and Status dropdown fields
- Users list: unchanged (already shows all users with role badges)

## Scoring

Assessment questions have `weight` and `points` fields, and each is assigned to a `phase_id`. Scoring works as follows:

- **Per-phase score:** For each phase, sum the points earned by the user's selected answers, divided by the maximum possible points for that phase. Express as percentage (0-100).
- **Overall score:** Weighted average of all phase scores (equal weight per phase unless specified otherwise). Express as 0-100.
- **Maturity labels:** Based on overall score:
  - 0-25: **Foundational**
  - 26-50: **Developing**
  - 51-75: **Maturing**
  - 76-100: **Optimised**

Phase scores and overall score are stored in the `assessment_attempts` record (existing `score` and `phase_scores` fields).

## TypeScript Type Updates

Add/update in `/src/lib/types.ts`:

- Update `Company` interface: add `type: CompanyType` and `status: CompanyStatus`, remove `is_active`
- Add `CompanyType = 'admin' | 'customer' | 'partner'`
- Add `CompanyStatus = 'prospect' | 'active' | 'churned' | 'pending' | 'approved' | 'inactive'`
- Add `SalesStage` interface: `id`, `name`, `sort_order`, `color`, `is_active`, timestamps
- Add `SalesLead` interface: `id`, `company_id`, `stage_id`, `assessment_attempt_id`, `contact_name`, `contact_email`, `notes`, timestamps, plus optional `company?: Company`, `assessment_attempt?: AssessmentAttempt`
- Update `Assessment` interface: add `is_onboarding`, `welcome_heading`, `welcome_description`, `completion_heading`, `completion_description`

## Supabase Configuration

- Add `/set-password` to `additional_redirect_urls` in `supabase/config.toml`
- Ensure invite email template is configured (for local dev, Inbucket handles this automatically)

## Customer Sidebar — Menu Hierarchy

The customer sidebar is flat (L1 only) — no mega menu, no L2/L3/L4 items. The `(customer)/layout.tsx` renders only the sidebar component (not the `<MegaMenu />` used in the admin layout). The sidebar reads L1 items from `get_menu_tree('customer')` and renders them directly.

## Existing Patterns Followed

- Client components (`"use client"`) for all interactive pages
- AuthContext + MenuContext providers
- Database-driven menu via `get_menu_tree(user_role)` RPC
- Service role operations go through Next.js API routes (never exposed to client)
- shadcn/ui components, IBM Carbon icons, Tailwind CSS
- Toast notifications (Sonner) for success/error feedback
- Desktop-only (no responsive/mobile for this phase)
