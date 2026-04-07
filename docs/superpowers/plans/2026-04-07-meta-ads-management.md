# Meta Ads Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing read-only Meta Ads feature with full create, edit, pause/resume, and delete capabilities across campaigns, ad sets, and ads, with a multi-step wizard UI and creative image upload.

**Architecture:** All write operations go through Next.js Route Handlers that call Meta's Marketing API v21.0 directly, then upsert results locally in Supabase. Creative images upload to Supabase Storage first, then push to Meta's AdImage API. The wizard is a multi-step form (Campaign -> Ad Set -> Ad) that can be entered at any level, with edit mode via `?edit=` query parameter.

**Tech Stack:** Next.js App Router, TypeScript, Supabase (Postgres + Storage), Meta Marketing API v21.0, Carbon icons, shadcn/ui, Tailwind CSS, Sonner toasts

**Spec:** `docs/superpowers/specs/2026-04-07-meta-ads-management-design.md`

**Required env vars (add to .env.local):**
- `META_PAGE_ID` — Your Facebook Page ID (required for ad creative creation). Find in Facebook Page Settings > Page Transparency.

---

## File Structure

```
src/
  lib/
    meta-api.ts                                       # (modify) Add metaApiPost, metaApiDelete
  components/ads/
    campaign-form.tsx                                  # Campaign fields (simplified + advanced)
    ad-set-form.tsx                                    # Ad set fields (simplified + advanced)
    ad-form.tsx                                        # Ad fields (simplified + advanced)
    ad-preview.tsx                                     # Live Facebook-style ad preview
    image-upload.tsx                                   # Drag-and-drop with preview + upload
    targeting-search.tsx                               # Async multi-select for interests/locations
  app/api/admin/ads/meta/
    campaigns/
      create/route.ts                                  # POST create campaign
      [campaignId]/
        update/route.ts                                # PUT update campaign
        status/route.ts                                # PUT pause/resume/archive
        delete/route.ts                                # DELETE campaign
    ad-sets/
      create/route.ts                                  # POST create ad set
      [adSetId]/
        update/route.ts                                # PUT update ad set
        status/route.ts                                # PUT pause/resume
        delete/route.ts                                # DELETE ad set
    ads/
      create/route.ts                                  # POST create ad (2 Meta API calls)
      [adId]/
        update/route.ts                                # PUT update ad
        status/route.ts                                # PUT pause/resume
        delete/route.ts                                # DELETE ad
    creatives/
      upload/route.ts                                  # POST image upload
    targeting/
      interests/route.ts                               # GET interest search
      locations/route.ts                               # GET location search
  app/(admin)/growth/ads/
    page.tsx                                           # (modify) Add create button + actions
    create/
      page.tsx                                         # Full 3-step wizard
    [campaignId]/
      page.tsx                                         # (modify) Add create button + actions
      create-ad-set/
        page.tsx                                       # 2-step wizard
      [adSetId]/
        page.tsx                                       # (modify) Add create button + actions
        create-ad/
          page.tsx                                     # 1-step wizard

supabase/migrations/
  20260407200001_ad_creatives_bucket.sql                # Storage bucket for ad images
```

---

### Task 1: Meta API Write Helpers + Storage Bucket

**Files:**
- Modify: `src/lib/meta-api.ts`
- Create: `supabase/migrations/20260407200001_ad_creatives_bucket.sql`

**Commit message:** `feat: add metaApiPost/metaApiDelete helpers and ad-creatives storage bucket`

- [ ] **Step 1: Add metaApiPost and metaApiDelete to meta-api.ts**

Replace the entire file:

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

export async function metaApiPost<T>(path: string, body: Record<string, unknown>, options: MetaApiOptions): Promise<T> {
  const url = new URL(`${META_API_BASE}${path}`)
  url.searchParams.set('access_token', options.accessToken)
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error?.message || `Meta API error: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function metaApiPostFormData<T>(path: string, formData: FormData, options: MetaApiOptions): Promise<T> {
  const url = new URL(`${META_API_BASE}${path}`)
  url.searchParams.set('access_token', options.accessToken)
  const res = await fetch(url.toString(), {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error?.message || `Meta API error: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function metaApiDelete(path: string, options: MetaApiOptions): Promise<void> {
  const url = new URL(`${META_API_BASE}${path}`)
  url.searchParams.set('access_token', options.accessToken)
  const res = await fetch(url.toString(), { method: 'DELETE' })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error?.message || `Meta API error: ${res.status}`)
  }
}

export function computeEmqScore(qualityRanking: string, engagementRanking: string, conversionRanking: string): number {
  const rankToScore = (rank: string): number => {
    if (rank.startsWith('ABOVE_AVERAGE')) return 3
    if (rank === 'AVERAGE') return 2
    return 1
  }
  return rankToScore(qualityRanking) + rankToScore(engagementRanking) + rankToScore(conversionRanking)
}
```

- [ ] **Step 2: Create ad-creatives storage bucket migration**

```sql
-- supabase/migrations/20260407200001_ad_creatives_bucket.sql
INSERT INTO storage.buckets (id, name, public) VALUES ('ad-creatives', 'ad-creatives', false)
ON CONFLICT (id) DO NOTHING;
```

---

### Task 2: Campaign CRUD API Routes

**Files:**
- Create: `src/app/api/admin/ads/meta/campaigns/create/route.ts`
- Create: `src/app/api/admin/ads/meta/campaigns/[campaignId]/update/route.ts`
- Create: `src/app/api/admin/ads/meta/campaigns/[campaignId]/status/route.ts`
- Create: `src/app/api/admin/ads/meta/campaigns/[campaignId]/delete/route.ts`

**Commit message:** `feat: add campaign CRUD API routes for Meta Ads management`

- [ ] **Step 1: Create campaign create route**

```typescript
// src/app/api/admin/ads/meta/campaigns/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decrypt } from '@/lib/encryption'
import { metaApiPost } from '@/lib/meta-api'

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

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, objective, daily_budget, status, lifetime_budget, bid_strategy, start_time, stop_time, special_ad_categories } = body

  if (!name || !objective) {
    return NextResponse.json({ error: 'Name and objective are required' }, { status: 400 })
  }
  if (!daily_budget && !lifetime_budget) {
    return NextResponse.json({ error: 'Either daily_budget or lifetime_budget is required' }, { status: 400 })
  }

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('id, access_token_encrypted, ad_account_id')
    .eq('company_id', admin.company_id)
    .single()

  if (!integration?.access_token_encrypted || !integration.ad_account_id) {
    return NextResponse.json({ error: 'Meta not connected or no ad account selected' }, { status: 400 })
  }

  const accessToken = decrypt(integration.access_token_encrypted)

  const metaBody: Record<string, unknown> = {
    name,
    objective,
    status: status || 'PAUSED',
    special_ad_categories: special_ad_categories || [],
  }

  if (daily_budget) metaBody.daily_budget = daily_budget
  if (lifetime_budget) metaBody.lifetime_budget = lifetime_budget
  if (bid_strategy) metaBody.bid_strategy = bid_strategy
  if (start_time) metaBody.start_time = start_time
  if (stop_time) metaBody.stop_time = stop_time

  try {
    const metaResult = await metaApiPost<{ id: string }>(
      `/${integration.ad_account_id}/campaigns`,
      metaBody,
      { accessToken }
    )

    const { data: campaign, error: dbError } = await supabaseAdmin
      .from('meta_campaigns')
      .upsert({
        integration_id: integration.id,
        meta_campaign_id: metaResult.id,
        name,
        status: status || 'PAUSED',
        objective,
        daily_budget: daily_budget ? daily_budget / 100 : null,
        lifetime_budget: lifetime_budget ? lifetime_budget / 100 : null,
        start_time: start_time || null,
        stop_time: stop_time || null,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        synced_at: new Date().toISOString(),
      }, { onConflict: 'meta_campaign_id' })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ campaign })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
```

- [ ] **Step 2: Create campaign update route**

```typescript
// src/app/api/admin/ads/meta/campaigns/[campaignId]/update/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decrypt } from '@/lib/encryption'
import { metaApiPost } from '@/lib/meta-api'

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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { campaignId } = await params
  const body = await request.json()
  const { name, objective, daily_budget, lifetime_budget, bid_strategy, start_time, stop_time, special_ad_categories } = body

  // Look up the meta_campaign_id from the local UUID
  const { data: existingCampaign } = await supabaseAdmin
    .from('meta_campaigns')
    .select('meta_campaign_id, integration_id')
    .eq('id', campaignId)
    .single()

  if (!existingCampaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('access_token_encrypted, ad_account_id')
    .eq('id', existingCampaign.integration_id)
    .single()

  if (!integration?.access_token_encrypted) {
    return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
  }

  const accessToken = decrypt(integration.access_token_encrypted)

  const metaBody: Record<string, unknown> = {}
  if (name) metaBody.name = name
  if (objective) metaBody.objective = objective
  if (daily_budget !== undefined) metaBody.daily_budget = daily_budget
  if (lifetime_budget !== undefined) metaBody.lifetime_budget = lifetime_budget
  if (bid_strategy) metaBody.bid_strategy = bid_strategy
  if (start_time !== undefined) metaBody.start_time = start_time
  if (stop_time !== undefined) metaBody.stop_time = stop_time
  if (special_ad_categories) metaBody.special_ad_categories = special_ad_categories

  try {
    await metaApiPost(
      `/${existingCampaign.meta_campaign_id}`,
      metaBody,
      { accessToken }
    )

    const updateData: Record<string, unknown> = { synced_at: new Date().toISOString() }
    if (name) updateData.name = name
    if (objective) updateData.objective = objective
    if (daily_budget !== undefined) updateData.daily_budget = daily_budget ? daily_budget / 100 : null
    if (lifetime_budget !== undefined) updateData.lifetime_budget = lifetime_budget ? lifetime_budget / 100 : null
    if (start_time !== undefined) updateData.start_time = start_time
    if (stop_time !== undefined) updateData.stop_time = stop_time

    const { data: campaign, error: dbError } = await supabaseAdmin
      .from('meta_campaigns')
      .update(updateData)
      .eq('id', campaignId)
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ campaign })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
```

- [ ] **Step 3: Create campaign status route**

```typescript
// src/app/api/admin/ads/meta/campaigns/[campaignId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decrypt } from '@/lib/encryption'
import { metaApiPost } from '@/lib/meta-api'

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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { campaignId } = await params
  const body = await request.json()
  const { status } = body

  if (!['ACTIVE', 'PAUSED', 'ARCHIVED'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status. Must be ACTIVE, PAUSED, or ARCHIVED' }, { status: 400 })
  }

  const { data: existingCampaign } = await supabaseAdmin
    .from('meta_campaigns')
    .select('meta_campaign_id, integration_id')
    .eq('id', campaignId)
    .single()

  if (!existingCampaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('access_token_encrypted')
    .eq('id', existingCampaign.integration_id)
    .single()

  if (!integration?.access_token_encrypted) {
    return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
  }

  const accessToken = decrypt(integration.access_token_encrypted)

  try {
    await metaApiPost(
      `/${existingCampaign.meta_campaign_id}`,
      { status },
      { accessToken }
    )

    const { data: campaign, error: dbError } = await supabaseAdmin
      .from('meta_campaigns')
      .update({ status, synced_at: new Date().toISOString() })
      .eq('id', campaignId)
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ campaign })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
```

- [ ] **Step 4: Create campaign delete route**

```typescript
// src/app/api/admin/ads/meta/campaigns/[campaignId]/delete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decrypt } from '@/lib/encryption'
import { metaApiDelete } from '@/lib/meta-api'

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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { campaignId } = await params

  const { data: existingCampaign } = await supabaseAdmin
    .from('meta_campaigns')
    .select('meta_campaign_id, integration_id')
    .eq('id', campaignId)
    .single()

  if (!existingCampaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('access_token_encrypted')
    .eq('id', existingCampaign.integration_id)
    .single()

  if (!integration?.access_token_encrypted) {
    return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
  }

  const accessToken = decrypt(integration.access_token_encrypted)

  try {
    await metaApiDelete(`/${existingCampaign.meta_campaign_id}`, { accessToken })

    const { error: dbError } = await supabaseAdmin
      .from('meta_campaigns')
      .delete()
      .eq('id', campaignId)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
```

---

### Task 3: Ad Set CRUD API Routes

**Files:**
- Create: `src/app/api/admin/ads/meta/ad-sets/create/route.ts`
- Create: `src/app/api/admin/ads/meta/ad-sets/[adSetId]/update/route.ts`
- Create: `src/app/api/admin/ads/meta/ad-sets/[adSetId]/status/route.ts`
- Create: `src/app/api/admin/ads/meta/ad-sets/[adSetId]/delete/route.ts`

**Commit message:** `feat: add ad set CRUD API routes for Meta Ads management`

- [ ] **Step 1: Create ad set create route**

```typescript
// src/app/api/admin/ads/meta/ad-sets/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decrypt } from '@/lib/encryption'
import { metaApiPost } from '@/lib/meta-api'

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

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    campaign_id, name, daily_budget, lifetime_budget,
    targeting, optimization_goal, bid_amount,
    start_time, end_time, status
  } = body

  if (!campaign_id || !name) {
    return NextResponse.json({ error: 'campaign_id and name are required' }, { status: 400 })
  }
  if (!daily_budget && !lifetime_budget) {
    return NextResponse.json({ error: 'Either daily_budget or lifetime_budget is required' }, { status: 400 })
  }

  // Look up meta_campaign_id from internal UUID
  const { data: campaign } = await supabaseAdmin
    .from('meta_campaigns')
    .select('meta_campaign_id, integration_id')
    .eq('id', campaign_id)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('id, access_token_encrypted, ad_account_id')
    .eq('id', campaign.integration_id)
    .single()

  if (!integration?.access_token_encrypted || !integration.ad_account_id) {
    return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
  }

  const accessToken = decrypt(integration.access_token_encrypted)

  const metaBody: Record<string, unknown> = {
    campaign_id: campaign.meta_campaign_id,
    name,
    status: status || 'PAUSED',
    billing_event: 'IMPRESSIONS',
  }

  if (daily_budget) metaBody.daily_budget = daily_budget
  if (lifetime_budget) metaBody.lifetime_budget = lifetime_budget
  if (optimization_goal) metaBody.optimization_goal = optimization_goal
  if (bid_amount) metaBody.bid_amount = bid_amount
  if (start_time) metaBody.start_time = start_time
  if (end_time) metaBody.end_time = end_time

  // Build targeting object
  if (targeting) {
    const metaTargeting: Record<string, unknown> = {}
    if (targeting.geo_locations) metaTargeting.geo_locations = targeting.geo_locations
    if (targeting.age_min) metaTargeting.age_min = targeting.age_min
    if (targeting.age_max) metaTargeting.age_max = targeting.age_max
    if (targeting.genders) metaTargeting.genders = targeting.genders
    if (targeting.flexible_spec) metaTargeting.flexible_spec = targeting.flexible_spec
    if (targeting.publisher_platforms) metaTargeting.publisher_platforms = targeting.publisher_platforms
    if (targeting.facebook_positions) metaTargeting.facebook_positions = targeting.facebook_positions
    metaBody.targeting = JSON.stringify(metaTargeting)
  }

  try {
    const metaResult = await metaApiPost<{ id: string }>(
      `/${integration.ad_account_id}/adsets`,
      metaBody,
      { accessToken }
    )

    const { data: adSet, error: dbError } = await supabaseAdmin
      .from('meta_ad_sets')
      .upsert({
        campaign_id,
        meta_ad_set_id: metaResult.id,
        name,
        status: status || 'PAUSED',
        targeting: targeting || null,
        daily_budget: daily_budget ? daily_budget / 100 : null,
        lifetime_budget: lifetime_budget ? lifetime_budget / 100 : null,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        synced_at: new Date().toISOString(),
      }, { onConflict: 'meta_ad_set_id' })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ adSet })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
```

- [ ] **Step 2: Create ad set update route**

```typescript
// src/app/api/admin/ads/meta/ad-sets/[adSetId]/update/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decrypt } from '@/lib/encryption'
import { metaApiPost } from '@/lib/meta-api'

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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ adSetId: string }> }) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { adSetId } = await params
  const body = await request.json()
  const { name, daily_budget, lifetime_budget, targeting, optimization_goal, bid_amount, start_time, end_time } = body

  const { data: existingAdSet } = await supabaseAdmin
    .from('meta_ad_sets')
    .select('meta_ad_set_id, campaign_id')
    .eq('id', adSetId)
    .single()

  if (!existingAdSet) {
    return NextResponse.json({ error: 'Ad set not found' }, { status: 404 })
  }

  const { data: campaign } = await supabaseAdmin
    .from('meta_campaigns')
    .select('integration_id')
    .eq('id', existingAdSet.campaign_id)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Parent campaign not found' }, { status: 404 })
  }

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('access_token_encrypted')
    .eq('id', campaign.integration_id)
    .single()

  if (!integration?.access_token_encrypted) {
    return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
  }

  const accessToken = decrypt(integration.access_token_encrypted)

  const metaBody: Record<string, unknown> = {}
  if (name) metaBody.name = name
  if (daily_budget !== undefined) metaBody.daily_budget = daily_budget
  if (lifetime_budget !== undefined) metaBody.lifetime_budget = lifetime_budget
  if (optimization_goal) metaBody.optimization_goal = optimization_goal
  if (bid_amount !== undefined) metaBody.bid_amount = bid_amount
  if (start_time !== undefined) metaBody.start_time = start_time
  if (end_time !== undefined) metaBody.end_time = end_time

  if (targeting) {
    const metaTargeting: Record<string, unknown> = {}
    if (targeting.geo_locations) metaTargeting.geo_locations = targeting.geo_locations
    if (targeting.age_min) metaTargeting.age_min = targeting.age_min
    if (targeting.age_max) metaTargeting.age_max = targeting.age_max
    if (targeting.genders) metaTargeting.genders = targeting.genders
    if (targeting.flexible_spec) metaTargeting.flexible_spec = targeting.flexible_spec
    if (targeting.publisher_platforms) metaTargeting.publisher_platforms = targeting.publisher_platforms
    if (targeting.facebook_positions) metaTargeting.facebook_positions = targeting.facebook_positions
    metaBody.targeting = JSON.stringify(metaTargeting)
  }

  try {
    await metaApiPost(
      `/${existingAdSet.meta_ad_set_id}`,
      metaBody,
      { accessToken }
    )

    const updateData: Record<string, unknown> = { synced_at: new Date().toISOString() }
    if (name) updateData.name = name
    if (daily_budget !== undefined) updateData.daily_budget = daily_budget ? daily_budget / 100 : null
    if (lifetime_budget !== undefined) updateData.lifetime_budget = lifetime_budget ? lifetime_budget / 100 : null
    if (targeting) updateData.targeting = targeting

    const { data: adSet, error: dbError } = await supabaseAdmin
      .from('meta_ad_sets')
      .update(updateData)
      .eq('id', adSetId)
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ adSet })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
```

- [ ] **Step 3: Create ad set status route**

```typescript
// src/app/api/admin/ads/meta/ad-sets/[adSetId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decrypt } from '@/lib/encryption'
import { metaApiPost } from '@/lib/meta-api'

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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ adSetId: string }> }) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { adSetId } = await params
  const body = await request.json()
  const { status } = body

  if (!['ACTIVE', 'PAUSED', 'ARCHIVED'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { data: existingAdSet } = await supabaseAdmin
    .from('meta_ad_sets')
    .select('meta_ad_set_id, campaign_id')
    .eq('id', adSetId)
    .single()

  if (!existingAdSet) {
    return NextResponse.json({ error: 'Ad set not found' }, { status: 404 })
  }

  const { data: campaign } = await supabaseAdmin
    .from('meta_campaigns')
    .select('integration_id')
    .eq('id', existingAdSet.campaign_id)
    .single()

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('access_token_encrypted')
    .eq('id', campaign!.integration_id)
    .single()

  if (!integration?.access_token_encrypted) {
    return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
  }

  const accessToken = decrypt(integration.access_token_encrypted)

  try {
    await metaApiPost(
      `/${existingAdSet.meta_ad_set_id}`,
      { status },
      { accessToken }
    )

    const { data: adSet, error: dbError } = await supabaseAdmin
      .from('meta_ad_sets')
      .update({ status, synced_at: new Date().toISOString() })
      .eq('id', adSetId)
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ adSet })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
```

- [ ] **Step 4: Create ad set delete route**

```typescript
// src/app/api/admin/ads/meta/ad-sets/[adSetId]/delete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decrypt } from '@/lib/encryption'
import { metaApiDelete } from '@/lib/meta-api'

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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ adSetId: string }> }) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { adSetId } = await params

  const { data: existingAdSet } = await supabaseAdmin
    .from('meta_ad_sets')
    .select('meta_ad_set_id, campaign_id')
    .eq('id', adSetId)
    .single()

  if (!existingAdSet) {
    return NextResponse.json({ error: 'Ad set not found' }, { status: 404 })
  }

  const { data: campaign } = await supabaseAdmin
    .from('meta_campaigns')
    .select('integration_id')
    .eq('id', existingAdSet.campaign_id)
    .single()

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('access_token_encrypted')
    .eq('id', campaign!.integration_id)
    .single()

  if (!integration?.access_token_encrypted) {
    return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
  }

  const accessToken = decrypt(integration.access_token_encrypted)

  try {
    await metaApiDelete(`/${existingAdSet.meta_ad_set_id}`, { accessToken })

    const { error: dbError } = await supabaseAdmin
      .from('meta_ad_sets')
      .delete()
      .eq('id', adSetId)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
```

---

### Task 4: Ad CRUD + Creative Upload + Targeting API Routes

**Files:**
- Create: `src/app/api/admin/ads/meta/ads/create/route.ts`
- Create: `src/app/api/admin/ads/meta/ads/[adId]/update/route.ts`
- Create: `src/app/api/admin/ads/meta/ads/[adId]/status/route.ts`
- Create: `src/app/api/admin/ads/meta/ads/[adId]/delete/route.ts`
- Create: `src/app/api/admin/ads/meta/creatives/upload/route.ts`
- Create: `src/app/api/admin/ads/meta/targeting/interests/route.ts`
- Create: `src/app/api/admin/ads/meta/targeting/locations/route.ts`

**Commit message:** `feat: add ad CRUD, creative upload, and targeting search API routes`

- [ ] **Step 1: Create ad create route (2 Meta API calls: creative + ad)**

```typescript
// src/app/api/admin/ads/meta/ads/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decrypt } from '@/lib/encryption'
import { metaApiPost } from '@/lib/meta-api'

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

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    ad_set_id, name, image_hash, image_url,
    primary_text, headline, link_url,
    call_to_action, status,
    description, display_link, url_tags
  } = body

  if (!ad_set_id || !name || !image_hash || !primary_text || !headline || !link_url) {
    return NextResponse.json({ error: 'ad_set_id, name, image_hash, primary_text, headline, and link_url are required' }, { status: 400 })
  }

  // Look up meta_ad_set_id from internal UUID
  const { data: adSet } = await supabaseAdmin
    .from('meta_ad_sets')
    .select('meta_ad_set_id, campaign_id')
    .eq('id', ad_set_id)
    .single()

  if (!adSet) {
    return NextResponse.json({ error: 'Ad set not found' }, { status: 404 })
  }

  const { data: campaign } = await supabaseAdmin
    .from('meta_campaigns')
    .select('integration_id')
    .eq('id', adSet.campaign_id)
    .single()

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('id, access_token_encrypted, ad_account_id')
    .eq('id', campaign!.integration_id)
    .single()

  if (!integration?.access_token_encrypted || !integration.ad_account_id) {
    return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
  }

  const accessToken = decrypt(integration.access_token_encrypted)
  const cta = call_to_action || 'LEARN_MORE'

  try {
    // Step 1: Create ad creative on Meta
    const creativeBody: Record<string, unknown> = {
      name: `${name} Creative`,
      object_story_spec: JSON.stringify({
        page_id: process.env.META_PAGE_ID,
        link_data: {
          image_hash: image_hash,
          link: link_url,
          message: primary_text,
          name: headline,
          call_to_action: { type: cta },
          ...(description ? { description } : {}),
          ...(display_link ? { caption: display_link } : {}),
        },
      }),
    }
    if (url_tags) creativeBody.url_tags = url_tags

    const creativeResult = await metaApiPost<{ id: string }>(
      `/${integration.ad_account_id}/adcreatives`,
      creativeBody,
      { accessToken }
    )

    // Step 2: Create the ad on Meta linking to the creative and ad set
    const adBody: Record<string, unknown> = {
      name,
      adset_id: adSet.meta_ad_set_id,
      creative: JSON.stringify({ creative_id: creativeResult.id }),
      status: status || 'PAUSED',
    }

    const adResult = await metaApiPost<{ id: string }>(
      `/${integration.ad_account_id}/ads`,
      adBody,
      { accessToken }
    )

    // Upsert locally
    const { data: ad, error: dbError } = await supabaseAdmin
      .from('meta_ads')
      .upsert({
        ad_set_id,
        meta_ad_id: adResult.id,
        name,
        status: status || 'PAUSED',
        creative_id: creativeResult.id,
        creative_thumbnail_url: image_url || null,
        creative_body: primary_text,
        creative_title: headline,
        creative_link_url: link_url,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        synced_at: new Date().toISOString(),
      }, { onConflict: 'meta_ad_id' })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ ad })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
```

- [ ] **Step 2: Create ad update route**

```typescript
// src/app/api/admin/ads/meta/ads/[adId]/update/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decrypt } from '@/lib/encryption'
import { metaApiPost } from '@/lib/meta-api'

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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ adId: string }> }) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { adId } = await params
  const body = await request.json()
  const { name, primary_text, headline, link_url, call_to_action, image_hash, image_url, description, display_link, url_tags } = body

  const { data: existingAd } = await supabaseAdmin
    .from('meta_ads')
    .select('meta_ad_id, ad_set_id, creative_id')
    .eq('id', adId)
    .single()

  if (!existingAd) {
    return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
  }

  const { data: adSet } = await supabaseAdmin
    .from('meta_ad_sets')
    .select('campaign_id')
    .eq('id', existingAd.ad_set_id)
    .single()

  const { data: campaign } = await supabaseAdmin
    .from('meta_campaigns')
    .select('integration_id')
    .eq('id', adSet!.campaign_id)
    .single()

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('access_token_encrypted, ad_account_id')
    .eq('id', campaign!.integration_id)
    .single()

  if (!integration?.access_token_encrypted) {
    return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
  }

  const accessToken = decrypt(integration.access_token_encrypted)

  try {
    // If creative fields changed, create a new creative and update the ad
    const needsNewCreative = image_hash || primary_text || headline || link_url || call_to_action || description || display_link

    let newCreativeId = existingAd.creative_id

    if (needsNewCreative) {
      // Merge incoming fields with existing ad data so Meta gets a complete creative
      const creativeBody: Record<string, unknown> = {
        name: `${name || existingAd.name} Creative`,
        object_story_spec: JSON.stringify({
          page_id: process.env.META_PAGE_ID,
          link_data: {
            image_hash: image_hash || existingAd.creative_id || undefined,
            link: link_url || existingAd.creative_link_url || undefined,
            message: primary_text || existingAd.creative_body || undefined,
            name: headline || existingAd.creative_title || undefined,
            call_to_action: { type: call_to_action || 'LEARN_MORE' },
            ...(description ? { description } : {}),
            ...(display_link ? { caption: display_link } : {}),
          },
        }),
      }
      if (url_tags) creativeBody.url_tags = url_tags

      const creativeResult = await metaApiPost<{ id: string }>(
        `/${integration.ad_account_id}/adcreatives`,
        creativeBody,
        { accessToken }
      )
      newCreativeId = creativeResult.id
    }

    const metaBody: Record<string, unknown> = {}
    if (name) metaBody.name = name
    if (newCreativeId !== existingAd.creative_id) {
      metaBody.creative = JSON.stringify({ creative_id: newCreativeId })
    }

    if (Object.keys(metaBody).length > 0) {
      await metaApiPost(`/${existingAd.meta_ad_id}`, metaBody, { accessToken })
    }

    const updateData: Record<string, unknown> = { synced_at: new Date().toISOString() }
    if (name) updateData.name = name
    if (newCreativeId) updateData.creative_id = newCreativeId
    if (primary_text) updateData.creative_body = primary_text
    if (headline) updateData.creative_title = headline
    if (link_url) updateData.creative_link_url = link_url
    if (image_url) updateData.creative_thumbnail_url = image_url

    const { data: ad, error: dbError } = await supabaseAdmin
      .from('meta_ads')
      .update(updateData)
      .eq('id', adId)
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ ad })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
```

- [ ] **Step 3: Create ad status route**

```typescript
// src/app/api/admin/ads/meta/ads/[adId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decrypt } from '@/lib/encryption'
import { metaApiPost } from '@/lib/meta-api'

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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ adId: string }> }) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { adId } = await params
  const body = await request.json()
  const { status } = body

  if (!['ACTIVE', 'PAUSED', 'ARCHIVED'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { data: existingAd } = await supabaseAdmin
    .from('meta_ads')
    .select('meta_ad_id, ad_set_id')
    .eq('id', adId)
    .single()

  if (!existingAd) {
    return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
  }

  const { data: adSet } = await supabaseAdmin
    .from('meta_ad_sets')
    .select('campaign_id')
    .eq('id', existingAd.ad_set_id)
    .single()

  const { data: campaign } = await supabaseAdmin
    .from('meta_campaigns')
    .select('integration_id')
    .eq('id', adSet!.campaign_id)
    .single()

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('access_token_encrypted')
    .eq('id', campaign!.integration_id)
    .single()

  if (!integration?.access_token_encrypted) {
    return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
  }

  const accessToken = decrypt(integration.access_token_encrypted)

  try {
    await metaApiPost(`/${existingAd.meta_ad_id}`, { status }, { accessToken })

    const { data: ad, error: dbError } = await supabaseAdmin
      .from('meta_ads')
      .update({ status, synced_at: new Date().toISOString() })
      .eq('id', adId)
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ ad })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
```

- [ ] **Step 4: Create ad delete route**

```typescript
// src/app/api/admin/ads/meta/ads/[adId]/delete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decrypt } from '@/lib/encryption'
import { metaApiDelete } from '@/lib/meta-api'

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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ adId: string }> }) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { adId } = await params

  const { data: existingAd } = await supabaseAdmin
    .from('meta_ads')
    .select('meta_ad_id, ad_set_id')
    .eq('id', adId)
    .single()

  if (!existingAd) {
    return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
  }

  const { data: adSet } = await supabaseAdmin
    .from('meta_ad_sets')
    .select('campaign_id')
    .eq('id', existingAd.ad_set_id)
    .single()

  const { data: campaign } = await supabaseAdmin
    .from('meta_campaigns')
    .select('integration_id')
    .eq('id', adSet!.campaign_id)
    .single()

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('access_token_encrypted')
    .eq('id', campaign!.integration_id)
    .single()

  if (!integration?.access_token_encrypted) {
    return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
  }

  const accessToken = decrypt(integration.access_token_encrypted)

  try {
    await metaApiDelete(`/${existingAd.meta_ad_id}`, { accessToken })

    const { error: dbError } = await supabaseAdmin
      .from('meta_ads')
      .delete()
      .eq('id', adId)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
```

- [ ] **Step 5: Create creative upload route**

```typescript
// src/app/api/admin/ads/meta/creatives/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { decrypt } from '@/lib/encryption'
import { metaApiPostFormData } from '@/lib/meta-api'

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

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const validTypes = ['image/jpeg', 'image/png']
  if (!validTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPG and PNG files are allowed' }, { status: 400 })
  }

  if (file.size > 30 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be under 30MB' }, { status: 400 })
  }

  const { data: integration } = await supabaseAdmin
    .from('meta_integrations')
    .select('access_token_encrypted, ad_account_id')
    .eq('company_id', admin.company_id)
    .single()

  if (!integration?.access_token_encrypted || !integration.ad_account_id) {
    return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
  }

  const accessToken = decrypt(integration.access_token_encrypted)

  try {
    // Step 1: Upload to Supabase Storage
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const fileName = `${admin.company_id}/${Date.now()}-${file.name}`

    const { error: storageError } = await supabaseAdmin.storage
      .from('ad-creatives')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (storageError) {
      return NextResponse.json({ error: `Storage upload failed: ${storageError.message}` }, { status: 500 })
    }

    // Get a signed URL for the uploaded file (valid for 1 year)
    const { data: signedUrlData } = await supabaseAdmin.storage
      .from('ad-creatives')
      .createSignedUrl(fileName, 365 * 24 * 60 * 60)

    const imageUrl = signedUrlData?.signedUrl || ''

    // Step 2: Upload to Meta AdImages API
    const metaFormData = new FormData()
    metaFormData.append('filename', file.name)
    metaFormData.append('bytes', fileBuffer.toString('base64'))

    const metaResult = await metaApiPostFormData<{ images: Record<string, { hash: string }> }>(
      `/${integration.ad_account_id}/adimages`,
      metaFormData,
      { accessToken }
    )

    // Extract the image hash from the response
    const imageKeys = Object.keys(metaResult.images || {})
    const imageHash = imageKeys.length > 0 ? metaResult.images[imageKeys[0]].hash : null

    if (!imageHash) {
      return NextResponse.json({ error: 'Failed to get image hash from Meta' }, { status: 500 })
    }

    return NextResponse.json({ image_hash: imageHash, image_url: imageUrl })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
```

- [ ] **Step 6: Create targeting interests search route**

```typescript
// src/app/api/admin/ads/meta/targeting/interests/route.ts
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

  const q = request.nextUrl.searchParams.get('q')
  if (!q || q.length < 2) {
    return NextResponse.json({ data: [] })
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
    const result = await metaApiGet<{ data: Array<{ id: string; name: string; audience_size_lower_bound: number; audience_size_upper_bound: number; path: string[] }> }>(
      '/search',
      { type: 'adinterest', q },
      { accessToken }
    )

    return NextResponse.json({ data: result.data || [] })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
```

- [ ] **Step 7: Create targeting locations search route**

```typescript
// src/app/api/admin/ads/meta/targeting/locations/route.ts
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

  const q = request.nextUrl.searchParams.get('q')
  if (!q || q.length < 2) {
    return NextResponse.json({ data: [] })
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
    const result = await metaApiGet<{ data: Array<{ key: string; name: string; type: string; country_code: string; country_name: string; region: string; supports_region: boolean; supports_city: boolean }> }>(
      '/search',
      { type: 'adgeolocation', q, location_types: '["country","region","city"]' },
      { accessToken }
    )

    return NextResponse.json({ data: result.data || [] })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
```

---

### Task 5: Shared Form Components

**Files:**
- Create: `src/components/ads/campaign-form.tsx`
- Create: `src/components/ads/ad-set-form.tsx`
- Create: `src/components/ads/ad-form.tsx`
- Create: `src/components/ads/ad-preview.tsx`
- Create: `src/components/ads/image-upload.tsx`
- Create: `src/components/ads/targeting-search.tsx`

**Commit message:** `feat: add shared form components for Meta Ads wizard`

- [ ] **Step 1: Create campaign-form.tsx**

```tsx
// src/components/ads/campaign-form.tsx
'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight } from '@carbon/icons-react'

const OBJECTIVES = [
  { value: 'OUTCOME_SALES', label: 'Conversions' },
  { value: 'OUTCOME_TRAFFIC', label: 'Traffic' },
  { value: 'OUTCOME_AWARENESS', label: 'Brand Awareness' },
  { value: 'OUTCOME_LEADS', label: 'Lead Generation' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engagement' },
  { value: 'OUTCOME_APP_PROMOTION', label: 'App Promotion' },
]

const BID_STRATEGIES = [
  { value: 'LOWEST_COST_WITHOUT_CAP', label: 'Lowest Cost' },
  { value: 'LOWEST_COST_WITH_BID_CAP', label: 'Bid Cap' },
  { value: 'COST_CAP', label: 'Cost Cap' },
]

const SPECIAL_CATEGORIES = [
  { value: 'CREDIT', label: 'Credit' },
  { value: 'EMPLOYMENT', label: 'Employment' },
  { value: 'HOUSING', label: 'Housing' },
  { value: 'SOCIAL_ISSUES_ELECTIONS_POLITICS', label: 'Social Issues / Elections / Politics' },
]

export interface CampaignFormData {
  name: string
  objective: string
  daily_budget: number | ''
  status: string
  lifetime_budget: number | ''
  bid_strategy: string
  start_time: string
  stop_time: string
  special_ad_categories: string[]
}

interface CampaignFormProps {
  initialData?: Partial<CampaignFormData>
  onSubmit: (data: CampaignFormData) => void
  onCancel?: () => void
  showNav?: boolean
  nextLabel?: string
}

export default function CampaignForm({ initialData, onSubmit, onCancel, showNav = true, nextLabel = 'Next: Ad Set' }: CampaignFormProps) {
  const [data, setData] = useState<CampaignFormData>({
    name: initialData?.name || '',
    objective: initialData?.objective || 'OUTCOME_TRAFFIC',
    daily_budget: initialData?.daily_budget || '',
    status: initialData?.status || 'PAUSED',
    lifetime_budget: initialData?.lifetime_budget || '',
    bid_strategy: initialData?.bid_strategy || '',
    start_time: initialData?.start_time || '',
    stop_time: initialData?.stop_time || '',
    special_ad_categories: initialData?.special_ad_categories || [],
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!data.name.trim()) newErrors.name = 'Campaign name is required'
    if (!data.objective) newErrors.objective = 'Objective is required'
    if (!data.daily_budget && !data.lifetime_budget) newErrors.daily_budget = 'Budget is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validate()) onSubmit(data)
  }

  const update = (field: keyof CampaignFormData, value: unknown) => {
    setData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  return (
    <div className="space-y-6">
      {/* Campaign Name */}
      <div className="space-y-2">
        <Label htmlFor="campaign-name">Campaign Name *</Label>
        <Input
          id="campaign-name"
          value={data.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="e.g., Summer Sale 2026"
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
      </div>

      {/* Objective */}
      <div className="space-y-2">
        <Label>Objective *</Label>
        <div className="flex flex-wrap gap-2">
          {OBJECTIVES.map((obj) => (
            <button
              key={obj.value}
              type="button"
              onClick={() => update('objective', obj.value)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                data.objective === obj.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-white hover:bg-muted border-border'
              }`}
            >
              {obj.label}
            </button>
          ))}
        </div>
        {errors.objective && <p className="text-xs text-red-500">{errors.objective}</p>}
      </div>

      {/* Daily Budget */}
      <div className="space-y-2">
        <Label htmlFor="daily-budget">Daily Budget (USD) *</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
          <Input
            id="daily-budget"
            type="number"
            min="1"
            step="1"
            value={data.daily_budget}
            onChange={(e) => update('daily_budget', e.target.value ? Number(e.target.value) : '')}
            placeholder="50"
            className={`pl-7 ${errors.daily_budget ? 'border-red-500' : ''}`}
          />
        </div>
        {errors.daily_budget && <p className="text-xs text-red-500">{errors.daily_budget}</p>}
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label>Initial Status</Label>
        <div className="flex gap-2">
          {['PAUSED', 'ACTIVE'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => update('status', s)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                data.status === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-white hover:bg-muted border-border'
              }`}
            >
              {s === 'ACTIVE' ? 'Active' : 'Paused'}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Settings Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {showAdvanced ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        Advanced Settings
      </button>

      {showAdvanced && (
        <div className="space-y-4 pl-4 border-l-2 border-border">
          {/* Lifetime Budget */}
          <div className="space-y-2">
            <Label htmlFor="lifetime-budget">Lifetime Budget (USD) — alternative to daily</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                id="lifetime-budget"
                type="number"
                min="1"
                value={data.lifetime_budget}
                onChange={(e) => update('lifetime_budget', e.target.value ? Number(e.target.value) : '')}
                placeholder="1000"
                className="pl-7"
              />
            </div>
          </div>

          {/* Bid Strategy */}
          <div className="space-y-2">
            <Label>Bid Strategy</Label>
            <div className="flex flex-wrap gap-2">
              {BID_STRATEGIES.map((bs) => (
                <button
                  key={bs.value}
                  type="button"
                  onClick={() => update('bid_strategy', data.bid_strategy === bs.value ? '' : bs.value)}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    data.bid_strategy === bs.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-white hover:bg-muted border-border'
                  }`}
                >
                  {bs.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Date</Label>
              <Input
                id="start-time"
                type="datetime-local"
                value={data.start_time}
                onChange={(e) => update('start_time', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stop-time">End Date</Label>
              <Input
                id="stop-time"
                type="datetime-local"
                value={data.stop_time}
                onChange={(e) => update('stop_time', e.target.value)}
              />
            </div>
          </div>

          {/* Special Ad Categories */}
          <div className="space-y-2">
            <Label>Special Ad Categories</Label>
            <div className="space-y-1.5">
              {SPECIAL_CATEGORIES.map((cat) => (
                <label key={cat.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.special_ad_categories.includes(cat.value)}
                    onChange={(e) => {
                      const updated = e.target.checked
                        ? [...data.special_ad_categories, cat.value]
                        : data.special_ad_categories.filter((c) => c !== cat.value)
                      update('special_ad_categories', updated)
                    }}
                    className="accent-primary"
                  />
                  {cat.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      {showNav && (
        <div className="flex justify-between pt-4 border-t">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
          )}
          <div className="ml-auto">
            <Button onClick={handleSubmit}>{nextLabel} &rarr;</Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create targeting-search.tsx**

```tsx
// src/components/ads/targeting-search.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Close } from '@carbon/icons-react'
import { supabase } from '@/lib/supabase-client'

interface TargetingOption {
  id?: string
  key?: string
  name: string
  type?: string
  country_code?: string
  audience_size_lower_bound?: number
  audience_size_upper_bound?: number
}

interface TargetingSearchProps {
  type: 'interests' | 'locations'
  selected: TargetingOption[]
  onChange: (selected: TargetingOption[]) => void
  placeholder?: string
}

export default function TargetingSearch({ type, selected, onChange, placeholder }: TargetingSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TargetingOption[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout>()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const endpoint = type === 'interests'
        ? `/api/admin/ads/meta/targeting/interests?q=${encodeURIComponent(query)}`
        : `/api/admin/ads/meta/targeting/locations?q=${encodeURIComponent(query)}`

      try {
        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const { data } = await res.json()
          setResults(data || [])
          setShowDropdown(true)
        }
      } catch {
        setResults([])
      }
      setLoading(false)
    }, 300)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, type])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const addItem = (item: TargetingOption) => {
    const key = item.id || item.key || item.name
    if (!selected.find(s => (s.id || s.key || s.name) === key)) {
      onChange([...selected, item])
    }
    setQuery('')
    setShowDropdown(false)
  }

  const removeItem = (item: TargetingOption) => {
    const key = item.id || item.key || item.name
    onChange(selected.filter(s => (s.id || s.key || s.name) !== key))
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Tag chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((item) => (
            <span
              key={item.id || item.key || item.name}
              className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-md"
            >
              {item.name}
              <button type="button" onClick={() => removeItem(item)} className="hover:text-red-500">
                <Close size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setShowDropdown(true)}
        placeholder={placeholder || `Search ${type}...`}
      />

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No results</div>
          ) : (
            results.map((item) => (
              <button
                key={item.id || item.key || item.name}
                type="button"
                onClick={() => addItem(item)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <div className="font-medium">{item.name}</div>
                {item.type && (
                  <div className="text-xs text-muted-foreground">
                    {item.type}{item.country_code ? ` · ${item.country_code}` : ''}
                    {item.audience_size_lower_bound ? ` · ${(item.audience_size_lower_bound / 1000000).toFixed(1)}M–${((item.audience_size_upper_bound || 0) / 1000000).toFixed(1)}M` : ''}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create image-upload.tsx**

```tsx
// src/components/ads/image-upload.tsx
'use client'

import { useState, useRef, useCallback } from 'react'
import { CloudUpload, TrashCan } from '@carbon/icons-react'
import { supabase } from '@/lib/supabase-client'
import { toast } from 'sonner'

interface ImageUploadProps {
  imageUrl: string | null
  imageHash: string | null
  onUploaded: (imageHash: string, imageUrl: string) => void
  onRemoved: () => void
}

export default function ImageUpload({ imageUrl, imageHash, onUploaded, onRemoved }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(async (file: File) => {
    const validTypes = ['image/jpeg', 'image/png']
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPG and PNG files are allowed')
      return
    }
    if (file.size > 30 * 1024 * 1024) {
      toast.error('File must be under 30MB')
      return
    }

    setUploading(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/ads/meta/creatives/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (!res.ok) {
        const { error } = await res.json()
        toast.error(error || 'Upload failed')
        return
      }

      const { image_hash, image_url } = await res.json()
      onUploaded(image_hash, image_url)
      toast.success('Image uploaded')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }, [onUploaded])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }, [uploadFile])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  if (imageUrl && imageHash) {
    return (
      <div className="relative rounded-lg border overflow-hidden">
        <img src={imageUrl} alt="Ad creative" className="w-full aspect-video object-cover" />
        <button
          type="button"
          onClick={() => { onRemoved(); if (fileInputRef.current) fileInputRef.current.value = '' }}
          className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-md hover:bg-red-50 text-red-500 transition-colors"
        >
          <TrashCan size={16} />
        </button>
      </div>
    )
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors ${
        dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
      } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
    >
      <CloudUpload size={32} className="text-muted-foreground" />
      <div className="text-sm text-muted-foreground text-center">
        {uploading ? 'Uploading...' : 'Drag and drop an image here, or click to browse'}
      </div>
      <div className="text-xs text-muted-foreground">JPG or PNG, max 30MB</div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
```

- [ ] **Step 4: Create ad-preview.tsx**

```tsx
// src/components/ads/ad-preview.tsx
'use client'

interface AdPreviewProps {
  primaryText: string
  headline: string
  imageUrl: string | null
  linkUrl: string
  callToAction: string
}

const CTA_LABELS: Record<string, string> = {
  SHOP_NOW: 'Shop Now',
  LEARN_MORE: 'Learn More',
  SIGN_UP: 'Sign Up',
  GET_OFFER: 'Get Offer',
  BOOK_TRAVEL: 'Book Travel',
  CONTACT_US: 'Contact Us',
  DOWNLOAD: 'Download',
  GET_QUOTE: 'Get Quote',
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url || 'example.com'
  }
}

export default function AdPreview({ primaryText, headline, imageUrl, linkUrl, callToAction }: AdPreviewProps) {
  return (
    <div className="border rounded-lg bg-white overflow-hidden max-w-[400px]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
          YB
        </div>
        <div>
          <div className="text-sm font-medium">Your Brand</div>
          <div className="text-xs text-muted-foreground">Sponsored</div>
        </div>
      </div>

      {/* Primary text */}
      <div className="px-4 pb-2 text-sm">
        {primaryText || <span className="text-muted-foreground italic">Your ad text will appear here...</span>}
      </div>

      {/* Image */}
      <div className="aspect-video bg-muted flex items-center justify-center">
        {imageUrl ? (
          <img src={imageUrl} alt="Ad preview" className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm text-muted-foreground">Image preview</span>
        )}
      </div>

      {/* Link bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground uppercase truncate">
            {extractDomain(linkUrl)}
          </div>
          <div className="text-sm font-medium truncate">
            {headline || <span className="text-muted-foreground italic">Headline</span>}
          </div>
        </div>
        <button
          type="button"
          className="ml-3 px-3 py-1.5 bg-gray-200 text-sm font-medium rounded-md whitespace-nowrap"
        >
          {CTA_LABELS[callToAction] || 'Learn More'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create ad-set-form.tsx**

```tsx
// src/components/ads/ad-set-form.tsx
'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight } from '@carbon/icons-react'
import TargetingSearch from './targeting-search'

interface TargetingOption {
  id?: string
  key?: string
  name: string
  type?: string
  country_code?: string
}

const OPTIMIZATION_GOALS = [
  { value: 'OFFSITE_CONVERSIONS', label: 'Conversions' },
  { value: 'LINK_CLICKS', label: 'Link Clicks' },
  { value: 'IMPRESSIONS', label: 'Impressions' },
  { value: 'REACH', label: 'Reach' },
  { value: 'LANDING_PAGE_VIEWS', label: 'Landing Page Views' },
]

const PLATFORMS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'audience_network', label: 'Audience Network' },
  { value: 'messenger', label: 'Messenger' },
]

export interface AdSetFormData {
  name: string
  daily_budget: number | ''
  lifetime_budget: number | ''
  locations: TargetingOption[]
  age_min: number
  age_max: number
  interests: TargetingOption[]
  genders: number[]
  publisher_platforms: string[]
  optimization_goal: string
  start_time: string
  end_time: string
  bid_amount: number | ''
}

interface AdSetFormProps {
  initialData?: Partial<AdSetFormData>
  onSubmit: (data: AdSetFormData) => void
  onBack?: () => void
  onCancel?: () => void
  showNav?: boolean
  nextLabel?: string
}

export default function AdSetForm({ initialData, onSubmit, onBack, onCancel, showNav = true, nextLabel = 'Next: Ad' }: AdSetFormProps) {
  const [data, setData] = useState<AdSetFormData>({
    name: initialData?.name || '',
    daily_budget: initialData?.daily_budget || '',
    lifetime_budget: initialData?.lifetime_budget || '',
    locations: initialData?.locations || [],
    age_min: initialData?.age_min || 18,
    age_max: initialData?.age_max || 65,
    interests: initialData?.interests || [],
    genders: initialData?.genders || [],
    publisher_platforms: initialData?.publisher_platforms || [],
    optimization_goal: initialData?.optimization_goal || '',
    start_time: initialData?.start_time || '',
    end_time: initialData?.end_time || '',
    bid_amount: initialData?.bid_amount || '',
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!data.name.trim()) newErrors.name = 'Ad set name is required'
    if (data.locations.length === 0) newErrors.locations = 'At least one location is required'
    if (!data.daily_budget && !data.lifetime_budget) newErrors.daily_budget = 'Budget is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validate()) onSubmit(data)
  }

  const update = (field: keyof AdSetFormData, value: unknown) => {
    setData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  return (
    <div className="space-y-6">
      {/* Ad Set Name */}
      <div className="space-y-2">
        <Label htmlFor="adset-name">Ad Set Name *</Label>
        <Input
          id="adset-name"
          value={data.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="e.g., AU 25-45 Tech Interest"
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
      </div>

      {/* Locations */}
      <div className="space-y-2">
        <Label>Locations *</Label>
        <TargetingSearch
          type="locations"
          selected={data.locations}
          onChange={(locations) => update('locations', locations)}
          placeholder="Search countries, regions, cities..."
        />
        {errors.locations && <p className="text-xs text-red-500">{errors.locations}</p>}
      </div>

      {/* Age Range */}
      <div className="space-y-2">
        <Label>Age Range</Label>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            min={13}
            max={65}
            value={data.age_min}
            onChange={(e) => update('age_min', Number(e.target.value))}
            className="w-20"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="number"
            min={13}
            max={65}
            value={data.age_max}
            onChange={(e) => update('age_max', Number(e.target.value))}
            className="w-20"
          />
        </div>
      </div>

      {/* Interests */}
      <div className="space-y-2">
        <Label>Interests</Label>
        <TargetingSearch
          type="interests"
          selected={data.interests}
          onChange={(interests) => update('interests', interests)}
          placeholder="Search interests..."
        />
      </div>

      {/* Daily Budget */}
      <div className="space-y-2">
        <Label htmlFor="adset-daily-budget">Daily Budget (USD) *</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
          <Input
            id="adset-daily-budget"
            type="number"
            min="1"
            value={data.daily_budget}
            onChange={(e) => update('daily_budget', e.target.value ? Number(e.target.value) : '')}
            placeholder="25"
            className={`pl-7 ${errors.daily_budget ? 'border-red-500' : ''}`}
          />
        </div>
        {errors.daily_budget && <p className="text-xs text-red-500">{errors.daily_budget}</p>}
      </div>

      {/* Advanced Settings Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {showAdvanced ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        Advanced Settings
      </button>

      {showAdvanced && (
        <div className="space-y-4 pl-4 border-l-2 border-border">
          {/* Gender */}
          <div className="space-y-2">
            <Label>Gender</Label>
            <div className="flex gap-2">
              {[
                { value: [] as number[], label: 'All' },
                { value: [1], label: 'Male' },
                { value: [2], label: 'Female' },
              ].map((g) => (
                <button
                  key={g.label}
                  type="button"
                  onClick={() => update('genders', g.value)}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    JSON.stringify(data.genders) === JSON.stringify(g.value)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-white hover:bg-muted border-border'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Placements */}
          <div className="space-y-2">
            <Label>Placements</Label>
            <div className="space-y-1.5">
              {PLATFORMS.map((p) => (
                <label key={p.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.publisher_platforms.includes(p.value)}
                    onChange={(e) => {
                      const updated = e.target.checked
                        ? [...data.publisher_platforms, p.value]
                        : data.publisher_platforms.filter(v => v !== p.value)
                      update('publisher_platforms', updated)
                    }}
                    className="accent-primary"
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          {/* Optimization Goal */}
          <div className="space-y-2">
            <Label>Optimization Goal</Label>
            <select
              className="border rounded-md px-3 py-1.5 text-sm bg-white w-full"
              value={data.optimization_goal}
              onChange={(e) => update('optimization_goal', e.target.value)}
            >
              <option value="">Default</option>
              {OPTIMIZATION_GOALS.map((og) => (
                <option key={og.value} value={og.value}>{og.label}</option>
              ))}
            </select>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="datetime-local"
                value={data.start_time}
                onChange={(e) => update('start_time', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="datetime-local"
                value={data.end_time}
                onChange={(e) => update('end_time', e.target.value)}
              />
            </div>
          </div>

          {/* Lifetime Budget */}
          <div className="space-y-2">
            <Label>Lifetime Budget (USD)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                min="1"
                value={data.lifetime_budget}
                onChange={(e) => update('lifetime_budget', e.target.value ? Number(e.target.value) : '')}
                className="pl-7"
              />
            </div>
          </div>

          {/* Bid Amount */}
          <div className="space-y-2">
            <Label>Bid Amount (cents)</Label>
            <Input
              type="number"
              min="1"
              value={data.bid_amount}
              onChange={(e) => update('bid_amount', e.target.value ? Number(e.target.value) : '')}
              placeholder="e.g., 500 for $5.00"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      {showNav && (
        <div className="flex justify-between pt-4 border-t">
          <div className="flex gap-2">
            {onCancel && <Button variant="outline" onClick={onCancel}>Cancel</Button>}
            {onBack && <Button variant="outline" onClick={onBack}>&larr; Back</Button>}
          </div>
          <Button onClick={handleSubmit}>{nextLabel} &rarr;</Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Create ad-form.tsx**

```tsx
// src/components/ads/ad-form.tsx
'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight } from '@carbon/icons-react'
import ImageUpload from './image-upload'
import AdPreview from './ad-preview'

const CTA_OPTIONS = [
  { value: 'SHOP_NOW', label: 'Shop Now' },
  { value: 'LEARN_MORE', label: 'Learn More' },
  { value: 'SIGN_UP', label: 'Sign Up' },
  { value: 'GET_OFFER', label: 'Get Offer' },
  { value: 'BOOK_TRAVEL', label: 'Book Travel' },
  { value: 'CONTACT_US', label: 'Contact Us' },
  { value: 'DOWNLOAD', label: 'Download' },
  { value: 'GET_QUOTE', label: 'Get Quote' },
]

export interface AdFormData {
  name: string
  image_hash: string
  image_url: string
  primary_text: string
  headline: string
  link_url: string
  call_to_action: string
  status: string
  description: string
  display_link: string
  url_tags: string
}

interface AdFormProps {
  initialData?: Partial<AdFormData>
  onSubmit: (data: AdFormData) => void
  onBack?: () => void
  onCancel?: () => void
  submitLabel?: string
}

export default function AdForm({ initialData, onSubmit, onBack, onCancel, submitLabel = 'Create' }: AdFormProps) {
  const [data, setData] = useState<AdFormData>({
    name: initialData?.name || '',
    image_hash: initialData?.image_hash || '',
    image_url: initialData?.image_url || '',
    primary_text: initialData?.primary_text || '',
    headline: initialData?.headline || '',
    link_url: initialData?.link_url || '',
    call_to_action: initialData?.call_to_action || 'LEARN_MORE',
    status: initialData?.status || 'PAUSED',
    description: initialData?.description || '',
    display_link: initialData?.display_link || '',
    url_tags: initialData?.url_tags || '',
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!data.name.trim()) newErrors.name = 'Ad name is required'
    if (!data.image_hash) newErrors.image = 'Image is required'
    if (!data.primary_text.trim()) newErrors.primary_text = 'Primary text is required'
    if (!data.headline.trim()) newErrors.headline = 'Headline is required'
    if (!data.link_url.trim()) newErrors.link_url = 'Destination URL is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validate()) onSubmit(data)
  }

  const update = (field: keyof AdFormData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  return (
    <div className="flex gap-8">
      {/* Form fields */}
      <div className="flex-1 space-y-6">
        {/* Ad Name */}
        <div className="space-y-2">
          <Label htmlFor="ad-name">Ad Name *</Label>
          <Input
            id="ad-name"
            value={data.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="e.g., Summer Sale - Image A"
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>

        {/* Image Upload */}
        <div className="space-y-2">
          <Label>Image *</Label>
          <ImageUpload
            imageUrl={data.image_url || null}
            imageHash={data.image_hash || null}
            onUploaded={(hash, url) => {
              setData(prev => ({ ...prev, image_hash: hash, image_url: url }))
              if (errors.image) setErrors(prev => { const n = { ...prev }; delete n.image; return n })
            }}
            onRemoved={() => setData(prev => ({ ...prev, image_hash: '', image_url: '' }))}
          />
          {errors.image && <p className="text-xs text-red-500">{errors.image}</p>}
        </div>

        {/* Primary Text */}
        <div className="space-y-2">
          <Label htmlFor="primary-text">Primary Text *</Label>
          <textarea
            id="primary-text"
            value={data.primary_text}
            onChange={(e) => update('primary_text', e.target.value)}
            placeholder="The main body text of your ad..."
            rows={3}
            className={`w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring ${errors.primary_text ? 'border-red-500' : 'border-input'}`}
          />
          {errors.primary_text && <p className="text-xs text-red-500">{errors.primary_text}</p>}
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <Label htmlFor="headline">Headline *</Label>
          <Input
            id="headline"
            value={data.headline}
            onChange={(e) => update('headline', e.target.value)}
            placeholder="e.g., Save 50% This Weekend"
            className={errors.headline ? 'border-red-500' : ''}
          />
          {errors.headline && <p className="text-xs text-red-500">{errors.headline}</p>}
        </div>

        {/* Destination URL */}
        <div className="space-y-2">
          <Label htmlFor="link-url">Destination URL *</Label>
          <Input
            id="link-url"
            type="url"
            value={data.link_url}
            onChange={(e) => update('link_url', e.target.value)}
            placeholder="https://example.com/landing-page"
            className={errors.link_url ? 'border-red-500' : ''}
          />
          {errors.link_url && <p className="text-xs text-red-500">{errors.link_url}</p>}
        </div>

        {/* Call to Action */}
        <div className="space-y-2">
          <Label>Call to Action</Label>
          <div className="flex flex-wrap gap-2">
            {CTA_OPTIONS.slice(0, 4).map((cta) => (
              <button
                key={cta.value}
                type="button"
                onClick={() => update('call_to_action', cta.value)}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  data.call_to_action === cta.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-white hover:bg-muted border-border'
                }`}
              >
                {cta.label}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Settings Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdvanced ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          Advanced Settings
        </button>

        {showAdvanced && (
          <div className="space-y-4 pl-4 border-l-2 border-border">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={data.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Link description text"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display-link">Display Link</Label>
              <Input
                id="display-link"
                value={data.display_link}
                onChange={(e) => update('display_link', e.target.value)}
                placeholder="example.com/sale"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url-tags">URL Parameters (UTM)</Label>
              <Input
                id="url-tags"
                value={data.url_tags}
                onChange={(e) => update('url_tags', e.target.value)}
                placeholder="utm_source=facebook&utm_medium=cpc"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <div className="flex gap-2">
            {onCancel && <Button variant="outline" onClick={onCancel}>Cancel</Button>}
            {onBack && <Button variant="outline" onClick={onBack}>&larr; Back</Button>}
          </div>
          <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
            {submitLabel}
          </Button>
        </div>
      </div>

      {/* Ad Preview - right side */}
      <div className="hidden lg:block w-[420px] flex-shrink-0">
        <div className="sticky top-8">
          <div className="text-sm font-medium text-muted-foreground mb-3">Ad Preview</div>
          <AdPreview
            primaryText={data.primary_text}
            headline={data.headline}
            imageUrl={data.image_url || null}
            linkUrl={data.link_url}
            callToAction={data.call_to_action}
          />
        </div>
      </div>
    </div>
  )
}
```

---

### Task 6: Wizard Pages

**Files:**
- Create: `src/app/(admin)/growth/ads/create/page.tsx`
- Create: `src/app/(admin)/growth/ads/[campaignId]/create-ad-set/page.tsx`
- Create: `src/app/(admin)/growth/ads/[campaignId]/[adSetId]/create-ad/page.tsx`

**Commit message:** `feat: add multi-step wizard pages for campaign, ad set, and ad creation`

- [ ] **Step 1: Create full 3-step wizard (create/page.tsx)**

```tsx
// src/app/(admin)/growth/ads/create/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { toast } from 'sonner'
import CampaignForm, { CampaignFormData } from '@/components/ads/campaign-form'
import AdSetForm, { AdSetFormData } from '@/components/ads/ad-set-form'
import AdForm, { AdFormData } from '@/components/ads/ad-form'

const STEPS = ['Campaign', 'Ad Set', 'Ad']

function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2 flex-1">
          <div className={`flex items-center gap-2 ${i <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
              i < currentStep ? 'bg-primary text-white border-primary'
                : i === currentStep ? 'border-primary text-primary'
                : 'border-muted-foreground/30 text-muted-foreground'
            }`}>
              {i + 1}
            </div>
            <span className="text-sm font-medium">{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 ${i < currentStep ? 'bg-primary' : 'bg-muted'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function CreateWizardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const isEdit = !!editId
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [campaignData, setCampaignData] = useState<CampaignFormData | null>(null)
  const [adSetData, setAdSetData] = useState<AdSetFormData | null>(null)
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null)
  const [createdAdSetId, setCreatedAdSetId] = useState<string | null>(null)

  // Load existing data for edit mode
  const [initialCampaignData, setInitialCampaignData] = useState<Partial<CampaignFormData> | undefined>()

  useEffect(() => {
    if (editId) {
      const loadCampaign = async () => {
        const { data } = await supabase
          .from('meta_campaigns')
          .select('*')
          .eq('id', editId)
          .single()
        if (data) {
          setInitialCampaignData({
            name: data.name,
            objective: data.objective || '',
            daily_budget: data.daily_budget ? data.daily_budget : '',
            status: data.status || 'PAUSED',
            lifetime_budget: data.lifetime_budget ? data.lifetime_budget : '',
            start_time: data.start_time || '',
            stop_time: data.stop_time || '',
          })
        }
      }
      loadCampaign()
    }
  }, [editId])

  const getAuthHeaders = async () => {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  }

  const handleCampaignSubmit = async (data: CampaignFormData) => {
    if (isEdit) {
      // Update existing campaign
      setSubmitting(true)
      try {
        const headers = await getAuthHeaders()
        const body: Record<string, unknown> = { name: data.name, objective: data.objective }
        if (data.daily_budget) body.daily_budget = Number(data.daily_budget) * 100
        if (data.lifetime_budget) body.lifetime_budget = Number(data.lifetime_budget) * 100
        if (data.bid_strategy) body.bid_strategy = data.bid_strategy
        if (data.start_time) body.start_time = new Date(data.start_time).toISOString()
        if (data.stop_time) body.stop_time = new Date(data.stop_time).toISOString()
        if (data.special_ad_categories.length > 0) body.special_ad_categories = data.special_ad_categories

        const res = await fetch(`/api/admin/ads/meta/campaigns/${editId}/update`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const { error } = await res.json()
          toast.error(error || 'Failed to update campaign')
          return
        }
        toast.success('Campaign updated')
        router.push('/growth/ads')
      } catch {
        toast.error('Failed to update campaign')
      } finally {
        setSubmitting(false)
      }
      return
    }

    setCampaignData(data)
    setStep(1)
  }

  const handleAdSetSubmit = (data: AdSetFormData) => {
    setAdSetData(data)
    setStep(2)
  }

  const handleAdSubmit = async (adData: AdFormData) => {
    if (!campaignData || !adSetData) return
    setSubmitting(true)

    try {
      const headers = await getAuthHeaders()

      // Step 1: Create campaign
      const campaignBody: Record<string, unknown> = {
        name: campaignData.name,
        objective: campaignData.objective,
        status: campaignData.status,
        special_ad_categories: campaignData.special_ad_categories,
      }
      if (campaignData.daily_budget) campaignBody.daily_budget = Number(campaignData.daily_budget) * 100
      if (campaignData.lifetime_budget) campaignBody.lifetime_budget = Number(campaignData.lifetime_budget) * 100
      if (campaignData.bid_strategy) campaignBody.bid_strategy = campaignData.bid_strategy
      if (campaignData.start_time) campaignBody.start_time = new Date(campaignData.start_time).toISOString()
      if (campaignData.stop_time) campaignBody.stop_time = new Date(campaignData.stop_time).toISOString()

      const campaignRes = await fetch('/api/admin/ads/meta/campaigns/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(campaignBody),
      })
      if (!campaignRes.ok) {
        const { error } = await campaignRes.json()
        toast.error(error || 'Failed to create campaign')
        setSubmitting(false)
        return
      }
      const { campaign } = await campaignRes.json()
      setCreatedCampaignId(campaign.id)

      // Step 2: Create ad set
      const targeting: Record<string, unknown> = {
        geo_locations: {
          countries: adSetData.locations
            .filter(l => l.type === 'country' || l.country_code)
            .map(l => l.country_code || l.key || l.name),
        },
        age_min: adSetData.age_min,
        age_max: adSetData.age_max,
      }
      if (adSetData.interests.length > 0) {
        targeting.flexible_spec = [{ interests: adSetData.interests.map(i => ({ id: i.id, name: i.name })) }]
      }
      if (adSetData.genders.length > 0) targeting.genders = adSetData.genders
      if (adSetData.publisher_platforms.length > 0) targeting.publisher_platforms = adSetData.publisher_platforms

      const adSetBody: Record<string, unknown> = {
        campaign_id: campaign.id,
        name: adSetData.name,
        targeting,
      }
      if (adSetData.daily_budget) adSetBody.daily_budget = Number(adSetData.daily_budget) * 100
      if (adSetData.lifetime_budget) adSetBody.lifetime_budget = Number(adSetData.lifetime_budget) * 100
      if (adSetData.optimization_goal) adSetBody.optimization_goal = adSetData.optimization_goal
      if (adSetData.bid_amount) adSetBody.bid_amount = Number(adSetData.bid_amount)
      if (adSetData.start_time) adSetBody.start_time = new Date(adSetData.start_time).toISOString()
      if (adSetData.end_time) adSetBody.end_time = new Date(adSetData.end_time).toISOString()

      const adSetRes = await fetch('/api/admin/ads/meta/ad-sets/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(adSetBody),
      })
      if (!adSetRes.ok) {
        const { error } = await adSetRes.json()
        toast.error(error || 'Failed to create ad set')
        setSubmitting(false)
        return
      }
      const { adSet } = await adSetRes.json()
      setCreatedAdSetId(adSet.id)

      // Step 3: Create ad
      const adBody: Record<string, unknown> = {
        ad_set_id: adSet.id,
        name: adData.name,
        image_hash: adData.image_hash,
        image_url: adData.image_url,
        primary_text: adData.primary_text,
        headline: adData.headline,
        link_url: adData.link_url,
        call_to_action: adData.call_to_action,
        status: adData.status || 'PAUSED',
      }
      if (adData.description) adBody.description = adData.description
      if (adData.display_link) adBody.display_link = adData.display_link
      if (adData.url_tags) adBody.url_tags = adData.url_tags

      const adRes = await fetch('/api/admin/ads/meta/ads/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(adBody),
      })
      if (!adRes.ok) {
        const { error } = await adRes.json()
        toast.error(error || 'Failed to create ad')
        setSubmitting(false)
        return
      }

      toast.success('Campaign, ad set, and ad created successfully')
      router.push('/growth/ads')
    } catch {
      toast.error('An error occurred during creation')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">
        {isEdit ? 'Edit Campaign' : 'Create Campaign'}
      </h1>
      <p className="text-muted-foreground mb-6">
        {isEdit ? 'Update your campaign settings.' : 'Set up a new campaign with an ad set and ad.'}
      </p>

      {!isEdit && <ProgressBar currentStep={step} />}

      {step === 0 && (
        <CampaignForm
          initialData={initialCampaignData}
          onSubmit={handleCampaignSubmit}
          onCancel={() => router.push('/growth/ads')}
          nextLabel={isEdit ? 'Save Changes' : 'Next: Ad Set'}
        />
      )}
      {step === 1 && (
        <AdSetForm
          onSubmit={handleAdSetSubmit}
          onBack={() => setStep(0)}
          onCancel={() => router.push('/growth/ads')}
        />
      )}
      {step === 2 && (
        <div className={submitting ? 'pointer-events-none opacity-60' : ''}>
          <AdForm
            onSubmit={handleAdSubmit}
            onBack={() => setStep(1)}
            onCancel={() => router.push('/growth/ads')}
            submitLabel={submitting ? 'Creating...' : 'Create Campaign'}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create 2-step wizard (create-ad-set/page.tsx)**

```tsx
// src/app/(admin)/growth/ads/[campaignId]/create-ad-set/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { MetaCampaign } from '@/lib/types'
import { toast } from 'sonner'
import AdSetForm, { AdSetFormData } from '@/components/ads/ad-set-form'
import AdForm, { AdFormData } from '@/components/ads/ad-form'

const STEPS = ['Ad Set', 'Ad']

function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2 flex-1">
          <div className={`flex items-center gap-2 ${i <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
              i < currentStep ? 'bg-primary text-white border-primary'
                : i === currentStep ? 'border-primary text-primary'
                : 'border-muted-foreground/30 text-muted-foreground'
            }`}>
              {i + 1}
            </div>
            <span className="text-sm font-medium">{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 ${i < currentStep ? 'bg-primary' : 'bg-muted'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function CreateAdSetWizardPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const campaignId = params.campaignId as string
  const editId = searchParams.get('edit')
  const isEdit = !!editId
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [campaign, setCampaign] = useState<MetaCampaign | null>(null)
  const [adSetData, setAdSetData] = useState<AdSetFormData | null>(null)
  const [initialAdSetData, setInitialAdSetData] = useState<Partial<AdSetFormData> | undefined>()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('meta_campaigns').select('*').eq('id', campaignId).single()
      if (data) setCampaign(data)

      if (editId) {
        const { data: adSet } = await supabase.from('meta_ad_sets').select('*').eq('id', editId).single()
        if (adSet) {
          setInitialAdSetData({
            name: adSet.name,
            daily_budget: adSet.daily_budget || '',
            lifetime_budget: adSet.lifetime_budget || '',
            age_min: adSet.targeting?.age_min as number || 18,
            age_max: adSet.targeting?.age_max as number || 65,
          })
        }
      }
    }
    load()
  }, [campaignId, editId])

  const getAuthHeaders = async () => {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  }

  const handleAdSetSubmit = async (data: AdSetFormData) => {
    if (isEdit) {
      setSubmitting(true)
      try {
        const headers = await getAuthHeaders()
        const targeting: Record<string, unknown> = {
          geo_locations: {
            countries: data.locations.map(l => l.country_code || l.key || l.name),
          },
          age_min: data.age_min,
          age_max: data.age_max,
        }
        if (data.interests.length > 0) {
          targeting.flexible_spec = [{ interests: data.interests.map(i => ({ id: i.id, name: i.name })) }]
        }
        if (data.genders.length > 0) targeting.genders = data.genders

        const body: Record<string, unknown> = { name: data.name, targeting }
        if (data.daily_budget) body.daily_budget = Number(data.daily_budget) * 100
        if (data.lifetime_budget) body.lifetime_budget = Number(data.lifetime_budget) * 100

        const res = await fetch(`/api/admin/ads/meta/ad-sets/${editId}/update`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const { error } = await res.json()
          toast.error(error || 'Failed to update ad set')
          return
        }
        toast.success('Ad set updated')
        router.push(`/growth/ads/${campaignId}`)
      } catch {
        toast.error('Failed to update ad set')
      } finally {
        setSubmitting(false)
      }
      return
    }

    setAdSetData(data)
    setStep(1)
  }

  const handleAdSubmit = async (adData: AdFormData) => {
    if (!adSetData) return
    setSubmitting(true)

    try {
      const headers = await getAuthHeaders()

      // Create ad set
      const targeting: Record<string, unknown> = {
        geo_locations: {
          countries: adSetData.locations.map(l => l.country_code || l.key || l.name),
        },
        age_min: adSetData.age_min,
        age_max: adSetData.age_max,
      }
      if (adSetData.interests.length > 0) {
        targeting.flexible_spec = [{ interests: adSetData.interests.map(i => ({ id: i.id, name: i.name })) }]
      }
      if (adSetData.genders.length > 0) targeting.genders = adSetData.genders

      const adSetBody: Record<string, unknown> = {
        campaign_id: campaignId,
        name: adSetData.name,
        targeting,
      }
      if (adSetData.daily_budget) adSetBody.daily_budget = Number(adSetData.daily_budget) * 100
      if (adSetData.lifetime_budget) adSetBody.lifetime_budget = Number(adSetData.lifetime_budget) * 100
      if (adSetData.optimization_goal) adSetBody.optimization_goal = adSetData.optimization_goal

      const adSetRes = await fetch('/api/admin/ads/meta/ad-sets/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(adSetBody),
      })
      if (!adSetRes.ok) {
        const { error } = await adSetRes.json()
        toast.error(error || 'Failed to create ad set')
        setSubmitting(false)
        return
      }
      const { adSet } = await adSetRes.json()

      // Create ad
      const adBody: Record<string, unknown> = {
        ad_set_id: adSet.id,
        name: adData.name,
        image_hash: adData.image_hash,
        image_url: adData.image_url,
        primary_text: adData.primary_text,
        headline: adData.headline,
        link_url: adData.link_url,
        call_to_action: adData.call_to_action,
        status: adData.status || 'PAUSED',
      }
      if (adData.description) adBody.description = adData.description
      if (adData.display_link) adBody.display_link = adData.display_link
      if (adData.url_tags) adBody.url_tags = adData.url_tags

      const adRes = await fetch('/api/admin/ads/meta/ads/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(adBody),
      })
      if (!adRes.ok) {
        const { error } = await adRes.json()
        toast.error(error || 'Failed to create ad')
        setSubmitting(false)
        return
      }

      toast.success('Ad set and ad created successfully')
      router.push(`/growth/ads/${campaignId}`)
    } catch {
      toast.error('An error occurred during creation')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">
        {isEdit ? 'Edit Ad Set' : 'Add Ad Set'}
      </h1>
      <p className="text-muted-foreground mb-6">
        {campaign ? `For campaign: ${campaign.name}` : 'Loading...'}
      </p>

      {!isEdit && <ProgressBar currentStep={step} />}

      {step === 0 && (
        <AdSetForm
          initialData={initialAdSetData}
          onSubmit={handleAdSetSubmit}
          onCancel={() => router.push(`/growth/ads/${campaignId}`)}
          nextLabel={isEdit ? 'Save Changes' : 'Next: Ad'}
        />
      )}
      {step === 1 && (
        <div className={submitting ? 'pointer-events-none opacity-60' : ''}>
          <AdForm
            onSubmit={handleAdSubmit}
            onBack={() => setStep(0)}
            onCancel={() => router.push(`/growth/ads/${campaignId}`)}
            submitLabel={submitting ? 'Creating...' : 'Create Ad Set'}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create 1-step wizard (create-ad/page.tsx)**

```tsx
// src/app/(admin)/growth/ads/[campaignId]/[adSetId]/create-ad/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { MetaAdSet, MetaCampaign } from '@/lib/types'
import { toast } from 'sonner'
import AdForm, { AdFormData } from '@/components/ads/ad-form'

export default function CreateAdPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const campaignId = params.campaignId as string
  const adSetId = params.adSetId as string
  const editId = searchParams.get('edit')
  const isEdit = !!editId
  const [submitting, setSubmitting] = useState(false)
  const [campaign, setCampaign] = useState<MetaCampaign | null>(null)
  const [adSet, setAdSet] = useState<MetaAdSet | null>(null)
  const [initialAdData, setInitialAdData] = useState<Partial<AdFormData> | undefined>()

  useEffect(() => {
    const load = async () => {
      const [campaignRes, adSetRes] = await Promise.all([
        supabase.from('meta_campaigns').select('*').eq('id', campaignId).single(),
        supabase.from('meta_ad_sets').select('*').eq('id', adSetId).single(),
      ])
      if (campaignRes.data) setCampaign(campaignRes.data)
      if (adSetRes.data) setAdSet(adSetRes.data)

      if (editId) {
        const { data: ad } = await supabase.from('meta_ads').select('*').eq('id', editId).single()
        if (ad) {
          setInitialAdData({
            name: ad.name,
            primary_text: ad.creative_body || '',
            headline: ad.creative_title || '',
            link_url: ad.creative_link_url || '',
            image_url: ad.creative_thumbnail_url || '',
            image_hash: ad.creative_id || '',
          })
        }
      }
    }
    load()
  }, [campaignId, adSetId, editId])

  const handleSubmit = async (adData: AdFormData) => {
    setSubmitting(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

      if (isEdit) {
        const body: Record<string, unknown> = {
          name: adData.name,
          primary_text: adData.primary_text,
          headline: adData.headline,
          link_url: adData.link_url,
          call_to_action: adData.call_to_action,
        }
        if (adData.image_hash) body.image_hash = adData.image_hash
        if (adData.image_url) body.image_url = adData.image_url
        if (adData.description) body.description = adData.description
        if (adData.display_link) body.display_link = adData.display_link
        if (adData.url_tags) body.url_tags = adData.url_tags

        const res = await fetch(`/api/admin/ads/meta/ads/${editId}/update`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const { error } = await res.json()
          toast.error(error || 'Failed to update ad')
          return
        }
        toast.success('Ad updated')
      } else {
        const body: Record<string, unknown> = {
          ad_set_id: adSetId,
          name: adData.name,
          image_hash: adData.image_hash,
          image_url: adData.image_url,
          primary_text: adData.primary_text,
          headline: adData.headline,
          link_url: adData.link_url,
          call_to_action: adData.call_to_action,
          status: adData.status || 'PAUSED',
        }
        if (adData.description) body.description = adData.description
        if (adData.display_link) body.display_link = adData.display_link
        if (adData.url_tags) body.url_tags = adData.url_tags

        const res = await fetch('/api/admin/ads/meta/ads/create', {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const { error } = await res.json()
          toast.error(error || 'Failed to create ad')
          return
        }
        toast.success('Ad created')
      }

      router.push(`/growth/ads/${campaignId}/${adSetId}`)
    } catch {
      toast.error('An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">
        {isEdit ? 'Edit Ad' : 'Add Ad'}
      </h1>
      <p className="text-muted-foreground mb-6">
        {campaign && adSet ? `${campaign.name} > ${adSet.name}` : 'Loading...'}
      </p>

      <div className={submitting ? 'pointer-events-none opacity-60' : ''}>
        <AdForm
          initialData={initialAdData}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/growth/ads/${campaignId}/${adSetId}`)}
          submitLabel={submitting ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Ad')}
        />
      </div>
    </div>
  )
}
```

---

### Task 7: Modify Existing Table Pages (Add Actions + Create Buttons)

**Files:**
- Modify: `src/app/(admin)/growth/ads/page.tsx`
- Modify: `src/app/(admin)/growth/ads/[campaignId]/page.tsx`
- Modify: `src/app/(admin)/growth/ads/[campaignId]/[adSetId]/page.tsx`

**Commit message:** `feat: add create buttons and action columns to campaigns, ad sets, and ads pages`

- [ ] **Step 1: Modify campaigns page — add Create Campaign button + Actions column**

Replace the entire file `src/app/(admin)/growth/ads/page.tsx`:

```tsx
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Time, Add, Pause, Play, Edit, TrashCan } from '@carbon/icons-react'

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
  const [deleteTarget, setDeleteTarget] = useState<MetaCampaign | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

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

  const getAuthHeaders = async () => {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  }

  const handleStatusChange = async (campaign: MetaCampaign, newStatus: string) => {
    setActionLoading(campaign.id)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/ads/meta/campaigns/${campaign.id}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        toast.error(error || 'Failed to update status')
        return
      }
      toast.success(`Campaign ${newStatus === 'ACTIVE' ? 'resumed' : 'paused'}`)
      fetchCampaigns()
    } catch {
      toast.error('Failed to update status')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setActionLoading(deleteTarget.id)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/ads/meta/campaigns/${deleteTarget.id}/delete`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) {
        const { error } = await res.json()
        toast.error(error || 'Failed to delete campaign')
        return
      }
      toast.success('Campaign deleted')
      setDeleteTarget(null)
      fetchCampaigns()
    } catch {
      toast.error('Failed to delete campaign')
    } finally {
      setActionLoading(null)
    }
  }

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
        <div className="flex items-center gap-3">
          {lastSynced && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Time size={14} />
              Last synced {timeAgo(lastSynced)}
            </div>
          )}
          <Button onClick={() => router.push('/growth/ads/create')}>
            <Add size={16} />
            Create Campaign
          </Button>
        </div>
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
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
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
                  <TableCell>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {campaign.status === 'ACTIVE' ? (
                        <button
                          title="Pause"
                          onClick={() => handleStatusChange(campaign, 'PAUSED')}
                          disabled={actionLoading === campaign.id}
                          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          <Pause size={16} />
                        </button>
                      ) : (
                        <button
                          title="Resume"
                          onClick={() => handleStatusChange(campaign, 'ACTIVE')}
                          disabled={actionLoading === campaign.id}
                          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          <Play size={16} />
                        </button>
                      )}
                      <button
                        title="Edit"
                        onClick={() => router.push(`/growth/ads/create?edit=${campaign.id}`)}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        title="Delete"
                        onClick={() => setDeleteTarget(campaign)}
                        disabled={actionLoading === campaign.id}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-red-500 disabled:opacity-50"
                      >
                        <TrashCan size={16} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>
              This will permanently remove it from Meta and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={!!actionLoading}>
              {actionLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Modify ad sets page — add Add Ad Set button + Actions column**

Replace the entire file `src/app/(admin)/growth/ads/[campaignId]/page.tsx`:

```tsx
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
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { ChevronRight, Add, Pause, Play, Edit, TrashCan } from '@carbon/icons-react'

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
  const [deleteTarget, setDeleteTarget] = useState<MetaAdSet | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

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

  const getAuthHeaders = async () => {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  }

  const handleStatusChange = async (adSet: MetaAdSet, newStatus: string) => {
    setActionLoading(adSet.id)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/ads/meta/ad-sets/${adSet.id}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        toast.error(error || 'Failed to update status')
        return
      }
      toast.success(`Ad set ${newStatus === 'ACTIVE' ? 'resumed' : 'paused'}`)
      fetchData()
    } catch {
      toast.error('Failed to update status')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setActionLoading(deleteTarget.id)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/ads/meta/ad-sets/${deleteTarget.id}/delete`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) {
        const { error } = await res.json()
        toast.error(error || 'Failed to delete ad set')
        return
      }
      toast.success('Ad set deleted')
      setDeleteTarget(null)
      fetchData()
    } catch {
      toast.error('Failed to delete ad set')
    } finally {
      setActionLoading(null)
    }
  }

  const summarizeTargeting = (targeting: Record<string, unknown> | null): string => {
    if (!targeting) return '—'
    if (targeting.geo_locations) return 'Geo-targeted'
    if (targeting.custom_audiences) return 'Custom audience'
    return 'Configured'
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="cursor-pointer hover:text-foreground" onClick={() => router.push('/growth/ads')}>Ads</span>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">{campaign?.name || '...'}</span>
        </div>
        <Button onClick={() => router.push(`/growth/ads/${campaignId}/create-ad-set`)}>
          <Add size={16} />
          Add Ad Set
        </Button>
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
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : adSets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
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
                  <TableCell>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {adSet.status === 'ACTIVE' ? (
                        <button
                          title="Pause"
                          onClick={() => handleStatusChange(adSet, 'PAUSED')}
                          disabled={actionLoading === adSet.id}
                          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          <Pause size={16} />
                        </button>
                      ) : (
                        <button
                          title="Resume"
                          onClick={() => handleStatusChange(adSet, 'ACTIVE')}
                          disabled={actionLoading === adSet.id}
                          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          <Play size={16} />
                        </button>
                      )}
                      <button
                        title="Edit"
                        onClick={() => router.push(`/growth/ads/${campaignId}/create-ad-set?edit=${adSet.id}`)}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        title="Delete"
                        onClick={() => setDeleteTarget(adSet)}
                        disabled={actionLoading === adSet.id}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-red-500 disabled:opacity-50"
                      >
                        <TrashCan size={16} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>
              This will permanently remove it from Meta and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={!!actionLoading}>
              {actionLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 3: Modify ads page — add Add Ad button + action buttons on cards**

Replace the entire file `src/app/(admin)/growth/ads/[campaignId]/[adSetId]/page.tsx`:

```tsx
// src/app/(admin)/growth/ads/[campaignId]/[adSetId]/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { MetaAd, MetaAdSet, MetaCampaign } from '@/lib/types'
import { getBenchmarkColor } from '@/lib/ads-benchmarks'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { ChevronRight, Compare, Add, Pause, Play, Edit, TrashCan } from '@carbon/icons-react'

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
  const [deleteTarget, setDeleteTarget] = useState<MetaAd | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

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

  const getAuthHeaders = async () => {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  }

  const handleStatusChange = async (ad: MetaAd, newStatus: string) => {
    setActionLoading(ad.id)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/ads/meta/ads/${ad.id}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        toast.error(error || 'Failed to update status')
        return
      }
      toast.success(`Ad ${newStatus === 'ACTIVE' ? 'resumed' : 'paused'}`)
      fetchData()
    } catch {
      toast.error('Failed to update status')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setActionLoading(deleteTarget.id)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/ads/meta/ads/${deleteTarget.id}/delete`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) {
        const { error } = await res.json()
        toast.error(error || 'Failed to delete ad')
        return
      }
      toast.success('Ad deleted')
      setDeleteTarget(null)
      fetchData()
    } catch {
      toast.error('Failed to delete ad')
    } finally {
      setActionLoading(null)
    }
  }

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
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="cursor-pointer hover:text-foreground" onClick={() => router.push('/growth/ads')}>Ads</span>
          <ChevronRight size={14} />
          <span className="cursor-pointer hover:text-foreground" onClick={() => router.push(`/growth/ads/${campaignId}`)}>
            {campaign?.name || '...'}
          </span>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">{adSet?.name || '...'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleCompare}
            disabled={selectedIds.size < 2}
          >
            <Compare size={16} />
            Compare Selected ({selectedIds.size}/4)
          </Button>
          <Button onClick={() => router.push(`/growth/ads/${campaignId}/${adSetId}/create-ad`)}>
            <Add size={16} />
            Add Ad
          </Button>
        </div>
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
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{ad.name}</div>
                  <Badge variant={ad.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-[10px]">
                    {ad.status || '—'}
                  </Badge>
                </div>
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

              {/* Stats + actions */}
              <div className="flex items-center justify-between mt-auto pt-2 border-t">
                <div className="text-xs text-muted-foreground">
                  ${ad.spend.toLocaleString()} · {ad.conversions} conv.
                </div>
                <div className="flex items-center gap-0.5">
                  {ad.status === 'ACTIVE' ? (
                    <button
                      title="Pause"
                      onClick={() => handleStatusChange(ad, 'PAUSED')}
                      disabled={actionLoading === ad.id}
                      className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      <Pause size={14} />
                    </button>
                  ) : (
                    <button
                      title="Resume"
                      onClick={() => handleStatusChange(ad, 'ACTIVE')}
                      disabled={actionLoading === ad.id}
                      className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      <Play size={14} />
                    </button>
                  )}
                  <button
                    title="Edit"
                    onClick={() => router.push(`/growth/ads/${campaignId}/${adSetId}/create-ad?edit=${ad.id}`)}
                    className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    title="Delete"
                    onClick={() => setDeleteTarget(ad)}
                    disabled={actionLoading === ad.id}
                    className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-red-500 disabled:opacity-50"
                  >
                    <TrashCan size={14} />
                  </button>
                  <label className="flex items-center gap-1 text-xs cursor-pointer ml-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(ad.id)}
                      onChange={() => toggleSelect(ad.id)}
                      className="accent-primary"
                    />
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>
              This will permanently remove it from Meta and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={!!actionLoading}>
              {actionLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

---

### Task 8: Final Verification

**Commit message:** N/A (no code changes, verification only)

- [ ] **Step 1: Run build check**

```bash
npm run build
```

Fix any TypeScript or build errors that arise.

- [ ] **Step 2: Manual navigation test**

Run `npm run dev` and verify:
1. `/growth/ads` shows the campaigns table with "Create Campaign" button and Actions column
2. Clicking "Create Campaign" navigates to `/growth/ads/create` with 3-step wizard
3. Clicking into a campaign shows ad sets table with "Add Ad Set" button and Actions column
4. Clicking into an ad set shows ads card grid with "Add Ad" button and action icons on cards
5. Pause/Resume buttons toggle status (requires Meta connection)
6. Delete button shows confirmation dialog
7. Edit button navigates to wizard with `?edit=` parameter
