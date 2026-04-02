# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

IThealth.ai is a multi-sided Modernisation Platform for SMB customers to modernise their IT. IThealth is positioned as "Your IT Modernisation Champion." The current scope is the **Admin area**: login, navigation shell with database-driven menus, user/company management, and a menu editor.

## Tech Stack

- **Framework**: Next.js (App Router), TypeScript
- **UI**: React, shadcn/ui, Tailwind CSS, Lucide icons
- **Backend**: Supabase (local Docker — Postgres, GoTrue auth, PostgREST, Studio)
- **State**: React context (auth + menu)
- **All admin pages are client components** (`"use client"`)

## Development Commands

```bash
# Start local Supabase
npx supabase start

# Run Next.js dev server
npm run dev

# Run database migrations
npx supabase db push

# Reset database (applies migrations + seed)
npx supabase db reset
```

## Architecture

### Route Groups

- `(auth)/` — Login, reset password (unauthenticated)
- `(admin)/` — Admin shell wrapped in auth guard + sidebar + mega menu
- `api/admin/users/` — Route Handlers for service_role operations (create user, reset password, delete user)

### Key Patterns

- **Auth guard** wraps `(admin)` layout; checks session + admin role, redirects to `/login` if missing
- **Menu system** is database-driven (adjacency list, 4 levels): L1 = sidebar icons, L2 = mega menu tabs, L3/L4 = mega menu expanded
- **Menu context** fetches the full menu tree on login via `get_menu_tree(user_role)` security definer function
- **Supabase service_role key** is never exposed to the client — admin operations (user CRUD, password resets) go through Next.js Route Handlers at `/api/admin/users/`
- **`profiles.email`** is a denormalized copy of `auth.users.email`, kept in sync by a database trigger

### Database Tables

- `companies` — organizations (IThealth is also a company here)
- `profiles` — extends `auth.users` with company_id, role (`admin`/`customer`/`partner`), display_name
- `menu_items` — hierarchical menu (parent_id, level 1-4, sort_order, icon, route)
- `role_menu_access` — composite PK (role, menu_item_id), controls menu visibility per role

### RLS

- `menu_items` access goes through `get_menu_tree(user_role)` security definer function (avoids cross-table RLS)
- Admins have full read/write on `companies` and `profiles`
- Non-admins read only their own company's data

## Conventions

- Desktop-only for this phase (no mobile/responsive)
- Light theme with dark sidebar
- Skeleton loaders for page content, spinner for auth check
- Toast notifications (shadcn Sonner) for CRUD success/error feedback
- Sort order in menu editor uses numeric input (no drag-and-drop yet)

## Design Spec

Full design spec: `docs/superpowers/specs/2026-04-02-ithealth-admin-platform-design.md`
