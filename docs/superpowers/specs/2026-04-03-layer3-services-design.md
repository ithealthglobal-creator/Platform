# Layer 3: Services List & Tabbed Builder — Design Spec

## Overview

Layer 3 builds the core Services feature — a list page at `/services` showing all services, and a tabbed create/edit form for building IT modernisation services. Each service is composed of reference data from Layer 1 (phases, products, cost variables, market data, skills) and learning content from Layer 2 (academy courses).

This is the third of three layers:
- **Layer 1 (done):** Reference data tables and CRUD pages
- **Layer 2 (this spec builds on):** Academy foundations
- **Layer 3 (this spec):** Services list + tabbed create/edit form

## Context

IThealth builds IT modernisation services composed of products, skills, and processes. A service belongs to a single phase (Operate, Secure, Streamline, Accelerate) and is assembled via an 8-tab editor that pulls from all the reference data and academy content.

## Menu

The existing "Services" L2 item under the Services L1 menu (route `/services`) currently shows a placeholder page. This spec replaces it with the services list and provides a create/edit form.

No menu changes needed — the route already exists.

## Database Schema

### `services`

The main services table.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | |
| name | text | NOT NULL | Service name |
| description | text | | Short description (Description tab) |
| long_description | text | | Detailed description (Growth tab) |
| phase_id | uuid | FK to phases, NOT NULL | Single phase per service |
| status | text | NOT NULL, DEFAULT 'draft', CHECK (status IN ('draft', 'active', 'archived')) | Service lifecycle |
| hero_image_url | text | | Hero image (Supabase Storage) |
| thumbnail_url | text | | Thumbnail image (Supabase Storage) |
| is_active | boolean | NOT NULL, DEFAULT true | Soft delete |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

### `service_verticals` (Market tab — many-to-many)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| service_id | uuid | FK to services, NOT NULL, ON DELETE CASCADE | |
| vertical_id | uuid | FK to verticals, NOT NULL, ON DELETE CASCADE | |
| PRIMARY KEY | | (service_id, vertical_id) | |

### `service_personas` (Market tab — many-to-many)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| service_id | uuid | FK to services, NOT NULL, ON DELETE CASCADE | |
| persona_id | uuid | FK to personas, NOT NULL, ON DELETE CASCADE | |
| PRIMARY KEY | | (service_id, persona_id) | |

### `service_pains` (Market tab — many-to-many)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| service_id | uuid | FK to services, NOT NULL, ON DELETE CASCADE | |
| pain_id | uuid | FK to pains, NOT NULL, ON DELETE CASCADE | |
| PRIMARY KEY | | (service_id, pain_id) | |

### `service_gains` (Market tab — many-to-many)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| service_id | uuid | FK to services, NOT NULL, ON DELETE CASCADE | |
| gain_id | uuid | FK to gains, NOT NULL, ON DELETE CASCADE | |
| PRIMARY KEY | | (service_id, gain_id) | |

### `service_products` (Product tab — many-to-many)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| service_id | uuid | FK to services, NOT NULL, ON DELETE CASCADE | |
| product_id | uuid | FK to products, NOT NULL, ON DELETE CASCADE | |
| notes | text | | Optional notes about why this product is included |
| PRIMARY KEY | | (service_id, product_id) | |

### `service_skills` (Skills tab — many-to-many)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| service_id | uuid | FK to services, NOT NULL, ON DELETE CASCADE | |
| skill_id | uuid | FK to skills, NOT NULL, ON DELETE CASCADE | |
| notes | text | | Optional notes about skill requirements |
| PRIMARY KEY | | (service_id, skill_id) | |

### `service_runbook_steps` (Runbook tab)

Ordered steps that make up the service delivery runbook.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | |
| service_id | uuid | FK to services, NOT NULL, ON DELETE CASCADE | |
| description | text | NOT NULL | What this step involves |
| estimated_minutes | integer | | Estimated time for this step |
| product_id | uuid | FK to products, nullable | Optional linked product (from service's products) |
| skill_id | uuid | FK to skills, nullable | Optional required skill (from service's skills) |
| role | text | | Who performs this step (e.g., "Engineer", "Project Manager") |
| sort_order | integer | NOT NULL, DEFAULT 0 | Order within the runbook |
| is_active | boolean | NOT NULL, DEFAULT true | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

### `service_costing_items` (Costing tab)

Line items for service pricing. Each item is either tiered or formula-based.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | |
| service_id | uuid | FK to services, NOT NULL, ON DELETE CASCADE | |
| name | text | NOT NULL | Line item name (e.g., "User Licenses") |
| category | text | NOT NULL, CHECK (category IN ('setup', 'maintenance')) | One-time or recurring |
| pricing_type | text | NOT NULL, CHECK (pricing_type IN ('tiered', 'formula')) | How price is calculated |
| cost_variable_id | uuid | FK to cost_variables, nullable | Which variable drives this item (e.g., "Users") |
| formula | text | | Formula expression for formula-based items (e.g., "base + users * rate") |
| base_cost | numeric(10,2) | DEFAULT 0 | Base/flat cost component |
| tiers | jsonb | | Tiered pricing brackets |
| sort_order | integer | NOT NULL, DEFAULT 0 | |
| is_active | boolean | NOT NULL, DEFAULT true | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

The `tiers` JSONB structure (for tiered pricing):
```json
[
  {"min": 1, "max": 10, "rate": 50.00},
  {"min": 11, "max": 50, "rate": 40.00},
  {"min": 51, "max": null, "rate": 30.00}
]
```

For formula-based items, `formula` contains a simple expression string and `base_cost` + `cost_variable_id` define the calculation. The formula is evaluated client-side for preview.

### `service_academy_links` (Academy tab — many-to-many)

Links services to academy courses.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| service_id | uuid | FK to services, NOT NULL, ON DELETE CASCADE | |
| course_id | uuid | FK to courses, NOT NULL, ON DELETE CASCADE | |
| is_required | boolean | NOT NULL, DEFAULT false | Whether this course is required for the service |
| PRIMARY KEY | | (service_id, course_id) | |

### FK Addition: `courses.service_id`

Layer 3 adds the FK constraint on `courses.service_id` that was left as a plain uuid in Layer 2:

```sql
ALTER TABLE public.courses
  ADD CONSTRAINT courses_service_id_fkey
  FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;
```

## Pages

### `/services` — Services List

Replaces the current placeholder page.

| Column | Notes |
|---|---|
| Name | Service name |
| Phase | Phase name (from FK) |
| Status | Draft/Active/Archived badge |
| Products | Count of linked products |
| Created | Date |
| Actions | Edit, Delete |

"Add Service" button navigates to `/services/new`.

Edit button navigates to `/services/[id]/edit`.

### `/services/new` and `/services/[id]/edit` — Tabbed Service Editor

Full-page form (not a dialog — too complex for a dialog) with 8 tabs:

#### Tab 1: Description
- Name (text input, required)
- Short description (textarea)
- Phase (single select dropdown from phases table)
- Status (select: draft, active, archived)

#### Tab 2: Market
- Verticals (multi-select from verticals table)
- Personas (multi-select from personas table)
- Pains (multi-select from pains table)
- Gains (multi-select from gains table)

Each is a searchable multi-select. Selected items shown as badges/chips that can be removed.

#### Tab 3: Products
- Multi-select from products table
- Each selected product shows name, vendor, category
- Optional notes field per selected product
- "Add Product" opens a selection dialog/dropdown

#### Tab 4: Skills
- Multi-select from skills table
- Each selected skill shows name, category
- Optional notes field per selected skill

#### Tab 5: Runbook
- Ordered list of steps
- Each step: description (text), estimated time (minutes), product dropdown (filtered to service's selected products), skill dropdown (filtered to service's selected skills), role (text input)
- Add step button, reorder via sort_order input, delete step
- Steps are created/edited inline (not in a dialog)

#### Tab 6: Growth
- Short description (textarea — same as Description tab's short description, or separate marketing copy)
- Long description (rich textarea or markdown)
- Hero image upload (Supabase Storage via file input)
- Thumbnail upload (Supabase Storage via file input)

#### Tab 7: Costing
- Split into two sections: **Setup** (one-time) and **Maintenance** (recurring)
- Each section has a list of costing line items
- Add line item: name, pricing type (tiered or formula), cost variable (dropdown), then either:
  - **Tiered**: table of min/max/rate rows
  - **Formula**: base cost + formula expression
- Preview: shows calculated cost for sample variable values (e.g., "For 25 users: $X setup, $Y/month maintenance")

#### Tab 8: Academy
- Multi-select from courses table (from Layer 2)
- Each linked course shows name, phase
- Toggle: required vs optional per course

### Save Behavior

- Each tab saves independently (auto-save or explicit "Save" button per tab)
- Service is created on first save of the Description tab (minimal: name + phase)
- Subsequent tabs update the existing service record and its junction tables
- Navigation between tabs does not lose unsaved changes (warn if navigating away with unsaved changes)

## RLS Policies

- `services`: Admins full CRUD. Non-admins SELECT only (for when partner/customer views are built).
- All junction tables (`service_verticals`, `service_personas`, etc.): Same pattern — admins full CRUD, non-admins SELECT.
- `service_runbook_steps`, `service_costing_items`: Admins full CRUD, non-admins SELECT.

## Image Upload

Hero image and thumbnail use Supabase Storage:
- Bucket: `service-images` (created via migration or setup)
- Path: `services/{service_id}/hero.{ext}` and `services/{service_id}/thumbnail.{ext}`
- Upload via Route Handler at `/api/services/upload` (uses service_role for storage operations)
- Returns public URL stored in `hero_image_url` / `thumbnail_url`

## Indexes

- `services`: index on `phase_id`, index on `status`
- `service_runbook_steps`: index on `(service_id, sort_order)`
- `service_costing_items`: index on `(service_id, category, sort_order)`

## Out of Scope

- Partner-created services (partner portal)
- Customer-facing service catalogue
- Service versioning/history
- Service templates/cloning
- Advanced formula parser (simple expressions only)
- Drag-and-drop reordering (sort_order uses numeric input)
- Rich text editor for long description (plain textarea/markdown for now)
- Costing currency configuration (assumes single currency)
