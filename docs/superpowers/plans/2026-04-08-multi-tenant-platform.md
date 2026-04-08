# Multi-Tenant Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the single-tenant IThealth admin platform into a multi-tenant managed services marketplace with dynamic branding, website CMS, super admin layer (Servolu), de-branded components, and a provider marketplace.

**Architecture:** Five sequential phases. Phase 1 adds a `company_branding` table and admin UI. Phase 2 adds a `website_content` CMS table with tabbed editor and refactors public pages to be data-driven. Phase 3 introduces the `super_admin` role, company hierarchy, Servolu as platform company, and a new route group. Phase 4 replaces all hardcoded IThealth references with dynamic values from DB. Phase 5 builds the Servolu marketplace aggregating admin companies. Each phase produces working, testable software.

**Tech Stack:** Next.js App Router, TypeScript, Supabase (Postgres + GoTrue auth + Storage), React client components, shadcn/ui, Tailwind CSS, Carbon icons, Poppins font.

**Spec:** `docs/superpowers/specs/2026-04-08-multi-tenant-platform-design.md`

---

## File Structure

### Phase 1: Brand Management — New Files

| File | Responsibility |
|------|---------------|
| `supabase/migrations/20260408100001_create_company_branding.sql` | Create `company_branding` table + trigger |
| `supabase/migrations/20260408100002_company_branding_rls.sql` | Admin-only RLS policies (SELECT, INSERT, UPDATE — no DELETE) |
| `supabase/migrations/20260408100003_create_branding_storage_bucket.sql` | Storage bucket `branding` with public read, admin write |
| `supabase/migrations/20260408100004_seed_ithealth_branding.sql` | Seed current IThealth brand values |
| `supabase/migrations/20260408100005_seed_brand_menu_item.sql` | Growth > Brand menu item + role_menu_access |
| `src/contexts/branding-context.tsx` | `BrandingProvider` + `useBranding()` hook — fetches branding, sets CSS vars, loads fonts |
| `src/components/logo-upload.tsx` | Drag-and-drop logo upload with preview, Supabase Storage integration |
| `src/components/colour-picker.tsx` | Hex colour input + swatch + native picker |
| `src/components/font-selector.tsx` | Searchable Google Font dropdown with live preview |
| `src/lib/google-fonts.ts` | Curated list of ~50 Google Fonts |
| `src/app/(admin)/growth/brand/page.tsx` | Brand management page — logos, colours, fonts |

### Phase 1: Brand Management — Modified Files

| File | Change |
|------|--------|
| `src/lib/types.ts` | Add `CompanyBranding` interface |
| `src/app/(admin)/layout.tsx` | Wrap with `BrandingProvider` |

### Phase 2: Website CMS — New Files

| File | Responsibility |
|------|---------------|
| `supabase/migrations/20260408200001_create_website_content.sql` | Create `website_content` table + trigger + index |
| `supabase/migrations/20260408200002_website_content_rls.sql` | Admin-only RLS policies |
| `supabase/migrations/20260408200003_create_website_content_bucket.sql` | Storage bucket `website-content` |
| `supabase/migrations/20260408200004_seed_ithealth_website_content.sql` | Seed current hardcoded content for all 5 public pages |
| `supabase/migrations/20260408200005_seed_website_menu_item.sql` | Growth > Content > Website menu item |
| `src/lib/website-content.ts` | `getPageContent()` server-side fetcher |
| `src/lib/default-content.ts` | Default content constants for new companies |
| `src/components/cms/section-editor.tsx` | Generic section editor card (header + toggle + sort_order) |
| `src/components/cms/image-field.tsx` | Image upload field with preview |
| `src/components/cms/repeatable-items.tsx` | Add/remove repeatable item groups |
| `src/app/(admin)/growth/content/website/page.tsx` | Tabbed CMS editor (Home, About, Features, Contact, Partners) |

### Phase 2: Website CMS — Modified Files

| File | Change |
|------|--------|
| `src/lib/types.ts` | Add `WebsiteSection`, `HeroContent`, `HomeMissionContent`, `AboutMissionContent`, `TestimonialsContent`, `CTAContent`, `ContactInfoContent` |
| `src/app/(public)/page.tsx` | Refactor to data-driven from `getPageContent()` |
| `src/app/(public)/about/page.tsx` | Refactor to data-driven |
| `src/app/(public)/features/page.tsx` | Refactor to data-driven |
| `src/app/(public)/contact/page.tsx` | Refactor to data-driven |
| `src/app/(public)/partners/page.tsx` | Refactor to data-driven |

### Phase 3: Super Admin — New Files

| File | Responsibility |
|------|---------------|
| `supabase/migrations/20260408300001_extend_company_type_enum.sql` | ADD VALUE 'platform' to `company_type` |
| `supabase/migrations/20260408300002_extend_user_role_enum.sql` | ADD VALUE 'super_admin' to `user_role` |
| `supabase/migrations/20260408300003_add_company_hierarchy.sql` | `parent_company_id`, `domain`, `tagline`, `slug`, etc. + trigger |
| `supabase/migrations/20260408300004_seed_servolu_company.sql` | Servolu company + update IThealth parent + customer/partner parents |
| `supabase/migrations/20260408300005_auth_helper_functions_v2.sql` | `get_my_company_type()`, `is_admin_or_above()`, `set_parent_company_on_insert()` |
| `supabase/migrations/20260408300006_rls_policies_v2.sql` | DROP+CREATE ALL 45+ admin policies, add super_admin policies |
| `supabase/migrations/20260408300007_seed_super_admin_menu.sql` | Platform menu items + role_menu_access |
| `supabase/migrations/20260408300008_seed_super_admin_user.sql` | Servolu admin profile (conditional on auth user existing) |
| `supabase/setup-super-admin.sh` | Setup script to create auth user via GoTrue Admin API |
| `src/lib/auth-utils.ts` | `isAdminOrAbove()`, `isSuperAdmin()` |
| `src/components/super-admin-guard.tsx` | Auth guard for super_admin role |
| `src/components/super-admin-sidebar.tsx` | Platform sidebar with Servolu branding |
| `src/app/(super-admin)/layout.tsx` | SuperAdminGuard + sidebar shell |
| `src/app/(super-admin)/platform/page.tsx` | Dashboard: stats across all admin companies |
| `src/app/(super-admin)/platform/companies/page.tsx` | List all admin companies |
| `src/app/(super-admin)/platform/companies/new/page.tsx` | Create new admin company wizard |
| `src/app/(super-admin)/platform/companies/[id]/page.tsx` | Company detail view |
| `src/app/(super-admin)/platform/companies/[id]/edit/page.tsx` | Edit company details |
| `src/app/(super-admin)/platform/marketplace/listings/page.tsx` | Marketplace listings management |
| `src/app/(super-admin)/platform/marketplace/branding/page.tsx` | Servolu branding (reuses brand page) |
| `src/app/(super-admin)/platform/settings/page.tsx` | Platform settings |

### Phase 3: Super Admin — Modified Files

| File | Change |
|------|--------|
| `src/lib/types.ts:1-13` | Update `UserRole`, `CompanyType`, `Company` interface |
| `src/components/auth-guard.tsx` | Use `isAdminOrAbove()` |
| `src/components/customer-guard.tsx` | Allow super_admin through |
| `src/app/(auth)/login/page.tsx` | Role-based redirect logic |
| `src/contexts/auth-context.tsx` | Include company type in context |
| `src/contexts/menu-context.tsx` | Handle super_admin menu |
| All ~25 API routes under `src/app/api/admin/` | Replace `role !== 'admin'` with `!isAdminOrAbove()` |

### Phase 4: De-branding — New Files

| File | Responsibility |
|------|---------------|
| `src/contexts/company-context.tsx` | `CompanyProvider` — provides company + branding to all layouts |

### Phase 4: De-branding — Modified Files (company-resolver created in Phase 2 Task 21)

Note: `src/lib/company-resolver.ts` is created as a stub in Phase 2 (Task 21) and enhanced in Phase 4 (Task 38).

### Phase 4: De-branding — Modified Files

| File | Change |
|------|--------|
| `src/components/sidebar.tsx` | Logo from branding context |
| `src/components/customer-sidebar.tsx` | Logo from branding context |
| `src/components/public-header.tsx` | Logo from company branding |
| `src/components/public-footer.tsx` | Logo + company name from context |
| `src/app/(auth)/login/page.tsx` | Dynamic branding (logo, copyright) |
| `src/app/(auth)/set-password/page.tsx` | Dynamic logo |
| `src/app/(onboarding)/get-started/page.tsx` | Dynamic logos |
| `src/components/academy/certificate-view.tsx` | Dynamic company name |
| `src/app/layout.tsx` | Dynamic page title via `generateMetadata` |
| `src/app/(public)/blog/page.tsx` | Dynamic metadata title |
| `src/app/(public)/blog/[slug]/page.tsx` | Dynamic metadata title |
| `src/app/api/support/email/route.ts` | Dynamic sender from company |
| `src/app/api/support/sla-monitor/route.ts` | Dynamic sender from company |
| `src/app/api/services/checkout/route.ts` | Dynamic company name |
| `src/app/api/certificates/download/route.ts` | Dynamic company name |
| `src/app/api/certificates/generate/route.ts` | Dynamic company name |
| `src/contexts/cart-context.tsx` | Company-scoped localStorage key |
| `ai-service/agents/defaults/orchestrators.py` | Templated company names |
| `ai-service/agents/defaults/blog_writer.py` | Templated company names |
| `ai-service/agents/defaults/service_builder.py` | Templated company names |
| `package.json` | Rename to `servolu-platform` |
| `supabase/config.toml` | Update project_id |
| `CLAUDE.md` | Update to reflect multi-tenant architecture |

### Phase 5: Marketplace — New Files

| File | Responsibility |
|------|---------------|
| `supabase/migrations/20260408500001_create_marketplace_listings.sql` | Create `marketplace_listings` table |
| `supabase/migrations/20260408500002_marketplace_rls.sql` | RLS policies |
| `supabase/migrations/20260408500003_seed_ithealth_marketplace_listing.sql` | Seed IThealth listing |
| `supabase/migrations/20260408500004_seed_marketplace_menu_items.sql` | Menu items for marketplace management |
| `src/app/(marketplace)/layout.tsx` | Servolu-branded header/footer |
| `src/app/(marketplace)/page.tsx` | Marketplace home: featured providers, search |
| `src/app/(marketplace)/providers/page.tsx` | Browse provider companies |
| `src/app/(marketplace)/providers/[slug]/page.tsx` | Provider profile |
| `src/app/(marketplace)/providers/[slug]/services/[serviceSlug]/page.tsx` | Service detail |
| `src/app/(marketplace)/services/page.tsx` | Browse all services across providers |
| `src/app/(marketplace)/about/page.tsx` | About Servolu (CMS-driven) |
| `src/app/(marketplace)/contact/page.tsx` | Contact Servolu (CMS-driven) |
| `src/components/marketplace/provider-card.tsx` | Provider card with logo, name, tagline |
| `src/components/marketplace/service-card.tsx` | Service card with provider attribution |
| `src/components/marketplace/marketplace-header.tsx` | Servolu marketplace header |
| `src/components/marketplace/marketplace-footer.tsx` | Servolu marketplace footer |

---

## Tasks

---

## PHASE 1: Brand Management

### Task 1: Database Migration — company_branding table

**Files:**
- Create: `supabase/migrations/20260408100001_create_company_branding.sql`

- [ ] **Step 1: Write migration**

```sql
CREATE TABLE public.company_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  logo_url text,
  logo_light_url text,
  icon_url text,
  primary_colour text NOT NULL DEFAULT '#1175E4',
  secondary_colour text NOT NULL DEFAULT '#FF246B',
  accent_colour text,
  font_heading text NOT NULL DEFAULT 'Poppins',
  font_body text NOT NULL DEFAULT 'Poppins',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_branding_company_id_key UNIQUE (company_id)
);

ALTER TABLE public.company_branding ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER company_branding_updated_at
  BEFORE UPDATE ON public.company_branding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 2: Apply migration**

Run: `npx supabase db push`
Expected: Migration applies successfully

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260408100001_create_company_branding.sql
git commit -m "feat(db): create company_branding table"
```

### Task 2: RLS Policies for company_branding

**Files:**
- Create: `supabase/migrations/20260408100002_company_branding_rls.sql`

- [ ] **Step 1: Write RLS migration**

```sql
-- Public read for rendering public sites
CREATE POLICY "Public can read branding"
  ON public.company_branding FOR SELECT
  USING (true);

-- Admins can read their own company's branding
CREATE POLICY "Admins select own company branding"
  ON public.company_branding FOR SELECT
  USING (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  );

-- Admins can insert their own company's branding
CREATE POLICY "Admins insert own company branding"
  ON public.company_branding FOR INSERT
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  );

-- Admins can update their own company's branding
CREATE POLICY "Admins update own company branding"
  ON public.company_branding FOR UPDATE
  USING (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
  );
-- No DELETE policy — branding records should not be deleted
```

- [ ] **Step 2: Apply and commit**

```bash
npx supabase db push
git add supabase/migrations/20260408100002_company_branding_rls.sql
git commit -m "feat(db): add company_branding RLS policies"
```

### Task 3: Storage Bucket for Branding

**Files:**
- Create: `supabase/migrations/20260408100003_create_branding_storage_bucket.sql`

- [ ] **Step 1: Write storage bucket migration**

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read branding bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'branding');

CREATE POLICY "Admins upload to own branding folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = (public.get_my_company_id())::text
    AND public.get_my_role() = 'admin'
  );

CREATE POLICY "Admins manage own branding files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = (public.get_my_company_id())::text
    AND public.get_my_role() = 'admin'
  );

CREATE POLICY "Admins delete own branding files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = (public.get_my_company_id())::text
    AND public.get_my_role() = 'admin'
  );
```

- [ ] **Step 2: Apply and commit**

```bash
npx supabase db push
git add supabase/migrations/20260408100003_create_branding_storage_bucket.sql
git commit -m "feat(db): create branding storage bucket with policies"
```

### Task 4: Seed IThealth Branding + Menu Item

**Files:**
- Create: `supabase/migrations/20260408100004_seed_ithealth_branding.sql`
- Create: `supabase/migrations/20260408100005_seed_brand_menu_item.sql`

- [ ] **Step 1: Write branding seed**

```sql
INSERT INTO public.company_branding (company_id, logo_url, logo_light_url, icon_url, primary_colour, secondary_colour, accent_colour, font_heading, font_body)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '/logos/ithealth-logo.svg',
  '/logos/ithealth-logo-white.svg',
  '/logos/ithealth-icon-white.svg',
  '#1175E4',
  '#FF246B',
  '#C8A951',
  'Poppins',
  'Poppins'
) ON CONFLICT (company_id) DO NOTHING;
```

- [ ] **Step 2: Write menu item seed**

```sql
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000301', '10000000-0000-0000-0000-000000000002',
   'Brand', 'ColorPalette', '/growth/brand', 3, 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.role_menu_access (role, menu_item_id) VALUES
  ('admin', '20000000-0000-0000-0000-000000000301')
ON CONFLICT (role, menu_item_id) DO NOTHING;
```

- [ ] **Step 3: Apply and commit**

```bash
npx supabase db push
git add supabase/migrations/20260408100004_seed_ithealth_branding.sql supabase/migrations/20260408100005_seed_brand_menu_item.sql
git commit -m "feat(db): seed IThealth branding and Brand menu item"
```

### Task 5: TypeScript Types for CompanyBranding

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add CompanyBranding interface**

Add after the `Company` interface (around line 13):

```typescript
export interface CompanyBranding {
  id: string
  company_id: string
  logo_url: string | null
  logo_light_url: string | null
  icon_url: string | null
  primary_colour: string
  secondary_colour: string
  accent_colour: string | null
  font_heading: string
  font_body: string
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add CompanyBranding TypeScript type"
```

### Task 6: Google Fonts List

**Files:**
- Create: `src/lib/google-fonts.ts`

- [ ] **Step 1: Create curated font list**

A static array of ~50 popular Google Fonts with their display names. Include: Poppins, Inter, Roboto, Open Sans, Lato, Montserrat, Playfair Display, Merriweather, Source Sans Pro, Nunito, Raleway, Work Sans, DM Sans, IBM Plex Sans, Manrope, Space Grotesk, Plus Jakarta Sans, Outfit, Sora, Figtree, Geist, Lexend, Urbanist, etc.

Each entry: `{ name: string, category: 'sans-serif' | 'serif' | 'display' | 'monospace' }`

- [ ] **Step 2: Commit**

```bash
git add src/lib/google-fonts.ts
git commit -m "feat: add curated Google Fonts list"
```

### Task 7: Branding Context Provider

**Files:**
- Create: `src/contexts/branding-context.tsx`

- [ ] **Step 1: Implement BrandingProvider**

`'use client'` component that:
1. Uses `useAuth()` to get the current profile's `company_id`
2. Fetches `company_branding` for that `company_id` from Supabase on mount
3. On load, sets CSS custom properties on `document.documentElement`:
   - `--brand-primary` → `primaryColour`
   - `--brand-secondary` → `secondaryColour`
   - `--brand-accent` → `accentColour`
4. Injects a `<link>` tag for Google Fonts with `fontHeading` and `fontBody`
5. Falls back to `{ primaryColour: '#1175E4', secondaryColour: '#FF246B', fontHeading: 'Poppins', fontBody: 'Poppins' }` if no record found
6. Exports `useBranding()` hook returning `{ branding, loading }`

- [ ] **Step 2: Wrap admin layout**

Modify `src/app/(admin)/layout.tsx`: wrap children with `<BrandingProvider>` inside the existing `AuthGuard`.

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`
Expected: Admin pages load without error. CSS vars `--brand-primary` etc. are set on `<html>`. Check with browser dev tools.

- [ ] **Step 4: Commit**

```bash
git add src/contexts/branding-context.tsx src/app/(admin)/layout.tsx
git commit -m "feat: add BrandingProvider context with CSS var injection"
```

### Task 8: Logo Upload Component

**Files:**
- Create: `src/components/logo-upload.tsx`

- [ ] **Step 1: Build component**

Props: `{ label: string, value: string | null, companyId: string, storagePath: string, onUploaded: (url: string | null) => void }`

Features:
- Drag-and-drop zone with dotted border
- Shows preview image if `value` is set
- "Upload" button triggers file picker (accept: `.svg,.png,.jpg,.jpeg`, max 2MB)
- On upload: `supabase.storage.from('branding').upload('{companyId}/{storagePath}', file, { upsert: true })`
- Gets public URL and calls `onUploaded(url)`
- "Remove" button sets `onUploaded(null)` and removes preview
- Loading spinner during upload

Uses shadcn `Button` and `Label`. Carbon `Upload` icon.

- [ ] **Step 2: Commit**

```bash
git add src/components/logo-upload.tsx
git commit -m "feat: add LogoUpload component with Supabase Storage"
```

### Task 9: Colour Picker Component

**Files:**
- Create: `src/components/colour-picker.tsx`

- [ ] **Step 1: Build component**

Props: `{ label: string, value: string, onChange: (hex: string) => void, optional?: boolean }`

Features:
- Hex text input (validates `#RRGGBB` format)
- Colour swatch div showing current colour
- Native `<input type="color">` hidden behind swatch click
- If `optional`, shows "Clear" button to set empty

- [ ] **Step 2: Commit**

```bash
git add src/components/colour-picker.tsx
git commit -m "feat: add ColourPicker component"
```

### Task 10: Font Selector Component

**Files:**
- Create: `src/components/font-selector.tsx`

- [ ] **Step 1: Build component**

Props: `{ label: string, value: string, onChange: (fontName: string) => void }`

Features:
- Searchable dropdown using shadcn `Command` + `Popover` pattern
- Options from `google-fonts.ts` list
- Each option renders with category badge (sans-serif, serif, etc.)
- Below dropdown: live preview text in the selected font (loads via `<link>` injection)
- Preview shows: heading sample "The Quick Brown Fox" + paragraph sample

- [ ] **Step 2: Commit**

```bash
git add src/components/font-selector.tsx
git commit -m "feat: add FontSelector component with live preview"
```

### Task 11: Brand Management Page

**Files:**
- Create: `src/app/(admin)/growth/brand/page.tsx`

- [ ] **Step 1: Build page**

`'use client'` page. On mount:
1. Get `profile` from `useAuth()`
2. Fetch `company_branding` for `profile.company_id`
3. Initialize form state from fetched data (or defaults)

Layout — three card sections:
1. **Logos** — three `LogoUpload` components side by side: "Main Logo" (`logo.svg`), "Light Logo" (`logo-light.svg`), "Icon" (`icon.svg`)
2. **Colours** — three `ColourPicker` components: Primary, Secondary, Accent (optional)
3. **Fonts** — two `FontSelector` components: Heading Font, Body Font

"Save Changes" button: upserts to `company_branding` table. Toast on success/error.

Loading state: skeleton cards while fetching.

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`, navigate to `/growth/brand`
Expected: Page loads with current IThealth branding values. Can edit colours, see live swatches. Upload logo files to storage. Save persists to DB.

- [ ] **Step 3: Commit**

```bash
git add src/app/(admin)/growth/brand/page.tsx
git commit -m "feat: add Brand Management page under Growth"
```

### Task 12: Phase 1 Integration Test

- [ ] **Step 1: Reset DB and verify end-to-end**

```bash
npx supabase db reset
npm run dev
```

Expected:
1. Login as admin → sidebar shows "Brand" under Growth
2. Navigate to `/growth/brand` → page loads with IThealth defaults
3. Change primary colour → save → refresh → colour persists
4. Upload a logo → appears in Supabase Storage → URL in DB
5. Change font → save → preview updates
6. CSS vars `--brand-primary` etc. update in admin shell

- [ ] **Step 2: Commit any fixes**

---

## PHASE 2: Website CMS

### Task 13: Database Migration — website_content table

**Files:**
- Create: `supabase/migrations/20260408200001_create_website_content.sql`

- [ ] **Step 1: Write migration**

```sql
CREATE TABLE public.website_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  page text NOT NULL,
  section text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT website_content_company_page_section_key UNIQUE (company_id, page, section)
);

ALTER TABLE public.website_content ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER website_content_updated_at
  BEFORE UPDATE ON public.website_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_website_content_company_page
  ON public.website_content (company_id, page, is_active, sort_order);
```

- [ ] **Step 2: Apply and commit**

```bash
npx supabase db push
git add supabase/migrations/20260408200001_create_website_content.sql
git commit -m "feat(db): create website_content table"
```

### Task 14: Website Content RLS + Storage Bucket

**Files:**
- Create: `supabase/migrations/20260408200002_website_content_rls.sql`
- Create: `supabase/migrations/20260408200003_create_website_content_bucket.sql`

- [ ] **Step 1: Write RLS** — admin-only SELECT, INSERT, UPDATE, DELETE + public SELECT. See spec §3.1.

- [ ] **Step 2: Write storage bucket** — `website-content` with public read, admin write. Same pattern as branding bucket but scoped to `website-content`. See spec §3.1.

- [ ] **Step 3: Apply and commit**

```bash
npx supabase db push
git add supabase/migrations/20260408200002_website_content_rls.sql supabase/migrations/20260408200003_create_website_content_bucket.sql
git commit -m "feat(db): add website_content RLS and storage bucket"
```

### Task 15: Seed Current Website Content

**Files:**
- Create: `supabase/migrations/20260408200004_seed_ithealth_website_content.sql`

- [ ] **Step 1: Extract current hardcoded content from public pages**

Read `src/app/(public)/page.tsx`, `about/page.tsx`, `features/page.tsx`, `contact/page.tsx`, `partners/page.tsx`. Extract all text content, headings, subheadings, CTAs, etc.

- [ ] **Step 2: Write seed migration**

Insert one row per section per page for company_id `00000000-0000-0000-0000-000000000001`. Each row's `content` JSONB matches the schema defined in spec §3.2.

Example:
```sql
INSERT INTO public.website_content (company_id, page, section, content, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'home', 'hero',
   '{"title": "Modern IT isn''t optional", "subtitle": "We guide you through IT modernisation...", "cta_text": "Get Started", "cta_link": "/get-started"}'::jsonb,
   1),
  -- ... all other sections for all 5 pages
ON CONFLICT (company_id, page, section) DO NOTHING;
```

- [ ] **Step 3: Apply and commit**

```bash
npx supabase db push
git add supabase/migrations/20260408200004_seed_ithealth_website_content.sql
git commit -m "feat(db): seed IThealth website content from current public pages"
```

### Task 16: Website Menu Item Seed

**Files:**
- Create: `supabase/migrations/20260408200005_seed_website_menu_item.sql`

- [ ] **Step 1: Write seed**

```sql
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('30000000-0000-0000-0000-000000000203', '20000000-0000-0000-0000-000000000201',
   'Website', 'Globe', '/growth/content/website', 2, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.role_menu_access (role, menu_item_id) VALUES
  ('admin', '30000000-0000-0000-0000-000000000203')
ON CONFLICT (role, menu_item_id) DO NOTHING;
```

- [ ] **Step 2: Apply and commit**

```bash
npx supabase db push
git add supabase/migrations/20260408200005_seed_website_menu_item.sql
git commit -m "feat(db): seed Website menu item under Growth > Content"
```

### Task 17: TypeScript Types for Website CMS

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add CMS types**

Add `WebsiteSection`, `HeroContent`, `HomeMissionContent`, `AboutMissionContent`, `TestimonialsContent`, `CTAContent`, `ContactInfoContent` as defined in spec §3.8.

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add Website CMS TypeScript types"
```

### Task 18: Server-Side Content Fetching

**Files:**
- Create: `src/lib/website-content.ts`
- Create: `src/lib/default-content.ts`

- [ ] **Step 1: Implement getPageContent()**

As defined in spec §3.6. Takes `companyId` and `page`, returns `Record<string, WebsiteSection>`.

- [ ] **Step 2: Implement getCompanyBranding()**

Server-side function to fetch branding for a company ID.

- [ ] **Step 3: Create default-content.ts**

Export `DEFAULT_CONTENT: Record<string, Record<string, object>>` — default content per page per section for new companies. Matches the seeded IThealth content.

- [ ] **Step 4: Commit**

```bash
git add src/lib/website-content.ts src/lib/default-content.ts
git commit -m "feat: add server-side content fetching and defaults"
```

### Task 19: CMS UI Components

**Files:**
- Create: `src/components/cms/section-editor.tsx`
- Create: `src/components/cms/image-field.tsx`
- Create: `src/components/cms/repeatable-items.tsx`

- [ ] **Step 1: Build SectionEditor**

Wrapper card with: section name header, `is_active` toggle, `sort_order` number input, collapsible body. Children slot for field-specific content.

- [ ] **Step 2: Build ImageField**

Props: `{ value: string | null, companyId: string, path: string, onUploaded: (url: string | null) => void }`
Image upload with preview thumbnail. Uploads to `website-content/{companyId}/{path}`.

- [ ] **Step 3: Build RepeatableItems**

Props: `{ items: T[], renderItem: (item: T, index: number, onChange: (field, value) => void) => ReactNode, onAdd: () => void, onRemove: (index: number) => void, addLabel: string }`
Renders a list of item cards with "Add" and "Remove" buttons.

- [ ] **Step 4: Commit**

```bash
git add src/components/cms/section-editor.tsx src/components/cms/image-field.tsx src/components/cms/repeatable-items.tsx
git commit -m "feat: add CMS UI components (SectionEditor, ImageField, RepeatableItems)"
```

### Task 20: Website CMS Page

**Files:**
- Create: `src/app/(admin)/growth/content/website/page.tsx`

- [ ] **Step 1: Build tabbed editor**

`'use client'` page. On mount:
1. Get `profile` from `useAuth()`
2. Fetch all `website_content` rows for `profile.company_id`
3. Group by `page`, merge with defaults from `default-content.ts`

Tab bar: Home | About | Features | Contact | Partners (using shadcn `Tabs`)

Each tab renders section editors matching the page's schema (spec §3.2):
- Hero sections: `title` + `subtitle` text inputs (+ CTA fields for home)
- Mission sections: textarea / paragraphs array
- Items arrays (values, features, benefits, testimonials): `RepeatableItems`
- Image fields: `ImageField`
- Boolean fields: Toggle
- Number fields: number input

"Save Page" button: batch upsert all sections for the current tab.
Toast on success/error.

- [ ] **Step 2: Verify in browser**

Navigate to `/growth/content/website`. Expected: tabs load with seeded content. Can edit text fields, toggle sections, save.

- [ ] **Step 3: Commit**

```bash
git add src/app/(admin)/growth/content/website/page.tsx
git commit -m "feat: add Website CMS tabbed editor page"
```

### Task 21: Refactor Public Pages to Data-Driven

**Files:**
- Modify: `src/app/(public)/page.tsx`
- Modify: `src/app/(public)/about/page.tsx`
- Modify: `src/app/(public)/features/page.tsx`
- Modify: `src/app/(public)/contact/page.tsx`
- Modify: `src/app/(public)/partners/page.tsx`

- [ ] **Step 1: Add resolveCompanyId() stub**

Create `src/lib/company-resolver.ts` with a simple stub:
```typescript
export async function resolveCompanyId(): Promise<string> {
  return process.env.DEFAULT_COMPANY_ID ?? '00000000-0000-0000-0000-000000000001'
}
```

- [ ] **Step 2: Refactor home page**

Convert `src/app/(public)/page.tsx` to fetch from `getPageContent()`:
- Call `resolveCompanyId()` + `getPageContent(companyId, 'home')`
- Replace each hardcoded section with data from the content record
- Fall back to defaults if section missing or inactive

- [ ] **Step 3: Refactor about page**

Same pattern for `about/page.tsx`.

- [ ] **Step 4: Refactor features page**

Same pattern for `features/page.tsx`.

- [ ] **Step 5: Refactor contact page**

Same pattern for `contact/page.tsx`. Replace hardcoded `hello@ithealth.ai` with `info.content.email`.

- [ ] **Step 6: Refactor partners page**

Same pattern for `partners/page.tsx`.

- [ ] **Step 7: Verify in browser**

All public pages should render identically to before (content comes from DB seed, which matches the old hardcoded values).

- [ ] **Step 8: Commit**

```bash
git add src/lib/company-resolver.ts src/app/(public)/page.tsx src/app/(public)/about/page.tsx src/app/(public)/features/page.tsx src/app/(public)/contact/page.tsx src/app/(public)/partners/page.tsx
git commit -m "feat: refactor public pages to data-driven from website_content"
```

### Task 22: Phase 2 Integration Test

- [ ] **Step 1: Reset DB and verify end-to-end**

```bash
npx supabase db reset
npm run dev
```

Expected:
1. Public pages render correctly from DB content
2. Admin → Growth > Content > Website → tabbed editor loads
3. Edit a hero title → save → refresh public page → new title appears
4. Toggle a section off → public page hides that section
5. Upload an image in CMS → appears on public page

- [ ] **Step 2: Commit any fixes**

---

## PHASE 3: Super Admin Layer (Servolu)

### Task 23: Extend Enums + Company Hierarchy

**Files:**
- Create: `supabase/migrations/20260408300001_extend_company_type_enum.sql`
- Create: `supabase/migrations/20260408300002_extend_user_role_enum.sql`
- Create: `supabase/migrations/20260408300003_add_company_hierarchy.sql`

- [ ] **Step 1: Write enum extensions**

```sql
-- 20260408300001
ALTER TYPE company_type ADD VALUE 'platform';
```

```sql
-- 20260408300002
ALTER TYPE user_role ADD VALUE 'super_admin';
```

- [ ] **Step 2: Write hierarchy migration**

```sql
-- 20260408300003
ALTER TABLE public.companies
  ADD COLUMN parent_company_id uuid REFERENCES public.companies(id),
  ADD COLUMN domain text,
  ADD COLUMN tagline text,
  ADD COLUMN support_email text,
  ADD COLUMN contact_email text,
  ADD COLUMN slug text UNIQUE;

CREATE INDEX idx_companies_parent ON public.companies (parent_company_id);

-- Auto-set parent_company_id trigger
CREATE OR REPLACE FUNCTION public.set_parent_company_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_company_id IS NULL AND NEW.type IN ('customer', 'partner') THEN
    NEW.parent_company_id := (SELECT company_id FROM public.profiles WHERE id = auth.uid());
  END IF;
  IF NEW.parent_company_id IS NULL AND NEW.type = 'admin' THEN
    NEW.parent_company_id := (SELECT company_id FROM public.profiles WHERE id = auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER companies_set_parent
  BEFORE INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_parent_company_on_insert();
```

- [ ] **Step 3: Apply and commit**

```bash
npx supabase db push
git add supabase/migrations/20260408300001_extend_company_type_enum.sql supabase/migrations/20260408300002_extend_user_role_enum.sql supabase/migrations/20260408300003_add_company_hierarchy.sql
git commit -m "feat(db): extend enums, add company hierarchy columns"
```

### Task 24: Seed Servolu Company

**Files:**
- Create: `supabase/migrations/20260408300004_seed_servolu_company.sql`

- [ ] **Step 1: Write seed**

As defined in spec §4.1: create Servolu, update IThealth parent, update customer/partner parents.

- [ ] **Step 2: Apply and commit**

```bash
npx supabase db push
git add supabase/migrations/20260408300004_seed_servolu_company.sql
git commit -m "feat(db): seed Servolu company and set company hierarchy"
```

### Task 25: Auth Helper Functions V2

**Files:**
- Create: `supabase/migrations/20260408300005_auth_helper_functions_v2.sql`

- [ ] **Step 1: Write functions**

`get_my_company_type()`, `is_admin_or_above()` as defined in spec §4.2.

**Note:** `set_parent_company_on_insert()` trigger was already created in Task 23's migration. Do NOT duplicate it here.

- [ ] **Step 2: Apply and commit**

```bash
npx supabase db push
git add supabase/migrations/20260408300005_auth_helper_functions_v2.sql
git commit -m "feat(db): add auth helper functions v2 (is_admin_or_above)"
```

### Task 26: RLS Policies V2 — The Big Migration

**Files:**
- Create: `supabase/migrations/20260408300006_rls_policies_v2.sql`

- [ ] **Step 1: Write the comprehensive policy migration**

This is the largest migration. It must:
1. DROP every existing `get_my_role() = 'admin'` policy across all 45+ tables
2. CREATE replacements using Template A (global tables) or Template B (company-scoped) from spec §4.2
3. Add super_admin policies for `company_branding` and `website_content`
4. Update storage.objects policies for `branding` and `website-content` buckets to use `is_admin_or_above()`

Use the comprehensive table list from spec §4.2 as a checklist. Each DROP+CREATE pair must be included.

- [ ] **Step 2: Apply migration**

```bash
npx supabase db push
```

Expected: No errors. Verify with `npx supabase db reset` that all migrations apply cleanly from scratch.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260408300006_rls_policies_v2.sql
git commit -m "feat(db): update all RLS policies for super_admin + multi-tenant"
```

### Task 27: Super Admin Menu + User Seed

**Files:**
- Create: `supabase/migrations/20260408300007_seed_super_admin_menu.sql`
- Create: `supabase/migrations/20260408300008_seed_super_admin_user.sql`
- Create: `supabase/setup-super-admin.sh`

- [ ] **Step 1: Write menu seed** — Platform menu items as defined in spec §4.4.

- [ ] **Step 2: Write user seed** — conditional insert as defined in spec §4.1.

- [ ] **Step 3: Write setup script** — `setup-super-admin.sh` as defined in spec §4.1.

- [ ] **Step 4: Update seed.sql for local dev** — add super_admin auth user + profile to `supabase/seed.sql`.

- [ ] **Step 5: Apply and commit**

```bash
npx supabase db push
git add supabase/migrations/20260408300007_seed_super_admin_menu.sql supabase/migrations/20260408300008_seed_super_admin_user.sql supabase/setup-super-admin.sh
git commit -m "feat(db): seed super admin menu, user, and setup script"
```

### Task 28: Update TypeScript Types

**Files:**
- Modify: `src/lib/types.ts:1-13`

- [ ] **Step 1: Update types**

```typescript
export type UserRole = 'super_admin' | 'admin' | 'customer' | 'partner'
export type CompanyType = 'platform' | 'admin' | 'customer' | 'partner'

export interface Company {
  id: string
  name: string
  type: CompanyType
  status: CompanyStatus
  parent_company_id: string | null
  domain: string | null
  tagline: string | null
  support_email: string | null
  contact_email: string | null
  slug: string | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: update types for super_admin, platform company, hierarchy"
```

### Task 29: Auth Utils + Guard Updates

**Files:**
- Create: `src/lib/auth-utils.ts`
- Modify: `src/components/auth-guard.tsx`
- Modify: `src/components/customer-guard.tsx`
- Create: `src/components/super-admin-guard.tsx`

- [ ] **Step 1: Create auth-utils.ts**

```typescript
export function isAdminOrAbove(role: string): boolean {
  return role === 'admin' || role === 'super_admin'
}

export function isSuperAdmin(role: string): boolean {
  return role === 'super_admin'
}
```

- [ ] **Step 2: Update AuthGuard**

Replace `profile.role !== 'admin'` with `!isAdminOrAbove(profile.role)` (both in useEffect and in render guard).

- [ ] **Step 3: Update CustomerGuard**

Replace `profile.role !== 'customer'` with `profile.role !== 'customer' && profile.role !== 'super_admin'`.

- [ ] **Step 4: Create SuperAdminGuard**

Same pattern as AuthGuard but checks `profile.role === 'super_admin'`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth-utils.ts src/components/auth-guard.tsx src/components/customer-guard.tsx src/components/super-admin-guard.tsx
git commit -m "feat: add auth utils and update guards for super_admin"
```

### Task 30: Update API Routes for super_admin

**Files:**
- Modify: All ~25 API routes under `src/app/api/admin/`, `src/app/api/support/`, `src/app/api/services/`, etc.

- [ ] **Step 1: Find all routes with admin role check**

Search for `profile.role !== 'admin'` across all API routes.

- [ ] **Step 2: Replace each with `!isAdminOrAbove(profile.role)`**

Add `import { isAdminOrAbove } from '@/lib/auth-utils'` to each file. Replace the role check.

- [ ] **Step 3: Verify no remaining hardcoded admin checks**

Search for `!== 'admin'` and `=== 'admin'` — ensure all are updated or intentional (e.g., login redirect).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/
git commit -m "feat: update all API routes to accept super_admin role"
```

### Task 31: Update Login Redirect

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Add role-based redirect**

After successful login, redirect based on role:
- `super_admin` → `/platform`
- `admin` → `/dashboard`
- `customer` → `/home`
- `partner` → `/partner/dashboard` (future)

**Note:** Pre-auth branding on the login page (showing the correct company logo before login) is deferred to Phase 4, Task 40. This task only handles the redirect logic.

- [ ] **Step 2: Commit**

```bash
git add src/app/(auth)/login/page.tsx
git commit -m "feat: add role-based login redirect for super_admin"
```

### Task 32: Super Admin Layout + Sidebar

**Files:**
- Create: `src/components/super-admin-sidebar.tsx`
- Create: `src/app/(super-admin)/layout.tsx`

- [ ] **Step 1: Build SuperAdminSidebar**

Same pattern as the existing admin `sidebar.tsx` but:
- Uses Servolu branding from `company_branding` for the platform company
- Renders platform menu items from `get_menu_tree('super_admin')`
- Includes company switcher dropdown at top

- [ ] **Step 2: Build layout**

`(super-admin)/layout.tsx`: wraps with `SuperAdminGuard`, `BrandingProvider`, sidebar + main content area.

- [ ] **Step 3: Commit**

```bash
git add src/components/super-admin-sidebar.tsx src/app/(super-admin)/layout.tsx
git commit -m "feat: add super admin layout and sidebar"
```

### Task 33: Super Admin Dashboard

**Files:**
- Create: `src/app/(super-admin)/platform/page.tsx`

- [ ] **Step 1: Build dashboard page**

`'use client'` page showing:
- Total admin companies card (count from `companies WHERE type = 'admin'`)
- Total customers card (count from `companies WHERE type = 'customer'`)
- Total services card
- Recent activity feed (placeholder for now)

Uses the same card pattern as the existing admin dashboard.

- [ ] **Step 2: Commit**

```bash
git add src/app/(super-admin)/platform/page.tsx
git commit -m "feat: add super admin dashboard page"
```

### Task 34: Companies Management Pages

**Files:**
- Create: `src/app/(super-admin)/platform/companies/page.tsx`
- Create: `src/app/(super-admin)/platform/companies/new/page.tsx`
- Create: `src/app/(super-admin)/platform/companies/[id]/page.tsx`
- Create: `src/app/(super-admin)/platform/companies/[id]/edit/page.tsx`

- [ ] **Step 1: Build companies list page**

Table with columns: Name, Domain, Status, Users (count), Customers (count), Created.
Actions: View, Edit.
"Add Company" button.

- [ ] **Step 2: Build new company page**

Form: name, domain, tagline, initial admin email. On submit:
1. Insert company with `type = 'admin'`
2. Create `company_branding` with defaults
3. Create admin user via API route (service_role)

- [ ] **Step 3: Build company detail + edit pages**

Detail: company info + list of users + list of child companies.
Edit: same form as new but pre-filled.

- [ ] **Step 4: Commit**

```bash
git add src/app/(super-admin)/platform/companies/
git commit -m "feat: add super admin companies management pages"
```

### Task 35: Super Admin Settings + Marketplace Branding

**Files:**
- Create: `src/app/(super-admin)/platform/settings/page.tsx`
- Create: `src/app/(super-admin)/platform/marketplace/branding/page.tsx`
- Create: `src/app/(super-admin)/platform/marketplace/listings/page.tsx`

- [ ] **Step 1: Build settings page** — Placeholder for now with platform config.

- [ ] **Step 2: Build marketplace branding** — Reuses the Brand page pattern from Phase 1 but for the Servolu company context.

- [ ] **Step 3: Build marketplace listings** — Placeholder page (fully built in Phase 5).

- [ ] **Step 4: Commit**

```bash
git add src/app/(super-admin)/platform/settings/ src/app/(super-admin)/platform/marketplace/
git commit -m "feat: add super admin settings and marketplace stub pages"
```

### Task 36: Phase 3 Integration Test

- [ ] **Step 1: Reset DB and verify**

```bash
npx supabase db reset
npm run dev
```

Expected:
1. Login as admin@servolu.com → redirects to `/platform`
2. Platform sidebar shows: Platform, Companies, Marketplace, Settings
3. Dashboard shows stats
4. Companies page lists IThealth
5. Login as existing IThealth admin → redirects to `/dashboard` as before
6. All existing admin features work (RLS migration didn't break anything)
7. All API routes accept both admin and super_admin

- [ ] **Step 2: Commit any fixes**

---

## PHASE 4: De-brand IThealth

### Task 37: Company Context Provider

**Files:**
- Create: `src/contexts/company-context.tsx`

- [ ] **Step 1: Build CompanyProvider**

`'use client'` context that:
1. In admin/super-admin layouts: resolves company from `useAuth()` profile's `company_id`
2. Fetches company record + company_branding
3. Provides `{ company, branding, loading }`

- [ ] **Step 2: Wrap admin layout** with `CompanyProvider` (above `BrandingProvider`).

- [ ] **Step 3: Commit**

```bash
git add src/contexts/company-context.tsx
git commit -m "feat: add CompanyProvider context"
```

### Task 38: Update company-resolver.ts

**Files:**
- Modify: `src/lib/company-resolver.ts`

- [ ] **Step 1: Enhance resolveCompanyId()**

```typescript
export async function resolveCompanyId(searchParams?: { company?: string }): Promise<string> {
  // 1. Check query param
  if (searchParams?.company) {
    const supabase = createServerClient()
    const { data } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', searchParams.company)
      .single()
    if (data) return data.id
  }
  // 2. Fall back to env default
  return process.env.DEFAULT_COMPANY_ID ?? '00000000-0000-0000-0000-000000000001'
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/company-resolver.ts
git commit -m "feat: enhance company resolver with slug lookup"
```

### Task 39: De-brand UI Components (Logos)

**Files:**
- Modify: `src/components/sidebar.tsx`
- Modify: `src/components/customer-sidebar.tsx`
- Modify: `src/components/public-header.tsx`
- Modify: `src/components/public-footer.tsx`

- [ ] **Step 1: Update sidebar.tsx**

Replace hardcoded `/logos/ithealth-icon-white.svg` with `branding?.icon_url ?? branding?.logo_light_url ?? '/logos/ithealth-icon-white.svg'` from `useBranding()`.

- [ ] **Step 2: Update customer-sidebar.tsx**

Same pattern — use `branding?.logo_light_url`.

- [ ] **Step 3: Update public-header.tsx**

This is a server component — pass branding as prop from layout. Replace hardcoded logo path.

- [ ] **Step 4: Update public-footer.tsx**

Replace logo path and "IThealth" copyright text with `company.name`.

- [ ] **Step 5: Review globals.css**

Check `src/app/globals.css` for hardcoded brand colour values (e.g. `#1175E4`). Keep them as fallback defaults — the `useBranding()` hook overrides at runtime. Update the comment from `/* IThealth brand colours */` to `/* Brand colour fallbacks */`.

- [ ] **Step 6: Commit**

```bash
git add src/components/sidebar.tsx src/components/customer-sidebar.tsx src/components/public-header.tsx src/components/public-footer.tsx
git commit -m "feat: de-brand UI components with dynamic logos"
```

### Task 40: De-brand Auth Pages

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/set-password/page.tsx`
- Modify: `src/app/(onboarding)/get-started/page.tsx`

- [ ] **Step 1: Update login page**

Replace hardcoded logos and copyright text. Fetch branding server-side via `resolveCompanyId()` + `getCompanyBranding()`. Pass as props.

- [ ] **Step 2: Update set-password page**

Replace hardcoded logo path.

- [ ] **Step 3: Update get-started page**

Replace all logo references (multiple occurrences).

- [ ] **Step 4: Commit**

```bash
git add src/app/(auth)/login/page.tsx src/app/(auth)/set-password/page.tsx src/app/(onboarding)/get-started/page.tsx
git commit -m "feat: de-brand auth and onboarding pages"
```

### Task 41: De-brand Metadata + Certificates + Emails

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/(public)/blog/page.tsx`
- Modify: `src/app/(public)/blog/[slug]/page.tsx`
- Modify: `src/components/academy/certificate-view.tsx`
- Modify: `src/app/api/certificates/download/route.ts`
- Modify: `src/app/api/certificates/generate/route.ts`
- Modify: `src/app/api/support/email/route.ts`
- Modify: `src/app/api/support/sla-monitor/route.ts`
- Modify: `src/app/api/services/checkout/route.ts`

- [ ] **Step 1: Update layout.tsx metadata** — dynamic title from `DEFAULT_COMPANY_ID` or "Servolu Platform".

- [ ] **Step 2: Update blog metadata** — `${company.name} Blog`.

- [ ] **Step 3: Update certificate-view.tsx** — replace "IThealth.ai" with company name/domain from user's company.

- [ ] **Step 4: Update certificate API routes** — look up company name from the user's profile.

- [ ] **Step 5: Update email routes** — look up company from ticket's company_id, use `company.support_email`.

- [ ] **Step 6: Update checkout route** — use company name from user's profile.

- [ ] **Step 7: Commit**

```bash
git add src/app/layout.tsx src/app/(public)/blog/ src/components/academy/certificate-view.tsx src/app/api/certificates/ src/app/api/support/ src/app/api/services/checkout/
git commit -m "feat: de-brand metadata, certificates, emails, checkout"
```

### Task 42: De-brand Cart Context + Config

**Files:**
- Modify: `src/contexts/cart-context.tsx`
- Modify: `package.json`
- Modify: `supabase/config.toml`

- [ ] **Step 1: Update cart localStorage key** — use `'platform-cart'` (company-scoped key requires more work, defer to Phase 5).

- [ ] **Step 2: Update package.json** — name to `"servolu-platform"`.

- [ ] **Step 3: Update supabase/config.toml** — project_id to `"servolu-platform"`.

- [ ] **Step 4: Commit**

```bash
git add src/contexts/cart-context.tsx package.json supabase/config.toml
git commit -m "feat: de-brand config files and cart context"
```

### Task 43: De-brand AI Service

**Files:**
- Modify: `ai-service/agents/defaults/orchestrators.py`
- Modify: `ai-service/agents/defaults/blog_writer.py`
- Modify: `ai-service/agents/defaults/service_builder.py`
- Modify: `ai-service/main.py`

- [ ] **Step 1: Template agent prompts**

Replace hardcoded "IThealth" in all prompt strings with `{company_name}` placeholder. E.g.:
```python
KING_PROMPT = """You are The King, the top-level orchestrator for {company_name}'s AI agent system."""
```

- [ ] **Step 2: Update main.py**

Add `COMPANY_NAME` env var fallback. Pass to agent prompt formatting.

- [ ] **Step 3: Commit**

```bash
git add ai-service/
git commit -m "feat: template AI agent prompts for multi-tenant company names"
```

### Task 44: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update project description**

Reflect multi-tenant architecture: Servolu as platform company, IThealth as first admin company. Update role list to include `super_admin`. Mention company hierarchy. Update architecture section.

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for multi-tenant architecture"
```

### Task 45: Phase 4 Verification

- [ ] **Step 1: Search for remaining IThealth references**

```bash
grep -ri "ithealth" src/ --include="*.tsx" --include="*.ts" -l
```

Expected: Only `src/lib/default-content.ts` (legitimate content) and possibly seed-related files. Zero in component rendering code.

- [ ] **Step 2: Visual verification**

Run `npm run dev`. Check:
- Admin sidebar: logo from DB
- Public header/footer: logo + name from DB
- Login page: branding from DB
- Certificate: company name from DB
- Public pages: all content from DB

- [ ] **Step 3: Commit any fixes**

---

## PHASE 5: Servolu Marketplace

### Task 46: Marketplace Database

**Files:**
- Create: `supabase/migrations/20260408500001_create_marketplace_listings.sql`
- Create: `supabase/migrations/20260408500002_marketplace_rls.sql`
- Create: `supabase/migrations/20260408500003_seed_ithealth_marketplace_listing.sql`
- Create: `supabase/migrations/20260408500004_seed_marketplace_menu_items.sql`

- [ ] **Step 1: Write marketplace_listings table** — as defined in spec §6.1 (no slug column — uses companies.slug).

- [ ] **Step 2: Write RLS** — super_admin full CRUD, admin read own, public read active.

- [ ] **Step 3: Seed IThealth listing** — `is_featured = true`, description from about page content.

- [ ] **Step 4: Seed menu items** — update super admin marketplace listings menu item if needed.

- [ ] **Step 5: Apply and commit**

```bash
npx supabase db push
git add supabase/migrations/20260408500001_create_marketplace_listings.sql supabase/migrations/20260408500002_marketplace_rls.sql supabase/migrations/20260408500003_seed_ithealth_marketplace_listing.sql supabase/migrations/20260408500004_seed_marketplace_menu_items.sql
git commit -m "feat(db): create marketplace_listings table and seed data"
```

### Task 47: Marketplace Layout + Components

**Files:**
- Create: `src/components/marketplace/marketplace-header.tsx`
- Create: `src/components/marketplace/marketplace-footer.tsx`
- Create: `src/components/marketplace/provider-card.tsx`
- Create: `src/components/marketplace/service-card.tsx`
- Create: `src/app/(marketplace)/layout.tsx`

- [ ] **Step 1: Build marketplace header** — Servolu logo + nav (Providers, Services, About, Contact).

- [ ] **Step 2: Build marketplace footer** — Servolu branding + copyright.

- [ ] **Step 3: Build provider card** — Logo, name, tagline, service count, "View" link.

- [ ] **Step 4: Build service card** — Service name, provider logo + name, phase badge, price.

- [ ] **Step 5: Build layout** — marketplace header + `{children}` + marketplace footer. Fetch Servolu branding server-side.

- [ ] **Step 6: Commit**

```bash
git add src/components/marketplace/ src/app/(marketplace)/layout.tsx
git commit -m "feat: add marketplace layout and reusable components"
```

### Task 48: Marketplace Home Page

**Files:**
- Create: `src/app/(marketplace)/page.tsx`

- [ ] **Step 1: Build page**

Server component. Fetches:
- Servolu's `website_content` for `page = 'home'` (marketplace home content)
- Featured providers: `marketplace_listings WHERE is_featured = true` joined with `companies` and `company_branding`
- Phase categories from `phases` table

Renders:
- Hero section (CMS-driven)
- Featured providers carousel/grid
- Service category cards (Operate, Secure, Streamline, Accelerate)
- Search bar (links to `/marketplace/services?q=...`)

- [ ] **Step 2: Commit**

```bash
git add src/app/(marketplace)/page.tsx
git commit -m "feat: add marketplace home page"
```

### Task 49: Provider Pages

**Files:**
- Create: `src/app/(marketplace)/providers/page.tsx`
- Create: `src/app/(marketplace)/providers/[slug]/page.tsx`
- Create: `src/app/(marketplace)/providers/[slug]/services/[serviceSlug]/page.tsx`

- [ ] **Step 1: Build providers list** — Grid of `ProviderCard` components. Filter by active marketplace listings.

- [ ] **Step 2: Build provider profile** — Header with branding, about section from provider's `website_content`, services grid.

- [ ] **Step 3: Build service detail** — Service info with provider attribution. Reuse existing service display patterns.

- [ ] **Step 4: Commit**

```bash
git add src/app/(marketplace)/providers/
git commit -m "feat: add marketplace provider pages"
```

### Task 50: Service Browsing + Static Pages

**Files:**
- Create: `src/app/(marketplace)/services/page.tsx`
- Create: `src/app/(marketplace)/services/[slug]/page.tsx`
- Create: `src/app/(marketplace)/about/page.tsx`
- Create: `src/app/(marketplace)/contact/page.tsx`

- [ ] **Step 1: Build services page** — Aggregated service list with phase filter, provider filter, search.

- [ ] **Step 1b: Build service slug redirect** — `services/[slug]/page.tsx` resolves the service, finds its provider, and redirects to `/marketplace/providers/[providerSlug]/services/[serviceSlug]`.

- [ ] **Step 2: Build about page** — CMS-driven from Servolu's `website_content`.

- [ ] **Step 3: Build contact page** — CMS-driven from Servolu's `website_content`.

- [ ] **Step 4: Commit**

```bash
git add src/app/(marketplace)/services/ src/app/(marketplace)/about/ src/app/(marketplace)/contact/
git commit -m "feat: add marketplace services, about, and contact pages"
```

### Task 51: Super Admin Marketplace Listings Management

**Files:**
- Modify: `src/app/(super-admin)/platform/marketplace/listings/page.tsx`

- [ ] **Step 1: Build full listings management page**

Replace placeholder with:
- Table of all admin companies with columns: Name, Status, Featured (toggle), Services Count, Sort Order
- Actions: toggle active, toggle featured, edit description (inline), reorder

- [ ] **Step 2: Commit**

```bash
git add src/app/(super-admin)/platform/marketplace/listings/page.tsx
git commit -m "feat: build marketplace listings management for super admin"
```

### Task 52: Phase 5 Integration Test

- [ ] **Step 1: Reset DB and verify**

```bash
npx supabase db reset
npm run dev
```

Expected:
1. Navigate to `/marketplace` → marketplace home loads with Servolu branding
2. Featured providers section shows IThealth
3. Click provider → profile page with IThealth branding and services
4. Browse services → aggregated from all providers
5. About/Contact pages render from CMS
6. Super admin → Marketplace > Listings → can toggle IThealth visibility/featured

- [ ] **Step 2: Commit any fixes**

### Task 53: Final End-to-End Verification

- [ ] **Step 1: Full DB reset**

```bash
npx supabase db reset
npm run dev
```

- [ ] **Step 2: Test complete flow**

1. Login as super_admin (admin@servolu.com) → `/platform` dashboard
2. View companies → IThealth listed
3. Switch to IThealth context → admin shell loads with IThealth branding
4. Growth > Brand → edit IThealth colours → save
5. Growth > Content > Website → edit home page hero → save
6. Public site → reflects updated branding + content
7. `/marketplace` → IThealth as featured provider
8. Login as IThealth admin → admin works as before
9. Login as customer → customer portal works as before

- [ ] **Step 3: Grep for remaining hardcoded IThealth**

```bash
grep -ri "ithealth" src/ --include="*.tsx" --include="*.ts" | grep -v "default-content" | grep -v "node_modules"
```

Expected: Zero results in component/page code.

- [ ] **Step 4: Commit final fixes if any**
