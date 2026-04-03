# Layer 3: Services List & Tabbed Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Services list page and 8-tab service editor, wiring up all Layer 1 reference data and Layer 2 academy content into a comprehensive service builder.

**Architecture:** A `services` table with 6 many-to-many junction tables, plus `service_runbook_steps` and `service_costing_items`. The `/services` placeholder is replaced with a list page. `/services/[id]/edit` is a full-page tabbed editor with 8 tabs, each saving independently. Image uploads go through a Route Handler to Supabase Storage. A safe formula parser handles costing calculations client-side.

**Tech Stack:** Next.js (App Router), React, TypeScript, shadcn/ui, Tailwind CSS, @carbon/icons-react, Supabase, Sonner

**Spec:** `docs/superpowers/specs/2026-04-03-layer3-services-design.md`

---

## File Map

```
IThealth.ai/
├── supabase/
│   ├── migrations/
│   │   ├── 20260403200001_create_services.sql
│   │   ├── 20260403200002_create_service_junction_tables.sql
│   │   ├── 20260403200003_create_service_runbook_steps.sql
│   │   ├── 20260403200004_create_service_costing_items.sql
│   │   ├── 20260403200005_create_service_academy_links.sql
│   │   ├── 20260403200006_services_rls_policies.sql
│   │   ├── 20260403200007_courses_service_fk.sql
│   │   └── 20260403200008_create_storage_buckets.sql
├── src/
│   ├── lib/
│   │   ├── types.ts                                      # Modified: add Service interfaces
│   │   └── formula-parser.ts                             # New: safe expression parser
│   ├── app/
│   │   ├── api/
│   │   │   └── services/
│   │   │       └── upload/route.ts                       # New: image upload endpoint
│   │   └── (admin)/
│   │       └── services/
│   │           ├── page.tsx                               # Modified: replace placeholder with list
│   │           └── [id]/
│   │               └── edit/
│   │                   └── page.tsx                       # New: tabbed service editor
│   └── components/
│       └── services/
│           ├── description-tab.tsx                        # New
│           ├── market-tab.tsx                             # New
│           ├── products-tab.tsx                           # New
│           ├── skills-tab.tsx                             # New
│           ├── runbook-tab.tsx                            # New
│           ├── growth-tab.tsx                             # New
│           ├── costing-tab.tsx                            # New
│           └── academy-tab.tsx                            # New
```

---

## Task 1: Database Migrations

**Files:**
- Create: `supabase/migrations/20260403200001_create_services.sql`
- Create: `supabase/migrations/20260403200002_create_service_junction_tables.sql`
- Create: `supabase/migrations/20260403200003_create_service_runbook_steps.sql`
- Create: `supabase/migrations/20260403200004_create_service_costing_items.sql`
- Create: `supabase/migrations/20260403200005_create_service_academy_links.sql`
- Create: `supabase/migrations/20260403200006_services_rls_policies.sql`
- Create: `supabase/migrations/20260403200007_courses_service_fk.sql`
- Create: `supabase/migrations/20260403200008_create_storage_buckets.sql`

- [ ] **Step 1: Create services table**

`supabase/migrations/20260403200001_create_services.sql`:

```sql
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  long_description text,
  phase_id uuid NOT NULL REFERENCES public.phases(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  hero_image_url text,
  thumbnail_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_services_phase_id ON public.services(phase_id);
CREATE INDEX idx_services_status ON public.services(status);

CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 2: Create junction tables**

`supabase/migrations/20260403200002_create_service_junction_tables.sql`:

```sql
CREATE TABLE public.service_verticals (
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  vertical_id uuid NOT NULL REFERENCES public.verticals(id) ON DELETE CASCADE,
  PRIMARY KEY (service_id, vertical_id)
);

CREATE TABLE public.service_personas (
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  persona_id uuid NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  PRIMARY KEY (service_id, persona_id)
);

CREATE TABLE public.service_pains (
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  pain_id uuid NOT NULL REFERENCES public.pains(id) ON DELETE CASCADE,
  PRIMARY KEY (service_id, pain_id)
);

CREATE TABLE public.service_gains (
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  gain_id uuid NOT NULL REFERENCES public.gains(id) ON DELETE CASCADE,
  PRIMARY KEY (service_id, gain_id)
);

CREATE TABLE public.service_products (
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  notes text,
  PRIMARY KEY (service_id, product_id)
);

CREATE TABLE public.service_skills (
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  notes text,
  PRIMARY KEY (service_id, skill_id)
);

ALTER TABLE public.service_verticals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_pains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_gains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_skills ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 3: Create runbook steps table**

`supabase/migrations/20260403200003_create_service_runbook_steps.sql`:

```sql
CREATE TABLE public.service_runbook_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  estimated_minutes integer,
  product_id uuid REFERENCES public.products(id),
  skill_id uuid REFERENCES public.skills(id),
  role text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_runbook_steps ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_service_runbook_steps_service_sort ON public.service_runbook_steps(service_id, sort_order);

CREATE TRIGGER service_runbook_steps_updated_at
  BEFORE UPDATE ON public.service_runbook_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 4: Create costing items table**

`supabase/migrations/20260403200004_create_service_costing_items.sql`:

```sql
CREATE TABLE public.service_costing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('setup', 'maintenance')),
  pricing_type text NOT NULL CHECK (pricing_type IN ('tiered', 'formula')),
  cost_variable_id uuid REFERENCES public.cost_variables(id),
  formula text,
  base_cost numeric(10,2) DEFAULT 0,
  tiers jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_costing_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_service_costing_items_service_cat_sort ON public.service_costing_items(service_id, category, sort_order);

CREATE TRIGGER service_costing_items_updated_at
  BEFORE UPDATE ON public.service_costing_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 5: Create academy links table**

`supabase/migrations/20260403200005_create_service_academy_links.sql`:

```sql
CREATE TABLE public.service_academy_links (
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  is_required boolean NOT NULL DEFAULT false,
  PRIMARY KEY (service_id, course_id)
);

ALTER TABLE public.service_academy_links ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 6: Create RLS policies**

`supabase/migrations/20260403200006_services_rls_policies.sql`:

```sql
-- Services
CREATE POLICY "Admins full access to services"
  ON public.services FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated read services"
  ON public.services FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Junction tables: admins full, authenticated read
CREATE POLICY "Admins full access to service_verticals" ON public.service_verticals FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Read service_verticals" ON public.service_verticals FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins full access to service_personas" ON public.service_personas FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Read service_personas" ON public.service_personas FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins full access to service_pains" ON public.service_pains FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Read service_pains" ON public.service_pains FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins full access to service_gains" ON public.service_gains FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Read service_gains" ON public.service_gains FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins full access to service_products" ON public.service_products FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Read service_products" ON public.service_products FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins full access to service_skills" ON public.service_skills FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Read service_skills" ON public.service_skills FOR SELECT USING (auth.uid() IS NOT NULL);

-- Runbook steps
CREATE POLICY "Admins full access to service_runbook_steps" ON public.service_runbook_steps FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Read service_runbook_steps" ON public.service_runbook_steps FOR SELECT USING (auth.uid() IS NOT NULL);

-- Costing items
CREATE POLICY "Admins full access to service_costing_items" ON public.service_costing_items FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Read service_costing_items" ON public.service_costing_items FOR SELECT USING (auth.uid() IS NOT NULL);

-- Academy links
CREATE POLICY "Admins full access to service_academy_links" ON public.service_academy_links FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Read service_academy_links" ON public.service_academy_links FOR SELECT USING (auth.uid() IS NOT NULL);
```

- [ ] **Step 7: Add courses.service_id FK**

`supabase/migrations/20260403200007_courses_service_fk.sql`:

```sql
ALTER TABLE public.courses
  ADD CONSTRAINT courses_service_id_fkey
  FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;

CREATE INDEX idx_courses_service_id ON public.courses(service_id);
```

- [ ] **Step 8: Create storage buckets**

`supabase/migrations/20260403200008_create_storage_buckets.sql`:

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/20260403200*.sql
git commit -m "feat: add layer 3 services database migrations"
```

---

## Task 2: TypeScript Types & Formula Parser

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/lib/formula-parser.ts`

- [ ] **Step 1: Add Service interfaces to types.ts**

Append to `src/lib/types.ts`:

```typescript
export type ServiceStatus = 'draft' | 'active' | 'archived'
export type CostingCategory = 'setup' | 'maintenance'
export type PricingType = 'tiered' | 'formula'

export interface CostingTier {
  min: number
  max: number | null
  rate: number
}

export interface Service {
  id: string
  name: string
  description: string | null
  long_description: string | null
  phase_id: string
  status: ServiceStatus
  hero_image_url: string | null
  thumbnail_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  phase?: Phase
}

export interface ServiceProduct {
  service_id: string
  product_id: string
  notes: string | null
  product?: Product
}

export interface ServiceSkill {
  service_id: string
  skill_id: string
  notes: string | null
  skill?: Skill
}

export interface ServiceRunbookStep {
  id: string
  service_id: string
  title: string
  description: string | null
  estimated_minutes: number | null
  product_id: string | null
  skill_id: string | null
  role: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  product?: Product
  skill?: Skill
}

export interface ServiceCostingItem {
  id: string
  service_id: string
  name: string
  category: CostingCategory
  pricing_type: PricingType
  cost_variable_id: string | null
  formula: string | null
  base_cost: string | null
  tiers: CostingTier[] | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  cost_variable?: CostVariable
}

export interface ServiceAcademyLink {
  service_id: string
  course_id: string
  is_required: boolean
  course?: Course
}
```

- [ ] **Step 2: Create formula parser**

`src/lib/formula-parser.ts`:

A safe expression parser that evaluates formulas like `{users} * 10` or `500 + {users} * 5`.

```typescript
/**
 * Evaluates a cost formula with a variable value.
 * Supports: +, -, *, /, parentheses, numeric literals, {variable} placeholder.
 * Returns null if the formula is invalid.
 */
export function evaluateFormula(formula: string, variableValue: number): number | null {
  // Replace {variable} placeholder with the value
  const expression = formula.replace(/\{[^}]+\}/g, String(variableValue))

  // Validate: only allow digits, operators, parentheses, decimal points, spaces
  if (!/^[\d\s+\-*/().]+$/.test(expression)) {
    return null
  }

  try {
    // Use Function constructor (safer than eval, still sandboxed to expression)
    const result = new Function(`return (${expression})`)()
    if (typeof result !== 'number' || !isFinite(result)) return null
    return Math.round(result * 100) / 100
  } catch {
    return null
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts src/lib/formula-parser.ts
git commit -m "feat: add service types and formula parser"
```

---

## Task 3: Services List Page

**Files:**
- Modify: `src/app/(admin)/services/page.tsx` (replace placeholder)

- [ ] **Step 1: Replace services placeholder with list page**

Replace `src/app/(admin)/services/page.tsx` with a full CRUD list page.

Table columns: Name, Phase (from FK), Status (draft/active/archived badge), Products (count), Created (date), Actions (Edit, Delete).

Features:
- Fetch services with phase join and product count: `supabase.from('services').select('*, phase:phases(name), service_products(count)').order('name')`
- "Add Service" button navigates to `/services/new/edit`
- Edit button navigates to `/services/[id]/edit`
- Delete with confirmation
- Status badge: Draft (secondary), Active (default), Archived (outline)
- Uses Carbon icons: `Add`, `Edit`, `TrashCan`
- Follow existing patterns from Companies/Phases pages

- [ ] **Step 2: Commit**

```bash
git add "src/app/(admin)/services/page.tsx"
git commit -m "feat: replace services placeholder with list page"
```

---

## Task 4: Service Editor Shell + Description Tab

**Files:**
- Create: `src/app/(admin)/services/[id]/edit/page.tsx`
- Create: `src/components/services/description-tab.tsx`

- [ ] **Step 1: Create the service editor page**

`src/app/(admin)/services/[id]/edit/page.tsx`:

A `'use client'` page that:
- Takes `params.id` from URL (`new` for creation, uuid for editing)
- Uses shadcn Tabs with 8 tabs: Description, Market, Products, Skills, Runbook, Growth, Costing, Academy
- Fetches the service on mount (if editing)
- Stores `serviceId` in state — set after first save on Description tab
- Each tab component receives `serviceId` as a prop
- Tabs 2-8 are disabled until service is created (serviceId exists)
- "Back to Services" link at top
- Breadcrumb component

- [ ] **Step 2: Create description tab component**

`src/components/services/description-tab.tsx`:

Props: `{ serviceId: string | null; onServiceCreated: (id: string) => void }`

Fields:
- Name (text input, required)
- Description (textarea)
- Phase (select dropdown from phases table)
- Status (select: draft, active, archived)

On save:
- If `serviceId` is null: insert new service, call `onServiceCreated` with new ID
- If `serviceId` exists: update the service
- Toast success/error

- [ ] **Step 3: Commit**

```bash
git add "src/app/(admin)/services/[id]/" src/components/services/description-tab.tsx
git commit -m "feat: add service editor with description tab"
```

---

## Task 5: Market Tab

**Files:**
- Create: `src/components/services/market-tab.tsx`

- [ ] **Step 1: Create market tab component**

`src/components/services/market-tab.tsx`:

Props: `{ serviceId: string }`

4 multi-select sections: Verticals, Personas, Pains, Gains.

Each section:
- Fetches all items from the reference table (e.g., `verticals`)
- Fetches currently linked items from junction table (e.g., `service_verticals`)
- Shows available items as a dropdown/combobox
- Shows selected items as removable badges/chips
- On add: insert into junction table
- On remove: delete from junction table
- Toast for errors

This is a reusable pattern — consider a helper component or function for the multi-select-with-junction-table pattern, since Products, Skills, and Academy tabs use the same pattern.

- [ ] **Step 2: Commit**

```bash
git add src/components/services/market-tab.tsx
git commit -m "feat: add service market tab with multi-select"
```

---

## Task 6: Products & Skills Tabs

**Files:**
- Create: `src/components/services/products-tab.tsx`
- Create: `src/components/services/skills-tab.tsx`

- [ ] **Step 1: Create products tab**

`src/components/services/products-tab.tsx`:

Props: `{ serviceId: string }`

Features:
- Multi-select from products table
- Selected products shown in a table: Name, Vendor, Category, Notes (editable), Remove button
- "Add Product" dropdown/combobox showing unselected products
- On add: insert into `service_products`
- On remove: delete from `service_products`
- Notes field: update `service_products.notes` on blur/save

- [ ] **Step 2: Create skills tab**

`src/components/services/skills-tab.tsx`:

Same pattern as products tab but for skills. Table: Name, Category, Notes, Remove.

- [ ] **Step 3: Commit**

```bash
git add src/components/services/products-tab.tsx src/components/services/skills-tab.tsx
git commit -m "feat: add service products and skills tabs"
```

---

## Task 7: Runbook Tab

**Files:**
- Create: `src/components/services/runbook-tab.tsx`

- [ ] **Step 1: Create runbook tab**

`src/components/services/runbook-tab.tsx`:

Props: `{ serviceId: string }`

Features:
- Fetch steps from `service_runbook_steps` ordered by sort_order
- Fetch service's products and skills (from junction tables) for the dropdown filters
- Each step rendered inline with fields: title (text), description (textarea), estimated_minutes (number), product (select filtered to service products), skill (select filtered to service skills), role (text), sort_order (number)
- "Add Step" button appends a new step
- Save button per step (or auto-save on blur)
- Delete button with confirmation per step
- Uses Carbon icons: `Add`, `TrashCan`

- [ ] **Step 2: Commit**

```bash
git add src/components/services/runbook-tab.tsx
git commit -m "feat: add service runbook tab"
```

---

## Task 8: Growth Tab + Image Upload API

**Files:**
- Create: `src/components/services/growth-tab.tsx`
- Create: `src/app/api/services/upload/route.ts`

- [ ] **Step 1: Create image upload route handler**

`src/app/api/services/upload/route.ts`:

POST handler that:
- Verifies admin auth (same pattern as `/api/admin/users/route.ts`)
- Accepts multipart form data with `file` and `serviceId` and `type` (hero or thumbnail)
- Uploads to Supabase Storage bucket `service-images` at path `services/{serviceId}/{type}.{ext}`
- Returns the public URL
- Uses `supabaseAdmin` from `@/lib/supabase-server`

- [ ] **Step 2: Create growth tab**

`src/components/services/growth-tab.tsx`:

Props: `{ serviceId: string; description: string | null }`

Features:
- Short description: read-only display of the service's `description` (passed as prop from parent)
- Long description: textarea, saves to `services.long_description`
- Hero image: file input, uploads via `/api/services/upload`, shows preview
- Thumbnail: file input, uploads via `/api/services/upload`, shows preview
- Save button for long_description
- Existing images shown as previews with "Replace" option

- [ ] **Step 3: Commit**

```bash
git add src/components/services/growth-tab.tsx src/app/api/services/upload/
git commit -m "feat: add service growth tab with image upload"
```

---

## Task 9: Costing Tab

**Files:**
- Create: `src/components/services/costing-tab.tsx`

- [ ] **Step 1: Create costing tab**

`src/components/services/costing-tab.tsx`:

Props: `{ serviceId: string }`

Features:
- Two sections: Setup and Maintenance
- Each section lists costing items from `service_costing_items` filtered by category
- "Add Line Item" button per section opens inline form:
  - Name (text)
  - Pricing type (select: tiered or formula)
  - Cost variable (select from cost_variables table)
  - If tiered: editable table of tier rows (min, max, rate) with add/remove row
  - If formula: base_cost (number) + formula expression (text input with placeholder showing syntax)
- Save/delete per item
- **Preview section**: input field for sample variable value (e.g., "25 users"), shows calculated costs:
  - For tiered: looks up the matching tier and calculates
  - For formula: uses `evaluateFormula()` from `@/lib/formula-parser`
  - Shows: "For X {variable}: $Y setup, $Z/month maintenance"

- [ ] **Step 2: Commit**

```bash
git add src/components/services/costing-tab.tsx
git commit -m "feat: add service costing tab with tiers and formulas"
```

---

## Task 10: Academy Tab

**Files:**
- Create: `src/components/services/academy-tab.tsx`

- [ ] **Step 1: Create academy tab**

`src/components/services/academy-tab.tsx`:

Props: `{ serviceId: string }`

Features:
- Fetch all published courses from `courses` table
- Fetch linked courses from `service_academy_links`
- "Link Course" dropdown showing unlinked courses
- Linked courses shown in table: Name, Phase, Required (toggle), Remove
- On add: insert into `service_academy_links`
- On remove: delete from `service_academy_links`
- Required toggle: update `is_required` on the junction row

- [ ] **Step 2: Commit**

```bash
git add src/components/services/academy-tab.tsx
git commit -m "feat: add service academy tab"
```

---

## Task 11: Apply Migrations & Verify

**Files:** None (verification only)

- [ ] **Step 1: Apply migrations**

Either `npx supabase db reset` or apply new migrations individually.

- [ ] **Step 2: Verify tables**

```bash
PGPASSWORD=postgres psql -h localhost -p 54342 -U postgres -d postgres -c "\dt public.service*"
```

Expected: services, service_verticals, service_personas, service_pains, service_gains, service_products, service_skills, service_runbook_steps, service_costing_items, service_academy_links.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: all routes compile, including `/services`, `/services/[id]/edit`, `/api/services/upload`.

- [ ] **Step 4: Smoke test**

1. Navigate to `/services` — list page renders (empty)
2. Click "Add Service" — editor opens, only Description tab enabled
3. Fill in name + phase, save — service created, other tabs enable
4. Market tab — add verticals, personas, pains, gains
5. Products tab — add products with notes
6. Skills tab — add skills
7. Runbook tab — add steps with products/skills dropdowns
8. Growth tab — edit long description, upload images
9. Costing tab — add tiered and formula items, test preview
10. Academy tab — link courses
11. Back to list — service appears with correct data

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "feat: complete layer 3 services builder"
```
