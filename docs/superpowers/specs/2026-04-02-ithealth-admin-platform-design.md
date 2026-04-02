# IThealth Admin Platform — Design Spec

## Overview

IThealth is an IT Managed Service Provider building a multi-sided platform with four participant types: Public User, IThealth Admin, Customer, and Partner. This spec covers the first feature slice: the **IThealth Admin area**.

Admins log in with email/password and land directly on a Dashboard — no onboarding flow. The admin area provides a navigation shell with a database-driven menu system and a menu editor for managing it.

Public users are unauthenticated visitors with no `profiles` record or auth account.

## Tech Stack

- **Framework**: Next.js (App Router), all admin pages as client components (SPA behavior)
- **UI**: React, shadcn/ui, Tailwind CSS, Lucide icons
- **Backend**: Local Docker Supabase (Postgres, GoTrue auth, PostgREST, Studio)
- **State**: React context for auth and menu state
- **Language**: TypeScript

### Key Dependencies

| Package | Purpose |
|---------|---------|
| next | Framework |
| react | UI |
| @supabase/supabase-js | Supabase client |
| tailwindcss | Styling |
| shadcn/ui | Component library |
| lucide-react | Icons |

## Project Structure

```
IThealth.ai/
├── docker-compose.yml
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (client)
│   │   ├── page.tsx                # Public home page
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx      # Includes forgot-password as inline UI state
│   │   │   └── reset-password/page.tsx
│   │   ├── api/
│   │   │   └── admin/
│   │   │       └── users/route.ts  # Server-side admin ops (service_role key)
│   │   └── (admin)/
│   │       ├── layout.tsx          # Admin shell (sidebar + mega menu + auth guard)
│   │       ├── dashboard/page.tsx
│   │       ├── growth/page.tsx
│   │       ├── sales/page.tsx
│   │       ├── services/page.tsx
│   │       ├── delivery/page.tsx
│   │       ├── academy/page.tsx
│   │       ├── people/
│   │       │   ├── companies/page.tsx
│   │       │   └── users/page.tsx
│   │       └── settings/
│   │           ├── general/page.tsx
│   │           └── menu-editor/page.tsx
│   ├── components/
│   │   ├── sidebar.tsx
│   │   ├── mega-menu.tsx
│   │   ├── breadcrumb.tsx
│   │   ├── auth-guard.tsx
│   │   └── ui/                     # shadcn components
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── types.ts
│   └── contexts/
│       ├── auth-context.tsx
│       └── menu-context.tsx
```

- Route group `(auth)` for login/reset flows
- Route group `(admin)` for the admin shell with sidebar + mega menu + auth guard
- All admin pages are `"use client"`

## Database Schema

### `companies`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | text | |
| is_active | boolean | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

IThealth itself is a company in this table. Admin users belong to the IThealth company.

### `profiles`

Extends Supabase `auth.users`.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, FK to auth.users |
| company_id | uuid | FK to companies |
| role | enum | `admin`, `customer`, `partner` |
| display_name | text | |
| email | text | |
| avatar_url | text | nullable |
| is_active | boolean | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

`profiles.email` is a denormalized copy of `auth.users.email`. A database trigger on `auth.users` keeps it in sync. This avoids needing service_role access for basic user listing queries.

Every user belongs to a company. Admins belong to the IThealth company.

### `menu_items`

Adjacency list for hierarchical menu.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| parent_id | uuid | nullable, FK to self (null = L1 sidebar item) |
| label | text | Display text |
| icon | text | Lucide icon name, L1 only |
| route | text | URL path, nullable for parent-only items |
| sort_order | int | Ordering within same level |
| level | int | 1-4, denormalized for easy querying |
| is_active | boolean | Toggle visibility |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Hierarchy:**
- L1 (parent_id = null): Sidebar items — Dashboard, Growth, Sales, Services, Delivery, Academy, People, Settings
- L2 (parent_id = L1): Shown as top mega menu bar
- L3 (parent_id = L2): Shown when mega menu expands
- L4 (parent_id = L3): Shown within expanded mega menu subsections

### `role_menu_access`

| Column | Type | Notes |
|--------|------|-------|
| role | enum | `admin`, `customer`, `partner` |
| menu_item_id | uuid | FK to menu_items |

Primary key is the composite `(role, menu_item_id)`. No separate `id` column.

### RLS Policies

- `companies`: Admins read/write all. Others read own company only.
- `profiles`: Admins read/write all. Others read own company's users only.
- `menu_items`: Read access via a Postgres `security definer` function `get_menu_tree(user_role)` that joins `menu_items` with `role_menu_access` and returns the full tree. This avoids complex cross-table RLS policies and is more performant.
- `role_menu_access`: Read for all authenticated. Write for admins only.

## Authentication

### Login (`/login`)

- Email + password form (shadcn Input/Button)
- `supabase.auth.signInWithPassword()`
- On success: fetch profile, confirm admin role, redirect to `/dashboard`
- On failure: inline error message
- Link to forgot password flow
- No signup on login page — admins created by other admins or seed data

### Forgot Password (inline UI state within `/login`)

- Toggled via "Forgot password?" link on the login form
- Replaces the login form with an email input form
- `supabase.auth.resetPasswordForEmail()`
- Shows confirmation: "Check your email"
- "Back to login" link to return to the login form
- Email contains link to `/reset-password`

### Reset Password (`/reset-password`)

- Reached via Supabase email link (token in URL)
- New password + confirm password form
- `supabase.auth.updateUser({ password })`
- On success: redirect to `/login`

### Admin Reset User Password (People > Users)

- Admin selects a user, clicks "Reset Password"
- Client calls `POST /api/admin/users` Route Handler
- Route Handler uses Supabase service_role client to call `supabase.auth.admin.resetPasswordForEmail()`
- User receives reset email

### Server-Side Admin Operations

Admin operations that require the Supabase `service_role` key (user creation, password reset, user deletion) are handled via Next.js Route Handlers at `/api/admin/users/`. The service_role key is never exposed to the client.

Operations routed through the API:
- Create user: `supabase.auth.admin.createUser()` + insert profile
- Reset user password: `supabase.auth.admin.resetPasswordForEmail()`
- Delete/deactivate user: `supabase.auth.admin.updateUserById()`

The Route Handler verifies the calling user is an admin before executing.

### Auth Guard (`auth-guard.tsx`)

- Wraps the `(admin)` layout
- On mount: `supabase.auth.getSession()`
- Listens to `onAuthStateChange` for refresh/expiry
- No session or non-admin role: redirect to `/login`
- While checking: loading spinner (no content flash)

### Session Management

- Supabase handles JWT refresh automatically
- Logout button at bottom of sidebar: `supabase.auth.signOut()` > redirect to `/login`

## Navigation

### Sidebar (Left)

- Fixed, ~60px wide, full height, dark background
- IThealth logo/icon at top
- 8 icon buttons stacked vertically:
  1. Dashboard
  2. Growth
  3. Sales
  4. Services
  5. Delivery
  6. Academy
  7. People
  8. Settings
- Active item highlighted
- Tooltip on hover showing label text
- Logout button at bottom
- Cannot expand — always icon-only

### Mega Menu (Top Bar)

- Fixed top, spans full width right of sidebar
- Light background with subtle bottom border
- Content changes based on active sidebar item

**Default state**: L2 items shown as horizontal tabs. E.g., People shows `Companies | Users`.

**Expanded state**: Clicking an L2 item with children reveals dropdown panel showing L3 items. L3 items with children show L4 items nested within.

### Menu Context

- On login, fetch full menu tree for the user's role in a single query
- Stored in React context (`menu-context.tsx`)
- Sidebar reads L1 items from context
- Mega menu reads L2/L3/L4 filtered by active L1
- Menu editor updates DB, then refreshes context immediately

## Menu Editor (Settings > Menu Editor)

- Tree view of all menu items showing hierarchy
- Add/edit/delete items at any level
- Sort order via numeric input fields (drag-and-drop is a future enhancement)
- Toggle `is_active` to show/hide items
- Assign roles via `role_menu_access`
- Changes save to DB and refresh menu context immediately

## Page Layout

```
+--------+----------------------------------+
|        |  Mega Menu (L2 tabs)             |
|  S     +----------------------------------+
|  I     |                                  |
|  D     |                                  |
|  E     |        Main Content Area         |
|  B     |                                  |
|  A     |                                  |
|  R     |                                  |
|        |                                  |
+--------+----------------------------------+
```

- Sidebar: fixed left, full height, dark
- Mega menu: fixed top right of sidebar, light with subtle border
- Content area: scrollable, below mega menu, right of sidebar, light background
- Desktop-only for this phase

### Placeholder Pages

Each section gets a placeholder page with:
- Section title heading
- Breadcrumb showing L1 > L2 path
- "Coming soon" placeholder content

Dashboard gets a richer placeholder: welcome message, quick stats cards with dummy data.

### Functional Pages

- **People > Companies**: List companies (table), create/edit company (dialog/form)
- **People > Users**: List users (table, filterable by company), create user, edit user, reset password action
- **Settings > Menu Editor**: Full tree editor as described above
- **Settings > General**: Placeholder

## Visual Style

- Light theme overall, dark sidebar
- IThealth brand colours (configurable in Tailwind config)
- shadcn default component styling as baseline
- Lucide icons throughout
- Clean, professional look

## Seed Data

`seed.sql` provides:
- IThealth company
- Default admin user (email/password for dev)
- Profile linked to IThealth company with `admin` role
- Full menu structure with placeholder L2/L3/L4 items for all 8 sidebar sections
- `role_menu_access` entries granting admin access to all menu items

## User Management (People Section)

### Companies (People > Companies)
- Table listing all companies (name, active status, user count via aggregation query)
- Create new company (name, active toggle)
- Edit company
- IThealth company appears in the list alongside all others

### Users (People > Users)
- Table listing all users (name, email, company, role, active status)
- Filterable by company
- Create new user: email, name, company (dropdown), role, sends invite email
- Edit user: update name, company, role, active status
- Reset password: sends reset email or sets temporary password
- Admin users (IThealth company) appear in the list alongside all other users

## Loading & Error Handling

- **Loading states**: Skeleton loaders for page content, spinner for auth check on mount
- **Success feedback**: Toast notifications (shadcn Sonner/Toast) for create/edit/delete operations
- **Error feedback**: Toast for API errors, inline messages for form validation errors
- **Menu fetch failure**: Show sidebar with cached/fallback icons, toast error prompting retry
- **Auth errors**: Redirect to login with optional error message param

## Future Considerations (Out of Scope)

- Customer onboarding journey with assessment
- Partner onboarding journey
- Public-facing home page (beyond basic placeholder)
- Customer and partner portal areas
- SSR for public pages
- Mobile/responsive design
- SSO/OAuth authentication
