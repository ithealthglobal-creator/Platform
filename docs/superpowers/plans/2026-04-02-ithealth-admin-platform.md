# IThealth Admin Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the IThealth Admin area — a SPA with auth, database-driven navigation, menu editor, and user/company management.

**Architecture:** Next.js App Router with all admin pages as `"use client"` components (SPA). Supabase for auth and database via Docker. React context for auth and menu state. Server-side Route Handlers for admin operations requiring the service_role key.

**Tech Stack:** Next.js, React, TypeScript, shadcn/ui, Tailwind CSS, IBM Carbon icons (@carbon/icons-react), Poppins font, Supabase (Docker), @supabase/supabase-js

**Spec:** `docs/superpowers/specs/2026-04-02-ithealth-admin-platform-design.md`

---

## File Map

```
IThealth.ai/
├── .env.local                              # Supabase URL + keys
├── .gitignore
├── docker-compose.yml                      # Local Supabase stack
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── components.json                         # shadcn config
├── supabase/
│   ├── migrations/
│   │   ├── 00001_create_companies.sql
│   │   ├── 00002_create_profiles.sql
│   │   ├── 00003_create_menu_items.sql
│   │   ├── 00004_create_role_menu_access.sql
│   │   ├── 00005_auth_helper_functions.sql
│   │   ├── 00006_rls_policies.sql
│   │   ├── 00007_get_menu_tree_function.sql
│   │   └── 00008_email_sync_trigger.sql
│   ├── seed.sql
│   └── setup.sh                    # Automated setup: migrations + seed + admin user
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   ├── api/
│   │   │   └── admin/
│   │   │       └── users/route.ts
│   │   └── (admin)/
│   │       ├── layout.tsx
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
│   │   └── ui/                             # shadcn (auto-generated)
│   ├── lib/
│   │   ├── supabase-client.ts              # Browser Supabase client
│   │   ├── supabase-server.ts              # Service role client (server only)
│   │   ├── icon-map.ts                     # Carbon icon name -> component map
│   │   └── types.ts                        # TypeScript types + DB enums
│   └── contexts/
│       ├── auth-context.tsx
│       └── menu-context.tsx
```

---

## Task 1: Project Scaffolding & Docker Supabase

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `.env.local`, `.gitignore`, `docker-compose.yml`, `components.json`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: Initialize Next.js project**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Accept defaults. This creates the base Next.js + Tailwind + TypeScript setup.

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @carbon/icons-react
npm install -D @types/node
```

Note: We use IBM Carbon UI icons (`@carbon/icons-react`) instead of Lucide. All icons come from https://www.ibm.com/design/language/iconography/ui-icons/library/

- [ ] **Step 3: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

Select: New York style, Zinc base color, CSS variables: yes.

- [ ] **Step 4: Install shadcn components needed across the project**

```bash
npx shadcn@latest add button input card table dialog dropdown-menu tooltip toast sonner label select separator badge sheet tabs
```

- [ ] **Step 5: Create docker-compose.yml for local Supabase**

Create `docker-compose.yml` using the official Supabase self-hosted Docker setup. Include services: postgres (port 5432), kong (port 8000), gotrue (auth), postgrest, studio (port 3000 or 54323), meta, realtime, storage.

Reference: https://supabase.com/docs/guides/self-hosting/docker

Key environment variables to configure:
- `POSTGRES_PASSWORD`
- `JWT_SECRET` (generate a 64-char random string)
- `ANON_KEY` and `SERVICE_ROLE_KEY` (generate JWT tokens signed with `JWT_SECRET`)
- `SITE_URL=http://localhost:3001` (Next.js dev server)
- `API_EXTERNAL_URL=http://localhost:8000`

- [ ] **Step 6: Create .env.local**

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=<generated-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<generated-service-role-key>
```

- [ ] **Step 7: Update .gitignore**

Append to the existing `.gitignore`:

```
.env.local
.superpowers/
docker-volumes/
```

- [ ] **Step 8: Create Supabase client lib**

Create `src/lib/supabase-client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

Create `src/lib/supabase-server.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
```

- [ ] **Step 9: Create TypeScript types**

Create `src/lib/types.ts`:

```typescript
export type UserRole = 'admin' | 'customer' | 'partner'

export interface Company {
  id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  company_id: string
  role: UserRole
  display_name: string
  email: string
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  company?: Company
}

export interface MenuItem {
  id: string
  parent_id: string | null
  label: string
  icon: string | null
  route: string | null
  sort_order: number
  level: number
  is_active: boolean
  created_at: string
  updated_at: string
  children?: MenuItem[]
}

export interface RoleMenuAccess {
  role: UserRole
  menu_item_id: string
}
```

- [ ] **Step 10: Create Carbon icon map**

Create `src/lib/icon-map.ts`:

```typescript
import {
  Dashboard,
  GrowthChart,  
  Currency,
  ToolKit,
  Delivery,
  Education,
  UserMultiple,
  Settings,
  Logout,
  ChevronRight,
  Add,
  Edit,
  TrashCan,
  Password,
  CircleDash,
} from '@carbon/icons-react'
import { ComponentType } from 'react'

export const iconMap: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  'dashboard': Dashboard,
  'growth-chart': GrowthChart,
  'currency': Currency,
  'tool-kit': ToolKit,
  'delivery': Delivery,
  'education': Education,
  'user-multiple': UserMultiple,
  'settings': Settings,
  'logout': Logout,
  'chevron-right': ChevronRight,
  'add': Add,
  'edit': Edit,
  'trash-can': TrashCan,
  'password': Password,
  'circle-dash': CircleDash,
}
```

All icons from IBM Carbon UI library: https://www.ibm.com/design/language/iconography/ui-icons/library/
When new icons are needed (e.g., via the menu editor), add them here.

- [ ] **Step 11: Update root layout**

Replace `src/app/layout.tsx` with a minimal client layout:

```typescript
import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const poppins = Poppins({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] })

export const metadata: Metadata = {
  title: 'IThealth',
  description: 'IThealth Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={poppins.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
```

- [ ] **Step 12: Create placeholder home page**

Replace `src/app/page.tsx`:

```typescript
export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1 className="text-3xl font-bold">IThealth</h1>
    </div>
  )
}
```

- [ ] **Step 13: Start Docker Supabase and verify**

```bash
docker compose up -d
```

Verify: open `http://localhost:54323` (Supabase Studio) in browser. Confirm it loads.

- [ ] **Step 14: Start Next.js dev server and verify**

```bash
npm run dev -- -p 3001
```

Verify: open `http://localhost:3001` in browser. Confirm "IThealth" heading renders.

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Docker Supabase"
```

---

## Task 2: Database Migrations & Seed Data

**Files:**
- Create: `supabase/migrations/00001_create_companies.sql`
- Create: `supabase/migrations/00002_create_profiles.sql`
- Create: `supabase/migrations/00003_create_menu_items.sql`
- Create: `supabase/migrations/00004_create_role_menu_access.sql`
- Create: `supabase/migrations/00005_auth_helper_functions.sql`
- Create: `supabase/migrations/00006_rls_policies.sql`
- Create: `supabase/migrations/00007_get_menu_tree_function.sql`
- Create: `supabase/migrations/00008_email_sync_trigger.sql`
- Create: `supabase/setup.sh`
- Create: `supabase/seed.sql`

- [ ] **Step 1: Create companies migration**

`supabase/migrations/00001_create_companies.sql`:

```sql
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 2: Create role enum and profiles migration**

`supabase/migrations/00002_create_profiles.sql`:

```sql
CREATE TYPE public.user_role AS ENUM ('admin', 'customer', 'partner');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  role public.user_role NOT NULL DEFAULT 'customer',
  display_name text NOT NULL,
  email text NOT NULL,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 3: Create menu_items migration**

`supabase/migrations/00003_create_menu_items.sql`:

```sql
CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.menu_items(id) ON DELETE CASCADE,
  label text NOT NULL,
  icon text,
  route text,
  sort_order integer NOT NULL DEFAULT 0,
  level integer NOT NULL CHECK (level BETWEEN 1 AND 4),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_items_parent_id ON public.menu_items(parent_id);
CREATE INDEX idx_menu_items_level ON public.menu_items(level);

CREATE TRIGGER menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 4: Create role_menu_access migration**

`supabase/migrations/00004_create_role_menu_access.sql`:

```sql
CREATE TABLE public.role_menu_access (
  role public.user_role NOT NULL,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  PRIMARY KEY (role, menu_item_id)
);
```

- [ ] **Step 5: Create auth helper functions (avoids RLS infinite recursion)**

`supabase/migrations/00005_auth_helper_functions.sql`:

NOTE: The `profiles` table has RLS enabled, so policies on `profiles` cannot sub-query `profiles` itself — that causes infinite recursion. Instead, we create `SECURITY DEFINER` helper functions that bypass RLS to check the calling user's role and company.

```sql
-- Helper to get the current user's role without triggering RLS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper to get the current user's company_id without triggering RLS
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$;
```

- [ ] **Step 6: Create RLS policies**

`supabase/migrations/00006_rls_policies.sql`:

```sql
-- Companies RLS
CREATE POLICY "Admins can do everything with companies"
  ON public.companies FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Users can read own company"
  ON public.companies FOR SELECT
  USING (id = public.get_my_company_id());

-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything with profiles"
  ON public.profiles FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Users can read own company profiles"
  ON public.profiles FOR SELECT
  USING (company_id = public.get_my_company_id());

-- Menu items RLS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything with menu_items"
  ON public.menu_items FOR ALL
  USING (public.get_my_role() = 'admin');

-- role_menu_access RLS
ALTER TABLE public.role_menu_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read role_menu_access"
  ON public.role_menu_access FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage role_menu_access"
  ON public.role_menu_access FOR ALL
  USING (public.get_my_role() = 'admin');
```

- [ ] **Step 7: Create get_menu_tree function**

`supabase/migrations/00007_get_menu_tree_function.sql`:

```sql
CREATE OR REPLACE FUNCTION public.get_menu_tree(user_role public.user_role)
RETURNS SETOF public.menu_items
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT m.*
  FROM public.menu_items m
  INNER JOIN public.role_menu_access rma
    ON rma.menu_item_id = m.id
  WHERE rma.role = user_role
    AND m.is_active = true
  ORDER BY m.level, m.sort_order;
$$;
```

- [ ] **Step 8: Create email sync trigger**

`supabase/migrations/00008_email_sync_trigger.sql`:

```sql
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_email_change
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.sync_profile_email();
```

- [ ] **Step 9: Create seed data**

`supabase/seed.sql`:

```sql
-- IThealth company
INSERT INTO public.companies (id, name, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'IThealth', true)
ON CONFLICT (id) DO NOTHING;

-- L1 Menu Items (Sidebar)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('10000000-0000-0000-0000-000000000001', NULL, 'Dashboard', 'dashboard', '/dashboard', 1, 1),
  ('10000000-0000-0000-0000-000000000002', NULL, 'Growth', 'growth-chart', '/growth', 2, 1),
  ('10000000-0000-0000-0000-000000000003', NULL, 'Sales', 'currency', '/sales', 3, 1),
  ('10000000-0000-0000-0000-000000000004', NULL, 'Services', 'tool-kit', '/services', 4, 1),
  ('10000000-0000-0000-0000-000000000005', NULL, 'Delivery', 'delivery', '/delivery', 5, 1),
  ('10000000-0000-0000-0000-000000000006', NULL, 'Academy', 'education', '/academy', 6, 1),
  ('10000000-0000-0000-0000-000000000007', NULL, 'People', 'user-multiple', '/people', 7, 1),
  ('10000000-0000-0000-0000-000000000008', NULL, 'Settings', 'settings', '/settings', 8, 1);

-- L2 Menu Items (Mega Menu tabs)
-- Dashboard L2
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Overview', NULL, '/dashboard', 1, 2);

-- Growth L2
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Pipeline', NULL, '/growth/pipeline', 1, 2),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Marketing', NULL, '/growth/marketing', 2, 2);

-- Sales L2
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'Deals', NULL, '/sales/deals', 1, 2),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', 'Proposals', NULL, '/sales/proposals', 2, 2);

-- Services L2
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000004', 'Managed IT', NULL, '/services/managed-it', 1, 2),
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000004', 'Cloud', NULL, '/services/cloud', 2, 2),
  ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000004', 'Security', NULL, '/services/security', 3, 2);

-- Delivery L2
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000005', 'Projects', NULL, '/delivery/projects', 1, 2),
  ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000005', 'Tickets', NULL, '/delivery/tickets', 2, 2);

-- Academy L2
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000006', 'Courses', NULL, '/academy/courses', 1, 2),
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000006', 'Certifications', NULL, '/academy/certifications', 2, 2);

-- People L2
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000007', 'Companies', NULL, '/people/companies', 1, 2),
  ('20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000007', 'Users', NULL, '/people/users', 2, 2);

-- Settings L2
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000008', 'General', NULL, '/settings/general', 1, 2),
  ('20000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000008', 'Menu Editor', NULL, '/settings/menu-editor', 2, 2);

-- L3 placeholder items (Services > Managed IT)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', 'Monitoring', NULL, '/services/managed-it/monitoring', 1, 3),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000006', 'Patching', NULL, '/services/managed-it/patching', 2, 3),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000006', 'Backup', NULL, '/services/managed-it/backup', 3, 3);

-- L4 placeholder items (Services > Managed IT > Monitoring)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Agent-based', NULL, '/services/managed-it/monitoring/agent', 1, 4),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'Agentless', NULL, '/services/managed-it/monitoring/agentless', 2, 4);

-- Grant admin access to all menu items
INSERT INTO public.role_menu_access (role, menu_item_id)
SELECT 'admin', id FROM public.menu_items;
```

- [ ] **Step 10: Create automated setup script**

`supabase/setup.sh`:

```bash
#!/bin/bash
set -e

# Configuration — these match docker-compose.yml
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-your-super-secret-and-long-postgres-password}"
DB_NAME="${DB_NAME:-postgres}"
SUPABASE_URL="${SUPABASE_URL:-http://localhost:8000}"
SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:-<your-service-role-key>}"

PGPASSWORD="$DB_PASSWORD"
export PGPASSWORD

echo "==> Running migrations..."
for f in supabase/migrations/*.sql; do
  echo "  Running $f"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$f"
done

echo "==> Running seed data..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f supabase/seed.sql

echo "==> Creating admin user via GoTrue API..."
RESPONSE=$(curl -s -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ithealth.ai",
    "password": "admin123456",
    "email_confirm": true
  }')

USER_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
  echo "  Admin user may already exist. Checking..."
  USER_ID=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT id FROM auth.users WHERE email = 'admin@ithealth.ai';" | tr -d ' ')
fi

if [ -n "$USER_ID" ]; then
  echo "  Admin user ID: $USER_ID"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
    "INSERT INTO public.profiles (id, company_id, role, display_name, email)
     VALUES ('$USER_ID', '00000000-0000-0000-0000-000000000001', 'admin', 'Admin', 'admin@ithealth.ai')
     ON CONFLICT (id) DO NOTHING;"
  echo "  Admin profile created."
else
  echo "  ERROR: Could not create or find admin user."
  exit 1
fi

echo "==> Setup complete!"
echo "  Login: admin@ithealth.ai / admin123456"
```

Make it executable: `chmod +x supabase/setup.sh`

- [ ] **Step 11: Run the setup script**

```bash
chmod +x supabase/setup.sh
./supabase/setup.sh
```

Expected: all migrations run, seed data inserted, admin user created with profile.

- [ ] **Step 12: Verify in Supabase Studio**

Open `http://localhost:54323`, check:
- Tables exist with correct columns
- Seed data is present in `companies`, `menu_items`, `role_menu_access`
- Admin user profile exists

- [ ] **Step 13: Commit**

```bash
git add supabase/
git commit -m "feat: add database migrations and seed data"
```

---

## Task 3: Auth Context & Auth Guard

**Files:**
- Create: `src/contexts/auth-context.tsx`
- Create: `src/components/auth-guard.tsx`

- [ ] **Step 1: Create auth context**

`src/contexts/auth-context.tsx`:

```typescript
'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase-client'
import { Profile } from '@/lib/types'

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  updatePassword: (password: string) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*, company:companies(*)')
      .eq('id', userId)
      .single()
    return data as Profile | null
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        const p = await fetchProfile(session.user.id)
        setProfile(p)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          const p = await fetchProfile(session.user.id)
          setProfile(p)
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error: error as Error | null }
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    return { error: error as Error | null }
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

- [ ] **Step 2: Create auth guard component**

`src/components/auth-guard.tsx`:

```typescript
'use client'

import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!profile || profile.role !== 'admin')) {
      router.replace('/login')
    }
  }, [loading, profile, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!profile || profile.role !== 'admin') {
    return null
  }

  return <>{children}</>
}
```

- [ ] **Step 3: Wrap root layout with AuthProvider**

Update `src/app/layout.tsx` — wrap `{children}` with `<AuthProvider>`:

```typescript
import { AuthProvider } from '@/contexts/auth-context'

// ... inside the body:
<AuthProvider>
  {children}
</AuthProvider>
<Toaster />
```

- [ ] **Step 4: Verify — app still loads at localhost:3001**

```bash
npm run dev -- -p 3001
```

No errors in terminal or browser console.

- [ ] **Step 5: Commit**

```bash
git add src/contexts/auth-context.tsx src/components/auth-guard.tsx src/app/layout.tsx
git commit -m "feat: add auth context and auth guard"
```

---

## Task 4: Login & Password Reset Pages

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/reset-password/page.tsx`

- [ ] **Step 1: Create login page with forgot-password inline state**

`src/app/(auth)/login/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const { signIn, resetPassword } = useAuth()
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      router.replace('/dashboard')
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await resetPassword(email)
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      setResetSent(true)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">IThealth</CardTitle>
          <CardDescription>
            {mode === 'login' ? 'Sign in to your account' : 'Reset your password'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
              <button type="button" onClick={() => { setMode('forgot'); setResetSent(false) }} className="w-full text-sm text-muted-foreground hover:underline">
                Forgot password?
              </button>
            </form>
          ) : resetSent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">Check your email for a password reset link.</p>
              <button type="button" onClick={() => { setMode('login'); setResetSent(false) }} className="text-sm text-muted-foreground hover:underline">
                Back to login
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send reset link'}
              </Button>
              <button type="button" onClick={() => setMode('login')} className="w-full text-sm text-muted-foreground hover:underline">
                Back to login
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Create reset-password page**

`src/app/(auth)/reset-password/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { updatePassword } = useAuth()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    const { error } = await updatePassword(password)
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password updated successfully')
      router.replace('/login')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>Enter your new password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input id="confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating...' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Verify — navigate to localhost:3001/login, form renders**

- [ ] **Step 4: Verify — sign in with admin@ithealth.ai / admin123456, redirects to /dashboard (will 404 for now, that's expected)**

- [ ] **Step 5: Commit**

```bash
git add src/app/\(auth\)/
git commit -m "feat: add login and reset password pages"
```

---

## Task 5: Menu Context

**Files:**
- Create: `src/contexts/menu-context.tsx`

- [ ] **Step 1: Create menu context**

`src/contexts/menu-context.tsx`:

```typescript
'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/auth-context'
import { MenuItem } from '@/lib/types'

interface MenuContextType {
  menuTree: MenuItem[]
  flatMenu: MenuItem[]
  loading: boolean
  refresh: () => Promise<void>
}

const MenuContext = createContext<MenuContextType | undefined>(undefined)

function buildTree(items: MenuItem[]): MenuItem[] {
  const map = new Map<string, MenuItem>()
  const roots: MenuItem[] = []

  items.forEach(item => {
    map.set(item.id, { ...item, children: [] })
  })

  map.forEach(item => {
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id)!.children!.push(item)
    } else if (!item.parent_id) {
      roots.push(item)
    }
  })

  return roots
}

export function MenuProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [flatMenu, setFlatMenu] = useState<MenuItem[]>([])
  const [menuTree, setMenuTree] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    const { data, error } = await supabase.rpc('get_menu_tree', {
      user_role: profile.role,
    })
    if (!error && data) {
      setFlatMenu(data as MenuItem[])
      setMenuTree(buildTree(data as MenuItem[]))
    }
    setLoading(false)
  }, [profile])

  useEffect(() => {
    if (profile) {
      refresh()
    }
  }, [profile, refresh])

  return (
    <MenuContext.Provider value={{ menuTree, flatMenu, loading, refresh }}>
      {children}
    </MenuContext.Provider>
  )
}

export function useMenu() {
  const context = useContext(MenuContext)
  if (!context) throw new Error('useMenu must be used within MenuProvider')
  return context
}
```

- [ ] **Step 2: Commit**

```bash
git add src/contexts/menu-context.tsx
git commit -m "feat: add menu context with tree builder"
```

---

## Task 6: Admin Layout Shell — Sidebar & Mega Menu

**Files:**
- Create: `src/components/sidebar.tsx`
- Create: `src/components/mega-menu.tsx`
- Create: `src/components/breadcrumb.tsx`
- Create: `src/app/(admin)/layout.tsx`

- [ ] **Step 1: Create sidebar component**

`src/components/sidebar.tsx`:

```typescript
'use client'

import { useMenu } from '@/contexts/menu-context'
import { useAuth } from '@/contexts/auth-context'
import { usePathname, useRouter } from 'next/navigation'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { iconMap } from '@/lib/icon-map'

function getIcon(iconName: string | null) {
  if (!iconName) {
    const Fallback = iconMap['circle-dash']
    return <Fallback size={20} />
  }
  const Icon = iconMap[iconName]
  if (!Icon) {
    const Fallback = iconMap['circle-dash']
    return <Fallback size={20} />
  }
  return <Icon size={20} />
}

export function Sidebar() {
  const { menuTree } = useMenu()
  const { signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const l1Items = menuTree.filter(item => item.level === 1)

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen w-[60px] flex-col items-center border-r bg-slate-900 py-4">
        {/* Logo */}
        <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white font-bold text-sm">
          IT
        </div>

        {/* Nav items */}
        <nav className="flex flex-1 flex-col items-center gap-1">
          {l1Items.map(item => {
            const isActive = pathname.startsWith(item.route || '')
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      const firstChild = item.children?.[0]
                      router.push(firstChild?.route || item.route || '/')
                    }}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {getIcon(item.icon)}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </nav>

        {/* Logout */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={signOut}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              {(() => { const LogoutIcon = iconMap['logout']; return <LogoutIcon size={20} /> })()}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Logout</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
```

- [ ] **Step 2: Create mega menu component**

`src/components/mega-menu.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useMenu } from '@/contexts/menu-context'
import { usePathname, useRouter } from 'next/navigation'
import { MenuItem } from '@/lib/types'

export function MegaMenu() {
  const { menuTree } = useMenu()
  const pathname = usePathname()
  const router = useRouter()
  const [expandedL2, setExpandedL2] = useState<string | null>(null)

  // Find active L1 based on pathname
  const activeL1 = menuTree.find(item =>
    item.level === 1 && pathname.startsWith(item.route || '')
  )

  if (!activeL1) return <div className="h-12 border-b bg-white" />

  const l2Items = activeL1.children || []

  return (
    <div className="relative border-b bg-white">
      {/* L2 tab bar */}
      <div className="flex h-12 items-center gap-1 px-4">
        {l2Items.map(item => {
          const isActive = pathname.startsWith(item.route || '')
          const hasChildren = item.children && item.children.length > 0
          return (
            <button
              key={item.id}
              onClick={() => {
                if (hasChildren) {
                  setExpandedL2(expandedL2 === item.id ? null : item.id)
                } else {
                  router.push(item.route || '/')
                  setExpandedL2(null)
                }
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {/* L3/L4 dropdown panel */}
      {expandedL2 && (
        <MegaMenuDropdown
          l2Item={l2Items.find(i => i.id === expandedL2)!}
          onNavigate={(route) => {
            router.push(route)
            setExpandedL2(null)
          }}
        />
      )}
    </div>
  )
}

function MegaMenuDropdown({ l2Item, onNavigate }: { l2Item: MenuItem; onNavigate: (route: string) => void }) {
  if (!l2Item.children || l2Item.children.length === 0) return null

  return (
    <div className="absolute left-0 right-0 top-12 z-50 border-b bg-white p-4 shadow-lg">
      <div className="flex gap-8">
        {l2Item.children.map(l3 => (
          <div key={l3.id} className="space-y-2">
            <button
              onClick={() => l3.route && onNavigate(l3.route)}
              className="text-sm font-semibold text-slate-900 hover:underline"
            >
              {l3.label}
            </button>
            {l3.children && l3.children.length > 0 && (
              <ul className="space-y-1">
                {l3.children.map(l4 => (
                  <li key={l4.id}>
                    <button
                      onClick={() => l4.route && onNavigate(l4.route)}
                      className="text-sm text-slate-600 hover:text-slate-900 hover:underline"
                    >
                      {l4.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create breadcrumb component**

`src/components/breadcrumb.tsx`:

```typescript
'use client'

import { useMenu } from '@/contexts/menu-context'
import { usePathname } from 'next/navigation'
import { iconMap } from '@/lib/icon-map'

const ChevronRight = iconMap['chevron-right']

export function Breadcrumb() {
  const { flatMenu } = useMenu()
  const pathname = usePathname()

  const crumbs = flatMenu
    .filter(item => item.route && pathname.startsWith(item.route))
    .sort((a, b) => a.level - b.level)

  if (crumbs.length === 0) return null

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      {crumbs.map((crumb, i) => (
        <span key={crumb.id} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={12} />}
          <span className={i === crumbs.length - 1 ? 'text-foreground font-medium' : ''}>
            {crumb.label}
          </span>
        </span>
      ))}
    </nav>
  )
}
```

- [ ] **Step 4: Create admin layout**

`src/app/(admin)/layout.tsx`:

```typescript
'use client'

import { AuthGuard } from '@/components/auth-guard'
import { MenuProvider } from '@/contexts/menu-context'
import { Sidebar } from '@/components/sidebar'
import { MegaMenu } from '@/components/mega-menu'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <MenuProvider>
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <MegaMenu />
            <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
              {children}
            </main>
          </div>
        </div>
      </MenuProvider>
    </AuthGuard>
  )
}
```

- [ ] **Step 5: Verify — log in, confirm sidebar renders with icons, mega menu shows L2 tabs**

- [ ] **Step 6: Commit**

```bash
git add src/components/sidebar.tsx src/components/mega-menu.tsx src/components/breadcrumb.tsx src/app/\(admin\)/layout.tsx
git commit -m "feat: add admin shell with sidebar, mega menu, and breadcrumb"
```

---

## Task 7: Dashboard & Placeholder Pages

**Files:**
- Create: `src/app/(admin)/dashboard/page.tsx`
- Create: `src/app/(admin)/growth/page.tsx`
- Create: `src/app/(admin)/sales/page.tsx`
- Create: `src/app/(admin)/services/page.tsx`
- Create: `src/app/(admin)/delivery/page.tsx`
- Create: `src/app/(admin)/academy/page.tsx`
- Create: `src/app/(admin)/settings/general/page.tsx`

- [ ] **Step 1: Create dashboard page (richer placeholder)**

`src/app/(admin)/dashboard/page.tsx`:

```typescript
'use client'

import { useAuth } from '@/contexts/auth-context'
import { Breadcrumb } from '@/components/breadcrumb'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserMultiple, Building, TaskComplete, GrowthChart } from '@carbon/icons-react'

export default function DashboardPage() {
  const { profile } = useAuth()

  return (
    <div>
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-muted-foreground mb-6">Welcome back, {profile?.display_name}</p>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Building size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserMultiple size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <TaskComplete size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <GrowthChart size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$48,200</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create placeholder page template**

For each of: `growth`, `sales`, `services`, `delivery`, `academy`, `settings/general` — create a page with this pattern:

```typescript
'use client'

import { Breadcrumb } from '@/components/breadcrumb'

export default function GrowthPage() {
  return (
    <div>
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-1">Growth</h1>
      <p className="text-muted-foreground">Coming soon</p>
    </div>
  )
}
```

Replace the title for each section accordingly.

- [ ] **Step 3: Verify — navigate between sidebar items, pages render with breadcrumbs**

- [ ] **Step 4: Commit**

```bash
git add src/app/\(admin\)/
git commit -m "feat: add dashboard and placeholder pages"
```

---

## Task 8: API Route Handler for Admin User Operations

**Files:**
- Create: `src/app/api/admin/users/route.ts`

- [ ] **Step 1: Create the route handler**

`src/app/api/admin/users/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') return null
  return user
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { action } = body

  if (action === 'create') {
    const { email, password, display_name, company_id, role } = body

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email,
        display_name,
        company_id,
        role,
      })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ user: authUser.user })
  }

  if (action === 'reset-password') {
    const { email } = body
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
    })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  }

  if (action === 'update') {
    const { user_id, display_name, company_id, role, is_active } = body
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ display_name, company_id, role, is_active })
      .eq('id', user_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/users/route.ts
git commit -m "feat: add admin API route handler for user operations"
```

---

## Task 9: People — Companies Page

**Files:**
- Create: `src/app/(admin)/people/companies/page.tsx`

- [ ] **Step 1: Create companies page**

`src/app/(admin)/people/companies/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Breadcrumb } from '@/components/breadcrumb'
import { Company } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Add, Edit } from '@carbon/icons-react'

interface CompanyWithCount extends Company {
  user_count: number
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)
  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(true)

  async function fetchCompanies() {
    setLoading(true)
    const { data, error } = await supabase
      .from('companies')
      .select('*, profiles(count)')
      .order('name')

    if (!error && data) {
      const mapped = data.map((c: any) => ({
        ...c,
        user_count: c.profiles?.[0]?.count ?? 0,
      }))
      setCompanies(mapped)
    }
    setLoading(false)
  }

  useEffect(() => { fetchCompanies() }, [])

  function openCreate() {
    setEditing(null)
    setName('')
    setIsActive(true)
    setDialogOpen(true)
  }

  function openEdit(company: Company) {
    setEditing(company)
    setName(company.name)
    setIsActive(company.is_active)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (editing) {
      const { error } = await supabase
        .from('companies')
        .update({ name, is_active: isActive })
        .eq('id', editing.id)
      if (error) { toast.error(error.message); return }
      toast.success('Company updated')
    } else {
      const { error } = await supabase
        .from('companies')
        .insert({ name, is_active: isActive })
      if (error) { toast.error(error.message); return }
      toast.success('Company created')
    }
    setDialogOpen(false)
    fetchCompanies()
  }

  return (
    <div>
      <Breadcrumb />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Companies</h1>
        <Button onClick={openCreate}><Add size={16} className="mr-2" /> Add Company</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Users</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map(company => (
            <TableRow key={company.id}>
              <TableCell className="font-medium">{company.name}</TableCell>
              <TableCell>{company.user_count}</TableCell>
              <TableCell>
                <Badge variant={company.is_active ? 'default' : 'secondary'}>
                  {company.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => openEdit(company)}>
                  <Edit size={16} />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Company' : 'New Company'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Name</Label>
              <Input id="company-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="company-active" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <Label htmlFor="company-active">Active</Label>
            </div>
            <Button onClick={handleSave} className="w-full">
              {editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Verify — navigate to People > Companies, see IThealth in the table, create a new company**

- [ ] **Step 3: Commit**

```bash
git add src/app/\(admin\)/people/companies/
git commit -m "feat: add companies management page"
```

---

## Task 10: People — Users Page

**Files:**
- Create: `src/app/(admin)/people/users/page.tsx`

- [ ] **Step 1: Create users page**

`src/app/(admin)/people/users/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/auth-context'
import { Breadcrumb } from '@/components/breadcrumb'
import { Profile, Company, UserRole } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Add, Edit, Password } from '@carbon/icons-react'

export default function UsersPage() {
  const { session } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [filterCompany, setFilterCompany] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Profile | null>(null)

  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [role, setRole] = useState<UserRole>('customer')
  const [isActive, setIsActive] = useState(true)

  async function fetchUsers() {
    setLoading(true)
    let query = supabase.from('profiles').select('*, company:companies(*)').order('display_name')
    if (filterCompany !== 'all') {
      query = query.eq('company_id', filterCompany)
    }
    const { data } = await query
    if (data) setUsers(data as Profile[])
    setLoading(false)
  }

  async function fetchCompanies() {
    const { data } = await supabase.from('companies').select('*').eq('is_active', true).order('name')
    if (data) setCompanies(data)
  }

  useEffect(() => { fetchCompanies() }, [])
  useEffect(() => { fetchUsers() }, [filterCompany])

  function openCreate() {
    setEditing(null)
    setEmail('')
    setPassword('')
    setDisplayName('')
    setCompanyId(companies[0]?.id || '')
    setRole('customer')
    setIsActive(true)
    setDialogOpen(true)
  }

  function openEdit(user: Profile) {
    setEditing(user)
    setEmail(user.email)
    setDisplayName(user.display_name)
    setCompanyId(user.company_id)
    setRole(user.role)
    setIsActive(user.is_active)
    setDialogOpen(true)
  }

  async function handleSave() {
    const token = session?.access_token
    if (!token) return

    if (editing) {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: 'update',
          user_id: editing.id,
          display_name: displayName,
          company_id: companyId,
          role,
          is_active: isActive,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success('User updated')
    } else {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: 'create',
          email,
          password,
          display_name: displayName,
          company_id: companyId,
          role,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success('User created')
    }
    setDialogOpen(false)
    fetchUsers()
  }

  async function handleResetPassword(user: Profile) {
    const token = session?.access_token
    if (!token) return

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'reset-password', email: user.email }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); return }
    toast.success(`Password reset email sent to ${user.email}`)
  }

  return (
    <div>
      <Breadcrumb />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <div className="flex items-center gap-4">
          <Select value={filterCompany} onValueChange={setFilterCompany}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate}><Add size={16} className="mr-2" /> Add User</Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(user => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.display_name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.company?.name}</TableCell>
              <TableCell><Badge variant="outline">{user.role}</Badge></TableCell>
              <TableCell>
                <Badge variant={user.is_active ? 'default' : 'secondary'}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                  <Edit size={16} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleResetPassword(user)}>
                  <Password size={16} />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit User' : 'New User'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editing && (
              <>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editing && (
              <div className="flex items-center gap-2">
                <input type="checkbox" id="user-active" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                <Label htmlFor="user-active">Active</Label>
              </div>
            )}
            <Button onClick={handleSave} className="w-full">
              {editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Verify — navigate to People > Users, see admin user, create a new user, reset password**

- [ ] **Step 3: Commit**

```bash
git add src/app/\(admin\)/people/users/
git commit -m "feat: add users management page with CRUD and password reset"
```

---

## Task 11: Menu Editor Page

**Files:**
- Create: `src/app/(admin)/settings/menu-editor/page.tsx`

- [ ] **Step 1: Create menu editor page**

`src/app/(admin)/settings/menu-editor/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useMenu } from '@/contexts/menu-context'
import { Breadcrumb } from '@/components/breadcrumb'
import { MenuItem, UserRole } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Add, Edit, TrashCan, ChevronRight } from '@carbon/icons-react'

export default function MenuEditorPage() {
  const { refresh } = useMenu()
  const [items, setItems] = useState<MenuItem[]>([])
  const [tree, setTree] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [roleAccess, setRoleAccess] = useState<Record<string, UserRole[]>>({})

  // Form state
  const [label, setLabel] = useState('')
  const [icon, setIcon] = useState('')
  const [route, setRoute] = useState('')
  const [parentId, setParentId] = useState<string>('none')
  const [sortOrder, setSortOrder] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(['admin'])

  async function fetchItems() {
    setLoading(true)
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .order('level')
      .order('sort_order')

    if (data) {
      setItems(data)
      setTree(buildTree(data))
    }

    // Fetch role access
    const { data: accessData } = await supabase.from('role_menu_access').select('*')
    if (accessData) {
      const map: Record<string, UserRole[]> = {}
      accessData.forEach((a: { menu_item_id: string; role: UserRole }) => {
        if (!map[a.menu_item_id]) map[a.menu_item_id] = []
        map[a.menu_item_id].push(a.role)
      })
      setRoleAccess(map)
    }

    setLoading(false)
  }

  function buildTree(items: MenuItem[]): MenuItem[] {
    const map = new Map<string, MenuItem>()
    const roots: MenuItem[] = []
    items.forEach(i => map.set(i.id, { ...i, children: [] }))
    map.forEach(item => {
      if (item.parent_id && map.has(item.parent_id)) {
        map.get(item.parent_id)!.children!.push(item)
      } else if (!item.parent_id) {
        roots.push(item)
      }
    })
    return roots
  }

  useEffect(() => { fetchItems() }, [])

  function openCreate(parentId?: string) {
    setEditing(null)
    setLabel('')
    setIcon('')
    setRoute('')
    setParentId(parentId || 'none')
    setSortOrder(0)
    setIsActive(true)
    setSelectedRoles(['admin'])
    setDialogOpen(true)
  }

  function openEdit(item: MenuItem) {
    setEditing(item)
    setLabel(item.label)
    setIcon(item.icon || '')
    setRoute(item.route || '')
    setParentId(item.parent_id || 'none')
    setSortOrder(item.sort_order)
    setIsActive(item.is_active)
    setSelectedRoles(roleAccess[item.id] || ['admin'])
    setDialogOpen(true)
  }

  function computeLevel(parentId: string | null): number {
    if (!parentId) return 1
    const parent = items.find(i => i.id === parentId)
    return parent ? parent.level + 1 : 1
  }

  async function handleSave() {
    const pid = parentId === 'none' ? null : parentId
    const level = computeLevel(pid)

    if (editing) {
      const { error } = await supabase
        .from('menu_items')
        .update({ label, icon: icon || null, route: route || null, parent_id: pid, sort_order: sortOrder, level, is_active: isActive })
        .eq('id', editing.id)
      if (error) { toast.error(error.message); return }

      // Update role access
      await supabase.from('role_menu_access').delete().eq('menu_item_id', editing.id)
      if (selectedRoles.length > 0) {
        await supabase.from('role_menu_access').insert(
          selectedRoles.map(r => ({ role: r, menu_item_id: editing.id }))
        )
      }
      toast.success('Menu item updated')
    } else {
      const { data, error } = await supabase
        .from('menu_items')
        .insert({ label, icon: icon || null, route: route || null, parent_id: pid, sort_order: sortOrder, level, is_active: isActive })
        .select()
        .single()
      if (error) { toast.error(error.message); return }

      if (data && selectedRoles.length > 0) {
        await supabase.from('role_menu_access').insert(
          selectedRoles.map(r => ({ role: r, menu_item_id: data.id }))
        )
      }
      toast.success('Menu item created')
    }
    setDialogOpen(false)
    fetchItems()
    refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this menu item? Children will also be deleted.')) return
    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Menu item deleted')
    fetchItems()
    refresh()
  }

  function toggleRole(role: UserRole) {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  function renderTree(items: MenuItem[], depth = 0) {
    return items.map(item => (
      <div key={item.id}>
        <div
          className="flex items-center gap-2 py-2 px-3 hover:bg-slate-50 rounded"
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          {item.children && item.children.length > 0 && (
            <ChevronRight size={16} className="text-muted-foreground" />
          )}
          <span className="flex-1 text-sm font-medium">{item.label}</span>
          <span className="text-xs text-muted-foreground">{item.route}</span>
          <Badge variant={item.is_active ? 'default' : 'secondary'} className="text-xs">
            L{item.level}
          </Badge>
          <div className="flex gap-1">
            {depth < 3 && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCreate(item.id)}>
                <Add size={12} />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
              <Edit size={12} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(item.id)}>
              <TrashCan size={12} />
            </Button>
          </div>
        </div>
        {item.children && renderTree(item.children, depth + 1)}
      </div>
    ))
  }

  return (
    <div>
      <Breadcrumb />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Menu Editor</h1>
        <Button onClick={() => openCreate()}><Add size={16} className="mr-2" /> Add Root Item</Button>
      </div>

      <div className="rounded-lg border bg-white">
        {tree.length === 0 && !loading ? (
          <p className="p-4 text-muted-foreground">No menu items yet.</p>
        ) : (
          renderTree(tree)
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Menu Item' : 'New Menu Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Icon (Lucide name, L1 only)</Label>
              <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="e.g. layout-dashboard" />
            </div>
            <div className="space-y-2">
              <Label>Route</Label>
              <Input value={route} onChange={(e) => setRoute(e.target.value)} placeholder="/path" />
            </div>
            <div className="space-y-2">
              <Label>Parent</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Root)</SelectItem>
                  {items.filter(i => i.level < 4).map(i => (
                    <SelectItem key={i.id} value={i.id}>
                      {'—'.repeat(i.level - 1)} {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Role Access</Label>
              <div className="flex gap-2">
                {(['admin', 'customer', 'partner'] as UserRole[]).map(r => (
                  <Button
                    key={r}
                    variant={selectedRoles.includes(r) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleRole(r)}
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="menu-active" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <Label htmlFor="menu-active">Active</Label>
            </div>
            <Button onClick={handleSave} className="w-full">
              {editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Verify — navigate to Settings > Menu Editor, see the full menu tree, edit an item, add a new sub-item, delete an item. Confirm sidebar/mega menu updates after changes.**

- [ ] **Step 3: Commit**

```bash
git add src/app/\(admin\)/settings/menu-editor/
git commit -m "feat: add menu editor with tree view and role access"
```

---

## Task 12: Final Integration & Verification

**Files:**
- Possibly modify any files with issues found during testing

- [ ] **Step 1: Full smoke test**

Run through the full flow:
1. `docker compose up -d` — Supabase is running
2. `npm run dev -- -p 3001` — Next.js is running
3. Visit `/login` — login form renders
4. Sign in with `admin@ithealth.ai` / `admin123456` — redirects to dashboard
5. Dashboard shows welcome message and 4 stat cards
6. Click each sidebar icon — page changes, mega menu updates with L2 tabs
7. Click an L2 tab with children — L3/L4 dropdown appears
8. Navigate to People > Companies — see IThealth, create a company
9. Navigate to People > Users — see admin user, create a user, reset password
10. Navigate to Settings > Menu Editor — see tree, edit, add, delete items
11. Confirm sidebar/mega menu reflect menu editor changes
12. Test forgot password flow on login page
13. Logout — redirects to login

- [ ] **Step 2: Fix any issues found**

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete IThealth admin platform - auth, navigation, user management, menu editor"
```
