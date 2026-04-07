# Customer Services Menu — Design Spec

**Date:** 2026-04-07
**Status:** Draft
**Project:** ITHealth.ai

## Overview

A customer-facing services feature within the customer portal (`/portal/services`) that lets customers browse available IThealth services, view full service details including costing breakdowns and SLA terms, add services to a cart, and purchase via PayFast. Customers can also view their active/contracted services with progress tracking.

## Goals

1. Customers can see services they currently consume with contract details and progress indicators
2. Customers can browse all available services in a catalog view
3. Clicking a service navigates to a full detail page showing all admin-configured information
4. Customers can add services to a cart and checkout with PayFast payment
5. SLA information is defined per service (via templates with overrides) and visible to customers
6. Visual design matches ITHealth brand: signature rounded corners (`16px 0 16px 16px`), solid phase colors, Poppins font, Carbon icons

## Data Model

### New table: `sla_templates`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | `gen_random_uuid()` |
| `name` | text NOT NULL | e.g., "Gold SLA", "Silver SLA" |
| `description` | text | Template description |
| `response_critical` | text | e.g., "1 hour" |
| `response_high` | text | e.g., "4 hours" |
| `response_medium` | text | e.g., "8 hours" |
| `response_low` | text | e.g., "24 hours" |
| `resolution_critical` | text | e.g., "4 hours" |
| `resolution_high` | text | e.g., "12 hours" |
| `resolution_medium` | text | e.g., "48 hours" |
| `resolution_low` | text | e.g., "5 business days" |
| `uptime_guarantee` | text | e.g., "99.9%" |
| `support_hours` | text | e.g., "24/7", "Business hours (8am-5pm)" |
| `support_channels` | text[] | e.g., `{"Email","Phone","Portal"}` |
| `is_active` | boolean DEFAULT true | |
| `created_at` | timestamptz DEFAULT now() | |
| `updated_at` | timestamptz DEFAULT now() | |

### New table: `service_sla`

Links a service to an SLA template with optional per-service overrides. Null override = inherit from template.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | `gen_random_uuid()` |
| `service_id` | uuid FK → services UNIQUE | One SLA config per service |
| `sla_template_id` | uuid FK → sla_templates | Base template |
| `override_response_critical` | text | |
| `override_response_high` | text | |
| `override_response_medium` | text | |
| `override_response_low` | text | |
| `override_resolution_critical` | text | |
| `override_resolution_high` | text | |
| `override_resolution_medium` | text | |
| `override_resolution_low` | text | |
| `override_uptime_guarantee` | text | |
| `override_support_hours` | text | |
| `override_support_channels` | text[] | |
| `created_at` | timestamptz DEFAULT now() | |
| `updated_at` | timestamptz DEFAULT now() | |

### New table: `customer_contracts`

Tracks purchased services per customer company. UNIQUE constraint on `(company_id, service_id)` where `status IN ('active', 'pending')` prevents duplicate active contracts for the same service.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | `gen_random_uuid()` |
| `company_id` | uuid FK → companies | The customer |
| `service_id` | uuid FK → services | The purchased service |
| `order_item_id` | uuid FK → order_items | Links back to the purchase for audit trail |
| `status` | text NOT NULL | `pending`, `active`, `paused`, `completed`, `cancelled` |
| `contracted_price` | numeric NOT NULL | Agreed total or recurring price |
| `billing_period` | text NOT NULL | `once`, `monthly`, `quarterly`, `annually` |
| `started_at` | timestamptz | When service delivery began |
| `renewal_date` | timestamptz | Next renewal (null if one-off) |
| `expires_at` | timestamptz | Contract end date |
| `payment_status` | text DEFAULT 'pending' | `paid`, `pending`, `overdue`, `na` |
| `notes` | text | Internal notes |
| `created_at` | timestamptz DEFAULT now() | |
| `updated_at` | timestamptz DEFAULT now() | |

**Partial unique index:** `CREATE UNIQUE INDEX idx_active_contract ON customer_contracts (company_id, service_id) WHERE status IN ('active', 'pending');`

### New table: `service_requests`

Tracks customer enquiries/requests for services (for non-checkout flow or future use).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | `gen_random_uuid()` |
| `company_id` | uuid FK → companies | Requesting customer |
| `profile_id` | uuid FK → profiles | Who submitted the request |
| `service_id` | uuid FK → services | Requested service |
| `status` | text DEFAULT 'new' | `new`, `in_review`, `approved`, `declined` |
| `message` | text | Customer's message |
| `created_at` | timestamptz DEFAULT now() | |
| `updated_at` | timestamptz DEFAULT now() | |

### New table: `orders`

Tracks cart checkout transactions for PayFast integration.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | `gen_random_uuid()` |
| `company_id` | uuid FK → companies | |
| `profile_id` | uuid FK → profiles | Who placed the order |
| `order_number` | text UNIQUE NOT NULL | Human-readable reference (e.g., "ORD-00001"), generated via Postgres sequence |
| `status` | text DEFAULT 'pending' | `pending`, `paid`, `failed`, `cancelled` |
| `subtotal` | numeric NOT NULL | Before VAT |
| `vat_amount` | numeric NOT NULL | 15% VAT |
| `total` | numeric NOT NULL | |
| `billing_email` | text | |
| `po_number` | text | Optional purchase order number |
| `notes` | text | |
| `payfast_payment_id` | text | PayFast m_payment_id |
| `payfast_status` | text | Raw PayFast status |
| `paid_at` | timestamptz | |
| `created_at` | timestamptz DEFAULT now() | |
| `updated_at` | timestamptz DEFAULT now() | |

### New table: `order_items`

Line items within an order.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | `gen_random_uuid()` |
| `order_id` | uuid FK → orders | |
| `service_id` | uuid FK → services | |
| `price` | numeric NOT NULL | Price at time of purchase (VAT-exclusive) |
| `billing_period` | text NOT NULL | `once`, `monthly`, `quarterly`, `annually` |
| `created_at` | timestamptz DEFAULT now() | |

### RLS Policies

- **services (existing):** Customer/partner read-only, filtered to `status = 'active'` only. Draft and archived services are not visible to customers.
- **sla_templates:** Admin full CRUD. Customer/partner read-only on active templates.
- **service_sla:** Admin full CRUD. Customer/partner read-only.
- **customer_contracts:** Admin full CRUD. Customer read-only, filtered by own `company_id`.
- **service_requests:** Admin full read. Customer insert + read own `company_id`.
- **orders / order_items:** `/api/services/checkout` uses `service_role` to create orders (customer's session is validated in the route handler, but DB writes use service_role to avoid complex RLS). Customer read-only on own `company_id`.

### Pricing Model

**All prices are VAT-exclusive.** VAT (15%) is calculated and displayed only at checkout. Display prices on cards, cart, and detail pages are always excl. VAT. The checkout page shows subtotal + VAT + total.

**Display price derivation:** The "All Services" catalog shows "From R X,XXX/mo" or "R X,XXX once". This is derived by summing the `base_cost` of all `service_costing_items` in the `maintenance` category (for recurring) or `setup` category (for one-off). For tiered pricing, the tier-1 minimum rate is used. A future enhancement could add a `display_price` column to `services` for admin override.

**Cart price:** The cart stores the same derived display price. The actual contracted price may differ if cost variables (e.g., number of users) change the final amount — this is handled during contract creation by the admin after payment.

### Contract Creation Logic

When the PayFast ITN webhook confirms payment:

1. Update `orders.status` to `paid`, set `paid_at` to now
2. For each `order_item`, create a `customer_contracts` row:
   - `status`: `active`
   - `contracted_price`: copied from `order_items.price`
   - `billing_period`: copied from `order_items.billing_period`
   - `started_at`: now
   - `renewal_date`: calculated from billing_period (e.g., `started_at + 1 month` for monthly, `+ 3 months` for quarterly, `+ 1 year` for annually, null for `once`)
   - `expires_at`: null initially (admin sets manually if needed)
   - `payment_status`: `paid`
   - `order_item_id`: FK back to the order item

### Progress Tracking

The "My Services" card shows three progress indicators. These are derived from existing tables — no new progress table needed:

- **Journey progress:** Placeholder for Phase 1. Shows "Phase X of Y" based on the service's phase position within the 4 journey phases (Operate → Secure → Streamline → Accelerate). Future: linked to customer's actual journey record.
- **Academy completion:** Counts completed courses from `user_section_progress` and `assessment_attempts` tables, filtered by courses linked via `service_academy_links`. Shows "X/Y courses".
- **Runbook completion:** Placeholder for Phase 1. Shows "—" until a `customer_runbook_progress` table is added in a future iteration. The UI renders the field but displays "Not tracked yet" when no data exists.

## Customer Portal Pages

### 1. Services Page — `/portal/services`

Two tabs using existing shadcn Tabs component (line variant):

#### Tab: "My Services"

- **Card grid** (2 columns)
- Each card uses **signature rounded corners** (`16px 0 16px 16px`) with **solid phase-colored header** (no gradient)
- **Card contents:**
  - Phase-colored header bar with phase name
  - Service name + status badge (active/paused/completed/cancelled)
  - Contract info grid: price, billing period, start date, renewal/payment status
  - Progress section (border-top separator):
    - Journey progress bar (colored to match phase)
    - Academy course completion count
    - Runbook step completion count
  - "View details →" link to `/portal/services/[id]`
- **Empty state:** "You haven't subscribed to any services yet. Browse All Services to get started."

#### Tab: "All Services"

- **Phase filter pills** at top: All / Operate / Secure / Streamline / Accelerate
- **Cart indicator** (top-right, signature corners): cart icon + item count + total
- **Card grid** (3 columns)
- Each card:
  - Phase-colored header bar (solid)
  - Service name
  - Short description (from admin `description` field)
  - Starting price: "From R X,XXX/mo" or "R X,XXX once" — derived from costing items
  - Footer: "View details →" link + action button:
    - **Default:** "Add to Cart" button (dark, bottom-right corner)
    - **In cart:** blue border on card + "Remove" button (red outline)
    - **Subscribed:** "Subscribed" badge (green pill)

### 2. Service Detail Page — `/portal/services/[id]`

Full-page view with breadcrumb navigation. All admin-configured sections visible:

1. **Header** — solid phase-colored banner with phase label, service name, long description
2. **Your Contract** (conditional — only if customer has active contract) — green left border, status badge, 4-column grid (price, billing, started, renewal), progress bar + academy/runbook counts
3. **About this Service** — long_description from admin
4. **SLA Terms** — table showing priority levels with response & resolution times, uptime guarantee, support hours, support channels. Values resolved: override ?? template value
5. **Products & Tools** — table: product name, vendor, category, notes
6. **Skills & Expertise** — badge pills
7. **Delivery Runbook** — table: step number, title, role, estimated time, with total
8. **Costing Breakdown** — grouped by category (Setup / Maintenance), tables showing line items with type and cost, subtotals per category
9. **Related Academy Courses** — list with phase-colored dot, course name, required/optional badge, completion status (if subscribed)
10. **Action buttons** — "Back to Services" + "Add to Cart" (or "Subscribed" badge)

### 3. Cart Page — `/portal/cart`

- **Item list** — card with rows per service: phase label, name, price, billing period, remove (×) button
- **Order summary** (right-aligned, 360px) — line items, total, "excl. VAT" note, "Proceed to Checkout" button
- **Empty state:** "Your cart is empty. Browse All Services to find what you need."

### 4. Checkout Page — `/portal/checkout`

Two-column layout:

**Left — Billing Details:**
- Company name (auto-filled, read-only)
- Billing contact email (editable)
- Purchase order number (optional)
- Notes (optional textarea)
- PayFast redirect notice (amber info box)

**Right — Order Summary:**
- Line items with billing period labels
- Subtotal
- VAT (15%)
- Total (bold)
- "Pay with PayFast" button (green)
- "Secure payment powered by PayFast" footer text

### 5. Post-Payment Pages

- `/portal/checkout/success` — confirmation message, order summary, link to "My Services"
- `/portal/checkout/cancel` — message with option to return to cart

### Cart Storage

Cart stored in `localStorage` — no database table. Structure:

```typescript
interface CartItem {
  service_id: string
  name: string
  phase_name: string
  price: number
  billing_period: 'once' | 'monthly' | 'quarterly' | 'annually'
}
```

## PayFast Integration

### Flow

1. Customer clicks "Pay with PayFast" on checkout
2. Frontend POSTs to `/api/services/checkout` with cart items + billing details
3. API route creates `orders` + `order_items` rows (status: `pending`)
4. API route generates PayFast form data with signature (merchant_id, merchant_key, amount, item_name, return/cancel/notify URLs)
5. Frontend redirects customer to PayFast hosted payment page
6. PayFast processes payment and sends ITN (Instant Transaction Notification) to `/api/services/payfast-itn`
7. ITN handler validates signature, updates `orders.status` to `paid`, creates `customer_contracts` rows for each order item

### Environment Variables

```
PAYFAST_MERCHANT_ID=
PAYFAST_MERCHANT_KEY=
PAYFAST_PASSPHRASE=
PAYFAST_SANDBOX=true
```

### Security

- ITN endpoint validates PayFast signature using passphrase
- ITN endpoint verifies source IP matches PayFast servers
- ITN endpoint confirms payment amount matches order total
- Orders table prevents double-processing via status check

## Admin Pages

### SLA Templates — `/settings/sla-templates` (new)

- **List page:** table with name, description, support hours, active status, actions (edit/delete)
- **Editor:** form with all SLA fields — response times (4 priorities), resolution times (4 priorities), uptime guarantee, support hours, support channels (multi-select or comma-separated)
- Registered in menu system under Settings

### Service Editor — SLA Tab (new tab)

New **"SLA"** tab added to the existing service editor at `/services/[id]/edit`:

- Dropdown to select SLA template
- Override fields shown below, pre-filled from template values
- Each override field has a "Reset to template" action to clear the override
- Visual indicator showing which values are overridden vs inherited

## Visual Design

### Brand Elements

- **Signature corners:** `border-radius: 16px 0px 16px 16px` (sharp top-right) on all cards, headers, and the cart indicator
- **Phase colors (solid, no gradient):**
  - Operate: `#1175E4` (blue)
  - Secure: `#FF246B` (pink)
  - Streamline: `#6c3ce0` (purple)
  - Accelerate: `#EDB600` (gold)
- **Typography:** Poppins font
- **Icons:** IBM Carbon icons only
- **Background:** `#f8fafc` (light grey)
- **Card borders:** `1px solid #e5e7eb`, white background

### Status Badges

- Active: green (`bg-green-100 text-green-800`)
- Paused: amber (`bg-amber-100 text-amber-800`)
- Completed: blue (`bg-blue-100 text-blue-800`)
- Cancelled: grey (`bg-slate-100 text-slate-600`)
- Overdue (payment): red text

### Progress Bars

- Colored to match service phase
- 6px height, rounded, on `#f1f5f9` background

## Component Inventory

### New Components

| Component | Path | Description |
|-----------|------|-------------|
| `ServiceCard` | `src/components/services/service-card.tsx` | Reusable card for both My Services and All Services tabs |
| `ServiceDetail` | `src/components/services/service-detail.tsx` | Full detail view sections |
| `CartIndicator` | `src/components/cart/cart-indicator.tsx` | Cart icon with count badge |
| `CartProvider` | `src/contexts/cart-context.tsx` | React context for cart state (localStorage) |
| `SlaDisplay` | `src/components/services/sla-display.tsx` | SLA terms table (resolves template + overrides) |
| `SlaTemplateEditor` | `src/components/services/sla-template-editor.tsx` | Admin SLA template form |
| `SlaTab` | `src/components/services/sla-tab.tsx` | Admin service editor SLA tab |

### New Pages

| Route | Path | Description |
|-------|------|-------------|
| `/portal/services` | `src/app/(customer)/portal/services/page.tsx` | My Services / All Services tabs |
| `/portal/services/[id]` | `src/app/(customer)/portal/services/[id]/page.tsx` | Service detail |
| `/portal/cart` | `src/app/(customer)/portal/cart/page.tsx` | Cart review |
| `/portal/checkout` | `src/app/(customer)/portal/checkout/page.tsx` | Billing + payment |
| `/portal/checkout/success` | `src/app/(customer)/portal/checkout/success/page.tsx` | Payment confirmation |
| `/portal/checkout/cancel` | `src/app/(customer)/portal/checkout/cancel/page.tsx` | Payment cancelled |
| `/settings/sla-templates` | `src/app/(admin)/settings/sla-templates/page.tsx` | SLA template management |

### New API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/services/checkout` | POST | Create order + generate PayFast redirect data |
| `/api/services/payfast-itn` | POST | PayFast ITN webhook handler |

## Database Migrations

New migration files needed:

1. `YYYYMMDD_create_sla_templates.sql` — sla_templates table + updated_at trigger
2. `YYYYMMDD_create_service_sla.sql` — service_sla table + updated_at trigger
3. `YYYYMMDD_create_customer_contracts.sql` — customer_contracts table + updated_at trigger
4. `YYYYMMDD_create_service_requests.sql` — service_requests table
5. `YYYYMMDD_create_orders.sql` — orders + order_items tables + updated_at triggers
6. `YYYYMMDD_customer_services_rls.sql` — RLS policies for all new tables
7. `YYYYMMDD_menu_customer_services.sql` — Add Services menu item to customer portal menu

## Error Handling

- Cart empty → disable "Proceed to Checkout", show empty state
- PayFast timeout/failure → order stays `pending`, customer can retry from order history
- ITN validation failure → log error, do not update order
- Service already subscribed → hide "Add to Cart", show "Subscribed" badge
- Network errors → Sonner toast notifications
