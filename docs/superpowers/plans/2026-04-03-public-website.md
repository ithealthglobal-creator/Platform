# Public Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the IThealth public-facing marketing website — homepage, blog, about, contact, and partners pages — as a conversion funnel driving SMB visitors to the "Start Now" onboarding CTA.

**Architecture:** New `(public)` route group with server components for SEO. Public layout with marketing header/footer, separate from admin shell. Supabase-driven content (blog posts, testimonials, partners). AuthProvider moved from root layout into `(admin)` and `(auth)` groups so public pages load no auth overhead. System-wide button restyle with IThealth signature shape.

**Tech Stack:** Next.js (App Router, SSR), React, TypeScript, shadcn/ui, Tailwind CSS, @carbon/icons-react, Supabase, Sonner, Poppins font

**Spec:** `docs/superpowers/specs/2026-04-03-public-website-design.md`

---

## File Map

```
IThealth.ai/
├── public/
│   ├── logos/
│   │   ├── ithealth-logo.svg           # Blue wordmark
│   │   ├── ithealth-logo-white.svg     # White wordmark
│   │   └── ithealth-icon.svg           # Icon/favicon
│   └── phases/
│       ├── operate.svg                  # Phase design icons
│       ├── secure.svg
│       ├── streamline.svg
│       └── accelerate.svg
├── supabase/
│   ├── migrations/
│   │   ├── 20260403100001_create_blog_posts.sql
│   │   ├── 20260403100002_create_testimonials.sql
│   │   ├── 20260403100003_create_contact_submissions.sql
│   │   ├── 20260403100004_create_partner_applications.sql
│   │   ├── 20260403100005_create_partners.sql
│   │   ├── 20260403100006_public_website_rls.sql
│   │   └── 20260403100007_public_menu_additions.sql
│   └── seed.sql                                  # Modified: add blog/testimonial/partner seed data
├── src/
│   ├── app/
│   │   ├── layout.tsx                             # Modified: remove AuthProvider
│   │   ├── globals.css                            # Modified: add brand colour CSS variables
│   │   ├── (auth)/
│   │   │   └── layout.tsx                         # New: wraps auth pages with AuthProvider
│   │   ├── (admin)/
│   │   │   └── layout.tsx                         # Modified: add AuthProvider wrapping
│   │   ├── (public)/
│   │   │   ├── layout.tsx                         # New: public layout (header + footer)
│   │   │   ├── page.tsx                           # New: homepage
│   │   │   ├── blog/
│   │   │   │   ├── page.tsx                       # New: blog listing
│   │   │   │   └── [slug]/page.tsx                # New: blog post
│   │   │   ├── about/page.tsx                     # New: about us
│   │   │   ├── contact/page.tsx                   # New: contact form
│   │   │   └── partners/page.tsx                  # New: partners + application
│   │   └── api/
│   │       ├── contact/route.ts                   # New: contact form handler
│   │       └── partners/route.ts                  # New: partner application handler
│   ├── components/
│   │   ├── ui/button.tsx                          # Modified: add signature border-radius
│   │   ├── public-header.tsx                      # New: marketing nav bar
│   │   ├── public-footer.tsx                      # New: marketing footer
│   │   ├── hero.tsx                               # New: hero section
│   │   ├── journey-section.tsx                    # New: modernisation journey
│   │   ├── blog-card.tsx                          # New: blog post card
│   │   ├── testimonial-card.tsx                   # New: testimonial card
│   │   └── cta-banner.tsx                         # New: reusable CTA banner
│   └── lib/
│       └── types.ts                               # Modified: add new interfaces
```

---

## Task 1: Brand Assets & Styling Foundation

**Files:**
- Create: `public/logos/ithealth-logo.svg`, `public/logos/ithealth-logo-white.svg`, `public/logos/ithealth-icon.svg`
- Create: `public/phases/operate.svg`, `public/phases/secure.svg`, `public/phases/streamline.svg`, `public/phases/accelerate.svg`
- Modify: `src/app/globals.css`
- Modify: `src/components/ui/button.tsx`

- [ ] **Step 1: Copy brand assets to public directory**

```bash
mkdir -p public/logos public/phases
cp /Users/futuvara/Downloads/04_Brand-Assets/Logos/IThealthLogo.svg public/logos/ithealth-logo.svg
cp /Users/futuvara/Downloads/04_Brand-Assets/Logos/IThealthLogoWhite.svg public/logos/ithealth-logo-white.svg
cp /Users/futuvara/Downloads/04_Brand-Assets/Icons/ITHIcon.svg public/logos/ithealth-icon.svg
cp /Users/futuvara/Downloads/OneDrive_2_11-02-2026/OperateDesign.svg public/phases/operate.svg
cp /Users/futuvara/Downloads/OneDrive_2_11-02-2026/SecureDesign.svg public/phases/secure.svg
cp /Users/futuvara/Downloads/OneDrive_2_11-02-2026/StreamlineDesign.svg public/phases/streamline.svg
cp /Users/futuvara/Downloads/OneDrive_2_11-02-2026/AccelerateDesign.svg public/phases/accelerate.svg
```

- [ ] **Step 2: Add brand colour CSS variables to globals.css**

Add to the `:root` block in `src/app/globals.css`, after the existing variables:

```css
  /* IThealth brand colours */
  --brand-primary: #1175E4;
  --brand-secondary: #FF246B;
  --brand-dark: #1a1a2e;
  --brand-footer: #0f0f1e;
  --phase-operate: #1175E4;
  --phase-secure: #FF246B;
  --phase-streamline: #133258;
  --phase-accelerate: #EDB600;
```

Also add to the `@theme inline` block:

```css
  --color-brand-primary: var(--brand-primary);
  --color-brand-secondary: var(--brand-secondary);
  --color-brand-dark: var(--brand-dark);
  --color-brand-footer: var(--brand-footer);
```

- [ ] **Step 3: Update button component with signature border-radius**

In `src/components/ui/button.tsx`, change the base `cva` class from `rounded-lg` to use the IThealth signature shape. Replace:

```
rounded-lg
```

with:

```
rounded-[50px_0_50px_50px]
```

This applies `border-radius: 50px 0 50px 50px` (square top-right) to all buttons system-wide. Also update the size variants that override `rounded-*`:
- `xs` size: change `rounded-[min(var(--radius-md),10px)]` to `rounded-[40px_0_40px_40px]`
- `sm` size: change `rounded-[min(var(--radius-md),12px)]` to `rounded-[40px_0_40px_40px]`
- `icon-xs` size: change `rounded-[min(var(--radius-md),10px)]` to `rounded-full` (icon buttons stay circular)
- `icon-sm` size: change `rounded-[min(var(--radius-md),12px)]` to `rounded-full` (icon buttons stay circular)

- [ ] **Step 4: Verify TypeScript compiles and admin still works**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add public/logos/ public/phases/ src/app/globals.css src/components/ui/button.tsx
git commit -m "feat: add brand assets, colours, and signature button style"
```

---

## Task 2: AuthProvider Refactor

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/(admin)/layout.tsx`
- Create: `src/app/(auth)/layout.tsx`

Move `AuthProvider` out of the root layout into the route groups that need it.

- [ ] **Step 1: Remove AuthProvider from root layout**

Replace `src/app/layout.tsx` with:

```typescript
import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const poppins = Poppins({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] })

export const metadata: Metadata = {
  title: 'IThealth',
  description: 'IThealth Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={poppins.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Add AuthProvider to admin layout**

In `src/app/(admin)/layout.tsx`, wrap the existing content with `AuthProvider`. The file currently imports `AuthGuard` and `MenuProvider`. Add `AuthProvider` wrapping everything:

```typescript
'use client'

import { AuthProvider } from '@/contexts/auth-context'
import { AuthGuard } from '@/components/auth-guard'
import { MenuProvider } from '@/contexts/menu-context'
import { Sidebar } from '@/components/sidebar'
import { MegaMenu } from '@/components/mega-menu'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <MenuProvider>
          <div className="flex h-screen">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
              <MegaMenu />
              <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
                {children}
              </main>
            </div>
          </div>
        </MenuProvider>
      </AuthGuard>
    </AuthProvider>
  )
}
```

- [ ] **Step 3: Create auth layout with AuthProvider**

Create `src/app/(auth)/layout.tsx`:

```typescript
'use client'

import { AuthProvider } from '@/contexts/auth-context'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}
```

- [ ] **Step 4: Verify login and admin still work**

```bash
npx tsc --noEmit
```

Start dev server and test:
- `/login` page loads, can log in
- `/dashboard` loads after login with sidebar/mega menu
- `/` (root) loads without errors (no auth context needed)

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/\(admin\)/layout.tsx src/app/\(auth\)/layout.tsx
git commit -m "refactor: move AuthProvider from root layout into admin and auth groups"
```

---

## Task 3: Database Migrations & Seed Data

**Files:**
- Create: `supabase/migrations/20260403100001_create_blog_posts.sql`
- Create: `supabase/migrations/20260403100002_create_testimonials.sql`
- Create: `supabase/migrations/20260403100003_create_contact_submissions.sql`
- Create: `supabase/migrations/20260403100004_create_partner_applications.sql`
- Create: `supabase/migrations/20260403100005_create_partners.sql`
- Create: `supabase/migrations/20260403100006_public_website_rls.sql`
- Create: `supabase/migrations/20260403100007_public_menu_additions.sql`
- Modify: `supabase/seed.sql`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Create blog_posts table**

`supabase/migrations/20260403100001_create_blog_posts.sql`:

```sql
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text,
  cover_image_url text,
  category text,
  author_id uuid REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX idx_blog_posts_published_at ON public.blog_posts(published_at);
CREATE INDEX idx_blog_posts_category ON public.blog_posts(category);

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 2: Create testimonials table**

`supabase/migrations/20260403100002_create_testimonials.sql`:

```sql
CREATE TABLE public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text,
  role text,
  quote text NOT NULL,
  avatar_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER testimonials_updated_at
  BEFORE UPDATE ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 3: Create contact_submissions table**

`supabase/migrations/20260403100003_create_contact_submissions.sql`:

```sql
CREATE TABLE public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 4: Create partner_applications table**

`supabase/migrations/20260403100004_create_partner_applications.sql`:

```sql
CREATE TABLE public.partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  website text,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 5: Create partners table**

`supabase/migrations/20260403100005_create_partners.sql`:

```sql
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  website text,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 6: Create RLS policies**

`supabase/migrations/20260403100006_public_website_rls.sql`:

```sql
-- blog_posts: public read for published, admin full CRUD
CREATE POLICY "Anyone can read published blog posts"
  ON public.blog_posts FOR SELECT
  USING (status = 'published' AND is_active = true);

CREATE POLICY "Admins can do everything with blog_posts"
  ON public.blog_posts FOR ALL
  USING (public.get_my_role() = 'admin');

-- testimonials: public read for active, admin full CRUD
CREATE POLICY "Anyone can read active testimonials"
  ON public.testimonials FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can do everything with testimonials"
  ON public.testimonials FOR ALL
  USING (public.get_my_role() = 'admin');

-- contact_submissions: anonymous insert, admin read
CREATE POLICY "Anyone can submit contact form"
  ON public.contact_submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read contact_submissions"
  ON public.contact_submissions FOR SELECT
  USING (public.get_my_role() = 'admin');

-- partner_applications: anonymous insert, admin read
CREATE POLICY "Anyone can submit partner application"
  ON public.partner_applications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read partner_applications"
  ON public.partner_applications FOR SELECT
  USING (public.get_my_role() = 'admin');

-- partners: public read for active, admin full CRUD
CREATE POLICY "Anyone can read active partners"
  ON public.partners FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can do everything with partners"
  ON public.partners FOR ALL
  USING (public.get_my_role() = 'admin');
```

- [ ] **Step 7: Create menu additions migration**

`supabase/migrations/20260403100007_public_menu_additions.sql`:

```sql
-- Growth > Content (new L2)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000201', '10000000-0000-0000-0000-000000000002', 'Content', NULL, '/growth/content', 2, 2);

-- Growth > Content > Blog (new L3)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('30000000-0000-0000-0000-000000000201', '20000000-0000-0000-0000-000000000201', 'Blog', NULL, '/growth/content/blog', 1, 3);

-- Growth > Market > Testimonials (new L3)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('30000000-0000-0000-0000-000000000202', '20000000-0000-0000-0000-000000000105', 'Testimonials', NULL, '/growth/market/testimonials', 5, 3);

-- People > Partners (new L2)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000202', '10000000-0000-0000-0000-000000000007', 'Partners', NULL, '/people/partners', 4, 2);

-- Grant admin access
INSERT INTO public.role_menu_access (role, menu_item_id)
SELECT 'admin', id FROM public.menu_items
WHERE id IN (
  '20000000-0000-0000-0000-000000000201',
  '30000000-0000-0000-0000-000000000201',
  '30000000-0000-0000-0000-000000000202',
  '20000000-0000-0000-0000-000000000202'
)
ON CONFLICT (role, menu_item_id) DO NOTHING;
```

- [ ] **Step 8: Add TypeScript types**

Append to `src/lib/types.ts`:

```typescript
export type BlogPostStatus = 'draft' | 'published'

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string | null
  cover_image_url: string | null
  category: string | null
  author_id: string | null
  status: BlogPostStatus
  published_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Testimonial {
  id: string
  name: string
  company: string | null
  role: string | null
  quote: string
  avatar_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ContactSubmission {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  message: string
  created_at: string
}

export interface PartnerApplication {
  id: string
  company_name: string
  contact_name: string
  email: string
  phone: string | null
  website: string | null
  message: string | null
  created_at: string
}

export interface Partner {
  id: string
  name: string
  logo_url: string | null
  website: string | null
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}
```

- [ ] **Step 9: Update seed.sql**

Append to `supabase/seed.sql` (after existing seed data):

```sql
-- Blog post seed data
INSERT INTO public.blog_posts (title, slug, excerpt, content, cover_image_url, category, status, published_at) VALUES
  ('The Complete Guide to IT Modernisation for SMBs', 'complete-guide-it-modernisation-smbs', 'Everything you need to know about transforming your IT infrastructure, from assessment to acceleration.', '<h2>Why Modernise?</h2><p>In today''s rapidly evolving digital landscape, outdated IT infrastructure isn''t just inconvenient—it''s a business risk. Modern IT modernisation is about more than upgrading hardware; it''s about transforming how your business operates, competes, and grows.</p><h2>The Four Phases</h2><p>IThealth''s modernisation journey follows four proven phases: Operate, Secure, Streamline, and Accelerate. Each phase builds on the last, creating a solid foundation for digital maturity.</p>', NULL, 'Strategy', 'published', now()),
  ('Why SMBs Need Zero Trust Security in 2026', 'smbs-zero-trust-security-2026', 'The threat landscape has changed dramatically. Here''s how Zero Trust architecture can protect your business.', '<h2>The Evolving Threat Landscape</h2><p>Cyber threats targeting small and medium businesses have increased by 300% in the last three years. Traditional perimeter-based security is no longer sufficient.</p><h2>What is Zero Trust?</h2><p>Zero Trust operates on a simple principle: never trust, always verify. Every user, device, and connection is authenticated and authorised before access is granted.</p>', NULL, 'Security', 'published', now()),
  ('Cloud Migration: A Step-by-Step Guide for SMBs', 'cloud-migration-step-by-step-guide', 'Moving to the cloud doesn''t have to be overwhelming. Follow our structured approach to a successful migration.', '<h2>Planning Your Migration</h2><p>A successful cloud migration starts with understanding what you have, what you need, and where you want to go. Start with an inventory of your current infrastructure.</p><h2>Choosing the Right Model</h2><p>Public cloud, private cloud, or hybrid? The right choice depends on your compliance requirements, budget, and growth plans.</p>', NULL, 'Cloud', 'published', now()),
  ('5 Signs Your IT Infrastructure Needs Modernising', 'five-signs-it-needs-modernising', 'Outdated infrastructure costs more than you think. Watch for these warning signs.', '<h2>1. Frequent Downtime</h2><p>If your team regularly experiences outages or slowdowns, your infrastructure is telling you something. Modern businesses can''t afford unreliable IT.</p><h2>2. Rising Costs</h2><p>Legacy systems often cost more to maintain than to replace. If your IT budget keeps growing without improved outcomes, it''s time to modernise.</p>', NULL, 'Operations', 'published', now())
ON CONFLICT DO NOTHING;

-- Testimonial seed data
INSERT INTO public.testimonials (name, company, role, quote, sort_order) VALUES
  ('Sarah Chen', 'TechFlow Ltd', 'CTO', 'IThealth transformed our IT infrastructure. We went from constant firefighting to proactive management. Their modernisation journey gave us a clear path forward.', 1),
  ('James Wright', 'Wright & Co Attorneys', 'Managing Partner', 'The modernisation journey framework gave us a clear roadmap. Best IT decision we''ve made. Our team is more productive and our data is finally secure.', 2),
  ('Maria Santos', 'Santos Financial Advisory', 'Managing Director', 'Professional, responsive, and they actually understand small business IT needs. IThealth doesn''t just fix problems—they prevent them.', 3)
ON CONFLICT DO NOTHING;

-- Partner seed data
INSERT INTO public.partners (name, description, website, sort_order) VALUES
  ('Microsoft', 'Cloud and productivity solutions', 'https://microsoft.com', 1),
  ('Datto', 'Business continuity and disaster recovery', 'https://datto.com', 2),
  ('SentinelOne', 'AI-powered endpoint security', 'https://sentinelone.com', 3),
  ('ConnectWise', 'IT management and automation platform', 'https://connectwise.com', 4)
ON CONFLICT DO NOTHING;

-- Menu additions for seed (matching migration IDs)
INSERT INTO public.menu_items (id, parent_id, label, icon, route, sort_order, level) VALUES
  ('20000000-0000-0000-0000-000000000201', '10000000-0000-0000-0000-000000000002', 'Content', NULL, '/growth/content', 2, 2),
  ('30000000-0000-0000-0000-000000000201', '20000000-0000-0000-0000-000000000201', 'Blog', NULL, '/growth/content/blog', 1, 3),
  ('30000000-0000-0000-0000-000000000202', '20000000-0000-0000-0000-000000000105', 'Testimonials', NULL, '/growth/market/testimonials', 5, 3),
  ('20000000-0000-0000-0000-000000000202', '10000000-0000-0000-0000-000000000007', 'Partners', NULL, '/people/partners', 4, 2)
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 10: Apply migrations and verify**

```bash
PGPASSWORD=postgres psql -h localhost -p 54342 -U postgres -d postgres -f supabase/migrations/20260403100001_create_blog_posts.sql
PGPASSWORD=postgres psql -h localhost -p 54342 -U postgres -d postgres -f supabase/migrations/20260403100002_create_testimonials.sql
PGPASSWORD=postgres psql -h localhost -p 54342 -U postgres -d postgres -f supabase/migrations/20260403100003_create_contact_submissions.sql
PGPASSWORD=postgres psql -h localhost -p 54342 -U postgres -d postgres -f supabase/migrations/20260403100004_create_partner_applications.sql
PGPASSWORD=postgres psql -h localhost -p 54342 -U postgres -d postgres -f supabase/migrations/20260403100005_create_partners.sql
PGPASSWORD=postgres psql -h localhost -p 54342 -U postgres -d postgres -f supabase/migrations/20260403100006_public_website_rls.sql
PGPASSWORD=postgres psql -h localhost -p 54342 -U postgres -d postgres -f supabase/migrations/20260403100007_public_menu_additions.sql
```

Run seed data for blog/testimonials/partners (extract just the new seed statements and run them).

- [ ] **Step 11: Commit**

```bash
git add supabase/migrations/20260403100*.sql supabase/seed.sql src/lib/types.ts
git commit -m "feat: add public website database tables, RLS, seed data, and types"
```

---

## Task 4: Public Layout — Header & Footer

**Files:**
- Create: `src/components/public-header.tsx`
- Create: `src/components/public-footer.tsx`
- Create: `src/app/(public)/layout.tsx`

- [ ] **Step 1: Create public header component**

`src/components/public-header.tsx` — Client component for mobile menu toggle.

Blue background (`bg-[var(--brand-primary)]`), sticky top, full width.

Left: White IThealth wordmark logo (large, `<Image src="/logos/ithealth-logo-white.svg" />`), links to `/`.

Right (desktop): "Resources" dropdown (using shadcn DropdownMenu) with items: Blog (`/blog`), About Us (`/about`), Contact (`/contact`), Partners (`/partners`). "Login" ghost button (white text, `bg-white/15`, signature radius, links to `/login`). "Start Now" CTA (pink `bg-[var(--brand-secondary)]`, signature radius, links to `/login` for now).

Mobile: Hamburger icon (IBM Carbon `Menu` icon, 24px, white) toggles shadcn Sheet from the right. Sheet contains: logo, all nav links, Login button, Start Now CTA.

Use IBM Carbon icons: `Menu`, `Close`, `ChevronDown` for dropdown.

- [ ] **Step 2: Create public footer component**

`src/components/public-footer.tsx` — Server component.

Dark background (`bg-[var(--brand-footer)]`), 4-column grid on desktop, stacking on mobile.

Column 1: White IThealth logo + tagline.
Column 2: Resources — Blog, About Us, Contact, Partners (links).
Column 3: Journey — Operate, Secure, Streamline, Accelerate.
Column 4: Get Started — Login, Start Now, Contact Us.

Bottom bar: Copyright + Privacy Policy + Terms of Service.

All links use `next/link`.

- [ ] **Step 3: Create public layout**

`src/app/(public)/layout.tsx` — Server component:

```typescript
import { PublicHeader } from '@/components/public-header'
import { PublicFooter } from '@/components/public-footer'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicHeader />
      <main>{children}</main>
      <PublicFooter />
    </>
  )
}
```

- [ ] **Step 4: Move root page into public group**

Move `src/app/page.tsx` (the current placeholder) to `src/app/(public)/page.tsx`. For now, keep it as a simple placeholder — the full homepage will be built in Task 5.

```typescript
export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1 className="text-3xl font-bold">IThealth</h1>
    </div>
  )
}
```

Delete the old `src/app/page.tsx`.

- [ ] **Step 5: Verify layout renders**

```bash
npx tsc --noEmit
```

Open `http://localhost:3001` — should see the blue header, placeholder content, and dark footer. Test mobile hamburger menu at narrow viewport.

- [ ] **Step 6: Commit**

```bash
git add src/components/public-header.tsx src/components/public-footer.tsx src/app/\(public\)/layout.tsx src/app/\(public\)/page.tsx
git rm src/app/page.tsx
git commit -m "feat: add public layout with marketing header and footer"
```

---

## Task 5: Homepage

**Files:**
- Create: `src/components/hero.tsx`
- Create: `src/components/journey-section.tsx`
- Create: `src/components/blog-card.tsx`
- Create: `src/components/testimonial-card.tsx`
- Create: `src/components/cta-banner.tsx`
- Modify: `src/app/(public)/page.tsx`

- [ ] **Step 1: Create hero component**

`src/components/hero.tsx` — Server component.

Solid blue background (`bg-[var(--brand-primary)]`), centered text, responsive padding.

- Headline: "Your IT Modernisation Champions" — white, `text-4xl md:text-5xl lg:text-[52px]`, font-bold
- CTA: "Start Now" button — pink, large, signature radius. Links to `/login`.
- Subtitle: "Your free modernisation journey" — white/80% opacity
- Supporting copy: "In today's world, modern IT isn't optional — we guide you through IT modernisation with simplicity, clarity and security, keeping your business resilient and future ready." — white, smaller, max-w-2xl mx-auto

- [ ] **Step 2: Create journey section component**

`src/components/journey-section.tsx` — Server component. Fetches phases from Supabase (server-side query using `supabase-server.ts` — wait, that uses service_role. For public reads, use the anon client instead).

Actually, phases are accessible via the `get_menu_tree` function which requires auth. Instead, query the `phases` table directly — it has RLS from layer 1 that allows authenticated read. But public pages have no auth. We need to use the anon key Supabase client for server-side fetching. Create a simple server-side anon client:

The existing `supabase-client.ts` is a browser client. For server components, create the Supabase client inline or use it directly. Since phases are small static data, we can fetch them server-side with the anon key.

Phase lockups: horizontal row on desktop (flex), vertical on mobile. Each lockup: phase design icon (`<Image src="/phases/operate.svg" />`, 48px) + phase name (coloured text). Arrow separators between phases (IBM Carbon `ArrowRight` icon, hidden on mobile).

Phase descriptions: 4-column grid below lockups, 1-column on mobile.

Value strip: White card, 3 columns with dividers — "Enterprise", "Guided", "Strategic".

CTA: "Start Your Journey" button.

- [ ] **Step 3: Create blog card component**

`src/components/blog-card.tsx` — Server component.

Props: `post: BlogPost`. Renders: cover image placeholder (gradient if no image), category tag (coloured), title, excerpt, date. Links to `/blog/${post.slug}`.

- [ ] **Step 4: Create testimonial card component**

`src/components/testimonial-card.tsx` — Server component.

Props: `testimonial: Testimonial`. Renders: pink quotation mark, quote text, avatar circle, name, role, company. Dark card background for use on dark section.

- [ ] **Step 5: Create CTA banner component**

`src/components/cta-banner.tsx` — Server component.

Props: `heading?: string`, `subheading?: string`, `buttonText?: string`, `buttonHref?: string`. Defaults: "Ready to Modernise Your IT?", "Start your free modernisation journey today", "Start Now", "/login".

Blue background, centered white text, pink CTA button.

- [ ] **Step 6: Build homepage**

Replace `src/app/(public)/page.tsx` with the full homepage composing all sections:

```typescript
import { Hero } from '@/components/hero'
import { JourneySection } from '@/components/journey-section'
import { BlogCard } from '@/components/blog-card'
import { TestimonialCard } from '@/components/testimonial-card'
import { CTABanner } from '@/components/cta-banner'
import { createClient } from '@supabase/supabase-js'
import { BlogPost, Testimonial } from '@/lib/types'

export default async function HomePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .eq('is_active', true)
    .order('published_at', { ascending: false })
    .limit(3)

  const { data: testimonials } = await supabase
    .from('testimonials')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
    .limit(3)

  return (
    <>
      <Hero />
      <JourneySection />

      {/* Blog Highlights */}
      <section className="py-16 px-6 md:px-12 lg:px-16 bg-white">
        <h2 className="text-center text-3xl font-bold text-[var(--brand-dark)] mb-2">Latest Insights</h2>
        <p className="text-center text-muted-foreground mb-10">Expert advice on IT modernisation</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {(posts as BlogPost[] ?? []).map(post => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-6 md:px-12 lg:px-16 bg-[var(--brand-dark)]">
        <h2 className="text-center text-3xl font-bold text-white mb-2">What Our Clients Say</h2>
        <p className="text-center text-white/60 mb-10">Trusted by businesses across industries</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {(testimonials as Testimonial[] ?? []).map(t => (
            <TestimonialCard key={t.id} testimonial={t} />
          ))}
        </div>
      </section>

      <CTABanner />
    </>
  )
}
```

- [ ] **Step 7: Verify homepage renders**

```bash
npx tsc --noEmit
```

Open `http://localhost:3001` — full homepage should render with all sections.

- [ ] **Step 8: Commit**

```bash
git add src/components/hero.tsx src/components/journey-section.tsx src/components/blog-card.tsx src/components/testimonial-card.tsx src/components/cta-banner.tsx src/app/\(public\)/page.tsx
git commit -m "feat: build homepage with hero, journey, blog, testimonials, and CTA"
```

---

## Task 6: Blog Pages

**Files:**
- Create: `src/app/(public)/blog/page.tsx`
- Create: `src/app/(public)/blog/[slug]/page.tsx`

- [ ] **Step 1: Create blog listing page**

`src/app/(public)/blog/page.tsx` — Server component.

- Page header with gradient background
- Category filter pills (implemented as links with query params: `/blog?category=Security`)
- Featured post (latest) displayed as hero card
- Post grid using `BlogCard` component
- Fetches from `blog_posts` where `status = 'published'`, ordered by `published_at` desc
- If `searchParams.category` is set, filter by category

- [ ] **Step 2: Create blog post page**

`src/app/(public)/blog/[slug]/page.tsx` — Server component.

- Fetches single post by slug
- Cover image (or gradient placeholder)
- Title, category tag, published date
- Content rendered with `dangerouslySetInnerHTML` + Tailwind `prose` classes (`prose prose-lg max-w-3xl mx-auto`)
- CTA banner at bottom
- Dynamic metadata for SEO:

```typescript
export async function generateMetadata({ params }: { params: { slug: string } }) {
  // fetch post, return { title, description, openGraph }
}
```

- 404 if post not found (`notFound()`)

- [ ] **Step 3: Install Tailwind typography plugin**

```bash
npm install @tailwindcss/typography
```

Add to `src/app/globals.css` (or Tailwind config if needed) to enable `prose` classes.

- [ ] **Step 4: Verify blog pages**

Open `http://localhost:3001/blog` — listing with category filter and posts.
Click a post — individual post page renders with formatted content.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(public\)/blog/ package.json package-lock.json
git commit -m "feat: add blog listing and post pages"
```

---

## Task 7: About Us Page

**Files:**
- Create: `src/app/(public)/about/page.tsx`

- [ ] **Step 1: Create about page**

`src/app/(public)/about/page.tsx` — Server component. Static content from brand document.

Sections:
1. **Page header**: "About IThealth", subtitle "Your IT Modernisation Champions", gradient background
2. **Mission**: Two-column — text left (mission statement from brand doc), image/gradient placeholder right
3. **Values**: 3 cards — "Champion Mindset" (IBM Carbon `Trophy` icon), "Security First" (IBM Carbon `Security` icon), "Continuous Progress" (IBM Carbon `Rocket` icon). Each has title + description.
4. **CTA Banner**: Reusable `<CTABanner heading="Ready to Start Your Journey?" subheading="See where your IT stands today" />`

All responsive: grids collapse to 1 column on mobile.

- [ ] **Step 2: Verify**

Open `http://localhost:3001/about` — page renders with all sections.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(public\)/about/page.tsx
git commit -m "feat: add about us page"
```

---

## Task 8: Contact Page & API Route

**Files:**
- Create: `src/app/(public)/contact/page.tsx`
- Create: `src/app/api/contact/route.ts`

- [ ] **Step 1: Create contact API route**

`src/app/api/contact/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, email, message, phone, company } = body

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Name, email, and message are required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('contact_submissions')
    .insert({ name, email, message, phone: phone || null, company: company || null })

  if (error) {
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 })
  }

  // Email notification can be added later via Supabase Edge Function or SMTP
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Create contact page**

`src/app/(public)/contact/page.tsx` — Mostly server component with a client component form.

The page itself is a server component. The form is a separate client component (either inline with `'use client'` or extracted). Use `useState` for form fields, `fetch('/api/contact', { method: 'POST', body })` for submission, `toast` for success/error feedback.

Layout: Two columns on desktop, stacked on mobile.
- Left: Form — name, email, phone, company, message (textarea), "Send Message" button (blue)
- Right: Contact info card — email (hello@ithealth.ai), phone, location (Johannesburg, South Africa) + "Start Now" CTA

- [ ] **Step 3: Verify**

Open `http://localhost:3001/contact` — form renders, submit works (check Supabase Studio for row in `contact_submissions`).

- [ ] **Step 4: Commit**

```bash
git add src/app/\(public\)/contact/page.tsx src/app/api/contact/route.ts
git commit -m "feat: add contact page with form and API route"
```

---

## Task 9: Partners Page & API Route

**Files:**
- Create: `src/app/(public)/partners/page.tsx`
- Create: `src/app/api/partners/route.ts`

- [ ] **Step 1: Create partners API route**

`src/app/api/partners/route.ts` — Same pattern as contact route but for `partner_applications` table. Required fields: `company_name`, `contact_name`, `email`.

- [ ] **Step 2: Create partners page**

`src/app/(public)/partners/page.tsx` — Server component with client form.

Sections:
1. **Page header**: "Our Partners", gradient background
2. **Partner logo grid**: 4-column grid (2 on mobile) of partner cards — logo placeholder + name. Fetched from `partners` table.
3. **"Become a Partner" section**: Benefits cards (3 columns) with IBM Carbon icons: `Growth` (Grow Revenue), `Partnership` (Co-Sell), `Education` (Enable).
4. **Application form**: Client component. Fields: company name, contact name, email, website, message. "Submit Application" button.

- [ ] **Step 3: Verify**

Open `http://localhost:3001/partners` — partner logos display, form submits.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(public\)/partners/page.tsx src/app/api/partners/route.ts
git commit -m "feat: add partners page with showcase and application form"
```

---

## Task 10: Final Integration & Verification

- [ ] **Step 1: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Test all pages**

Navigate through all public pages:
- `/` — Homepage: hero, journey, blog highlights, testimonials, CTA
- `/blog` — Blog listing with category filter
- `/blog/[slug]` — Individual post with formatted content
- `/about` — About page with mission, values, CTA
- `/contact` — Contact form submits successfully
- `/partners` — Partner grid + application form submits

- [ ] **Step 3: Test responsive design**

Resize browser to mobile width (< 768px). Verify:
- Nav collapses to hamburger menu
- All grids stack to single column
- Hero text scales down
- Journey phases stack vertically
- Footer columns stack

- [ ] **Step 4: Test admin still works**

Navigate to `/login`, log in, verify admin dashboard and existing pages still work with the new button style.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve public website integration issues"
```
