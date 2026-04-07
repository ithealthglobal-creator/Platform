# Customer Services Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a customer-facing services feature with two-tab catalog (My Services / All Services), service detail pages, cart + checkout with PayFast payment, and admin SLA template management.

**Architecture:** Customer portal pages under `(customer)/portal/` fetch service data from Supabase with RLS. Cart state lives in React Context backed by localStorage. Checkout creates orders via API route using service_role, then redirects to PayFast. PayFast ITN webhook creates customer_contracts on payment confirmation. Admin SLA templates are managed under Settings and linked to services with per-service overrides.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Supabase (Postgres + RLS), shadcn/ui, Tailwind CSS 4, Base UI Tabs, IBM Carbon icons, PayFast payment gateway.

**Spec:** `docs/superpowers/specs/2026-04-07-customer-services-menu-design.md`

---

## File Structure

### Database Migrations (`supabase/migrations/`)
- `20260407400001_create_sla_templates.sql` — SLA templates table
- `20260407400002_create_service_sla.sql` — Per-service SLA with overrides
- `20260407400003_create_orders.sql` — Orders + order_items + sequence
- `20260407400004_create_customer_contracts.sql` — Customer contracts with partial unique index
- `20260407400005_create_service_requests.sql` — Service enquiry requests
- `20260407400006_customer_services_rls.sql` — RLS policies for all new tables

### Types (`src/lib/types.ts`)
- Add: `SlaTemplate`, `ServiceSla`, `CustomerContract`, `ServiceRequest`, `Order`, `OrderItem`, `CartItem`, `BillingPeriod`, `ContractStatus`, `OrderStatus`, `PaymentStatus`

### Contexts (`src/contexts/`)
- Create: `cart-context.tsx` — CartProvider + useCart hook (localStorage-backed)

### Customer Pages (`src/app/(customer)/portal/`)
- Modify: `services/page.tsx` — Replace placeholder with My Services / All Services tabs
- Create: `services/[id]/page.tsx` — Service detail page
- Create: `cart/page.tsx` — Cart review page
- Create: `checkout/page.tsx` — Billing + PayFast checkout
- Create: `checkout/success/page.tsx` — Payment success
- Create: `checkout/cancel/page.tsx` — Payment cancelled

### Customer Components (`src/components/services/`)
- Create: `customer-service-card.tsx` — Reusable card (My Services + All Services variants)
- Create: `service-detail-view.tsx` — Full detail page sections
- Create: `sla-display.tsx` — SLA terms table (resolves template + overrides)

### Cart Components (`src/components/cart/`)
- Create: `cart-indicator.tsx` — Cart icon with item count + total

### Admin Pages (`src/app/(admin)/`)
- Create: `settings/sla-templates/page.tsx` — SLA template CRUD list + editor
- Modify: `services/[id]/edit/page.tsx` — Add SLA tab

### Admin Components (`src/components/services/`)
- Create: `sla-tab.tsx` — Service editor SLA tab (template select + overrides)

### API Routes (`src/app/api/services/`)
- Create: `checkout/route.ts` — Create order + PayFast redirect data
- Create: `payfast-itn/route.ts` — PayFast ITN webhook handler

### Utilities (`src/lib/`)
- Create: `payfast.ts` — PayFast signature generation + validation
- Create: `pricing.ts` — Display price derivation from costing items

---

## Task 1: Database Migrations — SLA Tables

**Files:**
- Create: `supabase/migrations/20260407400001_create_sla_templates.sql`
- Create: `supabase/migrations/20260407400002_create_service_sla.sql`

- [ ] **Step 1: Create SLA templates migration**

```sql
-- supabase/migrations/20260407400001_create_sla_templates.sql
CREATE TABLE public.sla_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  response_critical text,
  response_high text,
  response_medium text,
  response_low text,
  resolution_critical text,
  resolution_high text,
  resolution_medium text,
  resolution_low text,
  uptime_guarantee text,
  support_hours text,
  support_channels text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sla_templates ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER sla_templates_updated_at
  BEFORE UPDATE ON public.sla_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 2: Create service_sla migration**

```sql
-- supabase/migrations/20260407400002_create_service_sla.sql
CREATE TABLE public.service_sla (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  sla_template_id uuid NOT NULL REFERENCES public.sla_templates(id),
  override_response_critical text,
  override_response_high text,
  override_response_medium text,
  override_response_low text,
  override_resolution_critical text,
  override_resolution_high text,
  override_resolution_medium text,
  override_resolution_low text,
  override_uptime_guarantee text,
  override_support_hours text,
  override_support_channels text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_id)
);

ALTER TABLE public.service_sla ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_service_sla_service_id ON public.service_sla(service_id);
CREATE INDEX idx_service_sla_template_id ON public.service_sla(sla_template_id);

CREATE TRIGGER service_sla_updated_at
  BEFORE UPDATE ON public.service_sla
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 3: Apply migrations**

Run: `npx supabase db push`
Expected: Both tables created successfully.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260407400001_create_sla_templates.sql supabase/migrations/20260407400002_create_service_sla.sql
git commit -m "feat: add SLA templates and service_sla tables"
```

---

## Task 2: Database Migrations — Orders, Contracts, Requests

**Files:**
- Create: `supabase/migrations/20260407400003_create_orders.sql`
- Create: `supabase/migrations/20260407400004_create_customer_contracts.sql`
- Create: `supabase/migrations/20260407400005_create_service_requests.sql`

- [ ] **Step 1: Create orders migration**

```sql
-- supabase/migrations/20260407400003_create_orders.sql
CREATE SEQUENCE public.order_number_seq START 1;

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  profile_id uuid NOT NULL REFERENCES public.profiles(id),
  order_number text UNIQUE NOT NULL DEFAULT 'ORD-' || lpad(nextval('public.order_number_seq')::text, 5, '0'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  subtotal numeric NOT NULL,
  vat_amount numeric NOT NULL,
  total numeric NOT NULL,
  billing_email text,
  po_number text,
  notes text,
  payfast_payment_id text,
  payfast_status text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_orders_company_id ON public.orders(company_id);
CREATE INDEX idx_orders_status ON public.orders(status);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id),
  price numeric NOT NULL,
  billing_period text NOT NULL CHECK (billing_period IN ('once', 'monthly', 'quarterly', 'annually')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
```

- [ ] **Step 2: Create customer_contracts migration**

```sql
-- supabase/migrations/20260407400004_create_customer_contracts.sql
CREATE TABLE public.customer_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  service_id uuid NOT NULL REFERENCES public.services(id),
  order_item_id uuid REFERENCES public.order_items(id),
  status text NOT NULL CHECK (status IN ('pending', 'active', 'paused', 'completed', 'cancelled')),
  contracted_price numeric NOT NULL,
  billing_period text NOT NULL CHECK (billing_period IN ('once', 'monthly', 'quarterly', 'annually')),
  started_at timestamptz,
  renewal_date timestamptz,
  expires_at timestamptz,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'overdue', 'na')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_contracts ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_active_contract ON public.customer_contracts (company_id, service_id) WHERE status IN ('active', 'pending');
CREATE INDEX idx_customer_contracts_company_id ON public.customer_contracts(company_id);
CREATE INDEX idx_customer_contracts_service_id ON public.customer_contracts(service_id);

CREATE TRIGGER customer_contracts_updated_at
  BEFORE UPDATE ON public.customer_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 3: Create service_requests migration**

```sql
-- supabase/migrations/20260407400005_create_service_requests.sql
CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  profile_id uuid NOT NULL REFERENCES public.profiles(id),
  service_id uuid NOT NULL REFERENCES public.services(id),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'approved', 'declined')),
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_service_requests_company_id ON public.service_requests(company_id);
CREATE INDEX idx_service_requests_status ON public.service_requests(status);

CREATE TRIGGER service_requests_updated_at
  BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 4: Apply migrations**

Run: `npx supabase db push`
Expected: All three tables created successfully.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260407400003_create_orders.sql supabase/migrations/20260407400004_create_customer_contracts.sql supabase/migrations/20260407400005_create_service_requests.sql
git commit -m "feat: add orders, customer_contracts, and service_requests tables"
```

---

## Task 3: RLS Policies for All New Tables

**Files:**
- Create: `supabase/migrations/20260407400006_customer_services_rls.sql`

- [ ] **Step 1: Create RLS policies migration**

```sql
-- supabase/migrations/20260407400006_customer_services_rls.sql

-- SLA Templates: admin full, authenticated read active
CREATE POLICY "Admins full access to sla_templates" ON public.sla_templates FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Authenticated read active sla_templates" ON public.sla_templates FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

-- Service SLA: admin full, authenticated read
CREATE POLICY "Admins full access to service_sla" ON public.service_sla FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Authenticated read service_sla" ON public.service_sla FOR SELECT USING (auth.uid() IS NOT NULL);

-- Customer Contracts: admin full, customers read own company
CREATE POLICY "Admins full access to customer_contracts" ON public.customer_contracts FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Customers read own contracts" ON public.customer_contracts FOR SELECT USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Service Requests: admin full read, customers insert+read own company
CREATE POLICY "Admins full access to service_requests" ON public.service_requests FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Customers read own requests" ON public.service_requests FOR SELECT USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Customers create requests" ON public.service_requests FOR INSERT WITH CHECK (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Orders: admin full read, customers read own company
CREATE POLICY "Admins full access to orders" ON public.orders FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Customers read own orders" ON public.orders FOR SELECT USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Order Items: admin full read, customers read via order
CREATE POLICY "Admins full access to order_items" ON public.order_items FOR ALL USING (public.get_my_role() = 'admin');
CREATE POLICY "Customers read own order_items" ON public.order_items FOR SELECT USING (
  order_id IN (SELECT id FROM public.orders WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);
```

- [ ] **Step 2: Apply migration**

Run: `npx supabase db push`
Expected: RLS policies created.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260407400006_customer_services_rls.sql
git commit -m "feat: add RLS policies for customer services tables"
```

---

## Task 4: TypeScript Types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add new types to types.ts**

Append after the existing `ServiceAcademyLink` interface (around line 351):

```typescript
// === Customer Services Types ===

export type BillingPeriod = 'once' | 'monthly' | 'quarterly' | 'annually'
export type ContractStatus = 'pending' | 'active' | 'paused' | 'completed' | 'cancelled'
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled'
export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'na'

export interface SlaTemplate {
  id: string
  name: string
  description: string | null
  response_critical: string | null
  response_high: string | null
  response_medium: string | null
  response_low: string | null
  resolution_critical: string | null
  resolution_high: string | null
  resolution_medium: string | null
  resolution_low: string | null
  uptime_guarantee: string | null
  support_hours: string | null
  support_channels: string[] | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ServiceSla {
  id: string
  service_id: string
  sla_template_id: string
  override_response_critical: string | null
  override_response_high: string | null
  override_response_medium: string | null
  override_response_low: string | null
  override_resolution_critical: string | null
  override_resolution_high: string | null
  override_resolution_medium: string | null
  override_resolution_low: string | null
  override_uptime_guarantee: string | null
  override_support_hours: string | null
  override_support_channels: string[] | null
  created_at: string
  updated_at: string
  sla_template?: SlaTemplate
}

export interface CustomerContract {
  id: string
  company_id: string
  service_id: string
  order_item_id: string | null
  status: ContractStatus
  contracted_price: number
  billing_period: BillingPeriod
  started_at: string | null
  renewal_date: string | null
  expires_at: string | null
  payment_status: PaymentStatus
  notes: string | null
  created_at: string
  updated_at: string
  service?: Service
}

export interface ServiceRequest {
  id: string
  company_id: string
  profile_id: string
  service_id: string
  status: 'new' | 'in_review' | 'approved' | 'declined'
  message: string | null
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  company_id: string
  profile_id: string
  order_number: string
  status: OrderStatus
  subtotal: number
  vat_amount: number
  total: number
  billing_email: string | null
  po_number: string | null
  notes: string | null
  payfast_payment_id: string | null
  payfast_status: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
  order_items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  service_id: string
  price: number
  billing_period: BillingPeriod
  created_at: string
  service?: Service
}

export interface CartItem {
  service_id: string
  name: string
  phase_name: string
  phase_color: string
  price: number
  billing_period: BillingPeriod
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add customer services TypeScript types"
```

---

## Task 5: Pricing Utility

**Files:**
- Create: `src/lib/pricing.ts`

- [ ] **Step 1: Create pricing utility**

```typescript
// src/lib/pricing.ts
import type { ServiceCostingItem } from './types'

/**
 * Derives display price from service costing items.
 * Sums base_cost of maintenance items (recurring) or setup items (one-off).
 * For tiered pricing, uses tier-1 minimum rate.
 */
export function deriveDisplayPrice(
  costingItems: ServiceCostingItem[]
): { price: number; billingPeriod: 'once' | 'monthly' } {
  const maintenanceItems = costingItems.filter(i => i.category === 'maintenance' && i.is_active)
  const setupItems = costingItems.filter(i => i.category === 'setup' && i.is_active)

  // Prefer maintenance (recurring) if available
  const items = maintenanceItems.length > 0 ? maintenanceItems : setupItems
  const billingPeriod = maintenanceItems.length > 0 ? 'monthly' as const : 'once' as const

  let total = 0
  for (const item of items) {
    if (item.pricing_type === 'tiered' && item.tiers && item.tiers.length > 0) {
      total += item.tiers[0].rate
    } else if (item.base_cost) {
      total += parseFloat(item.base_cost)
    }
  }

  return { price: total, billingPeriod }
}

/**
 * Format price for display: "R 4,500/mo" or "R 12,000 once"
 */
export function formatPrice(price: number, billingPeriod: string): string {
  const formatted = new Intl.NumberFormat('en-ZA').format(price)
  const suffix = billingPeriod === 'once' ? ' once'
    : billingPeriod === 'monthly' ? '/mo'
    : billingPeriod === 'quarterly' ? '/qtr'
    : '/yr'
  return `R ${formatted}${suffix}`
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/pricing.ts
git commit -m "feat: add pricing utility for display price derivation"
```

---

## Task 6: Cart Context

**Files:**
- Create: `src/contexts/cart-context.tsx`

- [ ] **Step 1: Create cart context**

```typescript
// src/contexts/cart-context.tsx
'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { CartItem } from '@/lib/types'

const CART_STORAGE_KEY = 'ithealth-cart'

interface CartContextType {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (serviceId: string) => void
  clearCart: () => void
  isInCart: (serviceId: string) => boolean
  itemCount: number
  subtotal: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [loaded, setLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY)
      if (stored) setItems(JSON.parse(stored))
    } catch {}
    setLoaded(true)
  }, [])

  // Persist to localStorage on change
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    }
  }, [items, loaded])

  const addItem = useCallback((item: CartItem) => {
    setItems(prev => {
      if (prev.some(i => i.service_id === item.service_id)) return prev
      return [...prev, item]
    })
  }, [])

  const removeItem = useCallback((serviceId: string) => {
    setItems(prev => prev.filter(i => i.service_id !== serviceId))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const isInCart = useCallback((serviceId: string) => {
    return items.some(i => i.service_id === serviceId)
  }, [items])

  const subtotal = items.reduce((sum, i) => sum + i.price, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, isInCart, itemCount: items.length, subtotal }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
```

- [ ] **Step 2: Wrap customer layout with CartProvider**

Modify `src/app/(customer)/layout.tsx` — add `CartProvider` inside the existing provider chain:

```tsx
import { CartProvider } from '@/contexts/cart-context'

// Wrap children with CartProvider inside MenuProvider:
<MenuProvider>
  <CartProvider>
    <div className="flex h-screen">
      <CustomerSidebar />
      <main className="flex-1 overflow-y-auto bg-[#f8fafc] p-7">
        {children}
      </main>
    </div>
  </CartProvider>
</MenuProvider>
```

- [ ] **Step 3: Commit**

```bash
git add src/contexts/cart-context.tsx src/app/\(customer\)/layout.tsx
git commit -m "feat: add cart context with localStorage persistence"
```

---

## Task 7: Phase Color Helper

**Files:**
- Create: `src/lib/phase-colors.ts`

- [ ] **Step 1: Create phase color helper**

This centralizes phase color lookups used across service cards, detail pages, and progress bars.

```typescript
// src/lib/phase-colors.ts
const PHASE_COLORS: Record<string, string> = {
  Operate: '#1175E4',
  Secure: '#FF246B',
  Streamline: '#6c3ce0',
  Accelerate: '#EDB600',
}

export function getPhaseColor(phaseName: string): string {
  return PHASE_COLORS[phaseName] || '#64748b'
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/phase-colors.ts
git commit -m "feat: add centralized phase color helper"
```

---

## Task 8: Customer Service Card Component

**Files:**
- Create: `src/components/services/customer-service-card.tsx`

- [ ] **Step 1: Create the card component**

This component renders in two modes: `my-service` (with contract + progress) and `catalog` (with description + add to cart).

```typescript
// src/components/services/customer-service-card.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useCart } from '@/contexts/cart-context'
import { getPhaseColor } from '@/lib/phase-colors'
import { formatPrice } from '@/lib/pricing'
import type { Service, CustomerContract, BillingPeriod } from '@/lib/types'
import { Button } from '@/components/ui/button'

interface MyServiceCardProps {
  mode: 'my-service'
  service: Service & { phase_name: string }
  contract: CustomerContract
  academyProgress?: { completed: number; total: number }
}

interface CatalogCardProps {
  mode: 'catalog'
  service: Service & { phase_name: string }
  displayPrice: number
  billingPeriod: BillingPeriod
  isSubscribed: boolean
}

type Props = MyServiceCardProps | CatalogCardProps

export function CustomerServiceCard(props: Props) {
  const router = useRouter()
  const { addItem, removeItem, isInCart } = useCart()
  const { service } = props
  const phaseColor = getPhaseColor(service.phase_name)
  const inCart = isInCart(service.id)

  const cardBorder = props.mode === 'catalog' && inCart
    ? '2px solid #3b82f6'
    : '1px solid #e5e7eb'

  return (
    <div
      className="flex flex-col overflow-hidden bg-white"
      style={{ borderRadius: '16px 0 16px 16px', border: cardBorder }}
    >
      {/* Phase header */}
      <div
        className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white"
        style={{ backgroundColor: phaseColor }}
      >
        {service.phase_name}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {props.mode === 'my-service' ? (
          <>
            {/* Service name + status */}
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold text-slate-900">{service.name}</h3>
              <StatusBadge status={props.contract.status} />
            </div>

            {/* Contract info grid */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-slate-400">Price:</span> <span className="font-medium text-slate-900">{formatPrice(props.contract.contracted_price, props.contract.billing_period)}</span></div>
              <div><span className="text-slate-400">Billing:</span> <span className="text-slate-900">{props.contract.billing_period === 'once' ? 'One-off' : props.contract.billing_period.charAt(0).toUpperCase() + props.contract.billing_period.slice(1)}</span></div>
              <div><span className="text-slate-400">Started:</span> <span className="text-slate-900">{props.contract.started_at ? new Date(props.contract.started_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span></div>
              <div>
                {props.contract.payment_status === 'overdue'
                  ? <><span className="text-slate-400">Payment:</span> <span className="font-medium text-red-600">Overdue</span></>
                  : <><span className="text-slate-400">Renewal:</span> <span className="text-slate-900">{props.contract.renewal_date ? new Date(props.contract.renewal_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span></>
                }
              </div>
            </div>

            {/* Progress section */}
            <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Journey Progress</span>
                <span className="font-medium text-slate-900">—</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded bg-slate-100">
                <div className="h-full rounded" style={{ backgroundColor: phaseColor, width: '0%' }} />
              </div>
              <div className="flex justify-between text-xs">
                <div><span className="text-slate-500">Academy:</span> <span className="font-medium text-green-600">{props.academyProgress ? `${props.academyProgress.completed}/${props.academyProgress.total} courses` : '—'}</span></div>
                <div><span className="text-slate-500">Runbook:</span> <span className="text-slate-400">Not tracked yet</span></div>
              </div>
            </div>

            <button
              onClick={() => router.push(`/portal/services/${service.id}`)}
              className="mt-auto text-left text-sm font-medium text-blue-500 hover:underline"
            >
              View details →
            </button>
          </>
        ) : (
          <>
            {/* Catalog mode */}
            <h3 className="text-[15px] font-semibold text-slate-900">{service.name}</h3>
            <p className="flex-1 text-sm leading-relaxed text-slate-500">{service.description || ''}</p>
            <div className="text-sm text-slate-600">
              <span className="text-slate-400">From</span>{' '}
              <span className="font-semibold">{formatPrice(props.displayPrice, props.billingPeriod)}</span>
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.push(`/portal/services/${service.id}`)}
                className="text-sm font-medium text-blue-500 hover:underline"
              >
                View details →
              </button>
              {props.isSubscribed ? (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Subscribed</span>
              ) : inCart ? (
                <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => removeItem(service.id)}>Remove</Button>
              ) : (
                <Button size="sm" onClick={() => addItem({ service_id: service.id, name: service.name, phase_name: service.phase_name, phase_color: phaseColor, price: props.displayPrice, billing_period: props.billingPeriod })}>Add to Cart</Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    paused: 'bg-amber-100 text-amber-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-slate-100 text-slate-600',
    pending: 'bg-slate-100 text-slate-600',
  }
  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || styles.pending}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/services/customer-service-card.tsx
git commit -m "feat: add customer service card component with my-service and catalog modes"
```

---

## Task 9: Cart Indicator Component

**Files:**
- Create: `src/components/cart/cart-indicator.tsx`

- [ ] **Step 1: Create cart indicator**

```typescript
// src/components/cart/cart-indicator.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useCart } from '@/contexts/cart-context'
import { ShoppingCart } from '@carbon/icons-react'

export function CartIndicator() {
  const { itemCount, subtotal } = useCart()
  const router = useRouter()

  if (itemCount === 0) return null

  const formatted = new Intl.NumberFormat('en-ZA').format(subtotal)

  return (
    <button
      onClick={() => router.push('/portal/cart')}
      className="flex items-center gap-1.5 border border-slate-200 bg-white px-3.5 py-1.5 text-sm hover:bg-slate-50"
      style={{ borderRadius: '16px 0 16px 16px' }}
    >
      <ShoppingCart size={16} />
      <span className="font-semibold">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
      <span className="text-slate-500">— R {formatted}</span>
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/cart/cart-indicator.tsx
git commit -m "feat: add cart indicator component"
```

---

## Task 10: Customer Services Page (My Services + All Services Tabs)

**Files:**
- Modify: `src/app/(customer)/portal/services/page.tsx`

- [ ] **Step 1: Replace placeholder with full implementation**

```typescript
// src/app/(customer)/portal/services/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/auth-context'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CustomerServiceCard } from '@/components/services/customer-service-card'
import { CartIndicator } from '@/components/cart/cart-indicator'
import { deriveDisplayPrice } from '@/lib/pricing'
import type { Service, CustomerContract, ServiceCostingItem } from '@/lib/types'

type ServiceWithPhase = Service & { phase_name: string; phase?: { name: string } }
type ServiceWithPricing = ServiceWithPhase & { displayPrice: number; billingPeriod: 'once' | 'monthly' }

const PHASE_FILTERS = ['All', 'Operate', 'Secure', 'Streamline', 'Accelerate']

export default function ServicesPage() {
  const { profile } = useAuth()
  const [contracts, setContracts] = useState<(CustomerContract & { service: ServiceWithPhase })[]>([])
  const [allServices, setAllServices] = useState<ServiceWithPricing[]>([])
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set())
  const [phaseFilter, setPhaseFilter] = useState('All')
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!profile?.company_id) return
    setLoading(true)

    // Fetch customer contracts with service + phase
    const { data: contractData } = await supabase
      .from('customer_contracts')
      .select('*, service:services(*, phase:phases(name))')
      .eq('company_id', profile.company_id)
      .in('status', ['active', 'paused', 'pending'])

    const mappedContracts = (contractData || []).map(c => ({
      ...c,
      service: { ...c.service, phase_name: c.service?.phase?.name || '—' },
    }))
    setContracts(mappedContracts)
    setSubscribedIds(new Set(mappedContracts.map(c => c.service_id)))

    // Fetch all active services with phase + costing items
    const { data: serviceData } = await supabase
      .from('services')
      .select('*, phase:phases(name), service_costing_items(*)')
      .eq('status', 'active')

    const mappedServices: ServiceWithPricing[] = (serviceData || []).map(s => {
      const { price, billingPeriod } = deriveDisplayPrice(s.service_costing_items || [])
      return { ...s, phase_name: s.phase?.name || '—', displayPrice: price, billingPeriod }
    })
    setAllServices(mappedServices)

    setLoading(false)
  }, [profile?.company_id])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredServices = phaseFilter === 'All'
    ? allServices
    : allServices.filter(s => s.phase_name === phaseFilter)

  if (loading) {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Services</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Your Services</h1>
        <div className="mt-6 animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-xl bg-slate-100" />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Services</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">Your Services</h1>

      <Tabs defaultValue="my-services" className="mt-6">
        <TabsList variant="line">
          <TabsTrigger value="my-services">My Services</TabsTrigger>
          <TabsTrigger value="all-services">All Services</TabsTrigger>
        </TabsList>

        <TabsContent value="my-services" className="mt-6">
          {contracts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              You haven&apos;t subscribed to any services yet. Switch to <strong>All Services</strong> to get started.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {contracts.map(c => (
                <CustomerServiceCard
                  key={c.id}
                  mode="my-service"
                  service={c.service}
                  contract={c}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all-services" className="mt-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex gap-2">
              {PHASE_FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setPhaseFilter(f)}
                  className={`rounded-full px-3 py-1 text-xs ${phaseFilter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <CartIndicator />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {filteredServices.map(s => (
              <CustomerServiceCard
                key={s.id}
                mode="catalog"
                service={s}
                displayPrice={s.displayPrice}
                billingPeriod={s.billingPeriod}
                isSubscribed={subscribedIds.has(s.id)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 2: Verify page renders**

Run: `npm run dev`
Navigate to `/portal/services` in browser.
Expected: Two tabs render. "My Services" shows empty state if no contracts. "All Services" shows active services with phase colors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(customer\)/portal/services/page.tsx
git commit -m "feat: implement customer services page with My Services and All Services tabs"
```

---

## Task 11: SLA Display Component

**Files:**
- Create: `src/components/services/sla-display.tsx`

- [ ] **Step 1: Create SLA display component**

```typescript
// src/components/services/sla-display.tsx
'use client'

import type { ServiceSla, SlaTemplate } from '@/lib/types'

interface SlaDisplayProps {
  serviceSla: ServiceSla & { sla_template: SlaTemplate }
}

export function SlaDisplay({ serviceSla }: SlaDisplayProps) {
  const t = serviceSla.sla_template
  const resolve = (field: keyof SlaTemplate) => {
    const overrideKey = `override_${field}` as keyof ServiceSla
    return (serviceSla[overrideKey] as string | string[] | null) ?? (t[field] as string | string[] | null) ?? '—'
  }

  const priorities = [
    { label: 'Critical', response: resolve('response_critical'), resolution: resolve('resolution_critical') },
    { label: 'High', response: resolve('response_high'), resolution: resolve('resolution_high') },
    { label: 'Medium', response: resolve('response_medium'), resolution: resolve('resolution_medium') },
    { label: 'Low', response: resolve('response_low'), resolution: resolve('resolution_low') },
  ]

  const supportChannels = resolve('support_channels')

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-6" style={{ borderRadius: '16px 0 16px 16px' }}>
      <h3 className="mb-4 text-[15px] font-semibold text-slate-900">SLA Terms</h3>

      <table className="mb-4 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-3 py-2 text-left font-medium text-slate-500">Priority</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500">Response Time</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500">Resolution Target</th>
          </tr>
        </thead>
        <tbody>
          {priorities.map(p => (
            <tr key={p.label} className="border-b border-slate-100">
              <td className="px-3 py-2 font-medium text-slate-900">{p.label}</td>
              <td className="px-3 py-2 text-slate-600">{p.response}</td>
              <td className="px-3 py-2 text-slate-600">{p.resolution}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-slate-400">Uptime Guarantee</div>
          <div className="font-medium text-slate-900">{resolve('uptime_guarantee')}</div>
        </div>
        <div>
          <div className="text-slate-400">Support Hours</div>
          <div className="font-medium text-slate-900">{resolve('support_hours')}</div>
        </div>
        <div>
          <div className="text-slate-400">Support Channels</div>
          <div className="font-medium text-slate-900">
            {Array.isArray(supportChannels) ? supportChannels.join(', ') : supportChannels}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/services/sla-display.tsx
git commit -m "feat: add SLA display component with template + override resolution"
```

---

## Task 12: Service Detail Page

**Files:**
- Create: `src/app/(customer)/portal/services/[id]/page.tsx`

- [ ] **Step 1: Create service detail page**

This is a large page — it fetches all service data and renders all 10 sections from the spec. See spec section "2. Service Detail Page" for the full layout.

```typescript
// src/app/(customer)/portal/services/[id]/page.tsx
'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/auth-context'
import { useCart } from '@/contexts/cart-context'
import { SlaDisplay } from '@/components/services/sla-display'
import { getPhaseColor } from '@/lib/phase-colors'
import { formatPrice, deriveDisplayPrice } from '@/lib/pricing'
import { Button } from '@/components/ui/button'
import type { Service, CustomerContract, ServiceSla, SlaTemplate, ServiceCostingItem, ServiceRunbookStep } from '@/lib/types'

interface ServiceDetail extends Service {
  phase_name: string
  phase?: { name: string }
  service_products: { notes: string | null; product: { name: string; vendor: string | null; category: string | null } }[]
  service_skills: { notes: string | null; skill: { name: string; category: string | null } }[]
  service_runbook_steps: ServiceRunbookStep[]
  service_costing_items: ServiceCostingItem[]
  service_academy_links: { is_required: boolean; course: { id: string; name: string; phase_id: string } }[]
  service_sla: (ServiceSla & { sla_template: SlaTemplate })[]
}

export default function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { profile } = useAuth()
  const { addItem, removeItem, isInCart } = useCart()
  const router = useRouter()
  const [service, setService] = useState<ServiceDetail | null>(null)
  const [contract, setContract] = useState<CustomerContract | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)

    const { data: svc } = await supabase
      .from('services')
      .select(`
        *,
        phase:phases(name),
        service_products(notes, product:products(name, vendor, category)),
        service_skills(notes, skill:skills(name, category)),
        service_runbook_steps(*),
        service_costing_items(*),
        service_academy_links(is_required, course:courses(id, name, phase_id)),
        service_sla(*, sla_template:sla_templates(*))
      `)
      .eq('id', id)
      .single()

    if (svc) {
      setService({ ...svc, phase_name: svc.phase?.name || '—' })
    }

    // Fetch contract if customer
    if (profile?.company_id) {
      const { data: contractData } = await supabase
        .from('customer_contracts')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('service_id', id)
        .in('status', ['active', 'paused', 'pending'])
        .maybeSingle()

      setContract(contractData)
    }

    setLoading(false)
  }, [id, profile?.company_id])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading || !service) {
    return <div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 rounded-xl bg-slate-100" />)}</div>
  }

  const phaseColor = getPhaseColor(service.phase_name)
  const { price: displayPrice, billingPeriod } = deriveDisplayPrice(service.service_costing_items || [])
  const inCart = isInCart(service.id)
  const isSubscribed = !!contract
  const sla = service.service_sla?.[0]

  const setupItems = (service.service_costing_items || []).filter(i => i.category === 'setup' && i.is_active)
  const maintenanceItems = (service.service_costing_items || []).filter(i => i.category === 'maintenance' && i.is_active)
  const runbookSteps = (service.service_runbook_steps || []).sort((a, b) => a.sort_order - b.sort_order)
  const totalMinutes = runbookSteps.reduce((sum, s) => sum + (s.estimated_minutes || 0), 0)

  return (
    <div className="mx-auto max-w-[900px]">
      {/* Breadcrumb */}
      <div className="mb-4 text-sm text-slate-400">
        <button onClick={() => router.push('/portal/services')} className="text-blue-500 hover:underline">Services</button>
        <span className="mx-1.5">/</span>
        {service.name}
      </div>

      {/* 1. Header */}
      <div className="mb-6 px-8 py-6 text-white" style={{ backgroundColor: phaseColor, borderRadius: '16px 0 16px 16px' }}>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider opacity-80">{service.phase_name}</div>
        <h1 className="mb-2 text-[22px] font-semibold">{service.name}</h1>
        <p className="text-sm leading-relaxed opacity-90">{service.long_description || service.description}</p>
      </div>

      {/* 2. Contract (if subscribed) */}
      {contract && (
        <div className="mb-4 border border-slate-200 bg-white p-6" style={{ borderRadius: '16px 0 16px 16px', borderLeft: '3px solid #16a34a' }}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-slate-900">Your Contract</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${contract.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}</span>
          </div>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div><div className="text-slate-400">Contracted Price</div><div className="text-base font-semibold text-slate-900">{formatPrice(contract.contracted_price, contract.billing_period)}</div></div>
            <div><div className="text-slate-400">Billing Period</div><div className="font-medium text-slate-900">{contract.billing_period === 'once' ? 'One-off' : contract.billing_period.charAt(0).toUpperCase() + contract.billing_period.slice(1)}</div></div>
            <div><div className="text-slate-400">Started</div><div className="font-medium text-slate-900">{contract.started_at ? new Date(contract.started_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</div></div>
            <div><div className="text-slate-400">Renewal Date</div><div className="font-medium text-slate-900">{contract.renewal_date ? new Date(contract.renewal_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</div></div>
          </div>
        </div>
      )}

      {/* 3. About */}
      {service.long_description && (
        <div className="mb-4 border border-slate-200 bg-white p-6" style={{ borderRadius: '16px 0 16px 16px' }}>
          <h3 className="mb-3 text-[15px] font-semibold text-slate-900">About this Service</h3>
          <p className="text-sm leading-relaxed text-slate-600">{service.long_description}</p>
        </div>
      )}

      {/* 4. SLA */}
      {sla && <div className="mb-4"><SlaDisplay serviceSla={sla} /></div>}

      {/* 5. Products */}
      {service.service_products.length > 0 && (
        <div className="mb-4 border border-slate-200 bg-white p-6" style={{ borderRadius: '16px 0 16px 16px' }}>
          <h3 className="mb-3 text-[15px] font-semibold text-slate-900">Products & Tools</h3>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 bg-slate-50"><th className="px-3 py-2 text-left font-medium text-slate-500">Product</th><th className="px-3 py-2 text-left font-medium text-slate-500">Vendor</th><th className="px-3 py-2 text-left font-medium text-slate-500">Category</th><th className="px-3 py-2 text-left font-medium text-slate-500">Notes</th></tr></thead>
            <tbody>{service.service_products.map((sp, i) => (
              <tr key={i} className="border-b border-slate-100"><td className="px-3 py-2 font-medium text-slate-900">{sp.product.name}</td><td className="px-3 py-2 text-slate-600">{sp.product.vendor || '—'}</td><td className="px-3 py-2 text-slate-600">{sp.product.category || '—'}</td><td className="px-3 py-2 text-slate-500">{sp.notes || '—'}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {/* 6. Skills */}
      {service.service_skills.length > 0 && (
        <div className="mb-4 border border-slate-200 bg-white p-6" style={{ borderRadius: '16px 0 16px 16px' }}>
          <h3 className="mb-3 text-[15px] font-semibold text-slate-900">Skills & Expertise</h3>
          <div className="flex flex-wrap gap-2">
            {service.service_skills.map((ss, i) => (
              <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{ss.skill.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* 7. Runbook */}
      {runbookSteps.length > 0 && (
        <div className="mb-4 border border-slate-200 bg-white p-6" style={{ borderRadius: '16px 0 16px 16px' }}>
          <h3 className="mb-3 text-[15px] font-semibold text-slate-900">Delivery Runbook</h3>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 bg-slate-50"><th className="w-8 px-3 py-2 text-left font-medium text-slate-500">#</th><th className="px-3 py-2 text-left font-medium text-slate-500">Step</th><th className="px-3 py-2 text-left font-medium text-slate-500">Role</th><th className="px-3 py-2 text-right font-medium text-slate-500">Est. Time</th></tr></thead>
            <tbody>{runbookSteps.map((step, i) => (
              <tr key={step.id} className="border-b border-slate-100"><td className="px-3 py-2 text-slate-400">{i + 1}</td><td className="px-3 py-2 font-medium text-slate-900">{step.title}</td><td className="px-3 py-2 text-slate-600">{step.role || '—'}</td><td className="px-3 py-2 text-right text-slate-600">{step.estimated_minutes ? `${step.estimated_minutes} min` : '—'}</td></tr>
            ))}</tbody>
            <tfoot><tr><td colSpan={3} className="px-3 pt-3 font-semibold text-slate-900">Total estimated time</td><td className="px-3 pt-3 text-right font-semibold text-slate-900">{(totalMinutes / 60).toFixed(1)} hrs</td></tr></tfoot>
          </table>
        </div>
      )}

      {/* 8. Costing */}
      {(setupItems.length > 0 || maintenanceItems.length > 0) && (
        <div className="mb-4 border border-slate-200 bg-white p-6" style={{ borderRadius: '16px 0 16px 16px' }}>
          <h3 className="mb-3 text-[15px] font-semibold text-slate-900">Costing Breakdown</h3>
          {setupItems.length > 0 && (
            <>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Setup Costs</div>
              <table className="mb-5 w-full text-sm">
                <thead><tr className="border-b border-slate-200 bg-slate-50"><th className="px-3 py-2 text-left font-medium text-slate-500">Item</th><th className="px-3 py-2 text-left font-medium text-slate-500">Type</th><th className="px-3 py-2 text-right font-medium text-slate-500">Cost</th></tr></thead>
                <tbody>{setupItems.map(item => (
                  <tr key={item.id} className="border-b border-slate-100"><td className="px-3 py-2 text-slate-900">{item.name}</td><td className="px-3 py-2 text-slate-600">{item.pricing_type === 'tiered' ? 'Tiered' : 'Fixed'}</td><td className="px-3 py-2 text-right font-medium text-slate-900">{item.base_cost ? `R ${new Intl.NumberFormat('en-ZA').format(parseFloat(item.base_cost))}` : '—'}</td></tr>
                ))}</tbody>
              </table>
            </>
          )}
          {maintenanceItems.length > 0 && (
            <>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Monthly Maintenance</div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-200 bg-slate-50"><th className="px-3 py-2 text-left font-medium text-slate-500">Item</th><th className="px-3 py-2 text-left font-medium text-slate-500">Type</th><th className="px-3 py-2 text-right font-medium text-slate-500">Cost</th></tr></thead>
                <tbody>{maintenanceItems.map(item => (
                  <tr key={item.id} className="border-b border-slate-100"><td className="px-3 py-2 text-slate-900">{item.name}</td><td className="px-3 py-2 text-slate-600">{item.pricing_type === 'tiered' ? 'Tiered' : 'Fixed'}</td><td className="px-3 py-2 text-right font-medium text-slate-900">{item.base_cost ? `R ${new Intl.NumberFormat('en-ZA').format(parseFloat(item.base_cost))}` : '—'}</td></tr>
                ))}</tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* 9. Academy Courses */}
      {service.service_academy_links.length > 0 && (
        <div className="mb-4 border border-slate-200 bg-white p-6" style={{ borderRadius: '16px 0 16px 16px' }}>
          <h3 className="mb-3 text-[15px] font-semibold text-slate-900">Related Academy Courses</h3>
          <div className="flex flex-col gap-2.5">
            {service.service_academy_links.map((link, i) => (
              <div key={i} className="flex items-center justify-between border-b border-slate-100 py-2.5 last:border-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: phaseColor }} />
                  <span className="text-sm font-medium text-slate-900">{link.course.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${link.is_required ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>{link.is_required ? 'Required' : 'Optional'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 10. Action buttons */}
      <div className="mt-2 flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push('/portal/services')}>← Back to Services</Button>
        {isSubscribed ? (
          <span className="flex items-center rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-800">Subscribed</span>
        ) : inCart ? (
          <Button variant="outline" className="border-red-200 text-red-600" onClick={() => removeItem(service.id)}>Remove from Cart</Button>
        ) : (
          <Button onClick={() => { addItem({ service_id: service.id, name: service.name, phase_name: service.phase_name, phase_color: phaseColor, price: displayPrice, billing_period: billingPeriod }); }}>Add to Cart</Button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify page renders**

Run: `npm run dev`
Navigate to `/portal/services/[any-service-id]` in browser.
Expected: Full detail page renders with all sections.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(customer\)/portal/services/\[id\]/page.tsx
git commit -m "feat: implement service detail page with all admin sections visible"
```

---

## Task 13: Cart Page

**Files:**
- Create: `src/app/(customer)/portal/cart/page.tsx`

- [ ] **Step 1: Create cart page**

```typescript
// src/app/(customer)/portal/cart/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useCart } from '@/contexts/cart-context'
import { formatPrice } from '@/lib/pricing'
import { Button } from '@/components/ui/button'

export default function CartPage() {
  const { items, removeItem, subtotal, itemCount } = useCart()
  const router = useRouter()

  const formatted = new Intl.NumberFormat('en-ZA').format(subtotal)

  return (
    <div className="mx-auto max-w-[900px]">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Services</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">Your Cart</h1>

      {itemCount === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Your cart is empty. <button onClick={() => router.push('/portal/services')} className="font-medium text-blue-500 hover:underline">Browse All Services</button> to find what you need.
        </div>
      ) : (
        <div className="mt-6">
          {/* Item list */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white" style={{ borderRadius: '16px 0 16px 16px' }}>
            {items.map((item, i) => (
              <div key={item.service_id} className={`flex items-center justify-between px-5 py-4 ${i < items.length - 1 ? 'border-b border-slate-100' : ''}`}>
                <div>
                  <div className="text-[11px] uppercase text-slate-400">{item.phase_name}</div>
                  <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-900">{formatPrice(item.price, item.billing_period)}</div>
                    <div className="text-[11px] text-slate-400">{item.billing_period === 'once' ? 'One-off' : `${item.billing_period.charAt(0).toUpperCase() + item.billing_period.slice(1)} billing`}</div>
                  </div>
                  <button onClick={() => removeItem(item.service_id)} className="text-lg text-slate-400 hover:text-slate-600">×</button>
                </div>
              </div>
            ))}
          </div>

          {/* Order summary */}
          <div className="ml-auto mt-5 max-w-[360px] rounded-xl border border-slate-200 bg-white p-5" style={{ borderRadius: '16px 0 16px 16px' }}>
            <div className="mb-3 text-sm font-semibold text-slate-900">Order Summary</div>
            {items.map(item => (
              <div key={item.service_id} className="mb-1.5 flex justify-between text-sm">
                <span className="text-slate-500">{item.name}</span>
                <span className="text-slate-900">R {new Intl.NumberFormat('en-ZA').format(item.price)}</span>
              </div>
            ))}
            <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-[15px] font-semibold text-slate-900">
              <span>Total</span>
              <span>R {formatted}</span>
            </div>
            <div className="mt-1 text-right text-[11px] text-slate-400">excl. VAT</div>
            <Button className="mt-4 w-full" onClick={() => router.push('/portal/checkout')}>Proceed to Checkout</Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(customer\)/portal/cart/page.tsx
git commit -m "feat: implement cart page with order summary"
```

---

## Task 14: PayFast Utility

**Files:**
- Create: `src/lib/payfast.ts`

- [ ] **Step 1: Create PayFast utility**

```typescript
// src/lib/payfast.ts
import crypto from 'crypto'

const PAYFAST_SANDBOX_URL = 'https://sandbox.payfast.co.za/eng/process'
const PAYFAST_LIVE_URL = 'https://www.payfast.co.za/eng/process'

interface PayFastData {
  merchant_id: string
  merchant_key: string
  return_url: string
  cancel_url: string
  notify_url: string
  m_payment_id: string
  amount: string
  item_name: string
  email_address?: string
}

export function generatePayFastSignature(data: Record<string, string>, passphrase: string): string {
  const params = Object.entries(data)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v.trim()).replace(/%20/g, '+')}`)
    .join('&')

  const withPassphrase = `${params}&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`
  return crypto.createHash('md5').update(withPassphrase).digest('hex')
}

export function buildPayFastFormData(options: {
  orderId: string
  total: number
  itemName: string
  billingEmail?: string
  baseUrl: string
}): { url: string; data: Record<string, string> } {
  const merchantId = process.env.PAYFAST_MERCHANT_ID!
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY!
  const passphrase = process.env.PAYFAST_PASSPHRASE!
  const isSandbox = process.env.PAYFAST_SANDBOX === 'true'

  const data: Record<string, string> = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: `${options.baseUrl}/portal/checkout/success?order_id=${options.orderId}`,
    cancel_url: `${options.baseUrl}/portal/checkout/cancel`,
    notify_url: `${options.baseUrl}/api/services/payfast-itn`,
    m_payment_id: options.orderId,
    amount: options.total.toFixed(2),
    item_name: options.itemName,
  }

  if (options.billingEmail) {
    data.email_address = options.billingEmail
  }

  data.signature = generatePayFastSignature(data, passphrase)

  return {
    url: isSandbox ? PAYFAST_SANDBOX_URL : PAYFAST_LIVE_URL,
    data,
  }
}

export function validatePayFastSignature(postData: Record<string, string>, passphrase: string): boolean {
  const receivedSignature = postData.signature
  const dataWithoutSignature = { ...postData }
  delete dataWithoutSignature.signature

  const calculated = generatePayFastSignature(dataWithoutSignature, passphrase)
  return calculated === receivedSignature
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/payfast.ts
git commit -m "feat: add PayFast signature generation and validation utility"
```

---

## Task 15: Checkout API Route

**Files:**
- Create: `src/app/api/services/checkout/route.ts`

- [ ] **Step 1: Create checkout route**

```typescript
// src/app/api/services/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { buildPayFastFormData } from '@/lib/payfast'
import { createClient } from '@supabase/supabase-js'

interface CheckoutItem {
  service_id: string
  price: number
  billing_period: string
}

export async function POST(req: NextRequest) {
  try {
    // Validate user session
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const supabaseAuth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get profile to verify company_id
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, company_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await req.json()
    const { items, billing_email, po_number, notes } = body as {
      items: CheckoutItem[]
      billing_email: string
      po_number?: string
      notes?: string
    }

    const profile_id = profile.id
    const company_id = profile.company_id

    if (!items?.length) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    const subtotal = items.reduce((sum, i) => sum + i.price, 0)
    const vatAmount = Math.round(subtotal * 0.15 * 100) / 100
    const total = Math.round((subtotal + vatAmount) * 100) / 100

    // Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        company_id,
        profile_id,
        status: 'pending',
        subtotal,
        vat_amount: vatAmount,
        total,
        billing_email,
        po_number: po_number || null,
        notes: notes || null,
      })
      .select()
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // Create order items
    const orderItems = items.map(i => ({
      order_id: order.id,
      service_id: i.service_id,
      price: i.price,
      billing_period: i.billing_period,
    }))

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 })
    }

    // Generate PayFast form data
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
    const itemName = items.length === 1 ? 'IThealth Service' : `IThealth Services (${items.length})`

    const payfast = buildPayFastFormData({
      orderId: order.id,
      total,
      itemName,
      billingEmail: billing_email,
      baseUrl,
    })

    return NextResponse.json({
      order_id: order.id,
      order_number: order.order_number,
      payfast_url: payfast.url,
      payfast_data: payfast.data,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/services/checkout/route.ts
git commit -m "feat: add checkout API route for order creation and PayFast redirect"
```

---

## Task 16: PayFast ITN Webhook

**Files:**
- Create: `src/app/api/services/payfast-itn/route.ts`

- [ ] **Step 1: Create ITN webhook handler**

```typescript
// src/app/api/services/payfast-itn/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { validatePayFastSignature } from '@/lib/payfast'

// PayFast valid IP ranges (sandbox + production)
const PAYFAST_IPS = [
  '197.97.145.144/28',
  '41.74.179.192/27',
  '197.110.64.128/27',
  // Sandbox
  '197.97.145.144/28',
]

function isPayFastIP(ip: string): boolean {
  // In sandbox mode, skip IP check
  if (process.env.PAYFAST_SANDBOX === 'true') return true
  // Simple check — in production, use a proper CIDR matching library
  return PAYFAST_IPS.some(range => ip.startsWith(range.split('/')[0].split('.').slice(0, 3).join('.')))
}

function calculateRenewalDate(startedAt: string, billingPeriod: string): string | null {
  const date = new Date(startedAt)
  switch (billingPeriod) {
    case 'monthly': date.setMonth(date.getMonth() + 1); return date.toISOString()
    case 'quarterly': date.setMonth(date.getMonth() + 3); return date.toISOString()
    case 'annually': date.setFullYear(date.getFullYear() + 1); return date.toISOString()
    default: return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const postData: Record<string, string> = {}
    formData.forEach((value, key) => { postData[key] = value.toString() })

    // Validate source IP
    const forwardedFor = req.headers.get('x-forwarded-for')
    const sourceIP = forwardedFor?.split(',')[0]?.trim() || '0.0.0.0'
    if (!isPayFastIP(sourceIP)) {
      console.error('PayFast ITN: invalid source IP', sourceIP)
      return NextResponse.json({ error: 'Invalid source' }, { status: 403 })
    }

    // Validate signature
    const passphrase = process.env.PAYFAST_PASSPHRASE!
    if (!validatePayFastSignature(postData, passphrase)) {
      console.error('PayFast ITN: invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    const orderId = postData.m_payment_id
    const paymentStatus = postData.payment_status

    // Fetch order to prevent double-processing
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (!order || order.status === 'paid') {
      return NextResponse.json({ ok: true })
    }

    // Verify amount matches
    const receivedAmount = parseFloat(postData.amount_gross)
    if (Math.abs(receivedAmount - order.total) > 0.01) {
      console.error('PayFast ITN: amount mismatch', { expected: order.total, received: receivedAmount })
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
    }

    if (paymentStatus === 'COMPLETE') {
      const now = new Date().toISOString()

      // Update order
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'paid',
          payfast_payment_id: postData.pf_payment_id,
          payfast_status: paymentStatus,
          paid_at: now,
        })
        .eq('id', orderId)

      // Fetch order items
      const { data: orderItems } = await supabaseAdmin
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)

      // Create customer contracts
      if (orderItems) {
        const contracts = orderItems.map(item => ({
          company_id: order.company_id,
          service_id: item.service_id,
          order_item_id: item.id,
          status: 'active',
          contracted_price: item.price,
          billing_period: item.billing_period,
          started_at: now,
          renewal_date: calculateRenewalDate(now, item.billing_period),
          payment_status: 'paid',
        }))

        await supabaseAdmin.from('customer_contracts').insert(contracts)
      }
    } else if (paymentStatus === 'CANCELLED') {
      await supabaseAdmin
        .from('orders')
        .update({ status: 'cancelled', payfast_status: paymentStatus })
        .eq('id', orderId)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PayFast ITN error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/services/payfast-itn/route.ts
git commit -m "feat: add PayFast ITN webhook for payment confirmation and contract creation"
```

---

## Task 17: Checkout Page

**Files:**
- Create: `src/app/(customer)/portal/checkout/page.tsx`

- [ ] **Step 1: Create checkout page**

```typescript
// src/app/(customer)/portal/checkout/page.tsx
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useCart } from '@/contexts/cart-context'
import { supabase } from '@/lib/supabase-client'
import { formatPrice } from '@/lib/pricing'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function CheckoutPage() {
  const { profile } = useAuth()
  const { items, subtotal, clearCart } = useCart()
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  const [billingEmail, setBillingEmail] = useState(profile?.email || '')
  const [poNumber, setPoNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [payfastUrl, setPayfastUrl] = useState('')
  const [payfastData, setPayfastData] = useState<Record<string, string>>({})

  const vatAmount = Math.round(subtotal * 0.15 * 100) / 100
  const total = Math.round((subtotal + vatAmount) * 100) / 100

  if (items.length === 0) {
    router.push('/portal/cart')
    return null
  }

  const handleCheckout = async () => {
    if (!billingEmail) { toast.error('Billing email is required'); return }
    setSubmitting(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch('/api/services/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          items: items.map(i => ({ service_id: i.service_id, price: i.price, billing_period: i.billing_period })),
          billing_email: billingEmail,
          po_number: poNumber || undefined,
          notes: notes || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Checkout failed'); setSubmitting(false); return }

      // Set PayFast form data and auto-submit
      setPayfastUrl(data.payfast_url)
      setPayfastData(data.payfast_data)
      clearCart()

      // Auto-submit after state update
      setTimeout(() => formRef.current?.submit(), 100)
    } catch {
      toast.error('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-[900px]">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Services</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">Checkout</h1>

      <div className="mt-6 grid grid-cols-[1fr_360px] gap-6">
        {/* Billing details */}
        <div className="rounded-xl border border-slate-200 bg-white p-6" style={{ borderRadius: '16px 0 16px 16px' }}>
          <h3 className="mb-4 text-base font-semibold text-slate-900">Billing Details</h3>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Company</label>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">{profile?.company?.name || '—'}</div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Billing Contact Email</label>
              <input type="email" value={billingEmail} onChange={e => setBillingEmail(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Purchase Order Number (optional)</label>
              <input type="text" value={poNumber} onChange={e => setPoNumber(e.target.value)} placeholder="PO-2026-001" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Notes (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special requirements..." rows={3} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500" />
            </div>
          </div>
          <div className="mt-5 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
            You&apos;ll be redirected to <strong>PayFast</strong> to complete payment securely.
          </div>
        </div>

        {/* Order summary */}
        <div className="h-fit rounded-xl border border-slate-200 bg-white p-6" style={{ borderRadius: '16px 0 16px 16px' }}>
          <div className="mb-4 text-sm font-semibold text-slate-900">Order Summary</div>
          <div className="mb-4 flex flex-col gap-3">
            {items.map(item => (
              <div key={item.service_id} className="flex justify-between text-sm">
                <div><div className="font-medium text-slate-900">{item.name}</div><div className="text-[11px] text-slate-400">{item.billing_period === 'once' ? 'One-off' : item.billing_period.charAt(0).toUpperCase() + item.billing_period.slice(1)}</div></div>
                <span className="font-medium text-slate-900">R {new Intl.NumberFormat('en-ZA').format(item.price)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-200 pt-3">
            <div className="mb-1 flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span>R {new Intl.NumberFormat('en-ZA').format(subtotal)}</span></div>
            <div className="mb-2 flex justify-between text-sm"><span className="text-slate-500">VAT (15%)</span><span>R {new Intl.NumberFormat('en-ZA').format(vatAmount)}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900"><span>Total</span><span>R {new Intl.NumberFormat('en-ZA').format(total)}</span></div>
          </div>
          <Button className="mt-4 w-full bg-green-600 hover:bg-green-700" onClick={handleCheckout} disabled={submitting}>
            {submitting ? 'Processing...' : 'Pay with PayFast'}
          </Button>
          <div className="mt-2 text-center text-[11px] text-slate-400">Secure payment powered by PayFast</div>
        </div>
      </div>

      {/* Hidden PayFast form for redirect */}
      {payfastUrl && (
        <form ref={formRef} action={payfastUrl} method="POST" className="hidden">
          {Object.entries(payfastData).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        </form>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(customer\)/portal/checkout/page.tsx
git commit -m "feat: implement checkout page with PayFast payment redirect"
```

---

## Task 18: Post-Payment Pages

**Files:**
- Create: `src/app/(customer)/portal/checkout/success/page.tsx`
- Create: `src/app/(customer)/portal/checkout/cancel/page.tsx`

- [ ] **Step 1: Create success page**

```typescript
// src/app/(customer)/portal/checkout/success/page.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckmarkFilled } from '@carbon/icons-react'

export default function CheckoutSuccessPage() {
  const router = useRouter()
  const params = useSearchParams()
  const orderId = params.get('order_id')

  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="mt-16 mb-6 flex justify-center">
        <CheckmarkFilled size={48} className="text-green-600" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Payment Successful!</h1>
      <p className="mt-2 text-sm text-slate-500">Your services are now active. You can view them in your services dashboard.</p>
      {orderId && <p className="mt-1 text-xs text-slate-400">Order reference: {orderId}</p>}
      <div className="mt-8 flex justify-center gap-3">
        <Button onClick={() => router.push('/portal/services')}>View My Services</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create cancel page**

```typescript
// src/app/(customer)/portal/checkout/cancel/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { WarningAlt } from '@carbon/icons-react'

export default function CheckoutCancelPage() {
  const router = useRouter()

  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="mt-16 mb-6 flex justify-center">
        <WarningAlt size={48} className="text-amber-500" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Payment Cancelled</h1>
      <p className="mt-2 text-sm text-slate-500">Your payment was not completed. No charges were made.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Button variant="outline" onClick={() => router.push('/portal/services')}>Back to Services</Button>
        <Button onClick={() => router.push('/portal/cart')}>Return to Cart</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(customer\)/portal/checkout/success/page.tsx src/app/\(customer\)/portal/checkout/cancel/page.tsx
git commit -m "feat: add checkout success and cancel pages"
```

---

## Task 19: Admin SLA Templates Page

**Files:**
- Create: `src/app/(admin)/settings/sla-templates/page.tsx`

- [ ] **Step 1: Create SLA templates CRUD page**

Follow the existing admin page pattern from `src/app/(admin)/services/page.tsx`. This page should:
- Fetch all `sla_templates` from Supabase
- Render a table with columns: Name, Description, Support Hours, Active (badge), Actions (Edit/Delete)
- "Add Template" button opens an inline form or dialog
- Edit opens the same form pre-filled
- Delete with confirmation dialog
- Form fields: name, description, response_critical/high/medium/low, resolution_critical/high/medium/low, uptime_guarantee, support_hours, support_channels (comma-separated input), is_active toggle
- Toast notifications on success/error
- Pattern: match `src/app/(admin)/services/page.tsx` for table layout and CRUD handlers

Full implementation follows the same pattern as the services list page — state for items, loading, editing item, dialog open state, fetch on mount, insert/update/delete handlers with Supabase client, table rendering with action buttons.

- [ ] **Step 2: Verify page renders**

Run: `npm run dev`
Navigate to `/settings/sla-templates`.
Expected: Table renders, CRUD operations work.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(admin\)/settings/sla-templates/page.tsx
git commit -m "feat: add admin SLA templates management page"
```

---

## Task 20: Admin Service Editor — SLA Tab

**Files:**
- Create: `src/components/services/sla-tab.tsx`
- Modify: `src/app/(admin)/services/[id]/edit/page.tsx`

- [ ] **Step 1: Create SLA tab component**

Follow the pattern from `src/components/services/description-tab.tsx`. The SLA tab should:
- Fetch `service_sla` for the current service (with joined `sla_template`)
- Fetch all active `sla_templates` for the dropdown
- Show a Select dropdown to pick a template
- Below the dropdown, show all SLA fields (response times, resolution times, uptime, hours, channels)
- Each field shows the template value as placeholder + an optional override input
- "Reset to template" button per field clears the override
- Visual indicator (e.g., dot or border) on fields that have overrides
- Save button persists to `service_sla` table (upsert on service_id)
- Toast notifications

- [ ] **Step 2: Add SLA tab to service editor**

Modify `src/app/(admin)/services/[id]/edit/page.tsx`:
- Import `SlaTab` component
- Add new `TabsTrigger` with value `"sla"` and label `"SLA"`, disabled if `!serviceId`
- Add new `TabsContent` with `SlaTab` component, passing `serviceId`

- [ ] **Step 3: Verify tab renders**

Run: `npm run dev`
Navigate to `/services/[any-id]/edit`, click "SLA" tab.
Expected: Template dropdown shows, override fields render.

- [ ] **Step 4: Commit**

```bash
git add src/components/services/sla-tab.tsx src/app/\(admin\)/services/\[id\]/edit/page.tsx
git commit -m "feat: add SLA tab to admin service editor with template selection and overrides"
```

---

## Task 21: Menu Registration

**Files:**
- Create: `supabase/migrations/20260407400007_menu_customer_services.sql`

- [ ] **Step 1: Add menu items for customer portal services and cart**

```sql
-- supabase/migrations/20260407400007_menu_customer_services.sql

-- Add SLA Templates under Settings for admin
INSERT INTO public.menu_items (parent_id, label, icon, route, sort_order, level, is_active)
SELECT id, 'SLA Templates', NULL, '/settings/sla-templates', 40, 3, true
FROM public.menu_items WHERE label = 'Settings' AND level = 1
ON CONFLICT DO NOTHING;

-- Grant admin access to SLA Templates menu item
INSERT INTO public.role_menu_access (role, menu_item_id)
SELECT 'admin', id FROM public.menu_items WHERE route = '/settings/sla-templates'
ON CONFLICT DO NOTHING;

-- Add Cart to customer portal menu (if not present)
INSERT INTO public.menu_items (parent_id, label, icon, route, sort_order, level, is_active)
SELECT id, 'Cart', 'ShoppingCart', '/portal/cart', 25, 2, true
FROM public.menu_items WHERE route = '/portal/services' AND level = 2
ON CONFLICT DO NOTHING;

-- Grant customer access to Cart menu item
INSERT INTO public.role_menu_access (role, menu_item_id)
SELECT 'customer', id FROM public.menu_items WHERE route = '/portal/cart'
ON CONFLICT DO NOTHING;
```

- [ ] **Step 2: Apply migration**

Run: `npx supabase db push`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260407400007_menu_customer_services.sql
git commit -m "feat: add SLA Templates menu item for admin"
```

---

## Task 22: End-to-End Smoke Test

- [ ] **Step 1: Reset database and verify**

Run: `npx supabase db reset`
Expected: All migrations apply cleanly.

- [ ] **Step 2: Verify admin flow**

1. Log in as admin
2. Navigate to `/settings/sla-templates` — create a "Gold SLA" template
3. Navigate to `/services` — edit a service, go to "SLA" tab, select the Gold template
4. Verify SLA saves correctly

- [ ] **Step 3: Verify customer flow**

1. Log in as customer
2. Navigate to `/portal/services` — verify two tabs render
3. "All Services" tab shows active services with phase colors and pricing
4. Click "Add to Cart" on a service — cart indicator appears
5. Click "View details →" — service detail page shows all sections including SLA
6. Navigate to `/portal/cart` — items listed with order summary
7. Click "Proceed to Checkout" — checkout page renders with billing form
8. (PayFast redirect requires sandbox credentials configured)

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: end-to-end smoke test fixes"
```
