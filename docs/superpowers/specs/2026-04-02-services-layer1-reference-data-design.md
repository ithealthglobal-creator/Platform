# Layer 1: Reference Data — Design Spec

## Overview

Layer 1 of the Services feature introduces the reference/lookup data that the service creation flow depends on. This includes 8 new database tables, a menu restructure across Services/Growth/People, and 8 new admin CRUD pages following the existing Companies pattern.

This is the first of three layers:
- **Layer 1 (this spec):** Reference data tables and CRUD pages
- **Layer 2:** Academy foundations (Courses, Assessments, Certificates)
- **Layer 3:** Services list + tabbed create/edit form

## Context

IThealth.ai's Services feature allows admins to build IT modernisation services composed of products, skills, and processes. Before the main service builder can be built, the reference data it draws from must exist: phases of the modernisation journey, vendor products, cost variables, market positioning data (verticals, personas, pains, gains), and a skills registry.

## Menu Restructure

### Removals

All existing L2/L3/L4 items under Services (Managed IT, Cloud, Security, and their children) are removed.

### New Menu Items

| L1 | L2 | L3 | Route | Icon |
|---|---|---|---|---|
| Services | Services | — | /services | tool-kit (existing L1) |
| Services | Phases | — | /services/phases | — |
| Services | Products | — | /services/products | — |
| Services | Cost Variables | — | /services/cost-variables | — |
| Growth | Market | — | /growth/market | — |
| Growth > Market | — | Verticals | /growth/market/verticals | — |
| Growth > Market | — | Personas | /growth/market/personas | — |
| Growth > Market | — | Pains | /growth/market/pains | — |
| Growth > Market | — | Gains | /growth/market/gains | — |
| People | Companies | — | /people/companies | — (existing) |
| People | Users | — | /people/users | — (existing) |
| People | Skills | — | /people/skills | — |

All new menu items are admin-only via `role_menu_access`.

## Database Schema

### New Tables

All tables include `id` (uuid PK, default `gen_random_uuid()`), `created_at`, `updated_at` with the existing `update_updated_at()` trigger.

#### `phases`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| name | text | NOT NULL, UNIQUE | e.g., "Operate", "Secure" |
| description | text | | Phase description |
| sort_order | integer | NOT NULL, DEFAULT 0 | Display ordering |
| is_active | boolean | NOT NULL, DEFAULT true | Soft delete |

Seed data: Operate (sort 1), Secure (sort 2), Streamline (sort 3), Accelerate (sort 4).

#### `products`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| name | text | NOT NULL | Product/tool name |
| description | text | | What the product does |
| vendor | text | | Vendor/manufacturer name |
| category | text | | Product category (e.g., "Security", "Backup") |
| licensing_model | text | CHECK (licensing_model IN ('per_user', 'per_device', 'flat_fee')) | How it's licensed |
| cost | numeric(10,2) | | Unit cost |
| logo_url | text | | Product logo |
| url | text | | Vendor/product URL |
| is_active | boolean | NOT NULL, DEFAULT true | Soft delete |

#### `cost_variables`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| name | text | NOT NULL, UNIQUE | e.g., "Users", "Offices" |
| description | text | | What this variable represents |
| unit_label | text | | Display label (e.g., "users", "offices", "devices") |
| is_active | boolean | NOT NULL, DEFAULT true | Soft delete |

#### `verticals`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| name | text | NOT NULL, UNIQUE | e.g., "Legal", "Healthcare" |
| description | text | | Industry description |
| is_active | boolean | NOT NULL, DEFAULT true | Soft delete |

#### `personas`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| name | text | NOT NULL, UNIQUE | e.g., "IT Manager", "Business Owner" |
| description | text | | Persona description |
| is_active | boolean | NOT NULL, DEFAULT true | Soft delete |

#### `pains`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| name | text | NOT NULL, UNIQUE | e.g., "Frequent downtime" |
| description | text | | Pain point details |
| is_active | boolean | NOT NULL, DEFAULT true | Soft delete |

#### `gains`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| name | text | NOT NULL, UNIQUE | e.g., "Reduced IT costs" |
| description | text | | Gain/outcome details |
| is_active | boolean | NOT NULL, DEFAULT true | Soft delete |

#### `skills`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| name | text | NOT NULL, UNIQUE | e.g., "Network Engineering" |
| description | text | | Skill description |
| category | text | | Skill grouping (e.g., "Infrastructure", "Security") |
| is_active | boolean | NOT NULL, DEFAULT true | Soft delete |

### RLS Policies

All 8 tables follow the same pattern as `companies`:
- **Admins:** Full CRUD (SELECT, INSERT, UPDATE, DELETE)
- **Non-admins:** SELECT only (read access for when partner portal is built later)

### Indexes

- `phases`: index on `sort_order`
- `products`: index on `category`, index on `vendor`
- `skills`: index on `category`

## Pages

### Pattern

All 8 pages follow the existing Companies page pattern (`/people/companies/page.tsx`):

- Client component (`'use client'`)
- Page header with title + breadcrumb
- "Add [Entity]" button (Carbon Add icon)
- Data table with relevant columns
- Status badge (active/inactive) column
- Edit and delete action buttons per row
- Shared create/edit dialog
- Toast notifications (Sonner) for success/error
- Loading spinner and empty state
- Fetches data from Supabase on mount

### Page-Specific Details

#### /services/phases

| Column | Notes |
|---|---|
| Name | Phase name |
| Description | Truncated |
| Sort Order | Numeric |
| Status | Active/Inactive badge |
| Actions | Edit |

No delete — phases are fixed (Operate, Secure, Streamline, Accelerate). Admins can edit name/description/sort_order and toggle active.

#### /services/products

| Column | Notes |
|---|---|
| Name | Product name |
| Vendor | Vendor name |
| Category | Product category |
| Licensing | per_user / per_device / flat_fee |
| Cost | Formatted currency |
| Status | Active/Inactive badge |
| Actions | Edit, Delete |

Dialog has more fields: name, description, vendor, category, licensing model (select dropdown), cost, logo URL, product URL, active toggle.

#### /services/cost-variables

| Column | Notes |
|---|---|
| Name | Variable name |
| Unit Label | e.g., "users" |
| Status | Active/Inactive badge |
| Actions | Edit, Delete |

#### /growth/market/verticals

| Column | Notes |
|---|---|
| Name | Vertical name |
| Description | Truncated |
| Status | Active/Inactive badge |
| Actions | Edit, Delete |

#### /growth/market/personas

Same column pattern as verticals.

#### /growth/market/pains

Same column pattern as verticals.

#### /growth/market/gains

Same column pattern as verticals.

#### /people/skills

| Column | Notes |
|---|---|
| Name | Skill name |
| Category | Skill category |
| Description | Truncated |
| Status | Active/Inactive badge |
| Actions | Edit, Delete |

## Role Access

- All pages are admin-only
- Partner access will come with the partner portal (out of scope)

## Out of Scope

- Layer 2: Academy (Courses, Assessments, Certificates)
- Layer 3: Services list + tabbed create/edit form
- Partner portal and partner-facing service creation
- Drag-and-drop sort ordering (sort_order uses numeric input)
- Logo/image file upload (logo_url is a text field for now)
- Linking skills to user profiles (Layer 3 concern)
