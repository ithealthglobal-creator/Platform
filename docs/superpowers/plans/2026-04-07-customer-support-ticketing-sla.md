# Customer Support: Ticketing & SLA Measurements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Support module with ticketing (general/billing/service categories, auto-routing, email replies) and live SLA compliance dashboards for both admin and customer portal.

**Architecture:** Unified `support_tickets` table with category-based auto-routing via `ticket_routing_rules`. SLA deadlines computed at creation from existing `sla_templates` + `service_sla` infrastructure using a new `parse_sla_duration()` SQL function. Email notifications via Resend through Next.js API routes. Customer portal shows their own SLA performance + tickets.

**Tech Stack:** Next.js App Router (client components), Supabase (Postgres + RLS), shadcn/ui, Tailwind CSS, Carbon Icons, Resend (email), Zod (validation)

**Spec:** `docs/superpowers/specs/2026-04-07-customer-support-ticketing-sla-design.md`

---

## File Structure

### Database Migrations
- Create: `supabase/migrations/20260407700000_support_tables.sql` — all 4 tables + RLS + functions + triggers
- Create: `supabase/migrations/20260407700001_support_menu_items.sql` — menu items + role access
- Create: `supabase/migrations/20260407700002_support_seed.sql` — default SLA template + sample routing rules

### Types & Validation
- Modify: `src/lib/types.ts` — add SupportTicket, TicketReply, TicketRoutingRule, TicketEmailLog types
- Create: `src/lib/validations/support.ts` — Zod schemas for ticket creation, reply, status change

### Data Access (Supabase Queries)
- Create: `src/lib/supabase/queries/support-tickets.ts` — CRUD + filtered list queries
- Create: `src/lib/supabase/queries/ticket-replies.ts` — reply CRUD + fetch by ticket
- Create: `src/lib/supabase/queries/ticket-routing.ts` — routing rule lookup
- Create: `src/lib/supabase/queries/sla-measurements.ts` — compliance aggregation queries

### API Routes (Email + Service-Role Operations)
- Create: `src/app/api/support/email/route.ts` — send ticket emails via Resend
- Create: `src/app/api/support/tickets/route.ts` — ticket creation with SLA computation + routing

### Icon Map
- Modify: `src/lib/icon-map.ts` — add 'headset' icon for Support L1 menu

### Components
- Create: `src/components/support/ticket-table.tsx` — reusable ticket list table with filters
- Create: `src/components/support/ticket-detail.tsx` — split layout: conversation + sidebar
- Create: `src/components/support/ticket-reply.tsx` — single reply display (with quoted context)
- Create: `src/components/support/ticket-form.tsx` — new ticket dialog
- Create: `src/components/support/reply-form.tsx` — reply/internal note input
- Create: `src/components/support/sla-status.tsx` — SLA badge (on track/warning/breached)
- Create: `src/components/support/sla-kpi-cards.tsx` — 4 KPI cards for dashboard
- Create: `src/components/support/sla-company-table.tsx` — per-company compliance table
- Create: `src/components/support/sla-service-table.tsx` — per-service compliance table
- Create: `src/components/support/sla-ticket-table.tsx` — drill-down ticket-level SLA table
- Create: `src/components/support/sla-service-card.tsx` — customer portal SLA performance card

### Admin Pages
- Create: `src/app/(admin)/support/layout.tsx` — support section layout
- Create: `src/app/(admin)/support/ticketing/page.tsx` — ticket list
- Create: `src/app/(admin)/support/ticketing/[id]/page.tsx` — ticket detail
- Create: `src/app/(admin)/support/sla-measurements/page.tsx` — SLA dashboard

### Customer Portal Pages
- Modify: `src/app/(customer)/portal/support/page.tsx` — upgrade from placeholder
- Create: `src/app/(customer)/portal/support/tickets/[id]/page.tsx` — customer ticket detail

---

## Task 1: Database Migration — Tables, Functions, RLS

**Files:**
- Create: `supabase/migrations/20260407700000_support_tables.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Parse SLA duration text to PostgreSQL interval
CREATE OR REPLACE FUNCTION public.parse_sla_duration(duration_text text)
RETURNS interval AS $$
DECLARE
  num numeric;
  cleaned text;
BEGIN
  IF duration_text IS NULL OR trim(duration_text) = '' THEN
    RETURN interval '24 hours';
  END IF;
  cleaned := lower(trim(duration_text));
  -- Extract leading number
  num := (regexp_match(cleaned, '^(\d+\.?\d*)'))[1]::numeric;
  IF num IS NULL THEN
    RETURN interval '24 hours';
  END IF;
  -- Match unit
  IF cleaned ~ '(h|hour)' THEN
    RETURN make_interval(hours => num::int);
  ELSIF cleaned ~ '(d|day)' THEN
    RETURN make_interval(days => num::int);
  ELSIF cleaned ~ '(m|min)' THEN
    RETURN make_interval(mins => num::int);
  ELSE
    RETURN interval '24 hours';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Ticket number sequence
CREATE SEQUENCE public.ticket_number_seq START 1;

CREATE OR REPLACE FUNCTION public.next_ticket_number()
RETURNS text AS $$
BEGIN
  RETURN 'TKT-' || lpad(nextval('public.ticket_number_seq')::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- support_tickets
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL DEFAULT public.next_ticket_number(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  assigned_to uuid REFERENCES public.profiles(id),
  category text NOT NULL CHECK (category IN ('general', 'billing', 'service')),
  service_id uuid REFERENCES public.services(id),
  priority text NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed')),
  subject text NOT NULL,
  description text NOT NULL,
  sla_template_id uuid REFERENCES public.sla_templates(id),
  response_due_at timestamptz,
  resolution_due_at timestamptz,
  first_responded_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS: admin full access, customers read/create own company
CREATE POLICY "Admins full access to support_tickets"
  ON public.support_tickets FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Customers read own tickets"
  ON public.support_tickets FOR SELECT
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Customers create tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Customers update own tickets"
  ON public.support_tickets FOR UPDATE
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- ticket_replies
CREATE TABLE public.ticket_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id),
  body text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  email_sent boolean NOT NULL DEFAULT false,
  email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;

-- Admin: full access to all replies
CREATE POLICY "Admins full access to ticket_replies"
  ON public.ticket_replies FOR ALL
  USING (public.get_my_role() = 'admin');

-- Customers: read non-internal replies on their tickets, create replies on their tickets
CREATE POLICY "Customers read own ticket replies"
  ON public.ticket_replies FOR SELECT
  USING (
    is_internal = false
    AND ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Customers create replies on own tickets"
  ON public.ticket_replies FOR INSERT
  WITH CHECK (
    is_internal = false
    AND ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- ticket_routing_rules (admin-only, global)
CREATE TABLE public.ticket_routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('general', 'billing', 'service')),
  service_id uuid REFERENCES public.services(id),
  assigned_to uuid NOT NULL REFERENCES public.profiles(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_routing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to ticket_routing_rules"
  ON public.ticket_routing_rules FOR ALL
  USING (public.get_my_role() = 'admin');

-- ticket_email_log (admin-only)
CREATE TABLE public.ticket_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id),
  reply_id uuid REFERENCES public.ticket_replies(id),
  recipient_email text NOT NULL,
  email_type text NOT NULL CHECK (email_type IN ('new_ticket', 'reply', 'status_change', 'sla_warning', 'sla_breach')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to ticket_email_log"
  ON public.ticket_email_log FOR ALL
  USING (public.get_my_role() = 'admin');
```

- [ ] **Step 2: Run the migration**

Run: `cd /Users/futuvara/Documents/Claude/Projects/IThealth.ai && npx supabase db push`
Expected: Migration applied successfully

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260407700000_support_tables.sql
git commit -m "feat(support): add support tables, RLS policies, and SLA duration parser"
```

---

## Task 2: Database Migration — Menu Items & Seed Data

**Files:**
- Create: `supabase/migrations/20260407700001_support_menu_items.sql`
- Create: `supabase/migrations/20260407700002_support_seed.sql`

- [ ] **Step 1: Write the menu items migration**

```sql
-- L1: Support (sort_order 9, after Settings at 8)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('10000000-0000-0000-0000-000000000009', NULL, 'Support', 'headset', '/support', 9, 1)
ON CONFLICT (id) DO NOTHING;

-- L2: Ticketing and SLA Measurements
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000009', 'Ticketing', NULL, '/support/ticketing', 1, 2),
  ('20000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000009', 'SLA Measurements', NULL, '/support/sla-measurements', 2, 2)
ON CONFLICT (id) DO NOTHING;

-- Grant admin access to new menu items
INSERT INTO public.role_menu_access (role, menu_item_id)
SELECT 'admin', id FROM public.menu_items WHERE id IN (
  '10000000-0000-0000-0000-000000000009',
  '20000000-0000-0000-0000-000000000017',
  '20000000-0000-0000-0000-000000000018'
)
ON CONFLICT (role, menu_item_id) DO NOTHING;

-- Grant customer access to Support L1 (they see it in customer sidebar via /portal/support)
INSERT INTO public.role_menu_access (role, menu_item_id) VALUES
  ('customer', '10000000-0000-0000-0000-000000000009')
ON CONFLICT (role, menu_item_id) DO NOTHING;
```

- [ ] **Step 2: Write the seed migration**

```sql
-- Default SLA template for General and Billing tickets
INSERT INTO public.sla_templates (name, description, response_critical, response_high, response_medium, response_low, resolution_critical, resolution_high, resolution_medium, resolution_low, support_hours, is_active)
SELECT
  'Default Support',
  'Default SLA for general and billing support tickets',
  '4 hours', '8 hours', '24 hours', '48 hours',
  '24 hours', '48 hours', '72 hours', '120 hours',
  'Business hours',
  true
WHERE NOT EXISTS (SELECT 1 FROM public.sla_templates WHERE name = 'Default Support');
```

- [ ] **Step 3: Run the migrations**

Run: `cd /Users/futuvara/Documents/Claude/Projects/IThealth.ai && npx supabase db push`
Expected: Both migrations applied

- [ ] **Step 4: Add headset icon to icon-map**

In `src/lib/icon-map.ts`, add the `Headset` import from `@carbon/icons-react` and add `'headset': Headset` to the iconMap record.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260407700001_support_menu_items.sql supabase/migrations/20260407700002_support_seed.sql src/lib/icon-map.ts
git commit -m "feat(support): add Support menu items, seed default SLA template, add headset icon"
```

---

## Task 3: TypeScript Types & Zod Validation

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/lib/validations/support.ts`

- [ ] **Step 1: Add types to `src/lib/types.ts`**

Append these types at the end of the file (before any closing bracket):

```typescript
export type TicketCategory = 'general' | 'billing' | 'service'
export type TicketPriority = 'critical' | 'high' | 'medium' | 'low'
export type TicketStatus = 'open' | 'in_progress' | 'waiting_on_customer' | 'resolved' | 'closed'
export type EmailType = 'new_ticket' | 'reply' | 'status_change' | 'sla_warning' | 'sla_breach'
export type EmailStatus = 'pending' | 'sent' | 'failed'

export interface SupportTicket {
  id: string
  ticket_number: string
  company_id: string
  created_by: string
  assigned_to: string | null
  category: TicketCategory
  service_id: string | null
  priority: TicketPriority
  status: TicketStatus
  subject: string
  description: string
  sla_template_id: string | null
  response_due_at: string | null
  resolution_due_at: string | null
  first_responded_at: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
  // Joined fields
  company?: Company
  created_by_profile?: Profile
  assigned_to_profile?: Profile
  service?: Service
  sla_template?: SlaTemplate
}

export interface TicketReply {
  id: string
  ticket_id: string
  author_id: string
  body: string
  is_internal: boolean
  email_sent: boolean
  email_sent_at: string | null
  created_at: string
  // Joined
  author?: Profile
}

export interface TicketRoutingRule {
  id: string
  category: TicketCategory
  service_id: string | null
  assigned_to: string
  is_active: boolean
  created_at: string
  // Joined
  assigned_to_profile?: Profile
  service?: Service
}

export interface TicketEmailLog {
  id: string
  ticket_id: string
  reply_id: string | null
  recipient_email: string
  email_type: EmailType
  status: EmailStatus
  sent_at: string | null
  error: string | null
  created_at: string
}
```

- [ ] **Step 2: Create Zod validation schemas**

Create `src/lib/validations/support.ts`:

```typescript
import { z } from 'zod'

export const createTicketSchema = z.object({
  category: z.enum(['general', 'billing', 'service']),
  service_id: z.string().uuid().nullable(),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  subject: z.string().min(1, 'Subject is required').max(200),
  description: z.string().min(1, 'Description is required').max(5000),
  company_id: z.string().uuid(),
})

export const createReplySchema = z.object({
  ticket_id: z.string().uuid(),
  body: z.string().min(1, 'Reply body is required').max(10000),
  is_internal: z.boolean().default(false),
  send_email: z.boolean().default(true),
})

export const updateTicketStatusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed']),
})

export type CreateTicketInput = z.infer<typeof createTicketSchema>
export type CreateReplyInput = z.infer<typeof createReplySchema>
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts src/lib/validations/support.ts
git commit -m "feat(support): add TypeScript types and Zod validation schemas"
```

---

## Task 4: Supabase Query Functions

**Files:**
- Create: `src/lib/supabase/queries/support-tickets.ts`
- Create: `src/lib/supabase/queries/ticket-replies.ts`
- Create: `src/lib/supabase/queries/ticket-routing.ts`
- Create: `src/lib/supabase/queries/sla-measurements.ts`

- [ ] **Step 1: Create `src/lib/supabase/queries/support-tickets.ts`**

```typescript
import { supabase } from '@/lib/supabase-client'
import type { SupportTicket, TicketCategory, TicketPriority, TicketStatus } from '@/lib/types'

export interface TicketFilters {
  category?: TicketCategory
  status?: TicketStatus
  priority?: TicketPriority
  assigned_to?: string
  company_id?: string
  search?: string
}

export async function getTickets(filters: TicketFilters = {}) {
  let query = supabase
    .from('support_tickets')
    .select(`
      *,
      company:companies(id, name),
      created_by_profile:profiles!support_tickets_created_by_fkey(id, display_name, email),
      assigned_to_profile:profiles!support_tickets_assigned_to_fkey(id, display_name, email),
      service:services(id, name)
    `)
    .order('created_at', { ascending: false })

  if (filters.category) query = query.eq('category', filters.category)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.priority) query = query.eq('priority', filters.priority)
  if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to)
  if (filters.company_id) query = query.eq('company_id', filters.company_id)
  if (filters.search) query = query.or(`subject.ilike.%${filters.search}%,ticket_number.ilike.%${filters.search}%`)

  return query
}

export async function getTicketById(id: string) {
  return supabase
    .from('support_tickets')
    .select(`
      *,
      company:companies(id, name),
      created_by_profile:profiles!support_tickets_created_by_fkey(id, display_name, email),
      assigned_to_profile:profiles!support_tickets_assigned_to_fkey(id, display_name, email),
      service:services(id, name),
      sla_template:sla_templates(*)
    `)
    .eq('id', id)
    .single()
}

export async function updateTicketStatus(id: string, status: TicketStatus) {
  const updates: Record<string, unknown> = { status }
  if (status === 'resolved') updates.resolved_at = new Date().toISOString()
  return supabase.from('support_tickets').update(updates).eq('id', id)
}

export async function updateTicketAssignee(id: string, assigned_to: string | null) {
  return supabase.from('support_tickets').update({ assigned_to }).eq('id', id)
}

export async function getCustomerTickets(companyId: string, filters: TicketFilters = {}) {
  let query = supabase
    .from('support_tickets')
    .select(`
      *,
      service:services(id, name)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (filters.category) query = query.eq('category', filters.category)
  if (filters.status) query = query.eq('status', filters.status)

  return query
}
```

- [ ] **Step 2: Create `src/lib/supabase/queries/ticket-replies.ts`**

```typescript
import { supabase } from '@/lib/supabase-client'

export async function getRepliesByTicketId(ticketId: string) {
  return supabase
    .from('ticket_replies')
    .select(`
      *,
      author:profiles!ticket_replies_author_id_fkey(id, display_name, email, role)
    `)
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })
}

export async function createReply(data: {
  ticket_id: string
  author_id: string
  body: string
  is_internal: boolean
}) {
  return supabase.from('ticket_replies').insert(data).select().single()
}
```

- [ ] **Step 3: Create `src/lib/supabase/queries/ticket-routing.ts`**

```typescript
import { supabase } from '@/lib/supabase-client'
import type { TicketCategory } from '@/lib/types'

export async function findRoutingRule(category: TicketCategory, serviceId?: string | null) {
  let query = supabase
    .from('ticket_routing_rules')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)

  if (category === 'service' && serviceId) {
    query = query.eq('service_id', serviceId)
  } else {
    query = query.is('service_id', null)
  }

  return query.maybeSingle()
}
```

- [ ] **Step 4: Create `src/lib/supabase/queries/sla-measurements.ts`**

```typescript
import { supabase } from '@/lib/supabase-client'

export interface SlaPeriod {
  from: string
  to: string
}

export async function getCompanySlaSummary(period: SlaPeriod, companyId?: string) {
  let query = supabase
    .from('support_tickets')
    .select(`
      id, company_id, category, service_id, priority, status,
      response_due_at, resolution_due_at, first_responded_at, resolved_at, created_at,
      company:companies(id, name),
      service:services(id, name),
      sla_template:sla_templates(name)
    `)
    .gte('created_at', period.from)
    .lte('created_at', period.to)
    .not('sla_template_id', 'is', null)

  if (companyId) query = query.eq('company_id', companyId)

  return query.order('created_at', { ascending: false })
}

export async function getCustomerSlaSummary(companyId: string, period: SlaPeriod) {
  return supabase
    .from('support_tickets')
    .select(`
      id, ticket_number, subject, category, service_id, priority, status,
      response_due_at, resolution_due_at, first_responded_at, resolved_at, created_at,
      service:services(id, name),
      sla_template:sla_templates(*)
    `)
    .eq('company_id', companyId)
    .gte('created_at', period.from)
    .lte('created_at', period.to)
    .not('sla_template_id', 'is', null)
    .order('created_at', { ascending: false })
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/queries/support-tickets.ts src/lib/supabase/queries/ticket-replies.ts src/lib/supabase/queries/ticket-routing.ts src/lib/supabase/queries/sla-measurements.ts
git commit -m "feat(support): add Supabase query functions for tickets, replies, routing, SLA"
```

---

## Task 5: API Routes — Ticket Creation & Email

**Files:**
- Create: `src/app/api/support/tickets/route.ts`
- Create: `src/app/api/support/email/route.ts`

- [ ] **Step 1: Create ticket creation API route**

Create `src/app/api/support/tickets/route.ts`. This route uses `supabaseAdmin` (service role) to:
1. Look up SLA template (service_sla for service tickets, 'Default Support' for general/billing)
2. Compute `response_due_at` and `resolution_due_at` using `parse_sla_duration()` via an RPC call
3. Look up routing rule and set `assigned_to`
4. Insert the ticket
5. Return the created ticket

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createTicketSchema } from '@/lib/validations/support'

async function verifyUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, role, company_id, email, display_name')
    .eq('id', user.id)
    .single()
  return profile
}

export async function POST(request: NextRequest) {
  const profile = await verifyUser(request)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = createTicketSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const input = parsed.data
  const companyId = profile.role === 'admin' ? input.company_id : profile.company_id

  // Determine SLA template
  let slaTemplateId: string | null = null
  let responseDuration: string | null = null
  let resolutionDuration: string | null = null

  if (input.category === 'service' && input.service_id) {
    const { data: serviceSla } = await supabaseAdmin
      .from('service_sla')
      .select('*, sla_template:sla_templates(*)')
      .eq('service_id', input.service_id)
      .maybeSingle()

    if (serviceSla?.sla_template) {
      slaTemplateId = serviceSla.sla_template_id
      const tpl = serviceSla.sla_template
      responseDuration = serviceSla[`override_response_${input.priority}`] || tpl[`response_${input.priority}`]
      resolutionDuration = serviceSla[`override_resolution_${input.priority}`] || tpl[`resolution_${input.priority}`]
    }
  }

  if (!slaTemplateId) {
    const { data: defaultTpl } = await supabaseAdmin
      .from('sla_templates')
      .select('*')
      .eq('name', 'Default Support')
      .eq('is_active', true)
      .maybeSingle()

    if (defaultTpl) {
      slaTemplateId = defaultTpl.id
      responseDuration = defaultTpl[`response_${input.priority}` as keyof typeof defaultTpl] as string
      resolutionDuration = defaultTpl[`resolution_${input.priority}` as keyof typeof defaultTpl] as string
    }
  }

  // Compute deadlines in JS (simpler than RPC round-trips)
  let responseDueAt: string | null = null
  let resolutionDueAt: string | null = null

  if (responseDuration) {
    responseDueAt = new Date(Date.now() + parseDurationToMs(responseDuration)).toISOString()
  }
  if (resolutionDuration) {
    resolutionDueAt = new Date(Date.now() + parseDurationToMs(resolutionDuration)).toISOString()
  }

  // Look up routing rule
  let assignedTo: string | null = null
  const routingQuery = supabaseAdmin
    .from('ticket_routing_rules')
    .select('assigned_to')
    .eq('category', input.category)
    .eq('is_active', true)

  if (input.category === 'service' && input.service_id) {
    routingQuery.eq('service_id', input.service_id)
  } else {
    routingQuery.is('service_id', null)
  }

  const { data: rule } = await routingQuery.maybeSingle()
  if (rule) assignedTo = rule.assigned_to

  // Insert ticket
  const { data: ticket, error } = await supabaseAdmin
    .from('support_tickets')
    .insert({
      company_id: companyId,
      created_by: profile.id,
      assigned_to: assignedTo,
      category: input.category,
      service_id: input.service_id,
      priority: input.priority,
      subject: input.subject,
      description: input.description,
      sla_template_id: slaTemplateId,
      response_due_at: responseDueAt,
      resolution_due_at: resolutionDueAt,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ticket })
}
```

**Note:** Duration parsing is done in JS using `parseDurationToMs` defined at the top of this file. The SQL `parse_sla_duration` function exists in the migration for potential future use (e.g., database-level triggers or views) but the API route uses the JS version to avoid extra RPC round-trips.

Add this helper at the top of the route file:

```typescript
function parseDurationToMs(text: string): number {
  if (!text) return 24 * 60 * 60 * 1000
  const cleaned = text.toLowerCase().trim()
  const match = cleaned.match(/^(\d+\.?\d*)/)
  if (!match) return 24 * 60 * 60 * 1000
  const num = parseFloat(match[1])
  if (isNaN(num)) return 24 * 60 * 60 * 1000
  if (/\d\s*(h|hour)/.test(cleaned)) return num * 60 * 60 * 1000
  if (/\d\s*(d|day)/.test(cleaned)) return num * 24 * 60 * 60 * 1000
  if (/\d\s*(min)/.test(cleaned)) return num * 60 * 1000
  return 24 * 60 * 60 * 1000
}
```

- [ ] **Step 2: Create email API route**

Create `src/app/api/support/email/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  return user
}

export async function POST(request: NextRequest) {
  const user = await verifyAuth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ticket_id, reply_id, recipient_email, email_type, subject, html_body } = await request.json()

  // Log the email attempt
  const { data: logEntry, error: logError } = await supabaseAdmin
    .from('ticket_email_log')
    .insert({
      ticket_id,
      reply_id: reply_id || null,
      recipient_email,
      email_type,
      status: 'pending',
    })
    .select()
    .single()

  if (logError) return NextResponse.json({ error: logError.message }, { status: 400 })

  // Send via Resend
  // NOTE: Install resend package: npm install resend
  // Set RESEND_API_KEY in .env.local
  // If RESEND_API_KEY is not set, log the email but skip actual sending (dev mode)
  try {
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'IThealth Support <support@ithealth.ai>',
        to: recipient_email,
        subject,
        html: html_body,
      })
    } else {
      console.log(`[Email] Would send to ${recipient_email}: ${subject}`)
    }

    await supabaseAdmin
      .from('ticket_email_log')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', logEntry.id)

    // Update reply email_sent flag if applicable
    if (reply_id) {
      await supabaseAdmin
        .from('ticket_replies')
        .update({ email_sent: true, email_sent_at: new Date().toISOString() })
        .eq('id', reply_id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    await supabaseAdmin
      .from('ticket_email_log')
      .update({ status: 'failed', error: errorMsg })
      .eq('id', logEntry.id)

    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/support/tickets/route.ts src/app/api/support/email/route.ts
git commit -m "feat(support): add ticket creation API with SLA computation and email route"
```

---

## Task 6: Shared Support Components — SLA Status & Reply

**Files:**
- Create: `src/components/support/sla-status.tsx`
- Create: `src/components/support/ticket-reply.tsx`
- Create: `src/components/support/reply-form.tsx`

- [ ] **Step 1: Create SLA status badge component**

Create `src/components/support/sla-status.tsx`:

```typescript
'use client'

import { Badge } from '@/components/ui/badge'

interface SlaStatusProps {
  dueAt: string | null
  completedAt: string | null
  label?: string
}

export function getSlaState(dueAt: string | null, completedAt: string | null, createdAt?: string): 'met' | 'on_track' | 'warning' | 'breached' {
  if (!dueAt) return 'on_track'
  const due = new Date(dueAt).getTime()
  if (completedAt) {
    return new Date(completedAt).getTime() <= due ? 'met' : 'breached'
  }
  const now = Date.now()
  if (now > due) return 'breached'
  // If we have created_at, compute % elapsed; if > 75%, show warning
  if (createdAt) {
    const created = new Date(createdAt).getTime()
    const total = due - created
    const elapsed = now - created
    if (total > 0 && elapsed / total >= 0.75) return 'warning'
  }
  return 'on_track'
}

export function SlaStatus({ dueAt, completedAt, label }: SlaStatusProps) {
  const state = getSlaState(dueAt, completedAt)
  if (!dueAt) return null

  const due = new Date(dueAt)
  const now = new Date()

  if (state === 'met') {
    return <span className="text-xs font-semibold text-green-600">✓ {label || 'Met'}</span>
  }
  if (state === 'breached') {
    return <span className="text-xs font-semibold text-red-600">✗ {label || 'Breached'}</span>
  }
  if (state === 'warning') {
    const hoursLeft = Math.max(0, Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60) * 10) / 10)
    return <span className="text-xs font-semibold text-amber-500">⚠ {hoursLeft}h left</span>
  }
  const hoursLeft = Math.max(0, Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60) * 10) / 10)
  return <span className="text-xs font-semibold text-green-600">✓ {hoursLeft}h left</span>
}

export function SlaProgressBar({ dueAt, completedAt }: { dueAt: string | null; completedAt: string | null }) {
  if (!dueAt) return null
  const state = getSlaState(dueAt, completedAt)
  const colors: Record<string, string> = {
    met: 'bg-green-500',
    on_track: 'bg-green-500',
    warning: 'bg-amber-500',
    breached: 'bg-red-500',
  }

  let pct = 100
  if (!completedAt && dueAt) {
    const due = new Date(dueAt).getTime()
    const now = Date.now()
    // Approximate: assume SLA window started ~proportionally before due
    // In real usage, pass createdAt for accurate calculation
    const remaining = Math.max(0, due - now)
    const window = 24 * 60 * 60 * 1000 // fallback 24h window
    pct = Math.min(100, Math.max(0, (1 - remaining / window) * 100))
  }

  return (
    <div className="h-1 w-full rounded-full bg-slate-200">
      <div className={`h-1 rounded-full ${colors[state]}`} style={{ width: `${pct}%` }} />
    </div>
  )
}
```

- [ ] **Step 2: Create ticket reply component**

Create `src/components/support/ticket-reply.tsx`:

```typescript
'use client'

import type { TicketReply } from '@/lib/types'

interface TicketReplyProps {
  reply: TicketReply
  previousReply?: TicketReply | null
  isAdmin?: boolean
}

export function TicketReplyCard({ reply, previousReply, isAdmin }: TicketReplyProps) {
  const isInternal = reply.is_internal
  const authorName = reply.author?.display_name || reply.author?.email || 'Unknown'
  const authorRole = reply.author?.role
  const timeAgo = formatTimeAgo(reply.created_at)

  if (isInternal && !isAdmin) return null

  return (
    <div className={`rounded-lg border p-4 ${
      isInternal
        ? 'border-amber-200 bg-amber-50'
        : authorRole === 'admin'
          ? 'border-blue-200 bg-blue-50'
          : 'border-slate-200 bg-white'
    }`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">
          {authorName}
          {authorRole === 'admin' && <span className="ml-1 font-normal text-blue-600">(Admin)</span>}
          {isInternal && <span className="ml-1 font-normal text-amber-600">🔒 Internal Note</span>}
        </span>
        <span className="text-xs text-slate-400">
          {timeAgo}
          {reply.email_sent && ' · 📧 Email sent'}
        </span>
      </div>

      {previousReply && !isInternal && (
        <div className="mb-3 rounded border-l-[3px] border-slate-300 bg-slate-50 p-2 text-sm text-slate-500">
          <span className="text-xs text-slate-400">{previousReply.author?.display_name} wrote:</span>
          <p className="mt-1 line-clamp-3">{previousReply.body}</p>
        </div>
      )}

      <p className="whitespace-pre-wrap text-sm text-slate-700">{reply.body}</p>
    </div>
  )
}

function formatTimeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
```

- [ ] **Step 3: Create reply form component**

Create `src/components/support/reply-form.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface ReplyFormProps {
  onSubmit: (body: string, isInternal: boolean, sendEmail: boolean) => Promise<void>
  isAdmin?: boolean
}

export function ReplyForm({ onSubmit, isAdmin }: ReplyFormProps) {
  const [body, setBody] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [sendEmail, setSendEmail] = useState(true)
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!body.trim()) return
    setSaving(true)
    await onSubmit(body, isInternal, sendEmail)
    setBody('')
    setIsInternal(false)
    setSaving(false)
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      {isAdmin && (
        <div className="mb-3 flex gap-2">
          <Button
            size="sm"
            variant={!isInternal ? 'default' : 'outline'}
            onClick={() => setIsInternal(false)}
          >
            Reply
          </Button>
          <Button
            size="sm"
            variant={isInternal ? 'default' : 'outline'}
            className={isInternal ? 'bg-amber-500 hover:bg-amber-600' : ''}
            onClick={() => setIsInternal(true)}
          >
            Internal Note
          </Button>
        </div>
      )}

      <textarea
        className="w-full rounded-md border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
        rows={4}
        placeholder={isInternal ? 'Write an internal note...' : 'Write your reply...'}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-slate-400">
          <Button variant="ghost" size="sm" disabled className="text-xs text-slate-400">
            📎 Attach file (Coming soon)
          </Button>
        </div>
        <div className="flex items-center gap-3">
          {!isInternal && (
            <Label className="flex items-center gap-2 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="rounded"
              />
              Send email notification
            </Label>
          )}
          <Button onClick={handleSubmit} disabled={saving || !body.trim()} size="sm">
            {saving ? 'Sending...' : isInternal ? 'Add Note' : 'Send Reply'}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/support/sla-status.tsx src/components/support/ticket-reply.tsx src/components/support/reply-form.tsx
git commit -m "feat(support): add SLA status, ticket reply, and reply form components"
```

---

## Task 7: Support Components — Ticket Table & Form

**Files:**
- Create: `src/components/support/ticket-table.tsx`
- Create: `src/components/support/ticket-form.tsx`

- [ ] **Step 1: Create ticket table component**

Create `src/components/support/ticket-table.tsx` — a filterable table that shows tickets with SLA indicators. Uses the shadcn Table, Badge, Button, and Select components. Includes filter dropdowns for category, status, priority, assigned to, and company. Each row shows ticket number (blue link), subject, category badge, company name, priority badge, status badge, SLA status (using `SlaStatus` component), and assigned to name. Breached tickets get `bg-red-50` row background. Clicking a row navigates to ticket detail via `router.push`. Follow the exact pattern from `src/app/(admin)/people/companies/page.tsx` for the table structure.

- [ ] **Step 2: Create ticket form dialog component**

Create `src/components/support/ticket-form.tsx` — a dialog form for creating tickets. Fields: category select (General/Billing/Service), service select (shown when category=service, fetches services from Supabase), priority select, company select (admin only, fetches companies), subject input, description textarea. On submit, calls the `/api/support/tickets` POST route with auth header. Uses `createTicketSchema` for client-side validation. Shows toast on success/error. Follow the shadcn dialog + form pattern.

- [ ] **Step 3: Commit**

```bash
git add src/components/support/ticket-table.tsx src/components/support/ticket-form.tsx
git commit -m "feat(support): add ticket table with filters and ticket creation form"
```

---

## Task 8: Admin Pages — Support Layout & Ticketing

**Files:**
- Create: `src/app/(admin)/support/layout.tsx`
- Create: `src/app/(admin)/support/ticketing/page.tsx`
- Create: `src/app/(admin)/support/ticketing/[id]/page.tsx`

- [ ] **Step 1: Create support layout**

Create `src/app/(admin)/support/layout.tsx`:

```typescript
'use client'

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

- [ ] **Step 2: Create ticketing list page**

Create `src/app/(admin)/support/ticketing/page.tsx`. This page:
- Shows page header: "Support" label (uppercase, small) + "Ticketing" heading + search input + "New Ticket" button
- Renders `TicketTable` component with admin filters (category, status, priority, assigned to, company)
- Opens `TicketForm` dialog when "New Ticket" is clicked
- Refetches tickets after new ticket is created
- Follow the exact layout pattern from companies page: `<p className="text-xs font-medium uppercase tracking-wider text-slate-400">Support</p>` + `<h1 className="mt-1 text-2xl font-bold text-slate-900">Ticketing</h1>`

- [ ] **Step 3: Create ticket detail page**

Create `src/app/(admin)/support/ticketing/[id]/page.tsx`. This page:
- Fetches ticket by ID using `getTicketById`
- Fetches replies using `getRepliesByTicketId`
- Split layout: left side (flex-1) = conversation thread, right side (w-[300px]) = metadata sidebar
- Left side: page header (subject + ticket_number + created by + time), then all replies mapped through `TicketReplyCard` (passing previousReply for quoted context), then `ReplyForm` at bottom
- Right side: Status dropdown, Priority badge, Category + service name, Assigned To (with reassign dropdown fetching admin profiles), Company name, separator, SLA Tracking section with response SLA (using `SlaStatus` + `SlaProgressBar`) and resolution SLA
- On reply submit: insert reply via `createReply`, if not internal + sendEmail=true → call `/api/support/email` route, if it's first admin reply → update `first_responded_at`, refetch replies
- On status change: call `updateTicketStatus`, show toast, refetch ticket

- [ ] **Step 4: Commit**

```bash
git add src/app/(admin)/support/layout.tsx src/app/(admin)/support/ticketing/page.tsx src/app/(admin)/support/ticketing/\[id\]/page.tsx
git commit -m "feat(support): add admin ticketing list and detail pages"
```

---

## Task 9: SLA Dashboard Components

**Files:**
- Create: `src/components/support/sla-kpi-cards.tsx`
- Create: `src/components/support/sla-company-table.tsx`
- Create: `src/components/support/sla-service-table.tsx`
- Create: `src/components/support/sla-ticket-table.tsx`

- [ ] **Step 1: Create SLA KPI cards**

Create `src/components/support/sla-kpi-cards.tsx`. Accepts an array of tickets with SLA data. Computes 4 metrics:
- Overall SLA Compliance % (tickets where both response and resolution SLA met / total resolved)
- Response SLA Met % (tickets responded before response_due_at / total with first_responded_at)
- Resolution SLA Met % (tickets resolved before resolution_due_at / total resolved)
- Active Breaches (open tickets past either deadline)

Renders 4 cards in a `grid grid-cols-4 gap-4` layout. Each card: `rounded-xl border bg-white p-5` with label (uppercase small), big number (2xl font, color-coded green/amber/red), subtitle. Active Breaches card gets `border-red-200` if count > 0.

- [ ] **Step 2: Create compliance-by-company table**

Create `src/components/support/sla-company-table.tsx`. Groups tickets by company_id, computes per-company response %, resolution %, breach count, overall %. Renders a shadcn Table with clickable rows (onClick passes companyId). Overall % column includes a progress bar. Color-code percentages: green ≥ 90%, amber 75-89%, red < 75%.

- [ ] **Step 3: Create compliance-by-service table**

Create `src/components/support/sla-service-table.tsx`. Groups tickets by service_id, computes avg response time, avg resolution time, compliance %. Shows SLA template name. Clickable rows for drill-down.

- [ ] **Step 4: Create drill-down ticket-level table**

Create `src/components/support/sla-ticket-table.tsx`. Shows individual tickets with: ticket number, subject, priority badge, response target, actual response time, response met/breached, resolution target, actual resolution time, resolution met/breached. Breached rows get `bg-red-50`. Uses `SlaStatus` component for met/breached indicators.

- [ ] **Step 5: Commit**

```bash
git add src/components/support/sla-kpi-cards.tsx src/components/support/sla-company-table.tsx src/components/support/sla-service-table.tsx src/components/support/sla-ticket-table.tsx
git commit -m "feat(support): add SLA dashboard components (KPI cards, company/service/ticket tables)"
```

---

## Task 10: Admin SLA Measurements Page

**Files:**
- Create: `src/app/(admin)/support/sla-measurements/page.tsx`

- [ ] **Step 1: Create SLA measurements page**

This page:
- Page header: "Support" label + "SLA Measurements" heading
- Filter bar: time period select (Last 7 days / Last 30 days / Last 90 days / All time) + company select (fetches companies list)
- Fetches tickets using `getCompanySlaSummary` with computed date range
- State for `drillDown`: `{ companyId, companyName, serviceId?, serviceName? } | null`
- When `drillDown` is null: shows `SlaKpiCards` + `SlaCompanyTable` + `SlaServiceTable`
- When `drillDown` is set: shows back link ("← Back to SLA Measurements"), header with company/service name, mini KPI cards (response %, resolution %), `SlaTicketTable` filtered to that company/service
- Company table onClick → sets drillDown to that company
- Service table onClick → sets drillDown to that service

**Note:** The spec lists separate `[companyId]/page.tsx` and `[companyId]/[serviceId]/page.tsx` routes. This plan uses client-side state for drill-down within a single page instead. This is simpler (avoids prop passing via URL params, fewer files) and provides the same UX. The implementer should follow the client-side approach.

- [ ] **Step 2: Commit**

```bash
git add src/app/(admin)/support/sla-measurements/page.tsx
git commit -m "feat(support): add admin SLA measurements dashboard with drill-down"
```

---

## Task 11: Customer Portal — SLA Service Card Component

**Files:**
- Create: `src/components/support/sla-service-card.tsx`

- [ ] **Step 1: Create customer SLA service card**

Create `src/components/support/sla-service-card.tsx`. A card showing per-service SLA performance for the customer. Props: service name, SLA template, response/resolution compliance percentages, SLA targets per priority, support hours, ticket count. Layout:
- Header: service name + template name + "Active" badge
- Separator
- Two gauge blocks (response %, resolution %) with progress bars, side by side
- SLA targets grid: response times per priority (left), resolution times per priority (right)
- Separator
- Footer: support hours + ticket count

Uses `rounded-xl border bg-white p-5` card styling.

- [ ] **Step 2: Commit**

```bash
git add src/components/support/sla-service-card.tsx
git commit -m "feat(support): add customer SLA service performance card"
```

---

## Task 12: Customer Portal — Support Page

**Files:**
- Modify: `src/app/(customer)/portal/support/page.tsx`

- [ ] **Step 1: Rewrite customer support page**

Replace the existing placeholder with the full customer support page. This page:
- Uses `useAuth()` to get profile (company_id)
- Fetches customer's tickets via `getCustomerTickets(profile.company_id)`
- Fetches SLA data via `getCustomerSlaSummary(profile.company_id, period)`
- Fetches customer's contracts with services: `supabase.from('customer_contracts').select('*, service:services(*, service_sla:service_sla(*, sla_template:sla_templates(*)))').eq('company_id', profile.company_id)`
- Time period filter (Last 30 days default)
- KPI cards: same pattern as admin but scoped to this company
- SLA Performance by Service: renders `SlaServiceCard` for each contracted service + a General & Billing card
- Your Tickets: table with ticket number, subject, category badge, priority badge, status badge, SLA status, last updated. Click navigates to `/portal/support/tickets/[id]`
- "+ New Ticket" button opens `TicketForm` (with company_id pre-set, no company selector)

- [ ] **Step 2: Commit**

```bash
git add src/app/(customer)/portal/support/page.tsx
git commit -m "feat(support): upgrade customer portal support page with SLA tracking and tickets"
```

---

## Task 13: Customer Portal — Ticket Detail Page

**Files:**
- Create: `src/app/(customer)/portal/support/tickets/[id]/page.tsx`

- [ ] **Step 1: Create customer ticket detail page**

Same split layout as admin detail but:
- No internal notes visible (RLS already filters them, but also filter client-side as safety)
- No status change dropdown (read-only badge)
- No assigned to / reassign controls
- No company field (implicit)
- Reply form without "Internal Note" toggle (`isAdmin={false}`)
- SLA tracking in sidebar (response + resolution status)
- Back link to `/portal/support`

- [ ] **Step 2: Commit**

```bash
git add src/app/(customer)/portal/support/tickets/\[id\]/page.tsx
git commit -m "feat(support): add customer ticket detail page"
```

---

## Task 14: SLA Monitoring Cron API Route

**Files:**
- Create: `src/app/api/support/sla-monitor/route.ts`

- [ ] **Step 1: Create SLA monitoring endpoint**

Create `src/app/api/support/sla-monitor/route.ts`. This is a GET endpoint (callable by a cron service like Vercel Cron, or pg_cron via `net.http_get`). It:

1. Queries all open tickets (`status IN ('open', 'in_progress', 'waiting_on_customer')`) that have `response_due_at` or `resolution_due_at` set
2. For each ticket, checks:
   - **75% warning:** If 75% of the SLA time has elapsed and no `sla_breach` or `sla_warning` email exists in `ticket_email_log` for this ticket
   - **Breached:** If `now() > response_due_at` (and `first_responded_at` is null) or `now() > resolution_due_at` (and `resolved_at` is null), and no `sla_breach` email exists for this ticket
3. For warnings: sends email to assigned admin via `/api/support/email` (or direct Resend call)
4. For breaches: sends email to assigned admin + fetches all admin profiles and sends to each
5. Deduplication: before sending, checks `ticket_email_log` for existing `sla_breach` or `sla_warning` entries for the same ticket — skips if already notified
6. Returns `{ checked: N, warnings: N, breaches: N }`

Security: Verify a secret header (`x-cron-secret`) matches `process.env.CRON_SECRET` to prevent unauthorized calls.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  let warnings = 0
  let breaches = 0

  // Fetch open tickets with SLA deadlines
  const { data: tickets } = await supabaseAdmin
    .from('support_tickets')
    .select('id, ticket_number, subject, assigned_to, response_due_at, resolution_due_at, first_responded_at, resolved_at, created_at')
    .in('status', ['open', 'in_progress', 'waiting_on_customer'])
    .not('sla_template_id', 'is', null)

  if (!tickets) return NextResponse.json({ checked: 0, warnings: 0, breaches: 0 })

  for (const ticket of tickets) {
    // Check for existing notifications
    const { data: existingBreachLogs } = await supabaseAdmin
      .from('ticket_email_log')
      .select('email_type')
      .eq('ticket_id', ticket.id)
      .eq('email_type', 'sla_breach')

    const { data: existingWarningLogs } = await supabaseAdmin
      .from('ticket_email_log')
      .select('email_type')
      .eq('ticket_id', ticket.id)
      .eq('email_type', 'sla_warning')

    const alreadyBreachNotified = (existingBreachLogs || []).length > 0
    const alreadyWarningNotified = (existingWarningLogs || []).length > 0

    // Check response SLA breach
    const responseBreach = ticket.response_due_at
      && !ticket.first_responded_at
      && now > new Date(ticket.response_due_at)

    // Check resolution SLA breach
    const resolutionBreach = ticket.resolution_due_at
      && !ticket.resolved_at
      && now > new Date(ticket.resolution_due_at)

    if ((responseBreach || resolutionBreach) && !alreadyBreachNotified) {
      // Fetch all admins for breach notification
      const { data: admins } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('role', 'admin')

      const sendEmail = process.env.RESEND_API_KEY
        ? async (to: string, subject: string, html: string) => {
            const { Resend } = await import('resend')
            const r = new Resend(process.env.RESEND_API_KEY)
            await r.emails.send({ from: 'IThealth Support <support@ithealth.ai>', to, subject, html })
          }
        : null

      for (const admin of (admins || [])) {
        const { data: logEntry } = await supabaseAdmin.from('ticket_email_log').insert({
          ticket_id: ticket.id,
          recipient_email: admin.email,
          email_type: 'sla_breach',
          status: 'pending',
        }).select().single()

        try {
          if (sendEmail) {
            await sendEmail(
              admin.email,
              `⚠ SLA Breached: [${ticket.ticket_number}] ${ticket.subject}`,
              `<p>SLA has been breached for ticket ${ticket.ticket_number}.</p>`,
            )
          }
          if (logEntry) {
            await supabaseAdmin.from('ticket_email_log')
              .update({ status: 'sent', sent_at: now.toISOString() })
              .eq('id', logEntry.id)
          }
        } catch (err) {
          if (logEntry) {
            await supabaseAdmin.from('ticket_email_log')
              .update({ status: 'failed', error: err instanceof Error ? err.message : 'Unknown' })
              .eq('id', logEntry.id)
          }
        }
      }
      breaches++
      continue
    }

    // Check 75% warning (response)
    if (ticket.response_due_at && !ticket.first_responded_at && !alreadyWarningNotified) {
      const created = new Date(ticket.created_at).getTime()
      const due = new Date(ticket.response_due_at).getTime()
      const elapsed = now.getTime() - created
      const total = due - created
      if (total > 0 && elapsed / total >= 0.75 && elapsed / total < 1) {
        if (ticket.assigned_to) {
          const { data: assignee } = await supabaseAdmin
            .from('profiles')
            .select('email')
            .eq('id', ticket.assigned_to)
            .single()

          if (assignee) {
            const { data: warnLog } = await supabaseAdmin.from('ticket_email_log').insert({
              ticket_id: ticket.id,
              recipient_email: assignee.email,
              email_type: 'sla_warning',
              status: 'pending',
            }).select().single()

            try {
              const hoursLeft = Math.round((due - now.getTime()) / (1000 * 60 * 60) * 10) / 10
              if (process.env.RESEND_API_KEY) {
                const { Resend } = await import('resend')
                const r = new Resend(process.env.RESEND_API_KEY)
                await r.emails.send({
                  from: 'IThealth Support <support@ithealth.ai>',
                  to: assignee.email,
                  subject: `⚠ SLA at risk: [${ticket.ticket_number}] (${hoursLeft}h remaining)`,
                  html: `<p>SLA deadline approaching for ticket ${ticket.ticket_number}. ${hoursLeft} hours remaining.</p>`,
                })
              }
              if (warnLog) {
                await supabaseAdmin.from('ticket_email_log')
                  .update({ status: 'sent', sent_at: now.toISOString() })
                  .eq('id', warnLog.id)
              }
            } catch (err) {
              if (warnLog) {
                await supabaseAdmin.from('ticket_email_log')
                  .update({ status: 'failed', error: err instanceof Error ? err.message : 'Unknown' })
                  .eq('id', warnLog.id)
              }
            }
          }
        }
        warnings++
      }
    }
  }

  return NextResponse.json({ checked: tickets.length, warnings, breaches })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/support/sla-monitor/route.ts
git commit -m "feat(support): add SLA monitoring cron endpoint for breach/warning notifications"
```

---

## Task 15: Database Reset & Smoke Test

- [ ] **Step 1: Reset database to apply all migrations**

Run: `cd /Users/futuvara/Documents/Claude/Projects/IThealth.ai && npx supabase db reset`
Expected: All migrations apply cleanly, seed data inserted

- [ ] **Step 2: Start dev server and verify**

Run: `npm run dev`

Verify:
- Admin sidebar shows "Support" icon (headset)
- Clicking Support → mega menu shows "Ticketing" and "SLA Measurements"
- `/support/ticketing` loads with empty ticket list
- "/+ New Ticket" dialog opens and submits
- `/support/sla-measurements` loads with empty dashboard
- Customer portal `/portal/support` shows SLA cards and empty ticket list
- Customer can create a ticket and see it in their list
- Admin can view customer's ticket and reply
- SLA deadlines are computed on ticket creation

- [ ] **Step 3: Fix any issues found during smoke test**

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(support): complete customer support ticketing and SLA measurements feature"
```
