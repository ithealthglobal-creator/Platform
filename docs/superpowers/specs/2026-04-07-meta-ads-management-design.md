# Meta Ads Management — Design Spec

## Overview

Extend the existing read-only Meta Ads feature with full create, edit, pause/resume, and delete capabilities across all three levels: campaigns, ad sets, and ads. Users can create ads through a step-by-step wizard with simplified defaults and an advanced toggle for power users. Creative images are uploaded directly in IThealth, stored in Supabase Storage, and pushed to Meta. All write operations go through Next.js Route Handlers that call Meta's Marketing API directly, then immediately upsert the result locally.

## Prerequisites

This spec extends the existing Meta Ads feature (spec: `2026-04-07-meta-ads-feature-design.md`). All existing tables, API routes, pages, sync mechanism, comparison, and settings remain unchanged.

## Architecture

**Direct Meta API Writes:** All create/edit/delete operations POST to Meta's Marketing API v21.0 through Next.js Route Handlers. On success, the returned entity is upserted into the local Supabase table immediately. On failure, Meta's error message is surfaced to the user via toast. No local data is written on failure.

**Creative Upload Flow:** Image files go to Supabase Storage (`ad-creatives` bucket) first, then are pushed to Meta's AdImage API which returns an `image_hash`. The hash is used when creating the ad creative object on Meta.

**Wizard Pattern:** A multi-step form with progress indicator. Each step corresponds to one level (Campaign → Ad Set → Ad). The wizard can be entered at any level — full 3-step from campaigns page, 2-step from ad sets page, 1-step from ads page. Edit mode reuses the same wizard, pre-filled with current values via `?edit=` query parameter.

## New API Routes

All under `/api/admin/ads/meta/`. All require authenticated admin session. All follow the pattern: validate input → decrypt Meta token → call Meta API → upsert local → return result.

### Campaign CRUD

| Method | Route | Purpose |
|--------|-------|---------|
| POST | /api/admin/ads/meta/campaigns/create | Create campaign on Meta, upsert locally |
| PUT | /api/admin/ads/meta/campaigns/[campaignId]/update | Update campaign fields on Meta + local |
| PUT | /api/admin/ads/meta/campaigns/[campaignId]/status | Pause/resume/archive on Meta + local |
| DELETE | /api/admin/ads/meta/campaigns/[campaignId]/delete | Delete on Meta, remove locally |

**Create payload (simplified fields):**
- `name` (required) — Campaign name
- `objective` (required) — OUTCOME_SALES, OUTCOME_TRAFFIC, OUTCOME_AWARENESS, OUTCOME_LEADS, OUTCOME_ENGAGEMENT, OUTCOME_APP_PROMOTION
- `daily_budget` (required) — In cents (e.g., 5000 for $50)
- `status` — ACTIVE or PAUSED (default: PAUSED)

**Create payload (advanced fields):**
- `lifetime_budget` — Alternative to daily_budget
- `bid_strategy` — LOWEST_COST_WITHOUT_CAP, LOWEST_COST_WITH_BID_CAP, COST_CAP
- `start_time` / `stop_time` — ISO 8601 timestamps
- `special_ad_categories` — Array: CREDIT, EMPLOYMENT, HOUSING, SOCIAL_ISSUES_ELECTIONS_POLITICS, or empty

**Status payload:**
- `status` — ACTIVE, PAUSED, or ARCHIVED

### Ad Set CRUD

| Method | Route | Purpose |
|--------|-------|---------|
| POST | /api/admin/ads/meta/ad-sets/create | Create ad set on Meta, upsert locally |
| PUT | /api/admin/ads/meta/ad-sets/[adSetId]/update | Update ad set on Meta + local |
| PUT | /api/admin/ads/meta/ad-sets/[adSetId]/status | Pause/resume on Meta + local |
| DELETE | /api/admin/ads/meta/ad-sets/[adSetId]/delete | Delete on Meta, remove locally |

**Create payload (simplified fields):**
- `campaign_id` (required) — Internal UUID of parent campaign
- `name` (required) — Ad set name
- `daily_budget` (required) — In cents
- `targeting.geo_locations.countries` (required) — Array of country codes (e.g., ["AU", "US"])
- `targeting.age_min` — Minimum age (default: 18)
- `targeting.age_max` — Maximum age (default: 65)
- `targeting.flexible_spec` — Array of interest objects from targeting search

**Create payload (advanced fields):**
- `targeting.genders` — Array: [1] male, [2] female, or omit for all
- `targeting.publisher_platforms` — Array: facebook, instagram, audience_network, messenger
- `targeting.facebook_positions` — Array: feed, story, reels, etc.
- `custom_audiences` — Array of custom audience IDs
- `optimization_goal` — OFFSITE_CONVERSIONS, LINK_CLICKS, IMPRESSIONS, REACH, etc.
- `start_time` / `end_time` — ISO 8601 timestamps
- `bid_amount` — Manual bid in cents
- `lifetime_budget` — Alternative to daily_budget

**ID mapping:** The `campaign_id` in the payload is an internal UUID. The Route Handler looks up the `meta_campaign_id` and uses that when calling Meta's API.

### Ad CRUD

| Method | Route | Purpose |
|--------|-------|---------|
| POST | /api/admin/ads/meta/ads/create | Upload creative + create ad on Meta, upsert locally |
| PUT | /api/admin/ads/meta/ads/[adId]/update | Update ad on Meta + local |
| PUT | /api/admin/ads/meta/ads/[adId]/status | Pause/resume on Meta + local |
| DELETE | /api/admin/ads/meta/ads/[adId]/delete | Delete on Meta, remove locally |

**Create payload (simplified fields):**
- `ad_set_id` (required) — Internal UUID of parent ad set
- `name` (required) — Ad name
- `image_hash` (required) — From creative upload response
- `image_url` (required) — Supabase Storage URL (for local reference)
- `primary_text` (required) — Main ad body text
- `headline` (required) — Ad headline
- `link_url` (required) — Destination URL
- `call_to_action` — SHOP_NOW, LEARN_MORE, SIGN_UP, GET_OFFER, BOOK_TRAVEL, CONTACT_US, DOWNLOAD, GET_QUOTE (default: LEARN_MORE)
- `status` — ACTIVE or PAUSED (default: PAUSED)

**Create payload (advanced fields):**
- `description` — Link description text
- `display_link` — Display URL (cosmetic)
- `url_tags` — UTM parameters string

**Ad creation on Meta involves two API calls:**
1. POST to `/act_{id}/adcreatives` — Creates the creative object with image_hash, text, headline, link, CTA. Returns `creative_id`.
2. POST to `/act_{id}/ads` — Creates the ad linking to the creative and the ad set. Returns `ad_id`.

**ID mapping:** `ad_set_id` is an internal UUID. The Route Handler looks up `meta_ad_set_id` for the Meta API call.

### Creative Upload

| Method | Route | Purpose |
|--------|-------|---------|
| POST | /api/admin/ads/meta/creatives/upload | Upload image to Supabase Storage + Meta AdImage |

**Accepts:** multipart/form-data with `file` field (JPG or PNG, max 30MB).

**Flow:**
1. Upload file to Supabase Storage `ad-creatives` bucket
2. Read file bytes, POST to Meta's `/act_{id}/adimages` as multipart
3. Return `{ image_hash, image_url }` — hash for Meta creative creation, URL for local display

### Targeting Search

| Method | Route | Purpose |
|--------|-------|---------|
| GET | /api/admin/ads/meta/targeting/interests?q=search | Search Meta interest targeting options |
| GET | /api/admin/ads/meta/targeting/locations?q=search | Search Meta location targeting options |

These call Meta's `/search` endpoint with `type=adinterest` or `type=adgeolocation` and return the results for the async search dropdowns in the ad set form.

## Page Routes

### New Pages

| Route | Purpose |
|-------|---------|
| /growth/ads/create | Full 3-step wizard (Campaign → Ad Set → Ad) |
| /growth/ads/[campaignId]/create-ad-set | 2-step wizard (Ad Set → Ad), pre-linked to campaign |
| /growth/ads/[campaignId]/[adSetId]/create-ad | 1-step wizard (Ad only), pre-linked to ad set |

**Edit mode:** Append `?edit=[entityId]` to any wizard URL. The form loads existing data from Supabase and pre-fills all fields. The submit button changes from "Create" to "Save Changes". The API call uses the update route instead of create.

### Modified Pages

| Route | Changes |
|-------|---------|
| /growth/ads/ | Add "Create Campaign" button, add Actions column (Pause/Resume, Edit, Delete) |
| /growth/ads/[campaignId]/ | Add "Add Ad Set" button, add Actions column |
| /growth/ads/[campaignId]/[adSetId]/ | Add "Add Ad" button, add action buttons on each ad card |

## Wizard UI Design

### Progress Indicator

A 3-segment progress bar at the top of the wizard showing which step is active. Labels: "1. Campaign", "2. Ad Set", "3. Ad". When entering at a lower level (e.g., "Add Ad Set"), the bar starts at step 2.

### Each Step Has Two Sections

1. **Simplified fields** — Always visible. The essential fields needed to create a working entity. Opinionated defaults where possible.
2. **Advanced Settings** — Collapsed by default behind a "▶ Advanced Settings" toggle. Expands to show power-user fields.

### Campaign Step (Simplified)
- Campaign Name (text input, required)
- Objective (button group: Conversions, Traffic, Reach, Brand Awareness, Lead Generation, Engagement)
- Daily Budget (number input, required)
- Status (button group: Active, Paused)

### Campaign Step (Advanced)
- Lifetime Budget (number input, alternative to daily)
- Bid Strategy (select: Lowest Cost, Bid Cap, Cost Cap)
- Start Date / End Date (date pickers)
- Special Ad Categories (multi-select checkboxes)

### Ad Set Step (Simplified)
- Ad Set Name (text input, required)
- Locations (async search multi-select with tag chips, required)
- Age Range (two number inputs: min/max)
- Interests (async search multi-select with tag chips)
- Daily Budget (number input)

### Ad Set Step (Advanced)
- Gender (button group: All, Male, Female)
- Placements (radio: Automatic / Manual with checkbox list)
- Custom Audiences (select from existing)
- Optimization Goal (select dropdown)
- Schedule (start/end date pickers)
- Bid Amount (number input)

### Ad Step (Simplified)
- Ad Name (text input, required)
- Image (drag-and-drop upload zone with preview, required)
- Primary Text (textarea, required)
- Headline (text input, required)
- Destination URL (text input, required)
- Call to Action (button group: Shop Now, Learn More, Sign Up, Get Offer)

### Ad Step (Advanced)
- Description / Link Description (text input)
- Display Link (text input)
- URL Parameters (text input for UTM tags)

### Ad Preview
A Facebook-style ad preview panel shown alongside the ad form fields (right side on desktop). Updates live as the user types. Shows:
- Brand avatar placeholder + "Your Brand" + "Sponsored"
- Primary text
- Uploaded image (or placeholder)
- Link bar with destination domain + headline + CTA button

### Navigation
- "Cancel" — returns to the parent table page
- "← Back" — goes to previous step
- "Next: [Step Name] →" — validates current step, advances
- "Create Campaign" / "Save Changes" — final submit (green button)

### Validation
- Required fields validated on "Next" click before advancing
- Meta API errors shown as toast on submit failure
- Image validated client-side (type, size) before upload

## Inline Table Actions

### Action Buttons Per Row

Each row in campaigns, ad sets, and ads tables gets an Actions column with:

**For ACTIVE entities:**
- ⏸ Pause — calls status route with `PAUSED`, refreshes table
- ✏️ Edit — navigates to wizard with `?edit=[id]`
- 🗑 Delete — shows confirmation dialog, then calls delete route

**For PAUSED entities:**
- ▶ Resume — calls status route with `ACTIVE`, refreshes table
- ✏️ Edit — same as above
- 🗑 Delete — same as above

**For ad cards** (not a table), actions appear as icon buttons in the card footer.

### Delete Confirmation
A dialog (shadcn AlertDialog) asking: "Delete [entity name]? This will permanently remove it from Meta and cannot be undone." with Cancel and Delete buttons.

## Shared Components

| Component | Path | Purpose |
|-----------|------|---------|
| CampaignForm | `src/components/ads/campaign-form.tsx` | Campaign fields (simplified + advanced) |
| AdSetForm | `src/components/ads/ad-set-form.tsx` | Ad set fields (simplified + advanced) |
| AdForm | `src/components/ads/ad-form.tsx` | Ad fields (simplified + advanced) |
| AdPreview | `src/components/ads/ad-preview.tsx` | Live Facebook-style ad preview |
| ImageUpload | `src/components/ads/image-upload.tsx` | Drag-and-drop with preview + upload to API |
| TargetingSearch | `src/components/ads/targeting-search.tsx` | Async multi-select search for interests/locations |

All form components accept an `initialData` prop for edit mode and an `onSubmit` callback.

## File Structure

```
src/
  components/ads/
    campaign-form.tsx
    ad-set-form.tsx
    ad-form.tsx
    ad-preview.tsx
    image-upload.tsx
    targeting-search.tsx
  app/(admin)/growth/ads/
    create/
      page.tsx                                    # Full 3-step wizard
    [campaignId]/
      create-ad-set/
        page.tsx                                  # 2-step wizard
      [adSetId]/
        create-ad/
          page.tsx                                # 1-step wizard
    page.tsx                                      # (modify) Add create button + actions column
    [campaignId]/
      page.tsx                                    # (modify) Add create button + actions column
    [campaignId]/[adSetId]/
      page.tsx                                    # (modify) Add create button + actions on cards
  app/api/admin/ads/meta/
    campaigns/
      create/route.ts
      [campaignId]/
        update/route.ts
        status/route.ts
        delete/route.ts
    ad-sets/
      create/route.ts
      [adSetId]/
        update/route.ts
        status/route.ts
        delete/route.ts
    ads/
      create/route.ts
      [adId]/
        update/route.ts
        status/route.ts
        delete/route.ts
    creatives/
      upload/route.ts
    targeting/
      interests/route.ts
      locations/route.ts
  lib/
    meta-api.ts                                   # (modify) Add metaApiPost, metaApiDelete

supabase/migrations/
  20260407200001_ad_creatives_bucket.sql           # Storage bucket for ad images
```

## Storage

### Supabase Storage Bucket

**Bucket name:** `ad-creatives`
**Access:** Private (only accessible via service_role or signed URLs)
**File naming:** `{company_id}/{timestamp}-{original_filename}`
**Purpose:** Backup/reference copy of uploaded ad images. The canonical image lives on Meta after upload.

## Meta API Reference

### Key Endpoints Used

| Action | Meta API Endpoint | Method |
|--------|------------------|--------|
| Create campaign | `/act_{ad_account_id}/campaigns` | POST |
| Update campaign | `/{campaign_id}` | POST |
| Delete campaign | `/{campaign_id}` | DELETE |
| Create ad set | `/act_{ad_account_id}/adsets` | POST |
| Update ad set | `/{adset_id}` | POST |
| Delete ad set | `/{adset_id}` | DELETE |
| Upload image | `/act_{ad_account_id}/adimages` | POST (multipart) |
| Create creative | `/act_{ad_account_id}/adcreatives` | POST |
| Create ad | `/act_{ad_account_id}/ads` | POST |
| Update ad | `/{ad_id}` | POST |
| Delete ad | `/{ad_id}` | DELETE |
| Search interests | `/search?type=adinterest&q=` | GET |
| Search locations | `/search?type=adgeolocation&q=` | GET |

All endpoints use Meta Marketing API v21.0.

## Out of Scope

- Bulk operations (pause all, delete all)
- Campaign duplication / ad duplication
- A/B test creation
- Video ad upload (images only for now)
- Audience creation/management (use existing audiences from Meta)
- Budget optimization across ad sets
- Scheduling / dayparting UI
- Multi-account ad creation
