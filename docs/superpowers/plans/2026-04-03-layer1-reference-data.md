# Layer 1: Reference Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 8 reference data tables (phases, products, cost_variables, verticals, personas, pains, gains, skills), restructure the Services/Growth/People menus, and build 8 admin CRUD pages following the existing Companies page pattern.

**Architecture:** Each table gets a Supabase migration with RLS, seed data where applicable, and a client-component CRUD page. Menu restructure is done via a migration that removes old L2/L3/L4 items under Services and inserts the new menu hierarchy. All pages are `'use client'` and follow the Companies page pattern: table + dialog for create/edit, with Supabase client queries.

**Tech Stack:** Next.js (App Router), React, TypeScript, shadcn/ui, Tailwind CSS, @carbon/icons-react, Supabase (@supabase/supabase-js), Sonner (toast)

**Spec:** `docs/superpowers/specs/2026-04-02-services-layer1-reference-data-design.md`

---

## File Map

```
IThealth.ai/
├── supabase/
│   ├── migrations/
│   │   ├── 20260403000001_create_phases.sql
│   │   ├── 20260403000002_create_products.sql
│   │   ├── 20260403000003_create_cost_variables.sql
│   │   ├── 20260403000004_create_verticals.sql
│   │   ├── 20260403000005_create_personas.sql
│   │   ├── 20260403000006_create_pains.sql
│   │   ├── 20260403000007_create_gains.sql
│   │   ├── 20260403000008_create_skills.sql
│   │   ├── 20260403000009_layer1_rls_policies.sql
│   │   └── 20260403000010_menu_restructure.sql
│   └── seed.sql                                    # Modified: add phase + menu seed data
├── src/
│   ├── lib/
│   │   └── types.ts                                # Modified: add 8 new interfaces
│   ├── app/(admin)/
│   │   ├── services/
│   │   │   ├── page.tsx                            # Existing placeholder (unchanged)
│   │   │   ├── phases/page.tsx                     # New: Phases CRUD
│   │   │   ├── products/page.tsx                   # New: Products CRUD
│   │   │   └── cost-variables/page.tsx             # New: Cost Variables CRUD
│   │   ├── growth/
│   │   │   ├── page.tsx                            # Existing placeholder (unchanged)
│   │   │   └── market/
│   │   │       ├── verticals/page.tsx              # New: Verticals CRUD
│   │   │       ├── personas/page.tsx               # New: Personas CRUD
│   │   │       ├── pains/page.tsx                  # New: Pains CRUD
│   │   │       └── gains/page.tsx                  # New: Gains CRUD
│   │   └── people/
│   │       └── skills/page.tsx                     # New: Skills CRUD
```

---

## Task 1: Database Migrations — Tables

**Files:**
- Create: `supabase/migrations/20260403000001_create_phases.sql`
- Create: `supabase/migrations/20260403000002_create_products.sql`
- Create: `supabase/migrations/20260403000003_create_cost_variables.sql`
- Create: `supabase/migrations/20260403000004_create_verticals.sql`
- Create: `supabase/migrations/20260403000005_create_personas.sql`
- Create: `supabase/migrations/20260403000006_create_pains.sql`
- Create: `supabase/migrations/20260403000007_create_gains.sql`
- Create: `supabase/migrations/20260403000008_create_skills.sql`

- [ ] **Step 1: Create phases migration**

`supabase/migrations/20260403000001_create_phases.sql`:

```sql
CREATE TABLE public.phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_phases_sort_order ON public.phases(sort_order);

CREATE TRIGGER phases_updated_at
  BEFORE UPDATE ON public.phases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 2: Create products migration**

`supabase/migrations/20260403000002_create_products.sql`:

```sql
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  vendor text,
  category text,
  licensing_model text CHECK (licensing_model IN ('per_user', 'per_device', 'flat_fee')),
  cost numeric(10,2),
  logo_url text,
  url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_vendor ON public.products(vendor);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 3: Create cost_variables migration**

`supabase/migrations/20260403000003_create_cost_variables.sql`:

```sql
CREATE TABLE public.cost_variables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  unit_label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cost_variables ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER cost_variables_updated_at
  BEFORE UPDATE ON public.cost_variables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 4: Create verticals migration**

`supabase/migrations/20260403000004_create_verticals.sql`:

```sql
CREATE TABLE public.verticals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.verticals ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER verticals_updated_at
  BEFORE UPDATE ON public.verticals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 5: Create personas migration**

`supabase/migrations/20260403000005_create_personas.sql`:

```sql
CREATE TABLE public.personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER personas_updated_at
  BEFORE UPDATE ON public.personas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 6: Create pains migration**

`supabase/migrations/20260403000006_create_pains.sql`:

```sql
CREATE TABLE public.pains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pains ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER pains_updated_at
  BEFORE UPDATE ON public.pains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 7: Create gains migration**

`supabase/migrations/20260403000007_create_gains.sql`:

```sql
CREATE TABLE public.gains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gains ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER gains_updated_at
  BEFORE UPDATE ON public.gains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 8: Create skills migration**

`supabase/migrations/20260403000008_create_skills.sql`:

```sql
CREATE TABLE public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  category text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_skills_category ON public.skills(category);

CREATE TRIGGER skills_updated_at
  BEFORE UPDATE ON public.skills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/20260403000001_create_phases.sql supabase/migrations/20260403000002_create_products.sql supabase/migrations/20260403000003_create_cost_variables.sql supabase/migrations/20260403000004_create_verticals.sql supabase/migrations/20260403000005_create_personas.sql supabase/migrations/20260403000006_create_pains.sql supabase/migrations/20260403000007_create_gains.sql supabase/migrations/20260403000008_create_skills.sql
git commit -m "feat: add layer 1 reference data table migrations"
```

---

## Task 2: RLS Policies, Menu Restructure & Seed Data

**Files:**
- Create: `supabase/migrations/20260403000009_layer1_rls_policies.sql`
- Create: `supabase/migrations/20260403000010_menu_restructure.sql`
- Modify: `supabase/seed.sql`

- [ ] **Step 1: Create RLS policies for all 8 tables**

`supabase/migrations/20260403000009_layer1_rls_policies.sql`:

All 8 tables use the same pattern as `companies`: admins get full CRUD, non-admins get SELECT.

```sql
-- Phases
CREATE POLICY "Admins can do everything with phases"
  ON public.phases FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated users can read phases"
  ON public.phases FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Products
CREATE POLICY "Admins can do everything with products"
  ON public.products FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated users can read products"
  ON public.products FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Cost Variables
CREATE POLICY "Admins can do everything with cost_variables"
  ON public.cost_variables FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated users can read cost_variables"
  ON public.cost_variables FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Verticals
CREATE POLICY "Admins can do everything with verticals"
  ON public.verticals FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated users can read verticals"
  ON public.verticals FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Personas
CREATE POLICY "Admins can do everything with personas"
  ON public.personas FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated users can read personas"
  ON public.personas FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Pains
CREATE POLICY "Admins can do everything with pains"
  ON public.pains FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated users can read pains"
  ON public.pains FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Gains
CREATE POLICY "Admins can do everything with gains"
  ON public.gains FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated users can read gains"
  ON public.gains FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Skills
CREATE POLICY "Admins can do everything with skills"
  ON public.skills FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated users can read skills"
  ON public.skills FOR SELECT
  USING (auth.uid() IS NOT NULL);
```

- [ ] **Step 2: Create menu restructure migration**

`supabase/migrations/20260403000010_menu_restructure.sql`:

This migration removes old Services L2/L3/L4 items and inserts the new menu structure for Services, Growth, and People. The L1 items and their IDs are preserved. Growth's old L2 items (Pipeline, Marketing) are removed and replaced with Market. People keeps its existing L2 items (Companies, Users) and gets a new Skills L2.

```sql
-- Remove old Services L2/L3/L4 items (cascade deletes children)
DELETE FROM public.menu_items WHERE id IN (
  '20000000-0000-0000-0000-000000000006',  -- Managed IT
  '20000000-0000-0000-0000-000000000007',  -- Cloud
  '20000000-0000-0000-0000-000000000008'   -- Security
);

-- Remove old Growth L2 items
DELETE FROM public.menu_items WHERE id IN (
  '20000000-0000-0000-0000-000000000002',  -- Pipeline
  '20000000-0000-0000-0000-000000000003'   -- Marketing
);

-- New Services L2 items
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000101', '10000000-0000-0000-0000-000000000004', 'Services', NULL, '/services', 1, 2),
  ('20000000-0000-0000-0000-000000000102', '10000000-0000-0000-0000-000000000004', 'Phases', NULL, '/services/phases', 2, 2),
  ('20000000-0000-0000-0000-000000000103', '10000000-0000-0000-0000-000000000004', 'Products', NULL, '/services/products', 3, 2),
  ('20000000-0000-0000-0000-000000000104', '10000000-0000-0000-0000-000000000004', 'Cost Variables', NULL, '/services/cost-variables', 4, 2);

-- New Growth L2 item: Market
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000105', '10000000-0000-0000-0000-000000000002', 'Market', NULL, '/growth/market', 1, 2);

-- New Growth > Market L3 items
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('30000000-0000-0000-0000-000000000101', '20000000-0000-0000-0000-000000000105', 'Verticals', NULL, '/growth/market/verticals', 1, 3),
  ('30000000-0000-0000-0000-000000000102', '20000000-0000-0000-0000-000000000105', 'Personas', NULL, '/growth/market/personas', 2, 3),
  ('30000000-0000-0000-0000-000000000103', '20000000-0000-0000-0000-000000000105', 'Pains', NULL, '/growth/market/pains', 3, 3),
  ('30000000-0000-0000-0000-000000000104', '20000000-0000-0000-0000-000000000105', 'Gains', NULL, '/growth/market/gains', 4, 3);

-- New People L2 item: Skills (existing Companies/Users L2 items remain)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000106', '10000000-0000-0000-0000-000000000007', 'Skills', NULL, '/people/skills', 3, 2);

-- Grant admin access to all new menu items
INSERT INTO public.role_menu_access (role, menu_item_id)
SELECT 'admin', id FROM public.menu_items
WHERE id IN (
  '20000000-0000-0000-0000-000000000101',
  '20000000-0000-0000-0000-000000000102',
  '20000000-0000-0000-0000-000000000103',
  '20000000-0000-0000-0000-000000000104',
  '20000000-0000-0000-0000-000000000105',
  '20000000-0000-0000-0000-000000000106',
  '30000000-0000-0000-0000-000000000101',
  '30000000-0000-0000-0000-000000000102',
  '30000000-0000-0000-0000-000000000103',
  '30000000-0000-0000-0000-000000000104'
)
ON CONFLICT (role, menu_item_id) DO NOTHING;
```

- [ ] **Step 3: Update seed.sql**

Replace the entire `supabase/seed.sql` with the following. Changes from original: added phases seed data, replaced Services L2 items (Managed IT/Cloud/Security) with new L2 items (Services/Phases/Products/Cost Variables), replaced Growth L2 items (Pipeline/Marketing) with Market L2 + L3 children (Verticals/Personas/Pains/Gains), added Skills L2 under People, removed old L3/L4 items.

```sql
-- IThealth company
INSERT INTO public.companies (id, name, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'IThealth', true)
ON CONFLICT (id) DO NOTHING;

-- Phase seed data
INSERT INTO public.phases (name, description, sort_order) VALUES
  ('Operate', 'Keep IT running day-to-day', 1),
  ('Secure', 'Protect against threats and compliance risks', 2),
  ('Streamline', 'Optimise processes and reduce waste', 3),
  ('Accelerate', 'Drive growth through technology innovation', 4)
ON CONFLICT (name) DO NOTHING;

-- L1 Menu Items (Sidebar)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('10000000-0000-0000-0000-000000000001', NULL, 'Dashboard', 'dashboard', '/dashboard', 1, 1),
  ('10000000-0000-0000-0000-000000000002', NULL, 'Growth', 'growth', '/growth', 2, 1),
  ('10000000-0000-0000-0000-000000000003', NULL, 'Sales', 'currency', '/sales', 3, 1),
  ('10000000-0000-0000-0000-000000000004', NULL, 'Services', 'tool-kit', '/services', 4, 1),
  ('10000000-0000-0000-0000-000000000005', NULL, 'Delivery', 'delivery', '/delivery', 5, 1),
  ('10000000-0000-0000-0000-000000000006', NULL, 'Academy', 'education', '/academy', 6, 1),
  ('10000000-0000-0000-0000-000000000007', NULL, 'People', 'user-multiple', '/people', 7, 1),
  ('10000000-0000-0000-0000-000000000008', NULL, 'Settings', 'settings', '/settings', 8, 1)
ON CONFLICT (id) DO NOTHING;

-- L2: Dashboard
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Overview', NULL, '/dashboard', 1, 2)
ON CONFLICT (id) DO NOTHING;

-- L2: Growth
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000105', '10000000-0000-0000-0000-000000000002', 'Market', NULL, '/growth/market', 1, 2)
ON CONFLICT (id) DO NOTHING;

-- L2: Sales
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'Deals', NULL, '/sales/deals', 1, 2),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', 'Proposals', NULL, '/sales/proposals', 2, 2)
ON CONFLICT (id) DO NOTHING;

-- L2: Services
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000101', '10000000-0000-0000-0000-000000000004', 'Services', NULL, '/services', 1, 2),
  ('20000000-0000-0000-0000-000000000102', '10000000-0000-0000-0000-000000000004', 'Phases', NULL, '/services/phases', 2, 2),
  ('20000000-0000-0000-0000-000000000103', '10000000-0000-0000-0000-000000000004', 'Products', NULL, '/services/products', 3, 2),
  ('20000000-0000-0000-0000-000000000104', '10000000-0000-0000-0000-000000000004', 'Cost Variables', NULL, '/services/cost-variables', 4, 2)
ON CONFLICT (id) DO NOTHING;

-- L2: Delivery
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000005', 'Projects', NULL, '/delivery/projects', 1, 2),
  ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000005', 'Tickets', NULL, '/delivery/tickets', 2, 2)
ON CONFLICT (id) DO NOTHING;

-- L2: Academy
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000006', 'Courses', NULL, '/academy/courses', 1, 2),
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000006', 'Certifications', NULL, '/academy/certifications', 2, 2)
ON CONFLICT (id) DO NOTHING;

-- L2: People
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000007', 'Companies', NULL, '/people/companies', 1, 2),
  ('20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000007', 'Users', NULL, '/people/users', 2, 2),
  ('20000000-0000-0000-0000-000000000106', '10000000-0000-0000-0000-000000000007', 'Skills', NULL, '/people/skills', 3, 2)
ON CONFLICT (id) DO NOTHING;

-- L2: Settings
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000008', 'General', NULL, '/settings/general', 1, 2),
  ('20000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000008', 'Menu Editor', NULL, '/settings/menu-editor', 2, 2)
ON CONFLICT (id) DO NOTHING;

-- L3: Growth > Market
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('30000000-0000-0000-0000-000000000101', '20000000-0000-0000-0000-000000000105', 'Verticals', NULL, '/growth/market/verticals', 1, 3),
  ('30000000-0000-0000-0000-000000000102', '20000000-0000-0000-0000-000000000105', 'Personas', NULL, '/growth/market/personas', 2, 3),
  ('30000000-0000-0000-0000-000000000103', '20000000-0000-0000-0000-000000000105', 'Pains', NULL, '/growth/market/pains', 3, 3),
  ('30000000-0000-0000-0000-000000000104', '20000000-0000-0000-0000-000000000105', 'Gains', NULL, '/growth/market/gains', 4, 3)
ON CONFLICT (id) DO NOTHING;

-- Grant admin access to all menu items
INSERT INTO public.role_menu_access (role, menu_item_id)
SELECT 'admin', id FROM public.menu_items
ON CONFLICT (role, menu_item_id) DO NOTHING;
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260403000009_layer1_rls_policies.sql supabase/migrations/20260403000010_menu_restructure.sql supabase/seed.sql
git commit -m "feat: add layer 1 RLS policies, menu restructure, and seed data"
```

---

## Task 3: TypeScript Types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add interfaces for all 8 new tables**

Append to `src/lib/types.ts` after the existing `RoleMenuAccess` interface:

```typescript
export type LicensingModel = 'per_user' | 'per_device' | 'flat_fee'

export interface Phase {
  id: string
  name: string
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  description: string | null
  vendor: string | null
  category: string | null
  licensing_model: LicensingModel | null
  cost: string | null
  logo_url: string | null
  url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CostVariable {
  id: string
  name: string
  description: string | null
  unit_label: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Vertical {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Persona {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Pain {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Gain {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Skill {
  id: string
  name: string
  description: string | null
  category: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add TypeScript types for layer 1 reference data"
```

---

## Task 4: Phases CRUD Page

**Files:**
- Create: `src/app/(admin)/services/phases/page.tsx`

Phases follow the Companies pattern but with no delete action (phases are fixed reference data). Admins can edit name, description, sort_order, and toggle active.

- [ ] **Step 1: Create phases page**

`src/app/(admin)/services/phases/page.tsx`:

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Breadcrumb } from '@/components/breadcrumb'
import { Phase } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Edit } from '@carbon/icons-react'

export default function PhasesPage() {
  const [phases, setPhases] = useState<Phase[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formSortOrder, setFormSortOrder] = useState(0)
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchPhases = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('phases')
      .select('*')
      .order('sort_order')

    if (error) {
      toast.error('Failed to load phases')
      setLoading(false)
      return
    }

    setPhases(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPhases()
  }, [fetchPhases])

  function openEditDialog(phase: Phase) {
    setEditingPhase(phase)
    setFormName(phase.name)
    setFormDescription(phase.description ?? '')
    setFormSortOrder(phase.sort_order)
    setFormActive(phase.is_active)
    setDialogOpen(true)
  }

  async function handleSave() {
    const trimmedName = formName.trim()
    if (!trimmedName) {
      toast.error('Phase name is required')
      return
    }
    if (!editingPhase) return

    setSaving(true)

    const { error } = await supabase
      .from('phases')
      .update({
        name: trimmedName,
        description: formDescription.trim() || null,
        sort_order: formSortOrder,
        is_active: formActive,
      })
      .eq('id', editingPhase.id)

    if (error) {
      toast.error('Failed to update phase')
      setSaving(false)
      return
    }

    toast.success('Phase updated successfully')
    setSaving(false)
    setDialogOpen(false)
    fetchPhases()
  }

  return (
    <div>
      <Breadcrumb />

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Phases</h1>
        <p className="text-muted-foreground text-sm">
          Modernisation journey phases
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[100px]">Sort Order</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : phases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No phases found
                </TableCell>
              </TableRow>
            ) : (
              phases.map((phase) => (
                <TableRow key={phase.id}>
                  <TableCell className="font-medium">{phase.name}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{phase.description}</TableCell>
                  <TableCell>{phase.sort_order}</TableCell>
                  <TableCell>
                    <Badge variant={phase.is_active ? 'default' : 'secondary'}>
                      {phase.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(phase)}>
                      <Edit size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Phase</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="phase-name">Name</Label>
              <Input
                id="phase-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Phase name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phase-description">Description</Label>
              <Input
                id="phase-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Phase description"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phase-sort-order">Sort Order</Label>
              <Input
                id="phase-sort-order"
                type="number"
                value={formSortOrder}
                onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="phase-active"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="phase-active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(admin\)/services/phases/page.tsx
git commit -m "feat: add phases CRUD page"
```

---

## Task 5: Products CRUD Page

**Files:**
- Create: `src/app/(admin)/services/products/page.tsx`

Products has the most fields: name, description, vendor, category, licensing_model (select dropdown), cost, logo_url, url, active toggle. Supports create, edit, and delete.

- [ ] **Step 1: Create products page**

`src/app/(admin)/services/products/page.tsx`:

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Breadcrumb } from '@/components/breadcrumb'
import { Product, LicensingModel } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Add, Edit, TrashCan } from '@carbon/icons-react'

const LICENSING_OPTIONS: { value: LicensingModel; label: string }[] = [
  { value: 'per_user', label: 'Per User' },
  { value: 'per_device', label: 'Per Device' },
  { value: 'flat_fee', label: 'Flat Fee' },
]

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formVendor, setFormVendor] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formLicensing, setFormLicensing] = useState<LicensingModel | ''>('')
  const [formCost, setFormCost] = useState('')
  const [formLogoUrl, setFormLogoUrl] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name')

    if (error) {
      toast.error('Failed to load products')
      setLoading(false)
      return
    }

    setProducts(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  function resetForm() {
    setFormName('')
    setFormDescription('')
    setFormVendor('')
    setFormCategory('')
    setFormLicensing('')
    setFormCost('')
    setFormLogoUrl('')
    setFormUrl('')
    setFormActive(true)
  }

  function openCreateDialog() {
    setEditingProduct(null)
    resetForm()
    setDialogOpen(true)
  }

  function openEditDialog(product: Product) {
    setEditingProduct(product)
    setFormName(product.name)
    setFormDescription(product.description ?? '')
    setFormVendor(product.vendor ?? '')
    setFormCategory(product.category ?? '')
    setFormLicensing(product.licensing_model ?? '')
    setFormCost(product.cost != null ? String(product.cost) : '')
    setFormLogoUrl(product.logo_url ?? '')
    setFormUrl(product.url ?? '')
    setFormActive(product.is_active)
    setDialogOpen(true)
  }

  async function handleSave() {
    const trimmedName = formName.trim()
    if (!trimmedName) {
      toast.error('Product name is required')
      return
    }

    setSaving(true)

    const payload = {
      name: trimmedName,
      description: formDescription.trim() || null,
      vendor: formVendor.trim() || null,
      category: formCategory.trim() || null,
      licensing_model: formLicensing || null,
      cost: formCost ? parseFloat(formCost) : null,
      logo_url: formLogoUrl.trim() || null,
      url: formUrl.trim() || null,
      is_active: formActive,
    }

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingProduct.id)

      if (error) {
        toast.error('Failed to update product')
        setSaving(false)
        return
      }
      toast.success('Product updated successfully')
    } else {
      const { error } = await supabase
        .from('products')
        .insert(payload)

      if (error) {
        toast.error('Failed to create product')
        setSaving(false)
        return
      }
      toast.success('Product created successfully')
    }

    setSaving(false)
    setDialogOpen(false)
    fetchProducts()
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Delete "${product.name}"?`)) return

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id)

    if (error) {
      toast.error('Failed to delete product')
      return
    }

    toast.success('Product deleted')
    fetchProducts()
  }

  return (
    <div>
      <Breadcrumb />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Products</h1>
          <p className="text-muted-foreground text-sm">
            Vendor products and tools used in services
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Add size={16} />
          Add Product
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Licensing</TableHead>
              <TableHead className="w-[100px]">Cost</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.vendor}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>
                    {product.licensing_model
                      ? LICENSING_OPTIONS.find(o => o.value === product.licensing_model)?.label ?? product.licensing_model
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {product.cost != null ? `$${Number(product.cost).toFixed(2)}` : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.is_active ? 'default' : 'secondary'}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(product)}>
                        <Edit size={16} />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(product)}>
                        <TrashCan size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="product-name">Name</Label>
              <Input id="product-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Product name" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="product-description">Description</Label>
              <Input id="product-description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="What the product does" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="product-vendor">Vendor</Label>
                <Input id="product-vendor" value={formVendor} onChange={(e) => setFormVendor(e.target.value)} placeholder="Vendor name" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="product-category">Category</Label>
                <Input id="product-category" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="e.g., Security, Backup" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Licensing Model</Label>
                <Select value={formLicensing} onValueChange={(v) => setFormLicensing(v as LicensingModel)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {LICENSING_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="product-cost">Cost</Label>
                <Input id="product-cost" type="number" step="0.01" value={formCost} onChange={(e) => setFormCost(e.target.value)} placeholder="0.00" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="product-logo-url">Logo URL</Label>
              <Input id="product-logo-url" value={formLogoUrl} onChange={(e) => setFormLogoUrl(e.target.value)} placeholder="https://..." />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="product-url">Product URL</Label>
              <Input id="product-url" value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder="https://..." />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="product-active" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} className="h-4 w-4 rounded border-border" />
              <Label htmlFor="product-active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingProduct ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(admin\)/services/products/page.tsx
git commit -m "feat: add products CRUD page"
```

---

## Task 6: Cost Variables CRUD Page

**Files:**
- Create: `src/app/(admin)/services/cost-variables/page.tsx`

Simple name/description/unit_label CRUD with create, edit, delete.

- [ ] **Step 1: Create cost variables page**

`src/app/(admin)/services/cost-variables/page.tsx`:

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Breadcrumb } from '@/components/breadcrumb'
import { CostVariable } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Add, Edit, TrashCan } from '@carbon/icons-react'

export default function CostVariablesPage() {
  const [items, setItems] = useState<CostVariable[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CostVariable | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formUnitLabel, setFormUnitLabel] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('cost_variables')
      .select('*')
      .order('name')

    if (error) {
      toast.error('Failed to load cost variables')
      setLoading(false)
      return
    }

    setItems(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  function openCreateDialog() {
    setEditing(null)
    setFormName('')
    setFormDescription('')
    setFormUnitLabel('')
    setFormActive(true)
    setDialogOpen(true)
  }

  function openEditDialog(item: CostVariable) {
    setEditing(item)
    setFormName(item.name)
    setFormDescription(item.description ?? '')
    setFormUnitLabel(item.unit_label ?? '')
    setFormActive(item.is_active)
    setDialogOpen(true)
  }

  async function handleSave() {
    const trimmedName = formName.trim()
    if (!trimmedName) {
      toast.error('Name is required')
      return
    }

    setSaving(true)

    const payload = {
      name: trimmedName,
      description: formDescription.trim() || null,
      unit_label: formUnitLabel.trim() || null,
      is_active: formActive,
    }

    if (editing) {
      const { error } = await supabase.from('cost_variables').update(payload).eq('id', editing.id)
      if (error) { toast.error('Failed to update cost variable'); setSaving(false); return }
      toast.success('Cost variable updated')
    } else {
      const { error } = await supabase.from('cost_variables').insert(payload)
      if (error) { toast.error('Failed to create cost variable'); setSaving(false); return }
      toast.success('Cost variable created')
    }

    setSaving(false)
    setDialogOpen(false)
    fetchItems()
  }

  async function handleDelete(item: CostVariable) {
    if (!confirm(`Delete "${item.name}"?`)) return
    const { error } = await supabase.from('cost_variables').delete().eq('id', item.id)
    if (error) { toast.error('Failed to delete cost variable'); return }
    toast.success('Cost variable deleted')
    fetchItems()
  }

  return (
    <div>
      <Breadcrumb />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Cost Variables</h1>
          <p className="text-muted-foreground text-sm">
            Variables used to calculate service costs
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Add size={16} />
          Add Cost Variable
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Unit Label</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No cost variables found</TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.unit_label ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? 'default' : 'secondary'}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(item)}>
                        <Edit size={16} />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(item)}>
                        <TrashCan size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Cost Variable' : 'Add Cost Variable'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="cv-name">Name</Label>
              <Input id="cv-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., Users" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cv-description">Description</Label>
              <Input id="cv-description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="What this variable represents" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cv-unit">Unit Label</Label>
              <Input id="cv-unit" value={formUnitLabel} onChange={(e) => setFormUnitLabel(e.target.value)} placeholder="e.g., users, devices" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="cv-active" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} className="h-4 w-4 rounded border-border" />
              <Label htmlFor="cv-active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(admin\)/services/cost-variables/page.tsx
git commit -m "feat: add cost variables CRUD page"
```

---

## Task 7: Market Pages — Verticals, Personas, Pains, Gains

**Files:**
- Create: `src/app/(admin)/growth/market/verticals/page.tsx`
- Create: `src/app/(admin)/growth/market/personas/page.tsx`
- Create: `src/app/(admin)/growth/market/pains/page.tsx`
- Create: `src/app/(admin)/growth/market/gains/page.tsx`

All four pages share the exact same pattern: name + description + is_active CRUD. The only differences are the table name, page title, and description text. Each page is self-contained.

- [ ] **Step 1: Create verticals page**

`src/app/(admin)/growth/market/verticals/page.tsx`:

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Breadcrumb } from '@/components/breadcrumb'
import { Vertical } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Add, Edit, TrashCan } from '@carbon/icons-react'

export default function VerticalsPage() {
  const [items, setItems] = useState<Vertical[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Vertical | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('verticals').select('*').order('name')
    if (error) { toast.error('Failed to load verticals'); setLoading(false); return }
    setItems(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  function openCreateDialog() {
    setEditing(null); setFormName(''); setFormDescription(''); setFormActive(true); setDialogOpen(true)
  }

  function openEditDialog(item: Vertical) {
    setEditing(item); setFormName(item.name); setFormDescription(item.description ?? ''); setFormActive(item.is_active); setDialogOpen(true)
  }

  async function handleSave() {
    const trimmedName = formName.trim()
    if (!trimmedName) { toast.error('Name is required'); return }
    setSaving(true)
    const payload = { name: trimmedName, description: formDescription.trim() || null, is_active: formActive }

    if (editing) {
      const { error } = await supabase.from('verticals').update(payload).eq('id', editing.id)
      if (error) { toast.error('Failed to update vertical'); setSaving(false); return }
      toast.success('Vertical updated')
    } else {
      const { error } = await supabase.from('verticals').insert(payload)
      if (error) { toast.error('Failed to create vertical'); setSaving(false); return }
      toast.success('Vertical created')
    }
    setSaving(false); setDialogOpen(false); fetchItems()
  }

  async function handleDelete(item: Vertical) {
    if (!confirm(`Delete "${item.name}"?`)) return
    const { error } = await supabase.from('verticals').delete().eq('id', item.id)
    if (error) { toast.error('Failed to delete vertical'); return }
    toast.success('Vertical deleted'); fetchItems()
  }

  return (
    <div>
      <Breadcrumb />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Verticals</h1>
          <p className="text-muted-foreground text-sm">Industry verticals for market targeting</p>
        </div>
        <Button onClick={openCreateDialog}><Add size={16} />Add Vertical</Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No verticals found</TableCell></TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{item.description}</TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? 'default' : 'secondary'}>{item.is_active ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(item)}><Edit size={16} /></Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(item)}><TrashCan size={16} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Vertical' : 'Add Vertical'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="vert-name">Name</Label>
              <Input id="vert-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., Legal, Healthcare" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vert-desc">Description</Label>
              <Input id="vert-desc" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Industry description" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="vert-active" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} className="h-4 w-4 rounded border-border" />
              <Label htmlFor="vert-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Create personas page**

`src/app/(admin)/growth/market/personas/page.tsx`:

Same structure as verticals. Differences: table = `personas`, type = `Persona`, title = "Personas", subtitle = "Target buyer personas", placeholder = "e.g., IT Manager, Business Owner".

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Breadcrumb } from '@/components/breadcrumb'
import { Persona } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Add, Edit, TrashCan } from '@carbon/icons-react'

export default function PersonasPage() {
  const [items, setItems] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Persona | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('personas').select('*').order('name')
    if (error) { toast.error('Failed to load personas'); setLoading(false); return }
    setItems(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  function openCreateDialog() {
    setEditing(null); setFormName(''); setFormDescription(''); setFormActive(true); setDialogOpen(true)
  }

  function openEditDialog(item: Persona) {
    setEditing(item); setFormName(item.name); setFormDescription(item.description ?? ''); setFormActive(item.is_active); setDialogOpen(true)
  }

  async function handleSave() {
    const trimmedName = formName.trim()
    if (!trimmedName) { toast.error('Name is required'); return }
    setSaving(true)
    const payload = { name: trimmedName, description: formDescription.trim() || null, is_active: formActive }

    if (editing) {
      const { error } = await supabase.from('personas').update(payload).eq('id', editing.id)
      if (error) { toast.error('Failed to update persona'); setSaving(false); return }
      toast.success('Persona updated')
    } else {
      const { error } = await supabase.from('personas').insert(payload)
      if (error) { toast.error('Failed to create persona'); setSaving(false); return }
      toast.success('Persona created')
    }
    setSaving(false); setDialogOpen(false); fetchItems()
  }

  async function handleDelete(item: Persona) {
    if (!confirm(`Delete "${item.name}"?`)) return
    const { error } = await supabase.from('personas').delete().eq('id', item.id)
    if (error) { toast.error('Failed to delete persona'); return }
    toast.success('Persona deleted'); fetchItems()
  }

  return (
    <div>
      <Breadcrumb />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Personas</h1>
          <p className="text-muted-foreground text-sm">Target buyer personas</p>
        </div>
        <Button onClick={openCreateDialog}><Add size={16} />Add Persona</Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No personas found</TableCell></TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{item.description}</TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? 'default' : 'secondary'}>{item.is_active ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(item)}><Edit size={16} /></Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(item)}><TrashCan size={16} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Persona' : 'Add Persona'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="per-name">Name</Label>
              <Input id="per-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., IT Manager, Business Owner" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="per-desc">Description</Label>
              <Input id="per-desc" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Persona description" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="per-active" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} className="h-4 w-4 rounded border-border" />
              <Label htmlFor="per-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 3: Create pains page**

`src/app/(admin)/growth/market/pains/page.tsx`:

Same structure. Differences: table = `pains`, type = `Pain`, title = "Pains", subtitle = "Customer pain points", placeholder = "e.g., Frequent downtime".

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Breadcrumb } from '@/components/breadcrumb'
import { Pain } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Add, Edit, TrashCan } from '@carbon/icons-react'

export default function PainsPage() {
  const [items, setItems] = useState<Pain[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Pain | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('pains').select('*').order('name')
    if (error) { toast.error('Failed to load pains'); setLoading(false); return }
    setItems(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  function openCreateDialog() {
    setEditing(null); setFormName(''); setFormDescription(''); setFormActive(true); setDialogOpen(true)
  }

  function openEditDialog(item: Pain) {
    setEditing(item); setFormName(item.name); setFormDescription(item.description ?? ''); setFormActive(item.is_active); setDialogOpen(true)
  }

  async function handleSave() {
    const trimmedName = formName.trim()
    if (!trimmedName) { toast.error('Name is required'); return }
    setSaving(true)
    const payload = { name: trimmedName, description: formDescription.trim() || null, is_active: formActive }

    if (editing) {
      const { error } = await supabase.from('pains').update(payload).eq('id', editing.id)
      if (error) { toast.error('Failed to update pain'); setSaving(false); return }
      toast.success('Pain updated')
    } else {
      const { error } = await supabase.from('pains').insert(payload)
      if (error) { toast.error('Failed to create pain'); setSaving(false); return }
      toast.success('Pain created')
    }
    setSaving(false); setDialogOpen(false); fetchItems()
  }

  async function handleDelete(item: Pain) {
    if (!confirm(`Delete "${item.name}"?`)) return
    const { error } = await supabase.from('pains').delete().eq('id', item.id)
    if (error) { toast.error('Failed to delete pain'); return }
    toast.success('Pain deleted'); fetchItems()
  }

  return (
    <div>
      <Breadcrumb />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Pains</h1>
          <p className="text-muted-foreground text-sm">Customer pain points</p>
        </div>
        <Button onClick={openCreateDialog}><Add size={16} />Add Pain</Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No pains found</TableCell></TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{item.description}</TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? 'default' : 'secondary'}>{item.is_active ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(item)}><Edit size={16} /></Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(item)}><TrashCan size={16} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Pain' : 'Add Pain'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="pain-name">Name</Label>
              <Input id="pain-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., Frequent downtime" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pain-desc">Description</Label>
              <Input id="pain-desc" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Pain point details" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="pain-active" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} className="h-4 w-4 rounded border-border" />
              <Label htmlFor="pain-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 4: Create gains page**

`src/app/(admin)/growth/market/gains/page.tsx`:

Same structure. Differences: table = `gains`, type = `Gain`, title = "Gains", subtitle = "Customer desired outcomes", placeholder = "e.g., Reduced IT costs".

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Breadcrumb } from '@/components/breadcrumb'
import { Gain } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Add, Edit, TrashCan } from '@carbon/icons-react'

export default function GainsPage() {
  const [items, setItems] = useState<Gain[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Gain | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('gains').select('*').order('name')
    if (error) { toast.error('Failed to load gains'); setLoading(false); return }
    setItems(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  function openCreateDialog() {
    setEditing(null); setFormName(''); setFormDescription(''); setFormActive(true); setDialogOpen(true)
  }

  function openEditDialog(item: Gain) {
    setEditing(item); setFormName(item.name); setFormDescription(item.description ?? ''); setFormActive(item.is_active); setDialogOpen(true)
  }

  async function handleSave() {
    const trimmedName = formName.trim()
    if (!trimmedName) { toast.error('Name is required'); return }
    setSaving(true)
    const payload = { name: trimmedName, description: formDescription.trim() || null, is_active: formActive }

    if (editing) {
      const { error } = await supabase.from('gains').update(payload).eq('id', editing.id)
      if (error) { toast.error('Failed to update gain'); setSaving(false); return }
      toast.success('Gain updated')
    } else {
      const { error } = await supabase.from('gains').insert(payload)
      if (error) { toast.error('Failed to create gain'); setSaving(false); return }
      toast.success('Gain created')
    }
    setSaving(false); setDialogOpen(false); fetchItems()
  }

  async function handleDelete(item: Gain) {
    if (!confirm(`Delete "${item.name}"?`)) return
    const { error } = await supabase.from('gains').delete().eq('id', item.id)
    if (error) { toast.error('Failed to delete gain'); return }
    toast.success('Gain deleted'); fetchItems()
  }

  return (
    <div>
      <Breadcrumb />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Gains</h1>
          <p className="text-muted-foreground text-sm">Customer desired outcomes</p>
        </div>
        <Button onClick={openCreateDialog}><Add size={16} />Add Gain</Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No gains found</TableCell></TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{item.description}</TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? 'default' : 'secondary'}>{item.is_active ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(item)}><Edit size={16} /></Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(item)}><TrashCan size={16} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Gain' : 'Add Gain'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="gain-name">Name</Label>
              <Input id="gain-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., Reduced IT costs" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gain-desc">Description</Label>
              <Input id="gain-desc" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Gain/outcome details" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="gain-active" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} className="h-4 w-4 rounded border-border" />
              <Label htmlFor="gain-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(admin\)/growth/market/
git commit -m "feat: add market pages (verticals, personas, pains, gains)"
```

---

## Task 8: Skills CRUD Page

**Files:**
- Create: `src/app/(admin)/people/skills/page.tsx`

Skills has name + description + category + is_active. Supports create, edit, delete.

- [ ] **Step 1: Create skills page**

`src/app/(admin)/people/skills/page.tsx`:

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Breadcrumb } from '@/components/breadcrumb'
import { Skill } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Add, Edit, TrashCan } from '@carbon/icons-react'

export default function SkillsPage() {
  const [items, setItems] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Skill | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('skills').select('*').order('name')
    if (error) { toast.error('Failed to load skills'); setLoading(false); return }
    setItems(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  function openCreateDialog() {
    setEditing(null); setFormName(''); setFormDescription(''); setFormCategory(''); setFormActive(true); setDialogOpen(true)
  }

  function openEditDialog(item: Skill) {
    setEditing(item); setFormName(item.name); setFormDescription(item.description ?? ''); setFormCategory(item.category ?? ''); setFormActive(item.is_active); setDialogOpen(true)
  }

  async function handleSave() {
    const trimmedName = formName.trim()
    if (!trimmedName) { toast.error('Name is required'); return }
    setSaving(true)
    const payload = { name: trimmedName, description: formDescription.trim() || null, category: formCategory.trim() || null, is_active: formActive }

    if (editing) {
      const { error } = await supabase.from('skills').update(payload).eq('id', editing.id)
      if (error) { toast.error('Failed to update skill'); setSaving(false); return }
      toast.success('Skill updated')
    } else {
      const { error } = await supabase.from('skills').insert(payload)
      if (error) { toast.error('Failed to create skill'); setSaving(false); return }
      toast.success('Skill created')
    }
    setSaving(false); setDialogOpen(false); fetchItems()
  }

  async function handleDelete(item: Skill) {
    if (!confirm(`Delete "${item.name}"?`)) return
    const { error } = await supabase.from('skills').delete().eq('id', item.id)
    if (error) { toast.error('Failed to delete skill'); return }
    toast.success('Skill deleted'); fetchItems()
  }

  return (
    <div>
      <Breadcrumb />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Skills</h1>
          <p className="text-muted-foreground text-sm">Skills registry for service delivery</p>
        </div>
        <Button onClick={openCreateDialog}><Add size={16} />Add Skill</Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No skills found</TableCell></TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.category ?? '—'}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{item.description}</TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? 'default' : 'secondary'}>{item.is_active ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(item)}><Edit size={16} /></Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(item)}><TrashCan size={16} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Skill' : 'Add Skill'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="skill-name">Name</Label>
              <Input id="skill-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., Network Engineering" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="skill-category">Category</Label>
              <Input id="skill-category" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="e.g., Infrastructure, Security" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="skill-desc">Description</Label>
              <Input id="skill-desc" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Skill description" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="skill-active" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} className="h-4 w-4 rounded border-border" />
              <Label htmlFor="skill-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(admin\)/people/skills/page.tsx
git commit -m "feat: add skills CRUD page"
```

---

## Task 9: Apply Migrations & Verify

**Files:** None (runtime verification only)

- [ ] **Step 1: Reset database to apply all migrations and updated seed**

```bash
cd /Users/futuvara/Documents/Claude/Projects/IThealth.ai
npx supabase db reset
```

Expected: All migrations run successfully, seed data is inserted including phases and new menu structure.

- [ ] **Step 2: Run the setup script to create admin user**

```bash
./supabase/setup.sh
```

Expected: Admin user exists with profile linked to IThealth company.

- [ ] **Step 3: Start dev server and verify navigation**

```bash
npm run dev -- -p 3001
```

Open `http://localhost:3001/login`, log in as `admin@ithealth.ai / admin123456`. Verify:
- Services sidebar item shows L2 tabs: Services, Phases, Products, Cost Variables
- Growth sidebar item shows L2 tab: Market, with L3 items: Verticals, Personas, Pains, Gains
- People sidebar item shows L2 tabs: Companies, Users, Skills
- Each new page loads without errors and shows the CRUD table

- [ ] **Step 4: Test CRUD on each page**

For each of the 8 new pages:
1. Create a new item
2. Verify it appears in the table
3. Edit the item
4. Verify the edit persists
5. Delete the item (where applicable — not Phases)
6. Verify it's removed

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 6: Commit any fixes if needed**

If any issues were found and fixed in previous steps:

```bash
git add -A
git commit -m "fix: resolve layer 1 integration issues"
```
