# Multi-Tenant Platform, Brand Management & Website CMS Design

**Date**: 2026-04-08
**Status**: Approved
**Scope**: 5 phases — Brand Management, Website CMS, Super Admin (Servolu), De-branding, Marketplace

---

## 1. Overview

This spec transforms the IThealth platform from a single-tenant admin system into a multi-tenant managed services platform. A new top-level entity — Servolu — operates as a "platform" company that manages multiple admin companies (IThealth being the first). Each admin company gets its own branding, website content, and customer base. Servolu exposes a marketplace that aggregates admin companies and their services.

### Goals

1. **Brand Management** — each admin company uploads logos, selects colours and fonts, stored in DB and applied dynamically
2. **Website CMS** — admins edit all public website content and images through a tabbed admin interface
3. **Super Admin** — Servolu sits above admin companies with its own role, permissions, and management shell
4. **De-branding** — remove all hardcoded IThealth references, replace with dynamic values from DB
5. **Marketplace** — Servolu's public site aggregates admin companies into a managed services marketplace

### Phase Dependencies

```
Phase 1: Brand Management          ← Foundation (no dependencies). Admin-only RLS; super_admin policies deferred to Phase 3.
Phase 2: Website CMS               ← Depends on Phase 1 (uses branding). Admin-only RLS; super_admin policies deferred to Phase 3.
Phase 3: Super Admin (Servolu)     ← Must run after Phase 1 & 2 DB migrations (adds super_admin enum + policies for ALL tables including company_branding and website_content)
Phase 4: De-brand IThealth         ← Depends on Phase 1 + 2 + 3 (branding, CMS, and company metadata must exist)
Phase 5: Marketplace               ← Depends on Phase 3 + 4 (Servolu exists, sites are dynamic)
```

**Important**: Phase 1 and Phase 2 create tables with admin-only RLS. Phase 3's migrations add the `super_admin` enum value and then create super_admin policies for ALL tables (including Phase 1 & 2 tables). This avoids referencing a `super_admin` role that doesn't exist yet.

---

## 2. Phase 1: Brand Management

### 2.1 Database

**New table: `company_branding`**

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

**RLS Policies (Phase 1 — admin only; super_admin policies added in Phase 3):**

```sql
-- Public read for rendering public sites
CREATE POLICY "Public can read branding"
  ON public.company_branding FOR SELECT
  USING (true);

-- Admins can read/update/insert their own company's branding (no DELETE — one branding per company)
CREATE POLICY "Admins select own company branding"
  ON public.company_branding FOR SELECT
  USING (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  );

CREATE POLICY "Admins insert own company branding"
  ON public.company_branding FOR INSERT
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  );

CREATE POLICY "Admins update own company branding"
  ON public.company_branding FOR UPDATE
  USING (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
  );

-- NOTE: No DELETE policy — branding records should not be deleted, only updated.
-- NOTE: Super admin policies are added in Phase 3 migration 20260408300006.
```

**Supabase Storage bucket: `branding`**

- Public read access (logos need to be served without auth)
- Write restricted to authenticated users uploading for their own company
- Path convention: `{company_id}/logo.{ext}`, `{company_id}/logo-light.{ext}`, `{company_id}/icon.{ext}`

```sql
-- Migration: 20260408100003_create_branding_storage_bucket.sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Public read branding bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'branding');

-- Authenticated users upload to their company's folder
CREATE POLICY "Admins upload to own branding folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = (public.get_my_company_id())::text
    AND public.get_my_role() = 'admin'
  );

-- Admins can update/delete their own company's files
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

### 2.2 Menu Item

New L2 under Growth:

```sql
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000301', '10000000-0000-0000-0000-000000000002',
   'Brand', 'ColorPalette', '/growth/brand', 3, 2);

INSERT INTO public.role_menu_access (role, menu_item_id) VALUES
  ('admin', '20000000-0000-0000-0000-000000000301');
```

### 2.3 Admin UI: `/growth/brand`

**Route**: `src/app/(admin)/growth/brand/page.tsx`

**Layout**: Single page with three sections stacked vertically:

**Section 1 — Logos**
- Three upload zones side by side: "Main Logo", "Light Logo (for dark backgrounds)", "Icon / Favicon"
- Each zone: drag-and-drop area with preview thumbnail, upload button, remove button
- Accepted formats: SVG, PNG, JPEG. Max 2MB per file.
- On upload: file goes to Supabase Storage `branding/{company_id}/`, URL saved to `company_branding`

**Section 2 — Colours**
- Three colour pickers in a row: Primary, Secondary, Accent (optional)
- Each picker: hex input field + colour swatch + native colour picker popup
- Live preview strip below showing the three colours applied to sample elements (button, heading, link)

**Section 3 — Fonts**
- Two searchable dropdowns: "Heading Font" and "Body Font"
- Populated from a curated list of Google Fonts (stored as a static array — ~50 popular fonts)
- Live preview text below each dropdown showing the selected font applied to sample heading/paragraph

**Actions**: "Save Changes" button at bottom. Saves all fields in a single upsert to `company_branding`. Toast on success/error.

### 2.4 Branding Context: `useBranding()` hook

**File**: `src/contexts/branding-context.tsx`

```typescript
interface Branding {
  logoUrl: string | null
  logoLightUrl: string | null
  iconUrl: string | null
  primaryColour: string
  secondaryColour: string
  accentColour: string | null
  fontHeading: string
  fontBody: string
}

interface BrandingContextType {
  branding: Branding | null
  loading: boolean
}
```

**Behaviour:**
- Wraps `(admin)` layout — fetches branding for the current user's `company_id` on mount
- Sets CSS custom properties on `document.documentElement`:
  - `--brand-primary` → `primaryColour`
  - `--brand-secondary` → `secondaryColour`
  - `--brand-accent` → `accentColour`
- Loads Google Fonts dynamically via `<link>` injection for `fontHeading` and `fontBody`
- Falls back to current defaults if no branding record exists

### 2.5 TypeScript Types

```typescript
// In src/lib/types.ts
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

---

## 3. Phase 2: Website CMS

### 3.1 Database

**New table: `website_content`**

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

**RLS Policies (Phase 2 — admin only; super_admin policies added in Phase 3):**

```sql
-- Public read for rendering public sites
CREATE POLICY "Public can read website content"
  ON public.website_content FOR SELECT
  USING (true);

-- Admins manage their own company's content (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admins select own website content"
  ON public.website_content FOR SELECT
  USING (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  );

CREATE POLICY "Admins insert own website content"
  ON public.website_content FOR INSERT
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  );

CREATE POLICY "Admins update own website content"
  ON public.website_content FOR UPDATE
  USING (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  )
  WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "Admins delete own website content"
  ON public.website_content FOR DELETE
  USING (
    public.get_my_role() = 'admin'
    AND company_id = public.get_my_company_id()
  );

-- NOTE: Super admin policies are added in Phase 3 migration 20260408300006.
```

**Supabase Storage bucket: `website-content`**

- Public read access
- Write restricted to authenticated admins
- Path convention: `{company_id}/{page}/{section}/{filename}`

```sql
-- Migration: 20260408200003_create_website_content_bucket.sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('website-content', 'website-content', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read website-content bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'website-content');

CREATE POLICY "Admins upload to own website-content folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'website-content'
    AND (storage.foldername(name))[1] = (public.get_my_company_id())::text
    AND public.get_my_role() = 'admin'
  );

CREATE POLICY "Admins manage own website-content files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'website-content'
    AND (storage.foldername(name))[1] = (public.get_my_company_id())::text
    AND public.get_my_role() = 'admin'
  );

CREATE POLICY "Admins delete own website-content files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'website-content'
    AND (storage.foldername(name))[1] = (public.get_my_company_id())::text
    AND public.get_my_role() = 'admin'
  );
```

### 3.2 Content Schema Per Section

Each section's `content` JSONB follows a defined shape:

**All hero sections use standardised field names: `title`, `subtitle`** (matching the existing `PageHero` component props).

**Home Page:**

| Section | JSONB Schema |
|---------|-------------|
| `hero` | `{ title: string, subtitle: string, cta_text: string, cta_link: string, background_image_url: string \| null }` |
| `mission` | `{ body: string }` (single paragraph) |
| `journey` | `{ heading: string, subheading: string, show_phases: boolean }` (phases themselves come from existing `phases` table) |
| `team_banner` | `{ image_url: string, alt_text: string }` |
| `platform_showcase` | `{ eyebrow: string, heading: string, description: string, image_url: string \| null }` |
| `testimonials` | `{ heading: string, items: [{ quote: string, author: string, role: string, company: string, avatar_url: string \| null }] }` |
| `blog_preview` | `{ heading: string, subheading: string, count: number }` (posts fetched dynamically) |
| `cta` | `{ heading: string, subheading: string, button_text: string, button_link: string }` |

**About Page:**

| Section | JSONB Schema |
|---------|-------------|
| `hero` | `{ title: string, subtitle: string }` |
| `mission` | `{ eyebrow: string, heading: string, paragraphs: string[], image_url: string \| null }` |
| `values` | `{ items: [{ icon: string, title: string, description: string }] }` |
| `cta` | `{ heading: string, subheading: string, button_text: string, button_link: string }` |

**Features Page:**

| Section | JSONB Schema |
|---------|-------------|
| `hero` | `{ title: string, subtitle: string }` |
| `features` | `{ items: [{ icon: string, title: string, description: string }] }` |
| `detail` | `{ heading: string, body: string, image_url: string \| null }` |
| `cta` | `{ heading: string, subheading: string, button_text: string, button_link: string }` |

**Contact Page:**

| Section | JSONB Schema |
|---------|-------------|
| `hero` | `{ title: string, subtitle: string }` |
| `info` | `{ email: string, phone: string \| null, address: string \| null }` |
| `form` | `{ heading: string, fields: string[] }` (field names like 'name', 'email', 'message', 'company') |

**Partners Page:**

| Section | JSONB Schema |
|---------|-------------|
| `hero` | `{ title: string, subtitle: string }` |
| `benefits` | `{ heading: string, items: [{ icon: string, title: string, description: string }] }` |
| `cta` | `{ heading: string, subheading: string, button_text: string, button_link: string }` |

### 3.3 Menu Item

New L3 under Growth > Content:

```sql
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('30000000-0000-0000-0000-000000000203', '20000000-0000-0000-0000-000000000201',
   'Website', 'Globe', '/growth/content/website', 2, 3);

INSERT INTO public.role_menu_access (role, menu_item_id) VALUES
  ('admin', '30000000-0000-0000-0000-000000000203');
```

### 3.4 Admin UI: `/growth/content/website`

**Route**: `src/app/(admin)/growth/content/website/page.tsx`

**Layout**: Tabbed interface — one tab per public page.

**Tab bar**: Home | About | Features | Contact | Partners

Each tab renders a vertical list of section editor cards. Each card contains:

**Card header:**
- Section name (e.g. "Hero")
- Toggle switch to enable/disable section (`is_active`)
- Sort order number input (for reordering)

**Card body** — form fields matching the section's JSONB schema:
- `string` fields → text input or textarea (textarea for longer content like paragraphs)
- `string[]` fields → multi-line editor (one item per line, or add/remove buttons)
- `image_url` fields → image upload with preview (uploads to Supabase Storage `website-content/{company_id}/{page}/{section}/`)
- `items[]` arrays → repeatable card groups with add/remove buttons
- `boolean` fields → toggle switch
- `number` fields → number input

**Actions per tab:**
- "Save Page" button saves all sections for the current page tab in a batch upsert
- "Preview" button opens the public page in a new browser tab
- Toast on success/error

**Empty state**: When no `website_content` records exist for a company (new company), the editor pre-populates with default content matching the current hardcoded values. On first save, records are created.

### 3.5 Default Content Seed

A migration seeds `website_content` for the IThealth company (company_id `00000000-0000-0000-0000-000000000001`) with the current hardcoded content from the public pages. This ensures existing content is preserved when switching to the CMS.

### 3.6 Server-Side Data Fetching

**Function**: `getPageContent(companyId: string, page: string)`

```typescript
// src/lib/website-content.ts
export async function getPageContent(
  companyId: string,
  page: string
): Promise<Record<string, WebsiteSection>> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data } = await supabase
    .from('website_content')
    .select('*')
    .eq('company_id', companyId)
    .eq('page', page)
    .eq('is_active', true)
    .order('sort_order')

  // Returns a map: { hero: { content, sort_order }, mission: { content, sort_order }, ... }
  return (data ?? []).reduce((acc, row) => {
    acc[row.section] = row
    return acc
  }, {} as Record<string, WebsiteSection>)
}
```

### 3.7 Public Page Refactoring

Each public page is refactored from hardcoded content to data-driven rendering:

**Before** (hardcoded):
```tsx
export default function AboutPage() {
  return (
    <PageHero title="About IThealth" subtitle="Your IT Modernisation Champions" />
  )
}
```

**After** (data-driven):
```tsx
export default async function AboutPage() {
  const companyId = await resolveCompanyId() // see Phase 4
  const sections = await getPageContent(companyId, 'about')
  const branding = await getCompanyBranding(companyId)

  const hero = sections.hero?.content ?? { title: 'About Us', subtitle: '' }

  return (
    <PageHero title={hero.title} subtitle={hero.subtitle} />
  )
}
```

**Company resolution** (for public pages): Initially uses the IThealth company ID as default. In Phase 4, this becomes dynamic based on domain or route context.

### 3.8 TypeScript Types

```typescript
// In src/lib/types.ts
export interface WebsiteSection {
  id: string
  company_id: string
  page: string
  section: string
  content: Record<string, unknown>
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Section-specific content types (all hero sections use title/subtitle for consistency)
export interface HeroContent {
  title: string
  subtitle: string
  cta_text?: string
  cta_link?: string
  background_image_url?: string | null
}

// Home page mission (simple single paragraph)
export interface HomeMissionContent {
  body: string
}

// About page mission (structured with heading, paragraphs, image)
export interface AboutMissionContent {
  eyebrow?: string
  heading: string
  paragraphs: string[]
  image_url?: string | null
}

export interface TestimonialsContent {
  heading: string
  items: {
    quote: string
    author: string
    role: string
    company: string
    avatar_url?: string | null
  }[]
}

export interface CTAContent {
  heading: string
  subheading: string
  button_text: string
  button_link: string
}

export interface ContactInfoContent {
  email: string
  phone?: string | null
  address?: string | null
}
```

---

## 4. Phase 3: Super Admin Layer (Servolu)

### 4.1 Database Changes

**Extend enums:**

```sql
-- Add platform company type
ALTER TYPE company_type ADD VALUE 'platform';

-- Add super_admin role
ALTER TYPE user_role ADD VALUE 'super_admin';
```

**Add company hierarchy:**

```sql
ALTER TABLE public.companies
  ADD COLUMN parent_company_id uuid REFERENCES public.companies(id);

-- Index for querying child companies
CREATE INDEX idx_companies_parent ON public.companies (parent_company_id);
```

**Add company metadata columns:**

```sql
ALTER TABLE public.companies
  ADD COLUMN domain text,
  ADD COLUMN tagline text,
  ADD COLUMN support_email text,
  ADD COLUMN contact_email text,
  ADD COLUMN slug text UNIQUE;
```

**Seed Servolu:**

```sql
INSERT INTO public.companies (id, name, type, status, domain, tagline, support_email, contact_email, slug)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Servolu',
  'platform',
  'active',
  'servolu.com',
  'Managed Services Marketplace',
  'support@servolu.com',
  'hello@servolu.com',
  'servolu'
);

-- Update IThealth to be a child of Servolu
UPDATE public.companies
SET parent_company_id = '00000000-0000-0000-0000-000000000000',
    domain = 'ithealth.ai',
    tagline = 'Your IT Modernisation Champion',
    support_email = 'support@ithealth.ai',
    contact_email = 'hello@ithealth.ai',
    slug = 'ithealth'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Update customer companies to be children of IThealth
UPDATE public.companies
SET parent_company_id = '00000000-0000-0000-0000-000000000001'
WHERE type = 'customer';

-- Update partner companies to be children of IThealth
UPDATE public.companies
SET parent_company_id = '00000000-0000-0000-0000-000000000001'
WHERE type = 'partner';
```

**Seed super_admin user:**

The super admin profile requires a corresponding `auth.users` entry (FK constraint). This cannot be done via plain SQL migration — it must use the Supabase Auth Admin API.

**Approach**: A setup script (`supabase/setup-super-admin.sh`) creates the auth user via `supabase` CLI or the GoTrue Admin API, then inserts the profile:

```bash
#!/bin/bash
# supabase/setup-super-admin.sh
# Must be run after migrations, using service_role key

SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
SUPER_ADMIN_ID="c0000000-0000-0000-0000-000000000000"
SUPER_ADMIN_EMAIL="admin@servolu.com"
SUPER_ADMIN_PASSWORD="changeme123!" # prompt in production

# Create auth user via GoTrue Admin API
curl -s -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"${SUPER_ADMIN_ID}\",
    \"email\": \"${SUPER_ADMIN_EMAIL}\",
    \"password\": \"${SUPER_ADMIN_PASSWORD}\",
    \"email_confirm\": true
  }"
```

Then the profile is inserted via a seed migration that runs **after** the setup script:

```sql
-- Only insert if auth user exists (idempotent)
INSERT INTO public.profiles (id, email, display_name, role, company_id)
SELECT
  'c0000000-0000-0000-0000-000000000000',
  'admin@servolu.com',
  'Servolu Admin',
  'super_admin',
  '00000000-0000-0000-0000-000000000000'
WHERE EXISTS (
  SELECT 1 FROM auth.users WHERE id = 'c0000000-0000-0000-0000-000000000000'
)
ON CONFLICT (id) DO NOTHING;
```

**For local dev**: The `supabase/seed.sql` includes both the auth user creation (via `INSERT INTO auth.users` which works in local dev mode) and the profile insert. For production, the setup script must be run first.

### 4.2 RLS Policy Updates

**New helper function:**

```sql
CREATE OR REPLACE FUNCTION public.get_my_company_type()
RETURNS public.company_type
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT c.type
  FROM public.companies c
  INNER JOIN public.profiles p ON p.company_id = c.id
  WHERE p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_above()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role IN ('admin', 'super_admin')
  FROM public.profiles
  WHERE id = auth.uid();
$$;
```

**Updated policies — comprehensive list:**

Every existing `get_my_role() = 'admin'` policy must be updated. The Phase 3 RLS migration (`20260408300006`) must DROP and re-CREATE all affected policies.

**Strategy**: Use `is_admin_or_above()` helper for simple admin-access policies. Use explicit `super_admin` policies where super_admin needs broader access than admin.

**Companies table** (admin sees own tree, super_admin sees all):

```sql
-- Drop existing admin policy
DROP POLICY IF EXISTS "Admins can do everything with companies" ON public.companies;

-- Super admins: full access to everything
CREATE POLICY "Super admins full access on companies"
  ON public.companies FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

-- Admins: access to own company + child companies
CREATE POLICY "Admins manage own company tree"
  ON public.companies FOR SELECT
  USING (
    public.get_my_role() = 'admin'
    AND (id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id())
  );

CREATE POLICY "Admins insert child companies"
  ON public.companies FOR INSERT
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND parent_company_id = public.get_my_company_id()
  );

CREATE POLICY "Admins update own company tree"
  ON public.companies FOR UPDATE
  USING (
    public.get_my_role() = 'admin'
    AND (id = public.get_my_company_id() OR parent_company_id = public.get_my_company_id())
  )
  WITH CHECK (
    parent_company_id = public.get_my_company_id() OR id = public.get_my_company_id()
  );
```

**Note on parent_company_id for INSERT**: When an admin creates a new customer/partner company, the application code MUST set `parent_company_id` to their own company ID. The `WITH CHECK` clause enforces this. A database trigger also auto-sets it as a safety net:

```sql
CREATE OR REPLACE FUNCTION public.set_parent_company_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- For customer/partner: parent is the creating user's company
  IF NEW.parent_company_id IS NULL AND NEW.type IN ('customer', 'partner') THEN
    NEW.parent_company_id := (SELECT company_id FROM public.profiles WHERE id = auth.uid());
  END IF;
  -- For admin: parent is the platform company (super_admin creates admin companies)
  IF NEW.parent_company_id IS NULL AND NEW.type = 'admin' THEN
    NEW.parent_company_id := (SELECT company_id FROM public.profiles WHERE id = auth.uid());
    -- If creator is super_admin, their company_id IS the platform company — correct.
    -- If creator is admin, this prevents orphaned admin companies.
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER companies_set_parent
  BEFORE INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_parent_company_on_insert();
```

**Profiles table** (same tree pattern):

```sql
DROP POLICY IF EXISTS "Admins can do everything with profiles" ON public.profiles;

CREATE POLICY "Super admins full access on profiles"
  ON public.profiles FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Admins manage own company tree profiles"
  ON public.profiles FOR ALL
  USING (
    public.get_my_role() = 'admin'
    AND company_id IN (
      SELECT id FROM public.companies
      WHERE id = public.get_my_company_id()
        OR parent_company_id = public.get_my_company_id()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM public.companies
      WHERE id = public.get_my_company_id()
        OR parent_company_id = public.get_my_company_id()
    )
  );
```

**All other admin-scoped tables** — replace `get_my_role() = 'admin'` with `is_admin_or_above()`:

The following tables all have policies using `get_my_role() = 'admin'` that must be updated. For each, the migration DROPs the old policy and CREATEs a new one using `public.is_admin_or_above()`:

| Table | Migration File | Policy Name to Drop |
|-------|---------------|-------------------|
| `services` | `20260402000006_rls_policies.sql` | "Admins can do everything with services" |
| `service_phase_junction` | `20260403000009_layer1_rls_policies.sql` | "Admins manage service_phase_junction" |
| `service_vertical_junction` | `20260403000009_layer1_rls_policies.sql` | "Admins manage service_vertical_junction" |
| `service_persona_junction` | `20260403000009_layer1_rls_policies.sql` | "Admins manage service_persona_junction" |
| `service_pain_junction` | `20260403000009_layer1_rls_policies.sql` | "Admins manage service_pain_junction" |
| `service_gain_junction` | `20260403000009_layer1_rls_policies.sql` | "Admins manage service_gain_junction" |
| `runbook_steps` | `20260403000009_layer1_rls_policies.sql` | "Admins manage runbook_steps" |
| `service_costing_items` | `20260403000009_layer1_rls_policies.sql` | "Admins manage service_costing_items" |
| `blog_posts` | `20260403000009_layer1_rls_policies.sql` | "Admins manage blog_posts" |
| `testimonials` | `20260403000009_layer1_rls_policies.sql` | "Admins manage testimonials" |
| `partners` | `20260403000009_layer1_rls_policies.sql` | "Admins manage partners" |
| `courses` | Academy migrations | "Admins manage courses" |
| `course_sections` | Academy migrations | "Admins manage course_sections" |
| `course_modules` | Academy migrations | "Admins manage course_modules" |
| `assessments` | Assessment migrations | "Admins manage assessments" |
| `assessment_questions` | Assessment migrations | "Admins manage assessment_questions" |
| `assessment_attempts` | Assessment migrations | Admin policies |
| `certificates` | Academy migrations | Admin policies |
| `course_progress` | Academy migrations | Admin policies |
| `meta_campaigns` | Meta ads migration | Admin policies |
| `meta_ad_sets` | Meta ads migration | Admin policies |
| `meta_ads` | Meta ads migration | Admin policies |
| `meta_ad_metrics` | Meta ads migration | Admin policies |
| `sla_templates` | Support migration | Admin policies |
| `service_sla` | Support migration | Admin policies |
| `customer_contracts` | Support migration | Admin policies |
| `support_tickets` | Support migration | Admin policies (also has customer policies) |
| `ticket_replies` | Support migration | Admin policies |
| `ticket_routing_rules` | Support migration | Admin policies |
| `ticket_email_log` | Support migration | Admin policies |
| `service_requests` | Services migration | Admin policies |
| `orders` | Services migration | Admin policies |
| `order_items` | Services migration | Admin policies |
| `payfast_integrations` | Services migration | Admin policies |
| `company_branding` | Phase 1 | Add super_admin SELECT/INSERT/UPDATE policies |
| `website_content` | Phase 2 | Add super_admin SELECT/INSERT/UPDATE/DELETE policies |
| `ai_agents` | AI agents migration | Admin policies |
| `ai_agent_tools` | AI agents migration | Admin policies |
| `ai_conversations` | AI agents migration | Admin policies |
| `ai_messages` | AI agents migration | Admin policies |
| `ai_execution_steps` | AI agents migration | Admin policies |
| `team_invitations` | Team migration | Admin/company_admin policies |
| `team_skills` | Team migration | Admin policies |
| `team_skill_ratings` | Team migration | Admin policies |

**Multi-tenant scoping consideration:**

The existing codebase uses unscoped `get_my_role() = 'admin'` policies because there was only one admin company (IThealth). In a multi-tenant world, admins from Company A should NOT see Company B's data. However, most of these tables (services, blog_posts, courses, etc.) do NOT have a `company_id` column today — they were designed as global admin-managed data.

**Two categories of tables:**

1. **Global admin tables** (services, blog_posts, courses, testimonials, partners, etc.) — currently shared across the platform, not company-scoped. These stay accessible to all admins via `is_admin_or_above()` for now. In a future migration, a `company_id` column will be added to enable per-company content isolation. Super admins always see all.

2. **Company-scoped tables** (support_tickets, orders, service_requests, customer_contracts, team_invitations, team_skills, etc.) — already have `company_id` or link to a company via the user. These use company-tree scoping.

**Template A — Global admin tables** (no company_id column):

```sql
-- Example for services table (global, shared across admin companies)
DROP POLICY IF EXISTS "Admins can do everything with services" ON public.services;

-- Super admins: full access
CREATE POLICY "Super admins full access on services"
  ON public.services FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

-- Admins: full access (global — these tables will be company-scoped in a future migration)
CREATE POLICY "Admins full access on services"
  ON public.services FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');
```

**Tables using Template A:** services, service_phase_junction, service_vertical_junction, service_persona_junction, service_pain_junction, service_gain_junction, runbook_steps, service_costing_items, blog_posts, testimonials, partners, courses, course_sections, course_modules, assessments, assessment_questions, meta_campaigns, meta_ad_sets, meta_ads, meta_ad_metrics, ai_agents, ai_agent_tools

**Template B — Company-scoped tables** (have company_id or join to company):

```sql
-- Example for support_tickets (company-scoped)
DROP POLICY IF EXISTS "Admins manage support_tickets" ON public.support_tickets;

-- Super admins: full access to all
CREATE POLICY "Super admins full access on support_tickets"
  ON public.support_tickets FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

-- Admins: access own company tree's tickets only
CREATE POLICY "Admins manage own company tree support_tickets"
  ON public.support_tickets FOR ALL
  USING (
    public.get_my_role() = 'admin'
    AND company_id IN (
      SELECT id FROM public.companies
      WHERE id = public.get_my_company_id()
        OR parent_company_id = public.get_my_company_id()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM public.companies
      WHERE id = public.get_my_company_id()
        OR parent_company_id = public.get_my_company_id()
    )
  );
```

**Tables using Template B:** support_tickets, ticket_replies, ticket_routing_rules, ticket_email_log, sla_templates, service_sla, customer_contracts, service_requests, orders, order_items, payfast_integrations, team_invitations, team_skills, team_skill_ratings, assessment_attempts, certificates, course_progress, ai_conversations, ai_messages, ai_execution_steps

**Note on DELETE**: Both templates use `FOR ALL` which includes DELETE. This matches the existing behaviour (admins could always delete). For tables where deletion is destructive and should be restricted, individual policies should be used (as done for `company_branding`). The migration should be reviewed table-by-table during implementation, but the default is to preserve existing capability.

**Super admin policies for Phase 1 & 2 tables** (added in this migration):

```sql
-- company_branding: super_admin can read/insert/update (no delete, matching admin policy)
CREATE POLICY "Super admins select all branding"
  ON public.company_branding FOR SELECT
  USING (public.get_my_role() = 'super_admin');

CREATE POLICY "Super admins insert branding"
  ON public.company_branding FOR INSERT
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY "Super admins update branding"
  ON public.company_branding FOR UPDATE
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

-- website_content: super_admin gets full CRUD
CREATE POLICY "Super admins manage all website content"
  ON public.website_content FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');
```

### 4.3 Auth & Guards

**New utility** (`src/lib/auth-utils.ts`):

```typescript
export function isAdminOrAbove(role: string): boolean {
  return role === 'admin' || role === 'super_admin'
}

export function isSuperAdmin(role: string): boolean {
  return role === 'super_admin'
}
```

**Updated AuthGuard** (`src/components/auth-guard.tsx`):

```typescript
// Before: profile.role !== 'admin'
// After:  !isAdminOrAbove(profile.role)
```

**New SuperAdminGuard** (`src/components/super-admin-guard.tsx`):

```typescript
// Checks profile.role === 'super_admin', redirects to /login if not
// Same pattern as existing AuthGuard but for super_admin only
```

**Updated CustomerGuard** (`src/components/customer-guard.tsx`):

```typescript
// Before: profile.role !== 'customer'
// After:  profile.role !== 'customer' && profile.role !== 'super_admin'
// Super admins can access customer portal for debugging/support (impersonation)
```

**API route updates** (~25 routes):

All admin API routes that check `profile.role !== 'admin'` are updated to use `!isAdminOrAbove(profile.role)`. This is a mechanical find-and-replace with the new utility function.

**Login redirect logic update** (`src/app/(auth)/login/page.tsx`):

```typescript
// After successful login, redirect based on role:
if (profile.role === 'super_admin') {
  router.push('/platform')
} else if (profile.role === 'admin') {
  router.push('/dashboard')
} else if (profile.role === 'customer') {
  router.push('/home')
} else if (profile.role === 'partner') {
  router.push('/partner/dashboard') // future
}
```

**Login page branding (pre-authentication):**

Before the user logs in, there is no session to determine which company's branding to show. Resolution strategy:
1. Check for a `?company=<slug>` query parameter (allows bookmarkable branded login URLs like `/login?company=ithealth`)
2. If no query param, use `DEFAULT_COMPANY_ID` env var to fetch branding from `company_branding`
3. Fall back to Servolu (platform) branding if no default is configured

This means the login page fetches branding server-side via `resolveCompanyId()` (which checks query params before falling back to the default). The branding is passed as props to the login page component.

### 4.4 Menu System

**Super admin menu tree:**

```sql
-- L1: Platform (sidebar)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('50000000-0000-0000-0000-000000000001', NULL, 'Platform', 'Dashboard', '/platform', 1, 1),
  ('50000000-0000-0000-0000-000000000002', NULL, 'Companies', 'Building', '/platform/companies', 2, 1),
  ('50000000-0000-0000-0000-000000000003', NULL, 'Marketplace', 'Store', '/platform/marketplace', 3, 1),
  ('50000000-0000-0000-0000-000000000004', NULL, 'Settings', 'Settings', '/platform/settings', 4, 1);

-- L2: Companies sub-items
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002',
   'All Companies', NULL, '/platform/companies', 1, 2),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002',
   'Add Company', NULL, '/platform/companies/new', 2, 2);

-- L2: Marketplace sub-items
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003',
   'Listings', NULL, '/platform/marketplace/listings', 1, 2),
  ('60000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000003',
   'Branding', NULL, '/platform/marketplace/branding', 2, 2);

-- Grant super_admin access to platform menu items ONLY
INSERT INTO public.role_menu_access (role, menu_item_id)
SELECT 'super_admin', id FROM public.menu_items WHERE id::text LIKE '50000000%' OR id::text LIKE '60000000%';

-- NOTE: Super admins do NOT get admin menu items via role_menu_access.
-- When impersonating an admin company (via company switcher), the UI fetches
-- get_menu_tree('admin') directly and renders the admin sidebar in that context.
-- This prevents mixing platform and admin menu items in get_menu_tree('super_admin').
--
-- IMPORTANT: The existing get_menu_tree() function does NOT validate that the passed
-- role matches the caller's actual role — it's a SECURITY DEFINER function that simply
-- joins role_menu_access on the given role parameter. This means any authenticated user
-- can call get_menu_tree('admin'), but the menu items returned are harmless metadata
-- (labels, icons, routes) — actual data access is controlled by RLS on each table.
-- The frontend only calls get_menu_tree() with the user's own role (or 'admin' during
-- super_admin impersonation). No function modification is needed.
```

### 4.5 Route Group: `(super-admin)/`

```
src/app/(super-admin)/
├── layout.tsx                          — SuperAdminGuard + sidebar shell
├── platform/
│   ├── page.tsx                        — Dashboard: stats across all admin companies
│   ├── companies/
│   │   ├── page.tsx                    — List all admin companies with status, user count, customer count
│   │   ├── new/page.tsx                — Create new admin company (name, domain, branding setup)
│   │   └── [id]/
│   │       ├── page.tsx                — Company detail view
│   │       └── edit/page.tsx           — Edit company details
│   ├── marketplace/
│   │   ├── listings/page.tsx           — Manage which companies/services appear in marketplace
│   │   └── branding/page.tsx           — Servolu's own brand management (reuses Phase 1 UI)
│   └── settings/
│       └── page.tsx                    — Platform-level settings
```

**Super Admin Dashboard** (`/platform`):

Cards showing:
- Total admin companies (with active/inactive breakdown)
- Total customers across all admin companies
- Total services listed in marketplace
- Recent activity feed

**Companies Management** (`/platform/companies`):

Table with columns: Name, Domain, Status, Users, Customers, Services, Created
Actions: View, Edit, Deactivate
"Add Company" button → wizard: name, domain, initial admin user email, auto-creates company_branding with defaults

**Super admin sidebar:**
- Servolu branding (from company_branding for the platform company)
- Same sidebar pattern as admin but with platform menu items
- Company switcher dropdown at top to "impersonate" an admin company (opens their admin shell in context)

### 4.6 TypeScript Types

```typescript
// Extend existing types
export type UserRole = 'super_admin' | 'admin' | 'customer' | 'partner'
export type CompanyType = 'platform' | 'admin' | 'customer' | 'partner'

export type CompanyStatus = 'prospect' | 'active' | 'churned' | 'pending' | 'approved' | 'inactive'

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

---

## 5. Phase 4: De-brand IThealth

### 5.1 Strategy

Replace all 62 hardcoded IThealth references with dynamic values. Three sources:
1. **`company_branding`** — logos, colours, fonts (from Phase 1)
2. **`website_content`** — page text, images (from Phase 2)
3. **`companies`** — name, domain, tagline, emails (from Phase 3)

### 5.2 Company Context Provider

**File**: `src/contexts/company-context.tsx`

```typescript
interface CompanyContextType {
  company: Company | null
  branding: CompanyBranding | null
  loading: boolean
}
```

**Behaviour:**
- In `(admin)` layout: resolves company from authenticated user's `company_id`
- In `(super-admin)` layout: resolves to Servolu, or impersonated company
- In `(public)` layout: resolves from URL or default company
- In `(auth)` layout: resolves from URL query param or default

### 5.3 File-by-File De-branding Plan

**UI Components (logos & headers) — 12 files:**

| File | Current | Replacement |
|------|---------|-------------|
| `src/components/sidebar.tsx` | `/logos/ithealth-icon-white.svg` | `branding.icon_url` from context |
| `src/components/customer-sidebar.tsx` | `/logos/ithealth-logo-white.svg` | `branding.logo_light_url` from context |
| `src/components/public-header.tsx` | `/logos/ithealth-logo-white.svg` | `branding.logo_light_url` fetched server-side |
| `src/components/public-footer.tsx` | `/logos/ithealth-logo-white.svg` + "IThealth" copyright | `branding.logo_light_url` + `company.name` |
| `src/app/(auth)/login/page.tsx` | `/logos/ithealth-logo-white.svg`, copyright text | `branding.logo_light_url`, `company.name` |
| `src/app/(auth)/set-password/page.tsx` | `/logos/ithealth-logo.svg` | `branding.logo_url` |
| `src/app/(onboarding)/get-started/page.tsx` | Multiple logo refs | `branding.logo_url` / `branding.logo_light_url` |
| `src/components/academy/certificate-view.tsx` | "IThealth.ai" text | `company.name` + `company.domain` |

**Page metadata — 5 files:**

| File | Current | Replacement |
|------|---------|-------------|
| `src/app/layout.tsx` | `title: 'IThealth'` | `title: company.name` (via `generateMetadata`) |
| `src/app/(public)/blog/page.tsx` | `'Blog \| IThealth'` | `'Blog \| ${company.name}'` |
| `src/app/(public)/blog/[slug]/page.tsx` | `'IThealth Blog'` | `'${company.name} Blog'` |

**Public pages — 8 files:**
All replaced by CMS content from Phase 2. The hardcoded text in `page.tsx`, `about/page.tsx`, `features/page.tsx`, `contact/page.tsx`, `partners/page.tsx` is replaced with `getPageContent()` calls.

**Email & API — 5 files:**

| File | Current | Replacement |
|------|---------|-------------|
| `src/app/api/support/email/route.ts` | `'IThealth Support <support@ithealth.ai>'` | `'${company.name} Support <${company.support_email}>'` |
| `src/app/api/support/sla-monitor/route.ts` | Same | Same pattern |
| `src/app/(public)/contact/page.tsx` | `hello@ithealth.ai` | `company.contact_email` from CMS |
| `src/app/api/services/checkout/route.ts` | `'IThealth Service'` | `'${company.name} Service'` |

**AI agent prompts — 5 files:**

| File | Current | Replacement |
|------|---------|-------------|
| `ai-service/agents/defaults/orchestrators.py` | Hardcoded "IThealth" in prompts | Template: `f"You are the orchestrator for {company_name}'s AI agent system."` |
| `ai-service/agents/defaults/blog_writer.py` | "IThealth Blog Writer" | `f"{company_name} Blog Writer"` |
| `ai-service/agents/defaults/service_builder.py` | "IThealth Service Builder" | `f"{company_name} Service Builder"` |
| AI agents seed migration | "IThealth" in prompts | Templated prompts |

**AI service de-branding approach**: The AI service is a separate Python/FastAPI deployment that cannot import from `src/`. The company name must be passed explicitly:
- The Next.js API routes that call the AI service already pass context in the request body. Add a `company_name` field to the AI service request schema.
- The AI service reads `company_name` from the request and injects it into agent prompts via f-string templating.
- The `ai_agents.system_prompt` column in the DB stores prompts with `{company_name}` placeholders; the AI service substitutes at runtime.
- Fallback: if no `company_name` is provided, use the `COMPANY_NAME` environment variable (defaults to `"IThealth"` for backwards compatibility).

**PDF generation — 2 files:**

| File | Current | Replacement |
|------|---------|-------------|
| `src/app/api/certificates/download/route.ts` | `'IThealth.ai'` | `company.domain` or `company.name` from profile's company |
| `src/app/api/certificates/generate/route.ts` | `'IThealth'` | `company.name` |

**Config & storage — 4 files:**

| File | Current | Replacement |
|------|---------|-------------|
| `src/contexts/cart-context.tsx` | `'ithealth-cart'` | `'${company.slug}-cart'` (scoped per company to prevent data leaking between contexts) |
| `src/app/globals.css` | Hardcoded brand colours + comment | Keep as fallback defaults; `useBranding()` overrides at runtime |
| `package.json` | `"ithealth-scaffold"` | `"servolu-platform"` |
| `supabase/config.toml` | `project_id = "IThealth.ai"` | `project_id = "servolu-platform"` |

**Seed data — stays:**
IThealth remains in seed data as a real admin company. Servolu is added alongside it.

**Documentation:**
- `CLAUDE.md` updated to reflect multi-tenant architecture, Servolu as platform company
- Design specs are historical and don't need updating

### 5.4 Public Site Company Resolution

**Function**: `resolveCompanyId()`

For Phase 4 (single admin company deployment):
```typescript
// src/lib/company-resolver.ts
export async function resolveCompanyId(): Promise<string> {
  // For now, return the default admin company
  // In Phase 5, this resolves from domain or slug
  return process.env.DEFAULT_COMPANY_ID ?? '00000000-0000-0000-0000-000000000001'
}
```

For Phase 5 (marketplace), this becomes domain-aware or slug-aware.

---

## 6. Phase 5: Servolu Marketplace

### 6.1 Database

**New table: `marketplace_listings`**

```sql
CREATE TABLE public.marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  -- No slug column — marketplace URLs use companies.slug via JOIN.
  -- This avoids slug duplication and keeps company identity in one place.
  description text,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_listings_company_id_key UNIQUE (company_id)
);

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER marketplace_listings_updated_at
  BEFORE UPDATE ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

**RLS Policies:**

```sql
-- Super admins manage all listings
CREATE POLICY "Super admins manage marketplace listings"
  ON public.marketplace_listings FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

-- Admins can read their own listing
CREATE POLICY "Admins read own marketplace listing"
  ON public.marketplace_listings FOR SELECT
  USING (company_id = public.get_my_company_id());

-- Public read for marketplace browsing
CREATE POLICY "Public can read active marketplace listings"
  ON public.marketplace_listings FOR SELECT
  USING (is_active = true);
```

### 6.2 Route Group: `(marketplace)/`

```
src/app/(marketplace)/
├── layout.tsx                      — Servolu-branded header/footer
├── page.tsx                        — Marketplace home: featured providers, search
├── providers/
│   ├── page.tsx                    — Browse all provider companies (grid of cards)
│   └── [slug]/
│       ├── page.tsx                — Provider profile: branding, about, services list
│       └── services/
│           └── [serviceSlug]/
│               └── page.tsx        — Service detail with provider attribution
├── services/
│   ├── page.tsx                    — Browse all services across all providers
│   └── [slug]/page.tsx             — Service detail (redirects to provider/service)
├── about/page.tsx                  — About Servolu (CMS-driven, uses website_content for Servolu company)
└── contact/page.tsx                — Contact Servolu (CMS-driven)
```

### 6.3 Marketplace Home (`/marketplace`)

**Layout:**
- Servolu header with Servolu branding
- Hero section: "Find Your IT Modernisation Partner" (CMS-driven from Servolu's `website_content`)
- Featured providers carousel (from `marketplace_listings WHERE is_featured = true`)
- Service category grid (Operate, Secure, Streamline, Accelerate phases)
- Search bar filtering providers and services
- Footer with Servolu branding

### 6.4 Provider Profile (`/marketplace/providers/[slug]`)

**Data sources:**
- `companies` (name, tagline, domain)
- `company_branding` (logo, colours)
- `marketplace_listings` (description)
- `website_content` (provider's about page content, reused from their public site)
- `services` (their service offerings)

**Layout:**
- Provider header with their branding (logo, name, tagline)
- About section (from their website_content about page)
- Services grid
- Contact CTA

### 6.5 Service Browsing (`/marketplace/services`)

Aggregates services from all active marketplace-listed admin companies.

**Layout:**
- Filter by phase (Operate, Secure, Streamline, Accelerate)
- Filter by provider
- Search by service name/description
- Service cards showing: service name, provider logo + name, phase badge, price range

### 6.6 Super Admin Marketplace Management

From Phase 3's `(super-admin)/platform/marketplace/listings` page:

**Table**: All admin companies with toggle for marketplace visibility
**Columns**: Company Name, Status, Featured, Services Count, Sort Order, Actions
**Actions**: Toggle active, toggle featured, edit marketplace description, reorder

### 6.7 Marketplace Branding

The Servolu company gets its own `company_branding` and `website_content` records:
- Brand page reuses Phase 1 UI at `/platform/marketplace/branding`
- Website CMS for marketplace pages reuses Phase 2 UI for the Servolu company context

---

## 7. Migration Sequence

Migrations must be applied in order. Each phase produces a set of migration files.

### Phase 1 Migrations

```
20260408100001_create_company_branding.sql          -- table + trigger
20260408100002_company_branding_rls.sql             -- admin-only policies (no super_admin yet)
20260408100003_create_branding_storage_bucket.sql   -- Supabase Storage bucket 'branding' with public read
20260408100004_seed_ithealth_branding.sql           -- seeds current IThealth brand values
20260408100005_seed_brand_menu_item.sql
```

### Phase 2 Migrations

```
20260408200001_create_website_content.sql           -- table + trigger + index
20260408200002_website_content_rls.sql              -- admin-only policies (no super_admin yet)
20260408200003_create_website_content_bucket.sql    -- Supabase Storage bucket 'website-content' with public read
20260408200004_seed_ithealth_website_content.sql    -- seeds current hardcoded content for all pages
20260408200005_seed_website_menu_item.sql
```

### Phase 3 Migrations

```
20260408300001_extend_company_type_enum.sql         -- ADD VALUE 'platform'
20260408300002_extend_user_role_enum.sql             -- ADD VALUE 'super_admin'
20260408300003_add_company_hierarchy.sql             -- parent_company_id, domain, tagline, slug, etc. + parent trigger
20260408300004_seed_servolu_company.sql              -- create Servolu, update IThealth parent, update customer/partner parents
20260408300005_auth_helper_functions_v2.sql          -- get_my_company_type(), is_admin_or_above(), set_parent_company_on_insert()
20260408300006_rls_policies_v2.sql                   -- DROP+CREATE ALL 45+ admin policies across ALL tables (see §4.2 table)
                                                       -- ALSO updates storage.objects policies for 'branding' and 'website-content' buckets
                                                       -- to use is_admin_or_above() instead of get_my_role() = 'admin'
20260408300007_seed_super_admin_menu.sql
20260408300008_seed_super_admin_user.sql             -- Servolu admin profile (requires auth user from setup script)
```

### Phase 4 Migrations

```
20260408400001_add_company_metadata.sql             -- (if not already done in Phase 3)
```
No additional migrations — Phase 4 is primarily frontend refactoring.

### Phase 5 Migrations

```
20260408500001_create_marketplace_listings.sql
20260408500002_marketplace_rls.sql
20260408500003_seed_ithealth_marketplace_listing.sql
20260408500004_seed_marketplace_menu_items.sql
```

---

## 8. Component Inventory

### New Components

| Component | Phase | Purpose |
|-----------|-------|---------|
| `src/contexts/branding-context.tsx` | 1 | Provides branding to admin shell |
| `src/app/(admin)/growth/brand/page.tsx` | 1 | Brand management UI |
| `src/components/logo-upload.tsx` | 1 | Reusable logo upload with preview |
| `src/components/colour-picker.tsx` | 1 | Hex colour picker with swatch |
| `src/components/font-selector.tsx` | 1 | Google Font dropdown with preview |
| `src/app/(admin)/growth/content/website/page.tsx` | 2 | Website CMS tabbed editor |
| `src/components/cms/section-editor.tsx` | 2 | Generic section editor card |
| `src/components/cms/image-field.tsx` | 2 | Image upload field for CMS |
| `src/components/cms/repeatable-items.tsx` | 2 | Add/remove repeatable item groups |
| `src/lib/website-content.ts` | 2 | Server-side content fetching |
| `src/lib/default-content.ts` | 2 | Default content for new companies |
| `src/components/super-admin-guard.tsx` | 3 | Auth guard for super_admin role |
| `src/app/(super-admin)/layout.tsx` | 3 | Super admin shell layout |
| `src/components/super-admin-sidebar.tsx` | 3 | Super admin sidebar |
| `src/app/(super-admin)/platform/**` | 3 | All super admin pages |
| `src/lib/auth-utils.ts` | 3 | `isAdminOrAbove()`, `isSuperAdmin()` |
| `src/contexts/company-context.tsx` | 4 | Provides company + branding to all layouts |
| `src/lib/company-resolver.ts` | 4 | Resolves company from domain/slug/auth |
| `src/app/(marketplace)/layout.tsx` | 5 | Marketplace layout with Servolu branding |
| `src/app/(marketplace)/**` | 5 | All marketplace pages |

### Modified Components

| Component | Phase | Change |
|-----------|-------|--------|
| `src/components/sidebar.tsx` | 4 | Logo from branding context |
| `src/components/customer-sidebar.tsx` | 4 | Logo from branding context |
| `src/components/public-header.tsx` | 4 | Logo from branding/company |
| `src/components/public-footer.tsx` | 4 | Logo + company name from context |
| `src/components/auth-guard.tsx` | 3 | Use `isAdminOrAbove()` |
| `src/app/(auth)/login/page.tsx` | 3+4 | Role-based redirect + dynamic branding |
| `src/app/(public)/**` pages | 2+4 | CMS-driven content |
| All API routes under `/api/admin/` | 3 | Use `isAdminOrAbove()` |
| `src/app/api/support/email/route.ts` | 4 | Dynamic sender name/email |
| `src/app/api/certificates/*/route.ts` | 4 | Dynamic company name |
| `src/contexts/auth-context.tsx` | 3 | Include company type in context |
| `src/contexts/menu-context.tsx` | 3 | Handle super_admin menu |
| `ai-service/agents/defaults/*.py` | 4 | Templated company names |
| `src/app/globals.css` | 1 | Keep as fallback, branding hook overrides |

---

## 9. Testing Strategy

### Phase 1 — Brand Management
- Verify `company_branding` CRUD via admin UI
- Verify logo upload to Supabase Storage + URL persistence
- Verify CSS custom property injection via `useBranding()`
- Verify font loading via Google Fonts link injection
- Verify fallback defaults when no branding exists

### Phase 2 — Website CMS
- Verify `website_content` CRUD via tabbed editor
- Verify each section type renders correct form fields
- Verify image upload within CMS
- Verify public pages render from DB content
- Verify default content renders for new companies with no saved content
- Verify section toggle (is_active) hides sections on public site
- Verify sort_order reordering

### Phase 3 — Super Admin
- Verify super_admin login redirects to `/platform`
- Verify super_admin can access both super admin and admin routes
- Verify admin cannot access super admin routes
- Verify RLS: super_admin sees all companies, admin sees own tree only
- Verify company hierarchy: creating a company under an admin company
- Verify super admin menu renders correctly

### Phase 4 — De-branding
- Verify zero remaining hardcoded "IThealth" references in rendered output (run grep)
- Verify each de-branded component renders correctly with dynamic values
- Verify emails send with correct company-specific sender
- Verify certificates generate with correct company name
- Verify AI agent prompts include correct company context

### Phase 5 — Marketplace
- Verify marketplace home renders featured providers
- Verify provider profile pages render with correct branding
- Verify service browsing with filtering
- Verify super admin can toggle marketplace listings
- Verify RLS: public can read active listings, admins can read own

---

## 10. Environment & Configuration

### New Environment Variables

```env
# Default company ID for public site resolution (until domain routing is added)
DEFAULT_COMPANY_ID=00000000-0000-0000-0000-000000000001

# Servolu platform company ID
PLATFORM_COMPANY_ID=00000000-0000-0000-0000-000000000000
```

### Supabase Storage Buckets

```
branding          — public read, auth write — logo files
website-content   — public read, auth write — CMS images
```

---

## 11. Out of Scope (Future)

- Custom domain routing per admin company (each company gets their own URL)
- Drag-and-drop page builder (current CMS is structured fields, not visual builder)
- Partner portal route group and role-specific features
- Billing/subscription management for admin companies
- White-label login pages per admin company (login is shared for now)
- Mobile/responsive design (desktop-only per current conventions)
