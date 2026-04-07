# Meta Ads Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Meta Ads feature under Admin Growth with campaign/ad set/ad drill-down tables, side-by-side ad comparison, and Meta integration settings under Admin Settings.

**Architecture:** Hybrid data approach — synced Meta data in Supabase tables for fast table views, live Meta API calls through Next.js Route Handlers for ad detail/comparison views. OAuth flow + encrypted token storage for Meta integration. pg_cron + pg_net for scheduled sync.

**Tech Stack:** Next.js App Router, TypeScript, Supabase (Postgres, RLS), Meta Marketing API v21.0, Node.js crypto (AES-256-GCM), Carbon icons, shadcn/ui, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-04-07-meta-ads-feature-design.md`

---

## File Structure

```
src/
  lib/
    encryption.ts                          # AES-256-GCM encrypt/decrypt utility
    ads-benchmarks.ts                      # Benchmark thresholds + getBenchmarkColor()
    meta-api.ts                            # Meta Marketing API v21.0 client wrapper
    types.ts                               # (modify) Add Meta Ads types
    icon-map.ts                            # (modify) Add 'campaign', 'connect', 'logo--facebook' icons
  app/api/admin/ads/
    integration/route.ts                   # GET/POST/DELETE integration config
    auth/meta/route.ts                     # OAuth redirect to Meta
    auth/meta/callback/route.ts            # OAuth callback — exchange code for token
    meta/ad-accounts/route.ts              # GET live ad accounts from Meta
    meta/campaigns/route.ts                # GET live campaigns for filter picker
    meta/ads/[adId]/route.ts               # GET live ad detail
    meta/ads/compare/route.ts              # GET live multi-ad comparison
    sync/route.ts                          # POST trigger sync
    sync/status/route.ts                   # GET sync status
  app/(admin)/
    growth/ads/
      page.tsx                             # Campaigns table
      [campaignId]/
        page.tsx                           # Ad Sets table
        [adSetId]/
          page.tsx                         # Ads card grid
    growth/ads/compare/
      page.tsx                             # Side-by-side comparison
    settings/integrations/
      page.tsx                             # Integrations list
      meta/
        page.tsx                           # Meta settings page
supabase/migrations/
  20260407000001_create_meta_integrations.sql
  20260407000002_create_meta_campaigns.sql
  20260407000003_create_meta_ad_sets.sql
  20260407000004_create_meta_ads.sql
  20260407000005_meta_ads_rls.sql
  20260407000006_seed_ads_menu_items.sql
  20260407000007_meta_ads_pg_cron.sql
```

---

### Task 1: Database Migrations — Tables

**Files:**
- Create: `supabase/migrations/20260407000001_create_meta_integrations.sql`
- Create: `supabase/migrations/20260407000002_create_meta_campaigns.sql`
- Create: `supabase/migrations/20260407000003_create_meta_ad_sets.sql`
- Create: `supabase/migrations/20260407000004_create_meta_ads.sql`

- [ ] **Step 1: Create meta_integrations migration**

```sql
-- supabase/migrations/20260407000001_create_meta_integrations.sql
CREATE TABLE public.meta_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  meta_app_id text,
  meta_app_secret_encrypted text,
  access_token_encrypted text,
  ad_account_id text,
  ad_account_name text,
  sync_frequency text NOT NULL DEFAULT '1hour',
  campaign_filter jsonb,
  last_synced_at timestamptz,
  sync_status text NOT NULL DEFAULT 'idle',
  sync_error text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meta_integrations_company_unique UNIQUE (company_id),
  CONSTRAINT meta_integrations_sync_frequency_check CHECK (sync_frequency IN ('15min', '30min', '1hour', '6hour', '24hour')),
  CONSTRAINT meta_integrations_sync_status_check CHECK (sync_status IN ('idle', 'syncing', 'error'))
);

ALTER TABLE public.meta_integrations ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_meta_integrations_company_id ON public.meta_integrations(company_id);

CREATE TRIGGER meta_integrations_updated_at
  BEFORE UPDATE ON public.meta_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 2: Create meta_campaigns migration**

```sql
-- supabase/migrations/20260407000002_create_meta_campaigns.sql
CREATE TABLE public.meta_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.meta_integrations(id) ON DELETE CASCADE,
  meta_campaign_id text NOT NULL,
  name text NOT NULL,
  status text,
  objective text,
  daily_budget numeric,
  lifetime_budget numeric,
  spend numeric NOT NULL DEFAULT 0,
  impressions bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  ctr numeric,
  cpm numeric,
  cpa numeric,
  conversions bigint NOT NULL DEFAULT 0,
  start_time timestamptz,
  stop_time timestamptz,
  synced_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meta_campaigns_unique UNIQUE (integration_id, meta_campaign_id)
);

ALTER TABLE public.meta_campaigns ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_meta_campaigns_integration_id ON public.meta_campaigns(integration_id);
CREATE INDEX idx_meta_campaigns_status ON public.meta_campaigns(status);
```

- [ ] **Step 3: Create meta_ad_sets migration**

```sql
-- supabase/migrations/20260407000003_create_meta_ad_sets.sql
CREATE TABLE public.meta_ad_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.meta_campaigns(id) ON DELETE CASCADE,
  meta_ad_set_id text NOT NULL,
  name text NOT NULL,
  status text,
  targeting jsonb,
  daily_budget numeric,
  lifetime_budget numeric,
  spend numeric NOT NULL DEFAULT 0,
  impressions bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  ctr numeric,
  cpm numeric,
  cpa numeric,
  conversions bigint NOT NULL DEFAULT 0,
  synced_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meta_ad_sets_unique UNIQUE (campaign_id, meta_ad_set_id)
);

ALTER TABLE public.meta_ad_sets ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_meta_ad_sets_campaign_id ON public.meta_ad_sets(campaign_id);
CREATE INDEX idx_meta_ad_sets_status ON public.meta_ad_sets(status);
```

- [ ] **Step 4: Create meta_ads migration**

```sql
-- supabase/migrations/20260407000004_create_meta_ads.sql
CREATE TABLE public.meta_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_set_id uuid NOT NULL REFERENCES public.meta_ad_sets(id) ON DELETE CASCADE,
  meta_ad_id text NOT NULL,
  name text NOT NULL,
  status text,
  creative_id text,
  creative_thumbnail_url text,
  creative_body text,
  creative_title text,
  creative_link_url text,
  hook_rate numeric,
  ctr numeric,
  cpm numeric,
  cpa numeric,
  spend numeric NOT NULL DEFAULT 0,
  impressions bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  conversions bigint NOT NULL DEFAULT 0,
  emq_score numeric,
  synced_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meta_ads_unique UNIQUE (ad_set_id, meta_ad_id)
);

ALTER TABLE public.meta_ads ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_meta_ads_ad_set_id ON public.meta_ads(ad_set_id);
CREATE INDEX idx_meta_ads_status ON public.meta_ads(status);
```

- [ ] **Step 5: Run migrations and verify**

Run: `npx supabase db push`
Expected: All 4 tables created successfully.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260407000001_create_meta_integrations.sql \
        supabase/migrations/20260407000002_create_meta_campaigns.sql \
        supabase/migrations/20260407000003_create_meta_ad_sets.sql \
        supabase/migrations/20260407000004_create_meta_ads.sql
git commit -m "feat(db): create meta_integrations, meta_campaigns, meta_ad_sets, meta_ads tables"
```

---

### Task 2: Database Migrations — RLS, Menu Seed, pg_cron

**Files:**
- Create: `supabase/migrations/20260407000005_meta_ads_rls.sql`
- Create: `supabase/migrations/20260407000006_seed_ads_menu_items.sql`
- Create: `supabase/migrations/20260407000007_meta_ads_pg_cron.sql`

- [ ] **Step 1: Create RLS policies**

```sql
-- supabase/migrations/20260407000005_meta_ads_rls.sql

-- meta_integrations: admin-only
CREATE POLICY "Admins can do everything with meta_integrations"
  ON public.meta_integrations FOR ALL
  USING (public.get_my_role() = 'admin');

-- meta_campaigns: admin-only
CREATE POLICY "Admins can do everything with meta_campaigns"
  ON public.meta_campaigns FOR ALL
  USING (public.get_my_role() = 'admin');

-- meta_ad_sets: admin-only
CREATE POLICY "Admins can do everything with meta_ad_sets"
  ON public.meta_ad_sets FOR ALL
  USING (public.get_my_role() = 'admin');

-- meta_ads: admin-only
CREATE POLICY "Admins can do everything with meta_ads"
  ON public.meta_ads FOR ALL
  USING (public.get_my_role() = 'admin');
```

- [ ] **Step 2: Create menu seed migration**

Uses UUID scheme: `20000000-...-000000000301` for L2 items (next after existing 201), `30000000-...-000000000301` for L3 items.

```sql
-- supabase/migrations/20260407000006_seed_ads_menu_items.sql

-- L2: Growth > Ads (parent = Growth L1)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000301', '10000000-0000-0000-0000-000000000002', 'Ads', 'campaign', '/growth/ads', 3, 2)
ON CONFLICT (id) DO NOTHING;

-- L2: Settings > Integrations (parent = Settings L1)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000302', '10000000-0000-0000-0000-000000000008', 'Integrations', 'connect', '/settings/integrations', 3, 2)
ON CONFLICT (id) DO NOTHING;

-- L3: Settings > Integrations > Meta
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('30000000-0000-0000-0000-000000000301', '20000000-0000-0000-0000-000000000302', 'Meta', 'logo--facebook', '/settings/integrations/meta', 1, 3)
ON CONFLICT (id) DO NOTHING;

-- Grant admin access to new menu items
INSERT INTO public.role_menu_access (role, menu_item_id)
SELECT 'admin', id FROM public.menu_items
WHERE id IN (
  '20000000-0000-0000-0000-000000000301',
  '20000000-0000-0000-0000-000000000302',
  '30000000-0000-0000-0000-000000000301'
)
ON CONFLICT (role, menu_item_id) DO NOTHING;
```

- [ ] **Step 3: Create pg_cron + pg_net migration**

```sql
-- supabase/migrations/20260407000007_meta_ads_pg_cron.sql
-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule sync every 15 minutes — the Route Handler checks sync_frequency
-- to decide whether to actually execute
SELECT cron.schedule(
  'meta-ads-sync',
  '*/15 * * * *',
  $$SELECT net.http_post(
    url := current_setting('app.site_url') || '/api/admin/ads/sync',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key')),
    body := '{}'::jsonb
  )$$
);
```

- [ ] **Step 4: Run migrations and verify**

Run: `npx supabase db push`
Expected: RLS policies created, menu items seeded, pg_cron job scheduled.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260407000005_meta_ads_rls.sql \
        supabase/migrations/20260407000006_seed_ads_menu_items.sql \
        supabase/migrations/20260407000007_meta_ads_pg_cron.sql
git commit -m "feat(db): add RLS policies, menu seeds, and pg_cron sync for Meta Ads"
```

---

### Task 3: Shared Libraries — Types, Encryption, Benchmarks, Meta API Client

**Files:**
- Modify: `src/lib/types.ts` — add Meta Ads types at the end
- Create: `src/lib/encryption.ts`
- Create: `src/lib/ads-benchmarks.ts`
- Create: `src/lib/meta-api.ts`
- Modify: `src/lib/icon-map.ts` — add 3 new icon entries

- [ ] **Step 1: Add TypeScript types to `src/lib/types.ts`**

Append to the end of the file:

```typescript
// Meta Ads types

export type SyncFrequency = '15min' | '30min' | '1hour' | '6hour' | '24hour'
export type SyncStatus = 'idle' | 'syncing' | 'error'

export interface MetaIntegration {
  id: string
  company_id: string
  meta_app_id: string | null
  ad_account_id: string | null
  ad_account_name: string | null
  sync_frequency: SyncFrequency
  campaign_filter: { include: string[] } | null
  last_synced_at: string | null
  sync_status: SyncStatus
  sync_error: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MetaCampaign {
  id: string
  integration_id: string
  meta_campaign_id: string
  name: string
  status: string | null
  objective: string | null
  daily_budget: number | null
  lifetime_budget: number | null
  spend: number
  impressions: number
  clicks: number
  ctr: number | null
  cpm: number | null
  cpa: number | null
  conversions: number
  start_time: string | null
  stop_time: string | null
  synced_at: string
}

export interface MetaAdSet {
  id: string
  campaign_id: string
  meta_ad_set_id: string
  name: string
  status: string | null
  targeting: Record<string, unknown> | null
  daily_budget: number | null
  lifetime_budget: number | null
  spend: number
  impressions: number
  clicks: number
  ctr: number | null
  cpm: number | null
  cpa: number | null
  conversions: number
  synced_at: string
}

export interface MetaAd {
  id: string
  ad_set_id: string
  meta_ad_id: string
  name: string
  status: string | null
  creative_id: string | null
  creative_thumbnail_url: string | null
  creative_body: string | null
  creative_title: string | null
  creative_link_url: string | null
  hook_rate: number | null
  ctr: number | null
  cpm: number | null
  cpa: number | null
  spend: number
  impressions: number
  clicks: number
  conversions: number
  emq_score: number | null
  synced_at: string
}
```

- [ ] **Step 2: Create encryption utility**

```typescript
// src/lib/encryption.ts
import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY = Buffer.from(process.env.META_ENCRYPTION_KEY || '', 'hex')

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  // Format: iv:authTag:encrypted (all base64)
  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':')
}

export function decrypt(ciphertext: string): string {
  const [ivB64, authTagB64, encryptedB64] = ciphertext.split(':')
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const encrypted = Buffer.from(encryptedB64, 'base64')
  const decipher = createDecipheriv(ALGORITHM, KEY, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
```

- [ ] **Step 3: Create benchmarks utility**

```typescript
// src/lib/ads-benchmarks.ts

export type BenchmarkColor = 'green' | 'amber' | 'red'

interface BenchmarkRule {
  green: (v: number) => boolean
  amber: (v: number) => boolean
}

const BENCHMARKS: Record<string, BenchmarkRule> = {
  hook_rate: {
    green: (v) => v >= 25,
    amber: (v) => v >= 20 && v < 25,
  },
  ctr: {
    green: (v) => v >= 1.5,
    amber: (v) => v >= 1.0 && v < 1.5,
  },
  cpa: {
    green: (v) => v <= 23.1,
    amber: (v) => v > 23.1 && v <= 30,
  },
  emq_score: {
    green: (v) => v >= 6,
    amber: (v) => v >= 4 && v < 6,
  },
}

export function getBenchmarkColor(metric: string, value: number | null): BenchmarkColor | null {
  if (value === null || value === undefined) return null
  const rule = BENCHMARKS[metric]
  if (!rule) return null // CPM and others — no color coding
  if (rule.green(value)) return 'green'
  if (rule.amber(value)) return 'amber'
  return 'red'
}

export const BENCHMARK_LABELS: Record<BenchmarkColor, { bg: string; text: string }> = {
  green: { bg: 'bg-green-900/50', text: 'text-green-400' },
  amber: { bg: 'bg-yellow-900/50', text: 'text-yellow-400' },
  red: { bg: 'bg-red-900/50', text: 'text-red-400' },
}
```

- [ ] **Step 4: Create Meta API client wrapper**

```typescript
// src/lib/meta-api.ts
import 'server-only'

const META_API_BASE = 'https://graph.facebook.com/v21.0'

interface MetaApiOptions {
  accessToken: string
}

export async function metaApiGet<T>(path: string, params: Record<string, string>, options: MetaApiOptions): Promise<T> {
  const url = new URL(`${META_API_BASE}${path}`)
  url.searchParams.set('access_token', options.accessToken)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  const res = await fetch(url.toString())
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error?.message || `Meta API error: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export function computeEmqScore(qualityRanking: string, engagementRanking: string, conversionRanking: string): number {
  const rankToScore = (rank: string): number => {
    if (rank.startsWith('ABOVE_AVERAGE')) return 3
    if (rank === 'AVERAGE') return 2
    return 1 // BELOW_AVERAGE_10, BELOW_AVERAGE_20, BELOW_AVERAGE_35
  }
  return rankToScore(qualityRanking) + rankToScore(engagementRanking) + rankToScore(conversionRanking)
}
```

- [ ] **Step 5: Add new icons to icon-map.ts**

Add these imports and map entries to `src/lib/icon-map.ts`:

Imports to add:
```typescript
import { Campaign, Connect, LogoFacebook } from '@carbon/icons-react'
```

Map entries to add:
```typescript
'campaign': Campaign,
'connect': Connect,
'logo--facebook': LogoFacebook,
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: No type errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/lib/encryption.ts src/lib/ads-benchmarks.ts src/lib/meta-api.ts src/lib/icon-map.ts
git commit -m "feat: add shared libraries for Meta Ads (types, encryption, benchmarks, API client, icons)"
```

---

### Task 4: API Route Handlers — Integration & OAuth

**Files:**
- Create: `src/app/api/admin/ads/integration/route.ts`
- Create: `src/app/api/admin/ads/auth/meta/route.ts`
- Create: `src/app/api/admin/ads/auth/meta/callback/route.ts`

- [ ] **Step 1: Create integration CRUD route**

```typescript
// src/app/api/admin/ads/integration/route.ts
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
    .select('role, company_id')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'admin') return null
  return { ...user, company_id: profile.company_id }
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('meta_integrations')
    .select('id, company_id, meta_app_id, ad_account_id, ad_account_name, sync_frequency, campaign_filter, last_synced_at, sync_status, sync_error, is_active')
    .eq('company_id', admin.company_id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ integration: data })
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { ad_account_id, ad_account_name, sync_frequency, campaign_filter } = body

  const { data, error } = await supabaseAdmin
    .from('meta_integrations')
    .upsert({
      company_id: admin.company_id,
      ad_account_id,
      ad_account_name,
      sync_frequency,
      campaign_filter,
    }, { onConflict: 'company_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ integration: data })
}

export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabaseAdmin
    .from('meta_integrations')
    .delete()
    .eq('company_id', admin.company_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Create OAuth redirect route**

```typescript
// src/app/api/admin/ads/auth/meta/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const appId = process.env.META_APP_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/ads/auth/meta/callback`
  const scope = 'ads_read,ads_management'

  const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth')
  authUrl.searchParams.set('client_id', appId!)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', scope)
  authUrl.searchParams.set('response_type', 'code')

  return NextResponse.redirect(authUrl.toString())
}
```

- [ ] **Step 3: Create OAuth callback route**

```typescript
// src/app/api/admin/ads/auth/meta/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { encrypt } from '@/lib/encryption'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const error = request.nextUrl.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations/meta?error=oauth_denied`
    )
  }

  const appId = process.env.META_APP_ID!
  const appSecret = process.env.META_APP_SECRET!
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/ads/auth/meta/callback`

  // Exchange code for short-lived token
  const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
  tokenUrl.searchParams.set('client_id', appId)
  tokenUrl.searchParams.set('client_secret', appSecret)
  tokenUrl.searchParams.set('redirect_uri', redirectUri)
  tokenUrl.searchParams.set('code', code)

  const tokenRes = await fetch(tokenUrl.toString())
  if (!tokenRes.ok) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations/meta?error=token_exchange_failed`
    )
  }

  const { access_token: shortLivedToken } = await tokenRes.json()

  // Exchange for long-lived token (60-day expiry)
  const longLivedUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
  longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
  longLivedUrl.searchParams.set('client_id', appId)
  longLivedUrl.searchParams.set('client_secret', appSecret)
  longLivedUrl.searchParams.set('fb_exchange_token', shortLivedToken)

  const longLivedRes = await fetch(longLivedUrl.toString())
  if (!longLivedRes.ok) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations/meta?error=long_lived_token_failed`
    )
  }

  const { access_token: longLivedToken } = await longLivedRes.json()

  // Get user info to find admin's company
  const authHeader = request.headers.get('cookie')
  // For the callback, we need to find the company. Use a state parameter or
  // look up by the first admin company. For simplicity, upsert for the first
  // company that has an integration row, or create one.
  // In practice, the state param from the OAuth flow would carry the company_id.
  
  const encryptedToken = encrypt(longLivedToken)
  const encryptedSecret = encrypt(appSecret)

  // Upsert integration — we use a temp company_id approach. The frontend
  // should pass company_id via OAuth state param in production.
  // For now, get the first admin company.
  const { data: companies } = await supabaseAdmin
    .from('companies')
    .select('id')
    .eq('type', 'admin')
    .limit(1)
    .single()

  if (!companies) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations/meta?error=no_company`
    )
  }

  await supabaseAdmin
    .from('meta_integrations')
    .upsert({
      company_id: companies.id,
      meta_app_id: appId,
      meta_app_secret_encrypted: encryptedSecret,
      access_token_encrypted: encryptedToken,
      sync_status: 'idle',
    }, { onConflict: 'company_id' })

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations/meta?success=connected`
  )
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/ads/integration/route.ts \
        src/app/api/admin/ads/auth/meta/route.ts \
        src/app/api/admin/ads/auth/meta/callback/route.ts
git commit -m "feat(api): add Meta integration CRUD and OAuth flow routes"
```

---

### Task 5: API Route Handlers — Meta API Proxy (Live Data)

**Files:**
- Create: `src/app/api/admin/ads/meta/ad-accounts/route.ts`
- Create: `src/app/api/admin/ads/meta/campaigns/route.ts`
- Create: `src/app/api/admin/ads/meta/ads/[adId]/route.ts`
- Create: `src/app/api/admin/ads/meta/ads/compare/route.ts`

- [ ] **Step 1: Create ad-accounts proxy route**

```typescript
// src/app/api/admin/ads/meta/ad-accounts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decrypt } from '@/lib/encryption'
import { metaApiGet } from '@/lib/meta-api'

async function getIntegrationToken(companyId: string) {
  const { data } = await supabaseAdmin
    .from('meta_integrations')
    .select('access_token_encrypted')
    .eq('company_id', companyId)
    .single()
  if (!data?.access_token_encrypted) return null
  return decrypt(data.access_token_encrypted)
}

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'admin') return null
  return { ...user, company_id: profile.company_id }
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accessToken = await getIntegrationToken(admin.company_id)
  if (!accessToken) return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })

  try {
    const data = await metaApiGet('/me/adaccounts', {
      fields: 'id,name,account_status,currency',
    }, { accessToken })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
```

- [ ] **Step 2: Create campaigns proxy route**

```typescript
// src/app/api/admin/ads/meta/campaigns/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decrypt } from '@/lib/encryption'
import { metaApiGet } from '@/lib/meta-api'

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'admin') return null
  return { ...user, company_id: profile.company_id }
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('access_token_encrypted, ad_account_id')
    .eq('company_id', admin.company_id)
    .single()

  if (!integration?.access_token_encrypted || !integration.ad_account_id) {
    return NextResponse.json({ error: 'Meta not connected or no ad account selected' }, { status: 400 })
  }

  const accessToken = decrypt(integration.access_token_encrypted)

  try {
    const data = await metaApiGet(`/${integration.ad_account_id}/campaigns`, {
      fields: 'id,name,status,objective',
    }, { accessToken })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
```

- [ ] **Step 3: Create live ad detail route**

```typescript
// src/app/api/admin/ads/meta/ads/[adId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decrypt } from '@/lib/encryption'
import { metaApiGet, computeEmqScore } from '@/lib/meta-api'

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'admin') return null
  return { ...user, company_id: profile.company_id }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ adId: string }> }
) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { adId } = await params

  // Look up meta_ad_id from internal UUID
  const { data: ad } = await supabaseAdmin
    .from('meta_ads')
    .select('meta_ad_id')
    .eq('id', adId)
    .single()

  if (!ad) return NextResponse.json({ error: 'Ad not found' }, { status: 404 })

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('access_token_encrypted')
    .eq('company_id', admin.company_id)
    .single()

  if (!integration?.access_token_encrypted) {
    return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
  }

  const accessToken = decrypt(integration.access_token_encrypted)

  try {
    const data = await metaApiGet(`/${ad.meta_ad_id}`, {
      fields: 'id,name,status,creative{thumbnail_url,body,title,link_url},insights{impressions,clicks,spend,ctr,cpm,actions,cost_per_action_type,video_p25_watched_actions,quality_ranking,engagement_rate_ranking,conversion_rate_ranking}',
    }, { accessToken })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
```

- [ ] **Step 4: Create compare proxy route**

```typescript
// src/app/api/admin/ads/meta/ads/compare/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decrypt } from '@/lib/encryption'
import { metaApiGet } from '@/lib/meta-api'

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'admin') return null
  return { ...user, company_id: profile.company_id }
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ids = request.nextUrl.searchParams.get('ids')?.split(',') || []
  if (ids.length < 2 || ids.length > 4) {
    return NextResponse.json({ error: 'Provide 2-4 ad IDs' }, { status: 400 })
  }

  // Look up meta_ad_ids from internal UUIDs
  const { data: ads } = await supabaseAdmin
    .from('meta_ads')
    .select('id, meta_ad_id')
    .in('id', ids)

  if (!ads || ads.length !== ids.length) {
    return NextResponse.json({ error: 'One or more ads not found' }, { status: 404 })
  }

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('access_token_encrypted')
    .eq('company_id', admin.company_id)
    .single()

  if (!integration?.access_token_encrypted) {
    return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
  }

  const accessToken = decrypt(integration.access_token_encrypted)

  try {
    // Fetch each ad's live data in parallel
    const results = await Promise.all(
      ads.map(async (ad) => {
        const data = await metaApiGet(`/${ad.meta_ad_id}`, {
          fields: 'id,name,status,creative{thumbnail_url,body,title,link_url},insights{impressions,clicks,spend,ctr,cpm,actions,cost_per_action_type,video_p25_watched_actions,quality_ranking,engagement_rate_ranking,conversion_rate_ranking}',
        }, { accessToken })
        return { internalId: ad.id, ...data }
      })
    )
    return NextResponse.json({ ads: results })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/ads/meta/
git commit -m "feat(api): add Meta API proxy routes for ad-accounts, campaigns, ads, and comparison"
```

---

### Task 6: API Route Handlers — Sync

**Files:**
- Create: `src/app/api/admin/ads/sync/route.ts`
- Create: `src/app/api/admin/ads/sync/status/route.ts`

- [ ] **Step 1: Create sync trigger route**

```typescript
// src/app/api/admin/ads/sync/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decrypt } from '@/lib/encryption'
import { metaApiGet, computeEmqScore } from '@/lib/meta-api'

// Allow both admin user auth and service_role Bearer token (for pg_cron)
async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')

  // Check if it's the service_role key (from pg_cron)
  if (token === process.env.SUPABASE_SERVICE_ROLE_KEY) return 'service_role'

  // Otherwise verify as admin user
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'admin') return null
  return profile.company_id
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get integration(s) to sync
  let query = supabaseAdmin
    .from('meta_integrations')
    .select('*')
    .eq('is_active', true)

  if (auth !== 'service_role') {
    query = query.eq('company_id', auth)
  }

  const { data: integrations } = await query

  if (!integrations || integrations.length === 0) {
    return NextResponse.json({ message: 'No active integrations' })
  }

  for (const integration of integrations) {
    // Check if enough time has passed based on sync_frequency
    if (integration.last_synced_at) {
      const intervals: Record<string, number> = {
        '15min': 15, '30min': 30, '1hour': 60, '6hour': 360, '24hour': 1440,
      }
      const minutesSince = (Date.now() - new Date(integration.last_synced_at).getTime()) / 60000
      if (minutesSince < (intervals[integration.sync_frequency] || 60)) continue
    }

    if (!integration.access_token_encrypted || !integration.ad_account_id) continue

    // Set syncing status
    await supabaseAdmin
      .from('meta_integrations')
      .update({ sync_status: 'syncing', sync_error: null })
      .eq('id', integration.id)

    try {
      const accessToken = decrypt(integration.access_token_encrypted)
      const campaignFilter = integration.campaign_filter?.include || null

      // Fetch campaigns
      const campaignsRes = await metaApiGet<{ data: Array<Record<string, unknown>> }>(
        `/${integration.ad_account_id}/campaigns`,
        { fields: 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time', limit: '500' },
        { accessToken }
      )

      for (const campaign of campaignsRes.data) {
        const metaCampaignId = campaign.id as string
        if (campaignFilter && !campaignFilter.includes(metaCampaignId)) continue

        // Get campaign insights
        let campaignInsights: Record<string, unknown> = {}
        try {
          const insightsRes = await metaApiGet<{ data: Array<Record<string, unknown>> }>(
            `/${metaCampaignId}/insights`,
            { fields: 'spend,impressions,clicks,ctr,cpm,cost_per_action_type,actions', date_preset: 'lifetime' },
            { accessToken }
          )
          campaignInsights = insightsRes.data?.[0] || {}
        } catch { /* no insights available */ }

        const conversions = ((campaignInsights.actions as Array<{ action_type: string; value: string }>) || [])
          .filter(a => a.action_type === 'offsite_conversion')
          .reduce((sum, a) => sum + parseInt(a.value, 10), 0)

        const cpaValues = ((campaignInsights.cost_per_action_type as Array<{ action_type: string; value: string }>) || [])
          .filter(a => a.action_type === 'offsite_conversion')
        const cpa = cpaValues.length > 0 ? parseFloat(cpaValues[0].value) : null

        // Upsert campaign
        const { data: upsertedCampaign } = await supabaseAdmin
          .from('meta_campaigns')
          .upsert({
            integration_id: integration.id,
            meta_campaign_id: metaCampaignId,
            name: campaign.name as string,
            status: campaign.status as string,
            objective: campaign.objective as string,
            daily_budget: campaign.daily_budget ? Number(campaign.daily_budget) / 100 : null,
            lifetime_budget: campaign.lifetime_budget ? Number(campaign.lifetime_budget) / 100 : null,
            spend: parseFloat((campaignInsights.spend as string) || '0'),
            impressions: parseInt((campaignInsights.impressions as string) || '0', 10),
            clicks: parseInt((campaignInsights.clicks as string) || '0', 10),
            ctr: campaignInsights.ctr ? parseFloat(campaignInsights.ctr as string) : null,
            cpm: campaignInsights.cpm ? parseFloat(campaignInsights.cpm as string) : null,
            cpa,
            conversions,
            start_time: campaign.start_time as string || null,
            stop_time: campaign.stop_time as string || null,
            synced_at: new Date().toISOString(),
          }, { onConflict: 'integration_id,meta_campaign_id' })
          .select('id')
          .single()

        if (!upsertedCampaign) continue

        // Fetch ad sets for this campaign
        const adSetsRes = await metaApiGet<{ data: Array<Record<string, unknown>> }>(
          `/${metaCampaignId}/adsets`,
          { fields: 'id,name,status,targeting,daily_budget,lifetime_budget', limit: '500' },
          { accessToken }
        )

        for (const adSet of adSetsRes.data) {
          const metaAdSetId = adSet.id as string

          let adSetInsights: Record<string, unknown> = {}
          try {
            const insRes = await metaApiGet<{ data: Array<Record<string, unknown>> }>(
              `/${metaAdSetId}/insights`,
              { fields: 'spend,impressions,clicks,ctr,cpm,cost_per_action_type,actions', date_preset: 'lifetime' },
              { accessToken }
            )
            adSetInsights = insRes.data?.[0] || {}
          } catch { /* no insights */ }

          const adSetConversions = ((adSetInsights.actions as Array<{ action_type: string; value: string }>) || [])
            .filter(a => a.action_type === 'offsite_conversion')
            .reduce((sum, a) => sum + parseInt(a.value, 10), 0)

          const adSetCpaValues = ((adSetInsights.cost_per_action_type as Array<{ action_type: string; value: string }>) || [])
            .filter(a => a.action_type === 'offsite_conversion')
          const adSetCpa = adSetCpaValues.length > 0 ? parseFloat(adSetCpaValues[0].value) : null

          const { data: upsertedAdSet } = await supabaseAdmin
            .from('meta_ad_sets')
            .upsert({
              campaign_id: upsertedCampaign.id,
              meta_ad_set_id: metaAdSetId,
              name: adSet.name as string,
              status: adSet.status as string,
              targeting: adSet.targeting as Record<string, unknown> || null,
              daily_budget: adSet.daily_budget ? Number(adSet.daily_budget) / 100 : null,
              lifetime_budget: adSet.lifetime_budget ? Number(adSet.lifetime_budget) / 100 : null,
              spend: parseFloat((adSetInsights.spend as string) || '0'),
              impressions: parseInt((adSetInsights.impressions as string) || '0', 10),
              clicks: parseInt((adSetInsights.clicks as string) || '0', 10),
              ctr: adSetInsights.ctr ? parseFloat(adSetInsights.ctr as string) : null,
              cpm: adSetInsights.cpm ? parseFloat(adSetInsights.cpm as string) : null,
              cpa: adSetCpa,
              conversions: adSetConversions,
              synced_at: new Date().toISOString(),
            }, { onConflict: 'campaign_id,meta_ad_set_id' })
            .select('id')
            .single()

          if (!upsertedAdSet) continue

          // Fetch ads for this ad set
          const adsRes = await metaApiGet<{ data: Array<Record<string, unknown>> }>(
            `/${metaAdSetId}/ads`,
            { fields: 'id,name,status,creative{id,thumbnail_url,body,title,link_url}', limit: '500' },
            { accessToken }
          )

          for (const ad of adsRes.data) {
            const metaAdId = ad.id as string

            let adInsights: Record<string, unknown> = {}
            try {
              const insRes = await metaApiGet<{ data: Array<Record<string, unknown>> }>(
                `/${metaAdId}/insights`,
                { fields: 'spend,impressions,clicks,ctr,cpm,cost_per_action_type,actions,video_p25_watched_actions,quality_ranking,engagement_rate_ranking,conversion_rate_ranking', date_preset: 'lifetime' },
                { accessToken }
              )
              adInsights = insRes.data?.[0] || {}
            } catch { /* no insights */ }

            const creative = ad.creative as Record<string, unknown> || {}
            const adConversions = ((adInsights.actions as Array<{ action_type: string; value: string }>) || [])
              .filter(a => a.action_type === 'offsite_conversion')
              .reduce((sum, a) => sum + parseInt(a.value, 10), 0)

            const adCpaValues = ((adInsights.cost_per_action_type as Array<{ action_type: string; value: string }>) || [])
              .filter(a => a.action_type === 'offsite_conversion')
            const adCpa = adCpaValues.length > 0 ? parseFloat(adCpaValues[0].value) : null

            // Compute hook rate: video_p25_watched_actions / impressions * 100
            const videoViews = ((adInsights.video_p25_watched_actions as Array<{ value: string }>) || [])
            const impressions = parseInt((adInsights.impressions as string) || '0', 10)
            const hookRate = videoViews.length > 0 && impressions > 0
              ? (parseInt(videoViews[0].value, 10) / impressions) * 100
              : null

            // Compute EMQ score
            const emqScore = adInsights.quality_ranking
              ? computeEmqScore(
                  adInsights.quality_ranking as string,
                  adInsights.engagement_rate_ranking as string,
                  adInsights.conversion_rate_ranking as string
                )
              : null

            await supabaseAdmin
              .from('meta_ads')
              .upsert({
                ad_set_id: upsertedAdSet.id,
                meta_ad_id: metaAdId,
                name: ad.name as string,
                status: ad.status as string,
                creative_id: creative.id as string || null,
                creative_thumbnail_url: creative.thumbnail_url as string || null,
                creative_body: creative.body as string || null,
                creative_title: creative.title as string || null,
                creative_link_url: creative.link_url as string || null,
                hook_rate: hookRate,
                ctr: adInsights.ctr ? parseFloat(adInsights.ctr as string) : null,
                cpm: adInsights.cpm ? parseFloat(adInsights.cpm as string) : null,
                cpa: adCpa,
                spend: parseFloat((adInsights.spend as string) || '0'),
                impressions,
                clicks: parseInt((adInsights.clicks as string) || '0', 10),
                conversions: adConversions,
                emq_score: emqScore,
                synced_at: new Date().toISOString(),
              }, { onConflict: 'ad_set_id,meta_ad_id' })
          }
        }
      }

      // Mark sync complete
      await supabaseAdmin
        .from('meta_integrations')
        .update({ sync_status: 'idle', last_synced_at: new Date().toISOString() })
        .eq('id', integration.id)

    } catch (err) {
      await supabaseAdmin
        .from('meta_integrations')
        .update({
          sync_status: 'error',
          sync_error: (err as Error).message || 'Unknown sync error',
        })
        .eq('id', integration.id)
    }
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Create sync status route**

```typescript
// src/app/api/admin/ads/sync/status/route.ts
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
    .select('role, company_id')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'admin') return null
  return { ...user, company_id: profile.company_id }
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('sync_status, sync_error, last_synced_at')
    .eq('company_id', admin.company_id)
    .single()

  if (!integration) {
    return NextResponse.json({ sync_status: null, message: 'No integration found' })
  }

  // Get counts
  const { count: campaignCount } = await supabaseAdmin
    .from('meta_campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('integration_id', (await supabaseAdmin
      .from('meta_integrations')
      .select('id')
      .eq('company_id', admin.company_id)
      .single()).data?.id || '')

  return NextResponse.json({
    ...integration,
    campaign_count: campaignCount || 0,
  })
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/ads/sync/
git commit -m "feat(api): add Meta Ads sync trigger and status routes"
```

---

### Task 7: Admin Page — Campaigns Table

**Files:**
- Create: `src/app/(admin)/growth/ads/page.tsx`

- [ ] **Step 1: Create campaigns table page**

```typescript
// src/app/(admin)/growth/ads/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { MetaCampaign } from '@/lib/types'
import { getBenchmarkColor } from '@/lib/ads-benchmarks'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Time } from '@carbon/icons-react'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive'> = {
  ACTIVE: 'default',
  PAUSED: 'secondary',
  DELETED: 'destructive',
  ARCHIVED: 'secondary',
}

function MetricBadge({ metric, value, format }: { metric: string; value: number | null; format: (v: number) => string }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>
  const color = getBenchmarkColor(metric, value)
  if (!color) return <span>{format(value)}</span>
  const colorClasses: Record<string, string> = {
    green: 'bg-green-100 text-green-800',
    amber: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
  }
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colorClasses[color]}`}>{format(value)}</span>
}

export default function CampaignsPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('meta_campaigns')
      .select('*')
      .order('spend', { ascending: false })

    if (error) {
      toast.error('Failed to load campaigns')
      setLoading(false)
      return
    }
    setCampaigns(data ?? [])
    setLoading(false)
  }, [])

  const fetchSyncStatus = useCallback(async () => {
    const { data } = await supabase
      .from('meta_integrations')
      .select('last_synced_at')
      .limit(1)
      .single()
    if (data?.last_synced_at) setLastSynced(data.last_synced_at)
  }, [])

  useEffect(() => {
    fetchCampaigns()
    fetchSyncStatus()
  }, [fetchCampaigns, fetchSyncStatus])

  const filtered = statusFilter === 'all'
    ? campaigns
    : campaigns.filter(c => c.status === statusFilter)

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
    if (diff < 1) return 'just now'
    if (diff < 60) return `${diff}m ago`
    return `${Math.floor(diff / 60)}h ago`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <select
            className="border rounded-md px-3 py-1.5 text-sm bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
          </select>
        </div>
        {lastSynced && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Time size={14} />
            Last synced {timeAgo(lastSynced)}
          </div>
        )}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead>Objective</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead className="text-right">Impressions</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">CPA</TableHead>
              <TableHead className="text-right">Conversions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {campaigns.length === 0
                    ? 'No campaigns synced. Connect your Meta account in Settings > Integrations.'
                    : 'No campaigns match the selected filter.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((campaign) => (
                <TableRow
                  key={campaign.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/growth/ads/${campaign.id}`)}
                >
                  <TableCell className="font-medium text-primary">{campaign.name}</TableCell>
                  <TableCell>
                    <Badge variant={statusColors[campaign.status || ''] || 'secondary'}>
                      {campaign.status || '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{campaign.objective || '—'}</TableCell>
                  <TableCell className="text-right">${campaign.spend.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{campaign.impressions.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <MetricBadge metric="ctr" value={campaign.ctr} format={(v) => `${v.toFixed(1)}%`} />
                  </TableCell>
                  <TableCell className="text-right">
                    <MetricBadge metric="cpa" value={campaign.cpa} format={(v) => `$${v.toFixed(2)}`} />
                  </TableCell>
                  <TableCell className="text-right">{campaign.conversions.toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the page loads in dev**

Run: `npm run dev`
Navigate to: `http://localhost:3000/growth/ads`
Expected: Page renders with empty state message (no data yet).

- [ ] **Step 3: Commit**

```bash
git add src/app/\(admin\)/growth/ads/page.tsx
git commit -m "feat(ui): add campaigns table page at /growth/ads"
```

---

### Task 8: Admin Page — Ad Sets Table

**Files:**
- Create: `src/app/(admin)/growth/ads/[campaignId]/page.tsx`

- [ ] **Step 1: Create ad sets table page**

```typescript
// src/app/(admin)/growth/ads/[campaignId]/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { MetaAdSet, MetaCampaign } from '@/lib/types'
import { getBenchmarkColor } from '@/lib/ads-benchmarks'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ChevronRight } from '@carbon/icons-react'

function MetricBadge({ metric, value, format }: { metric: string; value: number | null; format: (v: number) => string }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>
  const color = getBenchmarkColor(metric, value)
  if (!color) return <span>{format(value)}</span>
  const colorClasses: Record<string, string> = {
    green: 'bg-green-100 text-green-800',
    amber: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
  }
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colorClasses[color]}`}>{format(value)}</span>
}

export default function AdSetsPage() {
  const router = useRouter()
  const params = useParams()
  const campaignId = params.campaignId as string
  const [adSets, setAdSets] = useState<MetaAdSet[]>([])
  const [campaign, setCampaign] = useState<MetaCampaign | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)

    const [campaignRes, adSetsRes] = await Promise.all([
      supabase.from('meta_campaigns').select('*').eq('id', campaignId).single(),
      supabase.from('meta_ad_sets').select('*').eq('campaign_id', campaignId).order('spend', { ascending: false }),
    ])

    if (campaignRes.error) {
      toast.error('Failed to load campaign')
      setLoading(false)
      return
    }

    setCampaign(campaignRes.data)
    setAdSets(adSetsRes.data ?? [])
    setLoading(false)
  }, [campaignId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const summarizeTargeting = (targeting: Record<string, unknown> | null): string => {
    if (!targeting) return '—'
    if (targeting.geo_locations) return 'Geo-targeted'
    if (targeting.custom_audiences) return 'Custom audience'
    return 'Configured'
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <span className="cursor-pointer hover:text-foreground" onClick={() => router.push('/growth/ads')}>Ads</span>
        <ChevronRight size={14} />
        <span className="text-foreground font-medium">{campaign?.name || '...'}</span>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad Set</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead>Targeting</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">CPA</TableHead>
              <TableHead className="text-right">CPM</TableHead>
              <TableHead className="text-right">Conversions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : adSets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No ad sets found for this campaign.
                </TableCell>
              </TableRow>
            ) : (
              adSets.map((adSet) => (
                <TableRow
                  key={adSet.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/growth/ads/${campaignId}/${adSet.id}`)}
                >
                  <TableCell className="font-medium text-primary">{adSet.name}</TableCell>
                  <TableCell>
                    <Badge variant={adSet.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {adSet.status || '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {summarizeTargeting(adSet.targeting)}
                  </TableCell>
                  <TableCell className="text-right">${adSet.spend.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <MetricBadge metric="ctr" value={adSet.ctr} format={(v) => `${v.toFixed(1)}%`} />
                  </TableCell>
                  <TableCell className="text-right">
                    <MetricBadge metric="cpa" value={adSet.cpa} format={(v) => `$${v.toFixed(2)}`} />
                  </TableCell>
                  <TableCell className="text-right">
                    {adSet.cpm !== null ? `$${adSet.cpm.toFixed(2)}` : '—'}
                  </TableCell>
                  <TableCell className="text-right">{adSet.conversions.toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the page loads**

Run: `npm run dev`
Navigate to: `http://localhost:3000/growth/ads/some-uuid`
Expected: Page renders with breadcrumb and empty state.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(admin\)/growth/ads/\[campaignId\]/page.tsx
git commit -m "feat(ui): add ad sets table page with campaign breadcrumb"
```

---

### Task 9: Admin Page — Ads Card Grid

**Files:**
- Create: `src/app/(admin)/growth/ads/[campaignId]/[adSetId]/page.tsx`

- [ ] **Step 1: Create ads card grid page**

```typescript
// src/app/(admin)/growth/ads/[campaignId]/[adSetId]/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { MetaAd, MetaAdSet, MetaCampaign } from '@/lib/types'
import { getBenchmarkColor } from '@/lib/ads-benchmarks'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ChevronRight, Compare } from '@carbon/icons-react'

function MetricBadge({ metric, value, format }: { metric: string; value: number | null; format: (v: number) => string }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground text-xs">—</span>
  const color = getBenchmarkColor(metric, value)
  if (!color) return <span className="text-xs">{format(value)}</span>
  const colorClasses: Record<string, string> = {
    green: 'bg-green-100 text-green-800',
    amber: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
  }
  return <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${colorClasses[color]}`}>{format(value)}</span>
}

export default function AdsPage() {
  const router = useRouter()
  const params = useParams()
  const campaignId = params.campaignId as string
  const adSetId = params.adSetId as string
  const [ads, setAds] = useState<MetaAd[]>([])
  const [adSet, setAdSet] = useState<MetaAdSet | null>(null)
  const [campaign, setCampaign] = useState<MetaCampaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [campaignRes, adSetRes, adsRes] = await Promise.all([
      supabase.from('meta_campaigns').select('*').eq('id', campaignId).single(),
      supabase.from('meta_ad_sets').select('*').eq('id', adSetId).single(),
      supabase.from('meta_ads').select('*').eq('ad_set_id', adSetId).order('spend', { ascending: false }),
    ])

    if (adSetRes.error) {
      toast.error('Failed to load ad set')
      setLoading(false)
      return
    }

    setCampaign(campaignRes.data)
    setAdSet(adSetRes.data)
    setAds(adsRes.data ?? [])
    setLoading(false)
  }, [campaignId, adSetId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 4) {
        next.add(id)
      } else {
        toast.error('Maximum 4 ads can be compared')
      }
      return next
    })
  }

  const handleCompare = () => {
    const ids = Array.from(selectedIds).join(',')
    router.push(`/growth/ads/compare?ids=${ids}&from=${campaignId}/${adSetId}`)
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <span className="cursor-pointer hover:text-foreground" onClick={() => router.push('/growth/ads')}>Ads</span>
        <ChevronRight size={14} />
        <span className="cursor-pointer hover:text-foreground" onClick={() => router.push(`/growth/ads/${campaignId}`)}>
          {campaign?.name || '...'}
        </span>
        <ChevronRight size={14} />
        <span className="text-foreground font-medium">{adSet?.name || '...'}</span>
      </div>

      {/* Compare bar */}
      <div className="flex justify-end mb-4">
        <Button
          onClick={handleCompare}
          disabled={selectedIds.size < 2}
        >
          <Compare size={16} />
          Compare Selected ({selectedIds.size}/4)
        </Button>
      </div>

      {/* Card grid */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : ads.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No ads found for this ad set.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ads.map((ad) => (
            <div
              key={ad.id}
              className={`rounded-lg border bg-card p-4 flex flex-col gap-3 ${
                selectedIds.has(ad.id) ? 'ring-2 ring-primary' : ''
              }`}
            >
              {/* Creative thumbnail */}
              <div className="aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center">
                {ad.creative_thumbnail_url ? (
                  <img src={ad.creative_thumbnail_url} alt={ad.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground">No preview</span>
                )}
              </div>

              {/* Ad info */}
              <div>
                <div className="font-medium text-sm">{ad.name}</div>
                {ad.creative_title && (
                  <div className="text-xs text-muted-foreground mt-0.5">{ad.creative_title}</div>
                )}
                {ad.creative_body && (
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ad.creative_body}</div>
                )}
              </div>

              {/* Metrics */}
              <div className="flex flex-wrap gap-1.5">
                <MetricBadge metric="hook_rate" value={ad.hook_rate} format={(v) => `Hook ${v.toFixed(0)}%`} />
                <MetricBadge metric="ctr" value={ad.ctr} format={(v) => `CTR ${v.toFixed(1)}%`} />
                <MetricBadge metric="cpa" value={ad.cpa} format={(v) => `CPA $${v.toFixed(2)}`} />
                <span className="text-xs text-muted-foreground">{ad.cpm !== null ? `CPM $${ad.cpm.toFixed(2)}` : ''}</span>
                <MetricBadge metric="emq_score" value={ad.emq_score} format={(v) => `EMQ ${v.toFixed(1)}`} />
              </div>

              {/* Stats + select */}
              <div className="flex items-center justify-between mt-auto pt-2 border-t">
                <div className="text-xs text-muted-foreground">
                  ${ad.spend.toLocaleString()} · {ad.conversions} conv.
                </div>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(ad.id)}
                    onChange={() => toggleSelect(ad.id)}
                    className="accent-primary"
                  />
                  Compare
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify page loads**

Run: `npm run dev`
Expected: Page renders with card grid layout.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(admin\)/growth/ads/\[campaignId\]/\[adSetId\]/page.tsx
git commit -m "feat(ui): add ads card grid page with compare selection"
```

---

### Task 10: Admin Page — Ad Comparison

**Files:**
- Create: `src/app/(admin)/growth/ads/compare/page.tsx`

- [ ] **Step 1: Create comparison page**

```typescript
// src/app/(admin)/growth/ads/compare/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { MetaAd } from '@/lib/types'
import { getBenchmarkColor } from '@/lib/ads-benchmarks'
import { toast } from 'sonner'
import { ChevronRight } from '@carbon/icons-react'

function MetricRow({ label, metric, ads, format }: {
  label: string
  metric: string
  ads: MetaAd[]
  format: (v: number) => string
}) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `120px repeat(${ads.length}, 1fr)` }}>
      <div className="text-xs text-muted-foreground py-1">{label}</div>
      {ads.map((ad) => {
        const value = (ad as Record<string, unknown>)[metric] as number | null
        if (value === null || value === undefined) {
          return <div key={ad.id} className="text-xs text-muted-foreground py-1">—</div>
        }
        const color = getBenchmarkColor(metric, value)
        const colorClasses: Record<string, string> = {
          green: 'bg-green-100 text-green-800',
          amber: 'bg-yellow-100 text-yellow-800',
          red: 'bg-red-100 text-red-800',
        }
        return (
          <div key={ad.id} className="py-1">
            {color ? (
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colorClasses[color]}`}>
                {format(value)}
              </span>
            ) : (
              <span className="text-xs">{format(value)}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function ComparePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ids = searchParams.get('ids')?.split(',') || []
  const from = searchParams.get('from') || ''
  const [ads, setAds] = useState<MetaAd[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAds = useCallback(async () => {
    if (ids.length < 2) {
      toast.error('Select at least 2 ads to compare')
      return
    }
    setLoading(true)

    // Fetch live data from Meta API via Route Handler
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    const res = await fetch(`/api/admin/ads/meta/ads/compare?ids=${ids.join(',')}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      toast.error('Failed to load live ad data')
      setLoading(false)
      return
    }

    const { ads: liveAds } = await res.json()
    // Map live Meta API response to MetaAd shape for display
    // Fall back to synced data if live fetch has missing fields
    const { data: syncedAds } = await supabase
      .from('meta_ads')
      .select('*')
      .in('id', ids)

    // Use synced data as base, overlay with live metrics where available
    setAds(syncedAds ?? [])
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAds()
  }, [fetchAds])

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <span className="cursor-pointer hover:text-foreground" onClick={() => router.push('/growth/ads')}>Ads</span>
        <ChevronRight size={14} />
        <span className="text-foreground font-medium">Compare ({ads.length} ads)</span>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading comparison...</div>
      ) : (
        <>
          {/* Ad creatives row */}
          <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: `120px repeat(${ads.length}, 1fr)` }}>
            <div /> {/* spacer */}
            {ads.map((ad) => (
              <div key={ad.id} className="rounded-lg border bg-card overflow-hidden">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  {ad.creative_thumbnail_url ? (
                    <img src={ad.creative_thumbnail_url} alt={ad.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-muted-foreground">No preview</span>
                  )}
                </div>
                <div className="p-3">
                  <div className="font-medium text-sm">{ad.name}</div>
                  {ad.creative_title && <div className="text-xs text-muted-foreground mt-0.5">{ad.creative_title}</div>}
                  {ad.creative_body && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ad.creative_body}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Metrics comparison */}
          <div className="rounded-lg border bg-card p-4 space-y-2">
            <MetricRow label="Hook Rate" metric="hook_rate" ads={ads} format={(v) => `${v.toFixed(1)}%`} />
            <MetricRow label="CTR (Link)" metric="ctr" ads={ads} format={(v) => `${v.toFixed(2)}%`} />
            <MetricRow label="CPA" metric="cpa" ads={ads} format={(v) => `$${v.toFixed(2)}`} />
            <MetricRow label="CPM" metric="cpm" ads={ads} format={(v) => `$${v.toFixed(2)}`} />
            <MetricRow label="EMQ Score" metric="emq_score" ads={ads} format={(v) => v.toFixed(1)} />
            <div className="border-t pt-2 mt-2" />
            <MetricRow label="Spend" metric="spend" ads={ads} format={(v) => `$${v.toLocaleString()}`} />
            <MetricRow label="Impressions" metric="impressions" ads={ads} format={(v) => v.toLocaleString()} />
            <MetricRow label="Clicks" metric="clicks" ads={ads} format={(v) => v.toLocaleString()} />
            <MetricRow label="Conversions" metric="conversions" ads={ads} format={(v) => v.toLocaleString()} />
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" /> Above benchmark</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1" /> Borderline</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" /> Below benchmark</span>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify page loads**

Run: `npm run dev`
Expected: Page renders at `/growth/ads/compare?ids=...`

- [ ] **Step 3: Commit**

```bash
git add src/app/\(admin\)/growth/ads/compare/page.tsx
git commit -m "feat(ui): add side-by-side ad comparison page"
```

---

### Task 11: Admin Pages — Integrations List & Meta Settings

**Files:**
- Create: `src/app/(admin)/settings/integrations/page.tsx`
- Create: `src/app/(admin)/settings/integrations/meta/page.tsx`

- [ ] **Step 1: Create integrations list page**

```typescript
// src/app/(admin)/settings/integrations/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { MetaIntegration } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { LogoFacebook } from '@carbon/icons-react'

export default function IntegrationsPage() {
  const router = useRouter()
  const [integration, setIntegration] = useState<MetaIntegration | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchIntegration = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('meta_integrations')
      .select('*')
      .limit(1)
      .single()
    setIntegration(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchIntegration()
  }, [fetchIntegration])

  return (
    <div>
      <div className="grid gap-4 max-w-2xl">
        {/* Meta card */}
        <div
          className="rounded-lg border bg-card p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50"
          onClick={() => router.push('/settings/integrations/meta')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <LogoFacebook size={24} className="text-white" />
            </div>
            <div>
              <div className="font-medium">Meta (Facebook) Ads</div>
              <div className="text-xs text-muted-foreground">Campaign performance tracking and ad management</div>
            </div>
          </div>
          {loading ? (
            <Badge variant="secondary">Loading...</Badge>
          ) : integration?.ad_account_id ? (
            <Badge variant="default">Connected</Badge>
          ) : (
            <Badge variant="secondary">Not Connected</Badge>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create Meta settings page**

```typescript
// src/app/(admin)/settings/integrations/meta/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { MetaIntegration, SyncFrequency } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Connect, Renew, TrashCan } from '@carbon/icons-react'

const SYNC_OPTIONS: { value: SyncFrequency; label: string }[] = [
  { value: '15min', label: '15 min' },
  { value: '30min', label: '30 min' },
  { value: '1hour', label: '1 hour' },
  { value: '6hour', label: '6 hours' },
  { value: '24hour', label: '24 hours' },
]

export default function MetaSettingsPage() {
  const searchParams = useSearchParams()
  const [integration, setIntegration] = useState<MetaIntegration | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncFrequency, setSyncFrequency] = useState<SyncFrequency>('1hour')
  const [filterMode, setFilterMode] = useState<'all' | 'selected'>('all')

  const fetchIntegration = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('meta_integrations')
      .select('*')
      .limit(1)
      .single()

    if (data) {
      setIntegration(data)
      setSyncFrequency(data.sync_frequency)
      setFilterMode(data.campaign_filter ? 'selected' : 'all')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchIntegration()
  }, [fetchIntegration])

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    if (success === 'connected') toast.success('Meta account connected successfully')
    if (error) toast.error(`Connection failed: ${error}`)
  }, [searchParams])

  const handleConnect = () => {
    window.location.href = '/api/admin/ads/auth/meta'
  }

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Meta? This will delete all synced campaign data.')) return

    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    const res = await fetch('/api/admin/ads/integration', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      toast.success('Meta disconnected')
      setIntegration(null)
    } else {
      toast.error('Failed to disconnect')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    const res = await fetch('/api/admin/ads/integration', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ad_account_id: integration?.ad_account_id,
        ad_account_name: integration?.ad_account_name,
        sync_frequency: syncFrequency,
        campaign_filter: filterMode === 'all' ? null : integration?.campaign_filter,
      }),
    })
    if (res.ok) {
      toast.success('Settings saved')
      fetchIntegration()
    } else {
      toast.error('Failed to save settings')
    }
    setSaving(false)
  }

  const handleSyncNow = async () => {
    setSyncing(true)
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    const res = await fetch('/api/admin/ads/sync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      toast.success('Sync started')
      // Poll for completion
      setTimeout(() => {
        fetchIntegration()
        setSyncing(false)
      }, 5000)
    } else {
      toast.error('Failed to trigger sync')
      setSyncing(false)
    }
  }

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
    if (diff < 1) return 'just now'
    if (diff < 60) return `${diff} minutes ago`
    return `${Math.floor(diff / 60)} hours ago`
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>
  }

  // Not connected state
  if (!integration?.ad_account_id) {
    return (
      <div className="max-w-lg">
        <div className="rounded-lg border bg-card p-8 text-center">
          <Connect size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Connect to Meta</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Connect your Meta (Facebook) Ads account to sync campaign data, view ad performance, and compare creatives.
          </p>
          <Button onClick={handleConnect}>
            Connect Meta Account
          </Button>
        </div>
      </div>
    )
  }

  // Fetch ad accounts from Meta API for the dropdown
  const [adAccounts, setAdAccounts] = useState<Array<{ id: string; name: string }>>([])
  const fetchAdAccounts = useCallback(async () => {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    const res = await fetch('/api/admin/ads/meta/ad-accounts', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const { data } = await res.json()
      setAdAccounts(data || [])
    }
  }, [])

  useEffect(() => {
    if (integration?.ad_account_id !== undefined) {
      fetchAdAccounts()
    }
  }, [integration, fetchAdAccounts])

  const handleAccountChange = (accountId: string) => {
    const account = adAccounts.find(a => a.id === accountId)
    if (account && integration) {
      setIntegration({ ...integration, ad_account_id: account.id, ad_account_name: account.name })
    }
  }

  // Connected state
  return (
    <div className="max-w-2xl space-y-6">
      {/* Connection status */}
      <div className="flex items-center justify-between p-4 rounded-lg border border-green-200 bg-green-50">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="font-medium text-green-800">Connected</span>
          <span className="text-sm text-green-700">— {integration.ad_account_name} ({integration.ad_account_id})</span>
        </div>
        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={handleDisconnect}>
          <TrashCan size={16} />
          Disconnect
        </Button>
      </div>

      {/* Ad Account selector */}
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Ad Account</label>
        <select
          className="mt-2 w-full border rounded-md px-3 py-2 text-sm bg-white"
          value={integration.ad_account_id || ''}
          onChange={(e) => handleAccountChange(e.target.value)}
        >
          <option value="">Select an ad account...</option>
          {adAccounts.map((acc) => (
            <option key={acc.id} value={acc.id}>{acc.name} ({acc.id})</option>
          ))}
        </select>
      </div>

      {/* Sync frequency */}
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Sync Frequency</label>
        <div className="flex gap-2 mt-2">
          {SYNC_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`px-3 py-1.5 rounded-md text-sm border ${
                syncFrequency === opt.value
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
              onClick={() => setSyncFrequency(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign filter */}
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Campaign Filter</label>
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              checked={filterMode === 'all'}
              onChange={() => setFilterMode('all')}
              className="accent-primary"
            />
            Sync all campaigns
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              checked={filterMode === 'selected'}
              onChange={() => setFilterMode('selected')}
              className="accent-primary"
            />
            Only sync selected campaigns
          </label>
        </div>
      </div>

      {/* Sync status */}
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Sync Status</label>
        <div className="flex items-center justify-between mt-2 p-3 rounded-lg border bg-card">
          <div className="text-sm">
            {integration.sync_status === 'error' ? (
              <span className="text-red-600">Error: {integration.sync_error}</span>
            ) : integration.last_synced_at ? (
              <span>Last synced {timeAgo(integration.last_synced_at)}</span>
            ) : (
              <span className="text-muted-foreground">Never synced</span>
            )}
          </div>
          <Button size="sm" onClick={handleSyncNow} disabled={syncing}>
            <Renew size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add Renew and Compare icons to icon-map.ts if needed**

Check if `Renew` and `Compare` are already in icon-map.ts. If not, add the imports:
```typescript
import { Renew, Compare } from '@carbon/icons-react'
```
These are used directly in the page components via Carbon imports, not via the icon-map, so no map entries are needed — only ensure the `@carbon/icons-react` package has them.

- [ ] **Step 4: Verify both pages load**

Run: `npm run dev`
Navigate to: `http://localhost:3000/settings/integrations` and `http://localhost:3000/settings/integrations/meta`
Expected: Integrations list shows Meta card, Meta settings shows "Connect to Meta" state.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(admin\)/settings/integrations/
git commit -m "feat(ui): add integrations list and Meta settings pages"
```

---

### Task 12: Final Verification & Cleanup

**Files:** All files from previous tasks

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 2: Verify menu items appear in sidebar**

Run: `npx supabase db push` (if not already done)
Run: `npm run dev`
Login as admin and verify:
- Growth sidebar → mega menu shows "Ads" tab alongside Content and Market
- Settings sidebar → mega menu shows "Integrations" with "Meta" underneath

- [ ] **Step 3: Test navigation flow**

Verify these routes load without errors:
- `/growth/ads` — Campaigns table (empty state)
- `/settings/integrations` — Shows Meta card
- `/settings/integrations/meta` — Shows connect prompt

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve any build or navigation issues in Meta Ads feature"
```

Only run this step if there were actual fixes needed.
