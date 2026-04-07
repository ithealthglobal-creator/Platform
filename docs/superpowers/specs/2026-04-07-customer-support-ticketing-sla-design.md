# Customer Support: Ticketing & SLA Measurements

**Date:** 2026-04-07
**Status:** Approved
**Area:** Admin Support Module + Customer Portal

## Overview

Add a Support section to IThealth with two core capabilities:

1. **Ticketing** — a support desk for creating, managing, and resolving tickets across three categories (General Support, Billing Support, Service-specific Support), with auto-routing to assigned admins and email-enabled replies
2. **SLA Measurements** — a live dashboard tracking compliance against service SLAs, with summary KPIs, per-company and per-service breakdowns, and drill-down to individual ticket SLA detail

Both admin and customer views are included. Customers see their own SLA performance data and tickets.

## Menu Structure

New L1 sidebar item **Support** with two L2 items:

- **Support → Ticketing** — ticket list, detail, creation (admin side)
- **Support → SLA Measurements** — compliance dashboard with drill-down (admin side)

Customer portal: existing **Support** menu at `/portal/support` upgraded from placeholder.

## Architecture: Unified Support Module

Single `support_tickets` table handles all categories. Auto-routing via a configurable `ticket_routing_rules` table that maps category (+ optional service) to a default assignee. SLA deadlines auto-populated from existing `sla_templates` + `service_sla` infrastructure.

### Why this approach

- Simple data model — one table for all tickets
- Easy cross-category reporting
- Routing rules are configurable, not hardcoded
- SLA compliance computed from existing sla_templates
- Category-specific fields (service_id, etc.) are just nullable FK columns

## Data Model

### New Tables

#### `support_tickets`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| ticket_number | text UNIQUE | Auto-generated, e.g. TKT-0001 |
| company_id | uuid FK → companies | Tenant isolation |
| created_by | uuid FK → profiles | |
| assigned_to | uuid FK → profiles (nullable) | Auto-set via routing rules |
| category | enum: general, billing, service | |
| service_id | uuid FK → services (nullable) | Only when category = service |
| priority | enum: critical, high, medium, low | |
| status | enum: open, in_progress, waiting_on_customer, resolved, closed | |
| subject | text | |
| description | text | |
| sla_template_id | uuid FK → sla_templates (nullable) | Auto-set from service_sla |
| response_due_at | timestamptz | Computed: created_at + response time for priority |
| resolution_due_at | timestamptz | Computed: created_at + resolution time for priority |
| first_responded_at | timestamptz (nullable) | Set on first admin reply |
| resolved_at | timestamptz (nullable) | Set on status → resolved |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS: Admins see all tickets. Customers see only their company's tickets.

#### `ticket_replies`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| ticket_id | uuid FK → support_tickets | CASCADE delete |
| author_id | uuid FK → profiles | |
| body | text | Reply content |
| is_internal | boolean DEFAULT false | Admin-only notes, hidden from customers |
| email_sent | boolean DEFAULT false | |
| email_sent_at | timestamptz (nullable) | |
| created_at | timestamptz | |

Displayed chronologically with quoted context from previous message.

#### `ticket_routing_rules`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| category | enum: general, billing, service | |
| service_id | uuid FK → services (nullable) | For service-specific routing |
| assigned_to | uuid FK → profiles | Default assignee |
| is_active | boolean DEFAULT true | |
| created_at | timestamptz | |

Maps category (+ optional service) → default assignee. Fallback: unassigned queue.

#### `ticket_email_log`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| ticket_id | uuid FK → support_tickets | |
| reply_id | uuid FK → ticket_replies (nullable) | |
| recipient_email | text | |
| email_type | enum: new_ticket, reply, status_change, sla_breach | |
| status | enum: pending, sent, failed | |
| sent_at | timestamptz (nullable) | |
| error | text (nullable) | |
| created_at | timestamptz | |

Audit trail for all ticket-related emails.

### Key Relationships

- `support_tickets.company_id` → `companies.id` (tenant isolation)
- `support_tickets.service_id` → `services.id` (only when category = service)
- `support_tickets.sla_template_id` → `sla_templates.id` (auto-set from service_sla)
- `ticket_replies.ticket_id` → `support_tickets.id` (CASCADE delete)
- `ticket_routing_rules` → auto-assigns on ticket creation
- `ticket_email_log` → audit trail, no business logic dependency

### SLA Computation Logic

On ticket creation:
- If `category = service` and the service has a `service_sla` record: auto-populate `sla_template_id`, `response_due_at` (now + response time for priority), and `resolution_due_at` (now + resolution time for priority). Override values from `service_sla` take precedence over template defaults.
- General/Billing tickets use a system-wide default SLA template.

## Admin UI

### Support → Ticketing

**Ticket List Page:**
- Page header with search and "+ New Ticket" button
- Filter bar: Category, Status, Priority, Assigned To, Company
- Table columns: Ticket #, Subject, Category (badge), Company, Priority (badge), Status (badge), SLA (on track/warning/breached), Assigned To
- Breached tickets highlighted with red row background
- Click row to open ticket detail

**Ticket Detail Page:**
- Split layout: conversation thread (left) + metadata sidebar (right)
- Left side:
  - Email-like replies displayed chronologically
  - Each admin reply shows quoted context from previous message
  - Internal notes displayed in yellow, hidden from customer view
  - Reply box with toggle between "Reply" (customer-visible) and "Internal Note"
  - "Send email notification" checkbox (default: checked)
  - File attachment support
  - Email sent indicator per reply
- Right sidebar:
  - Status (with change dropdown)
  - Priority
  - Category + service name
  - Assigned To
  - Company
  - SLA Tracking section: response SLA (met/remaining) and resolution SLA (met/remaining) with progress bars

**New Ticket Dialog:**
- Category selector (General, Billing, Service)
- Service picker (shown when category = service, filtered to customer's purchased services)
- Priority selector
- Company selector (admin creating on behalf)
- Subject + description fields

### Support → SLA Measurements

**Summary Dashboard:**
- Time period filter + company filter
- 4 KPI cards: Overall SLA Compliance %, Response SLA Met %, Resolution SLA Met %, Active Breaches count
- Compliance by Company table: company name, total tickets, response SLA %, resolution SLA %, uptime %, breaches count, overall % with progress bar
- Compliance by Service table: service name, SLA template name, ticket count, avg response time vs target, avg resolution time vs target, compliance %
- Click any row to drill down

**Drill-Down View:**
- Back navigation to dashboard
- Company + Service header with SLA template info
- Response/Resolution compliance KPI cards
- Ticket-level table: ticket #, subject, priority, response target, actual response, response met/breached, resolution target, actual resolution, resolution met/breached
- Breached tickets highlighted in red

## Customer Portal

### `/portal/support`

**KPI Cards (top):**
- Your SLA Compliance % (across all services)
- Response SLA Met %
- Resolution SLA Met %
- Open Tickets count

**SLA Performance by Service (cards):**
- One card per purchased service + a General & Billing card
- Each card shows:
  - Service name + SLA template name + active badge
  - Response compliance % + Resolution compliance % with progress bars
  - SLA targets (response/resolution times per priority)
  - Uptime guarantee + support hours + ticket count this period

**Your Tickets (table):**
- Columns: Ticket #, Subject, Category, Priority, Status, SLA status, Last Updated
- Category/status filters
- Click to view ticket conversation (same email-like view as admin, minus internal notes and assignment controls)
- "+ New Ticket" button

**Customer Ticket Detail:**
- Conversation thread (no internal notes visible)
- Reply box with email notification
- Ticket metadata (status, priority, category) — read-only
- SLA tracking (response met/remaining, resolution met/remaining)

## Email Notification System

### Trigger Events

| Event | Recipients |
|-------|-----------|
| New ticket (by customer) | Assigned admin + confirmation to customer |
| New ticket (by admin on behalf) | Customer with ticket details |
| Admin reply (email toggle on) | Customer |
| Customer reply | Assigned admin |
| Internal note | No email |
| Status → Resolved | Customer |
| Status → Closed | Customer |
| Status → Re-opened | Assigned admin |
| SLA 75% elapsed | Assigned admin (warning) |
| SLA breached | Assigned admin + all admin users |

### Email Format

- IThealth-branded HTML template
- Subject line format: `[TKT-0042] Email migration not syncing` or `Re: [TKT-0042] ...` for replies
- Reply content with quoted context from previous message
- "View Ticket in Portal" button linking to the ticket
- Footer with portal link

### Technical Implementation

- **Email sending:** Next.js API route calls email API (Resend or SendGrid) after reply/status change
- **SLA monitoring:** Cron job (Supabase pg_cron or external) runs every 15 minutes, checks open tickets where SLA deadline is approaching (75%) or breached, sends warning/breach emails
- **Audit:** Every email logged in `ticket_email_log` with delivery status
- **Admin control:** Email toggle per reply — admin can choose not to email on specific replies

## Routing Logic

On ticket creation:
1. Look up `ticket_routing_rules` for matching category + service_id (if service ticket)
2. If match found and rule is active → set `assigned_to` to rule's assignee
3. If no match → ticket enters unassigned queue (assigned_to = null)
4. Admin can reassign any ticket manually

## Testing Requirements

- Ticket CRUD operations with RLS validation (admin vs customer access)
- Auto-routing matches correct rules
- SLA deadline computation from sla_templates + service_sla overrides
- Email triggers fire correctly for each event type
- Customer portal only shows their company's data
- SLA compliance calculations are accurate
- Internal notes never visible to customers
- Email audit log records all sends

## File Structure

```
src/app/(admin)/support/
  layout.tsx
  ticketing/
    page.tsx              # Ticket list
    [id]/page.tsx         # Ticket detail
    new/page.tsx          # New ticket form
  sla-measurements/
    page.tsx              # SLA dashboard
    [companyId]/page.tsx  # Drill-down by company
    [companyId]/[serviceId]/page.tsx  # Drill-down by company+service

src/app/(customer)/portal/support/
  page.tsx                # Customer support hub (KPIs + SLA cards + tickets)
  tickets/
    [id]/page.tsx         # Customer ticket detail

src/components/support/
  ticket-table.tsx
  ticket-detail.tsx
  ticket-reply.tsx
  ticket-form.tsx
  sla-kpi-cards.tsx
  sla-company-table.tsx
  sla-service-table.tsx
  sla-ticket-table.tsx
  sla-service-card.tsx    # Customer portal SLA performance card

src/lib/supabase/queries/
  support-tickets.ts
  ticket-replies.ts
  ticket-routing.ts
  sla-measurements.ts

src/lib/validations/
  support.ts              # Zod schemas

src/app/api/support/
  tickets/route.ts
  tickets/[id]/replies/route.ts
  tickets/[id]/status/route.ts
  email/route.ts          # Email sending endpoint
```

## Database Migration

New migration adds:
- `support_tickets` table with RLS policies
- `ticket_replies` table with RLS policies
- `ticket_routing_rules` table (admin-only access)
- `ticket_email_log` table (admin-only access)
- Ticket number sequence function
- SLA deadline computation function
- Menu items: Support L1, Ticketing L2, SLA Measurements L2
- Role menu access for admin and customer roles
