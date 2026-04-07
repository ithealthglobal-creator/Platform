# Meta Ads Feature — Design Spec

## Overview

Add a Meta (Facebook) Ads management feature to the IThealth.ai admin platform. Users can view synced campaign performance data, drill down through campaigns → ad sets → individual ads, compare up to 4 ads side by side, and manage their Meta integration settings. Performance metrics are color-coded against 2026 industry benchmarks.

## Menu Placement

- **Growth > Ads** — New L2 menu item under the existing Growth L1 (sibling to Content and Market)
- **Settings > Integrations > Meta** — New L2 "Integrations" under Settings, with L3 "Meta" underneath

### Menu Items to Seed

| Level | Label | Route | Icon | Sort Order | Parent |
|-------|-------|-------|------|------------|--------|
| L2 | Ads | /growth/ads | campaign | 30 | Growth |
| L2 | Integrations | /settings/integrations | connect | 20 | Settings |
| L3 | Meta | /settings/integrations/meta | logo--facebook | 10 | Integrations |

## Database Schema

### meta_integrations

Stores OAuth credentials and sync configuration. One row per company.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| company_id | uuid FK → companies | Unique — one integration per company |
| meta_app_id | text | Meta App ID |
| meta_app_secret_encrypted | text | Encrypted Meta App Secret |
| access_token_encrypted | text | Encrypted long-lived user access token |
| ad_account_id | text | Selected Meta Ad Account ID (e.g., act_123456789) |
| ad_account_name | text | Display name for the selected account |
| sync_frequency | text | '15min' \| '30min' \| '1hour' \| '6hour' \| '24hour' |
| campaign_filter | jsonb | `{ "include": ["id1", "id2"] }` or null for all campaigns |
| last_synced_at | timestamptz | Timestamp of last successful sync |
| sync_status | text | 'idle' \| 'syncing' \| 'error' |
| sync_error | text | Last error message (null when idle) |
| is_active | boolean | default true |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

**Constraints:** Unique on company_id (one Meta integration per company).

### meta_campaigns

Synced campaign data from Meta Marketing API.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| integration_id | uuid FK → meta_integrations | ON DELETE CASCADE |
| meta_campaign_id | text | Meta's campaign ID (unique per integration) |
| name | text | Campaign name |
| status | text | ACTIVE \| PAUSED \| DELETED \| ARCHIVED |
| objective | text | CONVERSIONS \| TRAFFIC \| REACH \| etc. |
| daily_budget | numeric | In account currency |
| lifetime_budget | numeric | |
| spend | numeric | Total spend |
| impressions | bigint | |
| clicks | bigint | |
| ctr | numeric | Click-through rate |
| cpm | numeric | Cost per 1000 impressions |
| cpa | numeric | Cost per action |
| conversions | bigint | |
| start_time | timestamptz | Campaign start |
| stop_time | timestamptz | Campaign end (null if ongoing) |
| synced_at | timestamptz | When this row was last synced |

**Constraints:** Unique on (integration_id, meta_campaign_id).

### meta_ad_sets

Synced ad set data.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| campaign_id | uuid FK → meta_campaigns | ON DELETE CASCADE |
| meta_ad_set_id | text | Meta's ad set ID |
| name | text | |
| status | text | ACTIVE \| PAUSED \| etc. |
| targeting | jsonb | Audience targeting configuration from Meta |
| daily_budget | numeric | |
| lifetime_budget | numeric | |
| spend | numeric | |
| impressions | bigint | |
| clicks | bigint | |
| ctr | numeric | |
| cpm | numeric | |
| cpa | numeric | |
| conversions | bigint | |
| synced_at | timestamptz | |

**Constraints:** Unique on (campaign_id, meta_ad_set_id).

### meta_ads

Synced individual ad data including creative assets and all performance metrics.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| ad_set_id | uuid FK → meta_ad_sets | ON DELETE CASCADE |
| meta_ad_id | text | Meta's ad ID |
| name | text | |
| status | text | |
| creative_id | text | Meta creative object ID |
| creative_thumbnail_url | text | Ad image or video thumbnail URL |
| creative_body | text | Ad copy / primary text |
| creative_title | text | Ad headline |
| creative_link_url | text | Destination URL |
| hook_rate | numeric | 3-second video view rate (video_p25_watched_actions / impressions for video, null for static) |
| ctr | numeric | Link click-through rate |
| cpm | numeric | Cost per 1000 impressions |
| cpa | numeric | Cost per action |
| spend | numeric | |
| impressions | bigint | |
| clicks | bigint | |
| conversions | bigint | |
| emq_score | numeric | Estimated Meta Quality score (from quality_ranking, engagement_rate_ranking, conversion_rate_ranking) |
| synced_at | timestamptz | |

**Constraints:** Unique on (ad_set_id, meta_ad_id).

### Relationships

```
meta_integrations (1) → (N) meta_campaigns (1) → (N) meta_ad_sets (1) → (N) meta_ads
```

All foreign keys use ON DELETE CASCADE so disconnecting an integration cleans up all synced data.

### RLS Policies

- Admin role: full read/write on all four tables
- Non-admin: no access (ads management is admin-only)
- Access pattern matches existing admin-only tables (companies, profiles)

## Route Structure

| Route | Purpose | Data Source |
|-------|---------|-------------|
| /growth/ads/ | Campaigns table | Supabase |
| /growth/ads/[campaignId]/ | Ad Sets table for a campaign | Supabase |
| /growth/ads/[campaignId]/[adSetId]/ | Ads list (cards) for an ad set | Supabase |
| /growth/ads/compare?ids=id1,id2,... | Side-by-side comparison (up to 4) | Meta API (live) |
| /settings/integrations/ | Integrations list page | Supabase |
| /settings/integrations/meta/ | Meta connection & sync settings | Supabase + Meta API |

All pages are client components (`"use client"`) consistent with the existing admin pattern.

## Page Designs

### Campaigns Table (`/growth/ads/`)

- Standard admin table (matches existing CRUD patterns)
- Columns: Campaign Name (clickable link), Status (badge), Objective, Spend, Impressions, CTR, CPA, Conversions
- CTR and CPA columns use color-coded badges (green/amber/red) against benchmarks
- Status filter dropdown (Active, Paused, All)
- "Last synced X minutes ago" indicator in header
- Click campaign name → navigates to `/growth/ads/[campaignId]/`
- Empty state: "No campaigns synced. Connect your Meta account in Settings > Integrations."

### Ad Sets Table (`/growth/ads/[campaignId]/`)

- Breadcrumb: Ads > [Campaign Name]
- Table columns: Ad Set Name (clickable), Status (badge), Targeting (summary text from jsonb), Spend, CTR, CPA, CPM, Conversions
- Color-coded CTR and CPA badges
- Click ad set name → navigates to `/growth/ads/[campaignId]/[adSetId]/`

### Ads View (`/growth/ads/[campaignId]/[adSetId]/`)

- Breadcrumb: Ads > [Campaign Name] > [Ad Set Name]
- Card grid layout (not a table) — each card shows:
  - Creative thumbnail image (or placeholder if unavailable)
  - Ad name, headline, body text preview
  - All 5 benchmark metrics as color-coded badges: Hook Rate, CTR, CPA, CPM (no color), EMQ Score
  - Spend and Conversions as plain values
  - Checkbox "Select to compare"
- "Compare Selected (N/4)" button — enabled when 2+ ads selected, max 4
- Clicking Compare navigates to `/growth/ads/compare?ids=id1,id2,...`

### Ad Comparison (`/growth/ads/compare?ids=...`)

- Grid layout: 2 columns for 2 ads, 2x2 for 3-4 ads
- Each column is a full ad card:
  - Large creative image at top
  - Ad name and copy text
  - All 5 metrics with color-coded badges, aligned row-by-row across cards for easy scanning
  - Spend and conversions
- Data fetched live from Meta API via `/api/admin/ads/meta/ads/compare`
- Breadcrumb back to the originating ad set
- Legend bar: Green = above benchmark, Amber = borderline, Red = below benchmark

### Integrations List (`/settings/integrations/`)

- Simple card/list showing available integrations
- Meta card with connection status (Connected/Not Connected) and link to `/settings/integrations/meta/`
- Designed to be extensible for future integrations (Google Ads, LinkedIn, etc.)

### Meta Settings (`/settings/integrations/meta/`)

**Not connected state:**
- "Connect to Meta" button that initiates OAuth flow
- Brief explanation of what connecting enables

**Connected state:**
- Connection status banner (green, with account name and ID, Disconnect button)
- Ad Account dropdown (fetched live from Meta API)
- Sync Frequency toggle: 15 min | 30 min | 1 hour | 6 hours | 24 hours
- Campaign Filter: radio toggle between "Sync all campaigns" and "Only sync selected" with checkboxes
- Sync Status: last synced time, item counts, "Sync Now" button
- Save Settings button

## API Routes

All under `/api/admin/ads/`. All require authenticated admin session. Use Supabase service_role client for DB operations (consistent with `/api/admin/users/` pattern).

### Integration Management

| Method | Route | Purpose |
|--------|-------|---------|
| GET | /api/admin/ads/integration | Get current Meta integration config |
| POST | /api/admin/ads/integration | Create or update integration settings |
| DELETE | /api/admin/ads/integration | Disconnect Meta (deletes integration + cascades synced data) |

### OAuth Flow

| Method | Route | Purpose |
|--------|-------|---------|
| GET | /api/admin/ads/auth/meta | Redirect to Meta OAuth consent screen |
| GET | /api/admin/ads/auth/meta/callback | Exchange auth code for long-lived token, save to meta_integrations |

**OAuth flow details:**
1. Frontend calls `/api/admin/ads/auth/meta` which redirects to Meta's OAuth dialog
2. User grants permissions (ads_read, ads_management)
3. Meta redirects to `/api/admin/ads/auth/meta/callback` with auth code
4. Callback exchanges code for short-lived token, then exchanges for long-lived token (60-day expiry)
5. Token stored encrypted in meta_integrations.access_token_encrypted
6. Redirect back to `/settings/integrations/meta/` with success toast

### Meta API Proxy (Live Data)

| Method | Route | Purpose |
|--------|-------|---------|
| GET | /api/admin/ads/meta/ad-accounts | List ad accounts for the authenticated user |
| GET | /api/admin/ads/meta/campaigns | List campaigns (for campaign filter picker) |
| GET | /api/admin/ads/meta/ads/[adId] | Get live ad detail with fresh metrics |
| GET | /api/admin/ads/meta/ads/compare?ids=a,b,c,d | Get live data for multiple ads |

These endpoints read the access token from meta_integrations, call Meta's Marketing API, and return the response. No data is persisted — these are for real-time detail/comparison views.

### Sync

| Method | Route | Purpose |
|--------|-------|---------|
| POST | /api/admin/ads/sync | Trigger a manual sync |
| GET | /api/admin/ads/sync/status | Get current sync status and last_synced_at |

## Sync Architecture

### Flow

1. **Trigger**: pg_cron job (based on sync_frequency) OR manual "Sync Now" from UI
2. **Start**: Set sync_status = 'syncing' on meta_integrations row
3. **Fetch from Meta**: Using the stored access token:
   - GET `/act_{ad_account_id}/campaigns` with fields and insights
   - For each campaign: GET `/{campaign_id}/adsets` with fields and insights
   - For each ad set: GET `/{adset_id}/ads` with fields, insights, and creative data
4. **Upsert to Supabase**: Upsert each entity using the meta_*_id as the conflict key. Update synced_at on each row.
5. **Complete**: Set sync_status = 'idle', update last_synced_at
6. **On error**: Set sync_status = 'error', save error message to sync_error

### Campaign Filtering

If campaign_filter is set (not null), only sync campaigns whose meta_campaign_id is in the include list. Skip all others.

### Token Expiry Handling

Long-lived tokens expire after 60 days. If Meta returns an auth error during sync:
1. Set sync_status = 'error'
2. Set sync_error = 'Access token expired. Please reconnect your Meta account.'
3. The UI shows this error on the settings page with a re-connect prompt

### pg_cron Scheduling

A single pg_cron entry calls the sync endpoint. The Route Handler checks the sync_frequency value and compares against last_synced_at to decide whether to actually execute. This means the cron runs frequently (e.g., every 15 minutes) but the sync only executes when the configured interval has elapsed.

## Benchmark Thresholds

Hardcoded constants in a shared lib file (`src/lib/ads-benchmarks.ts`). Used by all pages that display metrics.

| Metric | Green | Amber | Red |
|--------|-------|-------|-----|
| Hook Rate | >= 25% | 20% – 25% | < 20% |
| CTR (Link) | >= 1.5% | 1.0% – 1.5% | < 1.0% |
| CPA | <= $23.10 | $23.10 – $30.00 | > $30.00 |
| CPM | No color coding | (varies by industry) | |
| EMQ Score | >= 6.0 | 4.0 – 6.0 | < 4.0 |

A utility function `getBenchmarkColor(metric: string, value: number): 'green' | 'amber' | 'red' | null` returns the appropriate color for any metric value.

## Navigation & UX

### Breadcrumbs

Every drill-down page shows a breadcrumb trail:
- Campaigns: `Ads`
- Ad Sets: `Ads > Summer Sale 2026`
- Ads: `Ads > Summer Sale 2026 > Lookalike - Purchasers`
- Compare: `Ads > Summer Sale 2026 > Lookalike - Purchasers > Compare (3 ads)`

### Empty States

- No integration: "Connect your Meta account in Settings > Integrations to start syncing campaigns."
- Integration connected but not synced: "Sync in progress..." or "Click Sync Now to pull your campaign data."
- No campaigns after sync: "No campaigns found in your Meta ad account."

### Loading States

- Skeleton loaders for table rows and ad cards (consistent with existing pattern)
- Spinner for live Meta API calls (detail/comparison views)
- "Syncing..." indicator with spinner when sync is in progress

### Error Handling

- Meta API errors show toast notification with error message
- Sync errors shown on settings page with error details
- Token expiry prompts reconnection
- Network errors show retry option

## File Structure

```
src/
  app/(admin)/
    growth/ads/
      page.tsx                          # Campaigns table
      [campaignId]/
        page.tsx                        # Ad Sets table
        [adSetId]/
          page.tsx                      # Ads card grid
      compare/
        page.tsx                        # Side-by-side comparison
    settings/integrations/
      page.tsx                          # Integrations list
      meta/
        page.tsx                        # Meta settings
  lib/
    ads-benchmarks.ts                   # Benchmark thresholds + getBenchmarkColor()
  app/api/admin/ads/
    integration/
      route.ts                          # GET/POST/DELETE integration
    auth/meta/
      route.ts                          # OAuth redirect
      callback/
        route.ts                        # OAuth callback
    meta/
      ad-accounts/
        route.ts                        # List ad accounts
      campaigns/
        route.ts                        # List campaigns (for filter picker)
      ads/
        [adId]/
          route.ts                      # Live ad detail
        compare/
          route.ts                      # Live multi-ad comparison
    sync/
      route.ts                          # POST trigger sync
      status/
        route.ts                        # GET sync status

supabase/migrations/
  20260407000001_create_meta_integrations.sql
  20260407000002_create_meta_campaigns.sql
  20260407000003_create_meta_ad_sets.sql
  20260407000004_create_meta_ads.sql
  20260407000005_meta_ads_rls.sql
  20260407000006_seed_ads_menu_items.sql
```

## Out of Scope

- Creating or editing campaigns/ads from within IThealth (read-only from Meta)
- Multi-account support (one Meta integration per company)
- Custom benchmark thresholds (hardcoded for now)
- Webhook/notification alerts for poor performance
- Google Ads, LinkedIn, or other ad platform integrations
- Mobile/responsive layout (desktop-only per project conventions)
