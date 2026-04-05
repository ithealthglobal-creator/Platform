# Customer Onboarding Flow — Design Spec

**Date:** 2026-04-05
**Status:** Approved

## Overview

A customer onboarding journey that starts with a public-facing Modernisation Assessment, captures user details, creates accounts, and lands the customer in a branded Customer Area where they see their maturity score. The flow also creates admin-side records: a company (Customer/Prospect), a user profile, and a sales lead on a configurable kanban board.

## Onboarding Flow

### Step 1: Public Assessment (`/get-started`)

- No authentication required
- Fetches the assessment marked `is_onboarding = true` from the database
- Marketing-style wizard: one question per screen, grouped by phase (Operate, Secure, Streamline, Accelerate)
- Each phase section has a visual header with the phase icon, colour, and name
- Progress indicator shows current phase and overall completion
- All questions required (no skip) for accurate scoring
- Answers stored in browser local state

### Step 2: Capture Details Screen

After the final question:

- Teaser message: "Your assessment is complete! To receive your Modernisation score and proceed with your modernisation journey..."
- Form fields: Full name, Company name, Email address
- Submit button: "Get My Score"

### Step 3: Backend Processing (`POST /api/onboarding`)

On form submission, the API route (using service role) performs these operations:

1. Creates a **company** record (type: `customer`, status: `prospect`)
2. Creates an **auth user** via `auth.admin.createUser()` with `email_confirm: false`
3. Creates a **profile** (role: `customer`, linked to the new company)
4. Saves an **assessment attempt** with answers and phase scores
5. Creates a **sales lead** in the first active sales stage
6. Sends a Supabase invite email via `auth.admin.inviteUserByEmail()`
7. Returns success → frontend shows "Check your email" confirmation screen

### Step 4: Set Password (`/set-password`)

- Supabase invite link redirects here with a token in the URL
- Exchanges token for session via `auth.verifyOtp()` (type: `invite`)
- Simple form: password + confirm password
- On success → redirect to `/login`

### Step 5: Login → Customer Area

- Existing login page handles both admin and customer roles
- AuthContext detects `profile.role === 'customer'` → redirects to `/home`
- Customer layout loads sidebar with menu items from `get_menu_tree('customer')`

## Database Changes

### Extend `companies` table

Add two new columns:

- `type`: enum `company_type` — values: `admin`, `customer`, `partner`
- `status`: enum `company_status` — values: `prospect`, `active`, `churned`, `pending`, `approved`, `inactive`

### Extend `assessments` table

Add columns for onboarding configuration:

- `is_onboarding` (boolean, default false) — only one assessment can have this set to true
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

RLS: Admin full access.

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

| Label | Icon | Route | Sort Order |
|-------|------|-------|------------|
| Home | Home | /home | 1 |
| Journey | Roadmap | /journey | 2 |
| Academy | Document | /academy | 3 |
| Services | Edit | /services | 4 |
| Team | UserMultiple | /team | 5 |
| Support | Time | /support | 6 |
| Settings | Settings | /settings | 7 |

## Route Structure

```
src/app/
├── (public)/
│   ├── get-started/page.tsx          # Public assessment wizard
│   └── ...existing
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

## Login Routing

After successful login, the AuthContext checks `profile.role`:

- `admin` → redirect to `/dashboard`
- `customer` → redirect to `/home`

## Auth Flow

- Uses existing Supabase Auth infrastructure
- Invite email sent via `auth.admin.inviteUserByEmail()`
- `/set-password` page exchanges the invite token via `auth.verifyOtp({ type: 'invite' })`
- After password set → redirect to `/login`

## Existing Patterns Followed

- Client components (`"use client"`) for all interactive pages
- AuthContext + MenuContext providers
- Database-driven menu via `get_menu_tree(user_role)` RPC
- Service role operations go through Next.js API routes (never exposed to client)
- shadcn/ui components, IBM Carbon icons, Tailwind CSS
- Toast notifications (Sonner) for success/error feedback
- Desktop-only (no responsive/mobile for this phase)
