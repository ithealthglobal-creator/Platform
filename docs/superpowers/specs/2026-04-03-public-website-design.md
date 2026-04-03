# Public Website — Design Spec

## Overview

IThealth's public-facing marketing website drives SMB visitors into the onboarding CTA journey ("Start Now"). The site includes a homepage, blog, about us, contact, and partners pages. All content that changes frequently (blog posts, testimonials, partners) is Supabase-driven and manageable from the admin area.

Public users are unauthenticated visitors with no `profiles` record or auth account.

## Tech Stack

Same as the existing admin platform:

- **Framework**: Next.js (App Router), TypeScript
- **UI**: React, shadcn/ui, Tailwind CSS, IBM Carbon icons (@carbon/icons-react), Poppins font
- **Backend**: Supabase (local Docker)
- **Rendering**: Server components (SSR) for SEO — unlike admin pages which are client components

## Brand

### Colours

| Token | Hex | Usage |
|---|---|---|
| `brand-primary` | `#1175E4` | Nav bar, hero, primary buttons, links |
| `brand-secondary` | `#FF246B` | CTA buttons ("Start Now"), accents |
| `brand-dark` | `#1a1a2e` | Body text, testimonials background |
| `brand-footer` | `#0f0f1e` | Footer background |
| `phase-operate` | `#1175E4` | Operate phase accent |
| `phase-secure` | `#FF246B` | Secure phase accent |
| `phase-streamline` | `#133258` | Streamline phase accent |
| `phase-accelerate` | `#EDB600` | Accelerate phase accent |

### Button Style (System-Wide)

All buttons across the entire system (public + admin) use the IThealth signature shape. This is a cross-cutting change — the existing admin area buttons will be restyled to match:

```
border-radius: 50px 0 50px 50px
```

Fully rounded corners with a **square top-right corner**. This applies to every button variant: primary, secondary, outline, ghost.

**Button variants:**
- **Primary CTA**: `background: #FF246B`, white text — used for "Start Now" buttons
- **Secondary**: `background: #1175E4`, white text — used for form submits, "Read More"
- **Outline**: `border: 2px solid`, no fill — secondary actions
- **Ghost**: subtle background tint — nav links like "Login"

### Logos

| File | Usage |
|---|---|
| `IThealthLogoWhite.svg` | Nav bar (on blue background), footer (on dark background) |
| `IThealthLogo.svg` | Any light background usage |
| `ITHIcon.svg` | Favicon, social sharing |

The nav bar uses the full IThealth wordmark logo, displayed large/prominent.

### Phase Design Icons

Each modernisation phase has a design icon SVG that forms a logo lockup with the phase name beside it:

| Phase | Icon File | Accent Colour |
|---|---|---|
| Operate | `OperateDesign.svg` | `#1175E4` |
| Secure | `SecureDesign.svg` | `#FF246B` |
| Streamline | `StreamlineDesign.svg` | `#133258` |
| Accelerate | `AccelerateDesign.svg` | `#EDB600` |

### Icons

IBM Carbon icons (`@carbon/icons-react`) for all project-authored components and pages. shadcn/ui primitives (dialog close button, select chevron, etc.) retain their built-in Lucide icons — replacing icons inside shadcn internals is fragile and unnecessary.

### Font

Poppins (already configured in root layout), weights 300-700.

## Project Structure

### Route Groups

```
src/app/
├── (public)/                    # New: public marketing pages
│   ├── layout.tsx               # Public layout: nav header + footer
│   ├── page.tsx                 # Homepage
│   ├── blog/
│   │   ├── page.tsx             # Blog listing with category filter
│   │   └── [slug]/page.tsx      # Individual blog post
│   ├── about/page.tsx           # About Us
│   ├── contact/page.tsx         # Contact form
│   └── partners/page.tsx        # Partner showcase + application
├── (auth)/                      # Existing: login, reset password
├── (admin)/                     # Existing: admin shell
└── api/
    ├── contact/route.ts         # New: contact form submission handler
    └── partners/route.ts        # New: partner application submission handler
```

### New Components

```
src/components/
├── public-header.tsx            # Marketing nav bar
├── public-footer.tsx            # Marketing footer
├── hero.tsx                     # Hero section
├── journey-section.tsx          # Modernisation journey section
├── blog-card.tsx                # Blog post card (reused on homepage + blog listing)
├── testimonial-card.tsx         # Testimonial card
└── cta-banner.tsx               # Reusable CTA banner section
```

### Brand Assets

Copy to `public/` for use on the website:

```
public/
├── logos/
│   ├── ithealth-logo.svg        # Blue wordmark (from IThealthLogo.svg)
│   ├── ithealth-logo-white.svg  # White wordmark (from IThealthLogoWhite.svg)
│   └── ithealth-icon.svg        # Icon/favicon (from ITHIcon.svg)
├── phases/
│   ├── operate.svg              # Phase design icons
│   ├── secure.svg
│   ├── streamline.svg
│   └── accelerate.svg
└── favicon.ico                  # Generated from ITHIcon.svg
```

## Database Schema

### New Tables

All tables include `id` (uuid PK, default `gen_random_uuid()`), `created_at`, `updated_at` with the existing `update_updated_at()` trigger.

#### `blog_posts`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| title | text | NOT NULL | Post title |
| slug | text | NOT NULL, UNIQUE | URL-friendly slug |
| excerpt | text | | Short summary for listing cards |
| content | text | | Full post body (HTML). Rendered with Tailwind `prose` classes. For now, content is raw HTML inserted via seed data or Supabase Studio. A rich text editor in the admin area is a future enhancement. |
| cover_image_url | text | | Cover image URL |
| category | text | | Post category (e.g., "Security", "Cloud") |
| author_id | uuid | FK to profiles | Author (admin user) |
| status | text | NOT NULL, DEFAULT 'draft', CHECK (status IN ('draft', 'published')) | Publication status |
| published_at | timestamptz | | When the post was published |
| is_active | boolean | NOT NULL, DEFAULT true | Soft delete |

Indexes: `slug` (unique), `status`, `published_at`, `category`.

#### `testimonials`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| name | text | NOT NULL | Person's name |
| company | text | | Company name |
| role | text | | Person's role/title |
| quote | text | NOT NULL | Testimonial text |
| avatar_url | text | | Profile photo URL |
| sort_order | integer | NOT NULL, DEFAULT 0 | Display ordering |
| is_active | boolean | NOT NULL, DEFAULT true | Soft delete |

#### `contact_submissions`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| name | text | NOT NULL | Submitter name |
| email | text | NOT NULL | Submitter email |
| phone | text | | Phone number |
| company | text | | Company name |
| message | text | NOT NULL | Message body |

No `updated_at` — submissions are immutable.

#### `partner_applications`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| company_name | text | NOT NULL | Applicant company |
| contact_name | text | NOT NULL | Contact person |
| email | text | NOT NULL | Contact email |
| phone | text | | Phone number |
| website | text | | Company website |
| message | text | | Application message |

No `updated_at` — applications are immutable.

#### `partners`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| name | text | NOT NULL | Partner name |
| logo_url | text | | Partner logo URL |
| website | text | | Partner website |
| description | text | | Partner description |
| sort_order | integer | NOT NULL, DEFAULT 0 | Display ordering |
| is_active | boolean | NOT NULL, DEFAULT true | Soft delete |

### RLS Policies

- `blog_posts`: Public SELECT for `status = 'published' AND is_active = true`. Admin full CRUD.
- `testimonials`: Public SELECT for `is_active = true`. Admin full CRUD.
- `contact_submissions`: No public SELECT. INSERT for anyone (no auth required). Admin SELECT.
- `partner_applications`: No public SELECT. INSERT for anyone (no auth required). Admin SELECT.
- `partners`: Public SELECT for `is_active = true`. Admin full CRUD.

"Public SELECT" means a SELECT policy with `USING (true)` — no auth required, accessible to anonymous users via the anon key. "INSERT for anyone" means an INSERT policy with `WITH CHECK (true)` — allows anonymous inserts.

### Admin Menu Additions

New menu items for managing public website content:

| L1 | L2 | L3 | Route |
|---|---|---|---|
| Growth | Content | Blog | /growth/content/blog |
| Growth | Market | Testimonials | /growth/market/testimonials |

Partners are already under People (existing L2). A new L3 for partner management:

| L1 | L2 | Route |
|---|---|---|
| People | Partners | /people/partners |

These admin CRUD pages follow the existing Companies page pattern. They are **out of scope for this spec** — they will be built as a separate follow-up feature. For launch, blog posts, testimonials, and partners can be seeded or managed via Supabase Studio.

## Pages

### Public Layout (`(public)/layout.tsx`)

Server component. Wraps all public pages with:
- **Header**: Blue nav bar (`#1175E4` background)
- **Footer**: Dark footer (`#0f0f1e` background)

The root `layout.tsx` currently wraps everything in `<AuthProvider>`. Move `<AuthProvider>` from the root layout into `(admin)/layout.tsx` and `(auth)/login/page.tsx` / `(auth)/reset-password/page.tsx` so public pages don't load unnecessary auth context.

### Navigation Header (`public-header.tsx`)

Blue background (`#1175E4`), full width, sticky top.

**Left**: IThealth white wordmark logo (large, prominent). Links to `/`.

**Right**:
- "Resources" dropdown (on hover/click): Blog, About Us, Contact, Partners
- "Login" ghost button (white text, subtle white background tint, signature border-radius). Links to `/login`.
- "Start Now" CTA button (pink `#FF246B`, signature border-radius). Links to onboarding flow.

**Mobile**: Hamburger menu with slide-out drawer containing all nav items.

### Homepage (`(public)/page.tsx`)

Server component. Sections in order:

#### 1. Hero

- Solid blue background (`#1175E4`), full width
- **Headline**: "Your IT Modernisation Champions" — white, large (48-52px), bold
- **CTA Button**: "Start Now" — pink `#FF246B`, signature border-radius
- **Subtitle**: "Your free modernisation journey" — white, slightly transparent
- **Supporting copy**: "In today's world, modern IT isn't optional — we guide you through IT modernisation with simplicity, clarity and security, keeping your business resilient and future ready." — white, smaller text, max-width for readability

#### 2. Modernisation Journey

- Light grey background (`#f8fafc`)
- **Section heading**: "The Modernisation Journey"
- **Section subheading**: "A clear, phased Success Blueprint that transforms your IT from a reactive cost centre into a strategic growth engine."
- **Phase logo lockups**: Horizontal row showing Operate → Secure → Streamline → Accelerate. Each lockup is the phase design icon (48px) + phase name beside it, with arrow separators. Phase names use their accent colours.
- **Phase descriptions**: Grid of 4 short descriptions below the lockups, aligned to each phase.
- **Value strip**: White card with 3 columns: "Enterprise outcomes at SMB scale" | "Guided transformation with Modernisation Champions" | "Strategic growth engine for your business"
- **CTA**: "Start Your Journey" button (pink)
- Data: Fetches from `phases` table for names/descriptions. Icons are static SVGs from `/public/phases/`.

#### 3. Blog Highlights

- White background
- **Section heading**: "Latest Insights"
- **3 blog cards**: Grid of 3 latest published posts. Each card: cover image, category tag (coloured), title, excerpt, date/read time.
- **"View All" link**: Links to `/blog`
- Data: Fetches latest 3 from `blog_posts` where `status = 'published'`.

#### 4. Testimonials

- Dark background (`#1a1a2e`), white text
- **Section heading**: "What Our Clients Say"
- **3 testimonial cards**: Each card: quote (with pink quotation mark), name, role, company, avatar placeholder.
- Data: Fetches from `testimonials` where `is_active = true`, ordered by `sort_order`, limit 3.

#### 5. CTA Banner

- Blue background (`#1175E4`), full width
- **Heading**: "Ready to Modernise Your IT?"
- **Subheading**: "Start your free modernisation journey today"
- **CTA Button**: "Start Now" — pink, signature border-radius

#### 6. Footer

See Footer section below.

### Blog Listing (`(public)/blog/page.tsx`)

- **Page header**: "Blog" heading with subtitle, light gradient background
- **Category filter**: Horizontal pill buttons (All, Security, Cloud, Operations, Strategy, etc.). "All" is default active. Filterable via URL query params.
- **Featured post**: If exists, top post displayed as large hero card (image left, content right)
- **Post grid**: 3-column grid of blog cards, paginated
- Data: Fetches from `blog_posts` where `status = 'published'`, ordered by `published_at` desc.

### Blog Post (`(public)/blog/[slug]/page.tsx`)

- **Cover image**: Full-width cover image at top
- **Post header**: Title, category tag, author name, published date, read time
- **Content body**: Rendered HTML from `content` field. Styled with Tailwind prose classes.
- **CTA Banner**: Reusable CTA banner at bottom
- **Metadata**: Dynamic `<title>` and Open Graph tags for SEO/social sharing
- Data: Fetches single post by `slug`.

### About Us (`(public)/about/page.tsx`)

- **Page header**: "About IThealth" with subtitle
- **Mission section**: Two-column layout. Left: mission text from brand document. Right: image placeholder.
- **Values section**: 3 cards — "Champion Mindset", "Security First", "Continuous Progress" — with IBM Carbon icons
- **CTA Banner**: Reusable "Ready to Start Your Journey?" banner

Static content — no database queries. Content comes from the brand document.

### Contact (`(public)/contact/page.tsx`)

- **Page header**: "Contact Us" with subtitle
- **Two-column layout**:
  - **Left**: Contact form — name, email, phone, company, message fields. "Send Message" button (blue). Client component for form handling.
  - **Right**: Contact info card (email, phone, location) + "Start Now" CTA
- **Form submission**: POST to `/api/contact` which:
  1. Validates input (name, email, message required)
  2. Inserts into `contact_submissions` table (service_role)
  3. Sends email notification (via Supabase Edge Function or simple SMTP — implementation detail)
  4. Returns success/error
- **Success state**: Toast notification "Message sent! We'll be in touch."

### Partners (`(public)/partners/page.tsx`)

- **Page header**: "Our Partners" with subtitle
- **Partner logo grid**: 4-column grid of partner cards (logo + name). Supabase-driven.
- **"Become a Partner" section**: Benefits cards (Grow Revenue, Co-Sell, Enable) with IBM Carbon icons
- **Application form**: company name, contact name, email, website, message. "Submit Application" button.
- **Form submission**: Same pattern as contact — POST to `/api/partners`, insert into `partner_applications`, send email notification.
- Data: Fetches from `partners` where `is_active = true`, ordered by `sort_order`.

### Footer (`public-footer.tsx`)

Dark background (`#0f0f1e`), full width.

**4-column grid:**
1. IThealth white logo + tagline ("Your IT Modernisation Champions. Helping SMBs transform their technology.")
2. Resources: Blog, About Us, Contact, Partners
3. Journey: Operate, Secure, Streamline, Accelerate
4. Get Started: Login, Start Now, Contact Us

**Bottom bar**: Copyright + Privacy Policy + Terms of Service links.

## Responsive Design

The public website is **fully responsive** (unlike the admin area which is desktop-only).

### Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Mobile Adaptations

- **Nav**: Hamburger menu with slide-out sheet (shadcn Sheet component). Logo + hamburger icon visible. Resources dropdown becomes accordion in the sheet.
- **Hero**: Smaller heading (32-36px), stacked layout
- **Journey phases**: Stack vertically (1 column), arrows become downward
- **Blog/Testimonials grids**: 1 column on mobile, 2 on tablet, 3 on desktop
- **Contact form**: Single column, contact info card moves below form
- **Partners grid**: 2 columns on mobile, 4 on desktop
- **Footer**: 1-2 columns on mobile, 4 on desktop

## SEO

- Server-rendered pages for crawlability
- Dynamic `<title>` and `<meta description>` per page
- Open Graph tags for social sharing (especially blog posts)
- Semantic HTML (`<nav>`, `<main>`, `<article>`, `<footer>`)
- Blog post slugs for clean URLs

## Seed Data

For development and demo purposes:

- 3-5 sample blog posts (published, varied categories)
- 3 sample testimonials
- 3-4 sample partners with placeholder logos
- Contact and partner application tables start empty

## Email Notifications

Contact form and partner application submissions trigger email notifications to an IThealth inbox. Implementation approach:

- **Option A**: Supabase Database Webhook → Edge Function → email service (Resend, SendGrid, etc.)
- **Option B**: Next.js API route sends email directly via SMTP/API after inserting to DB

Both approaches are valid. The specific email service is an implementation detail. For local development, emails can be caught by the Supabase Inbucket service (already running in Docker).

## Out of Scope

- Admin CRUD pages for blog posts, testimonials, partners (separate follow-up feature)
- Onboarding flow (the "Start Now" CTA destination — future feature, links to `/login` for now)
- SSO/OAuth authentication for public users
- Search functionality
- Comments on blog posts
- Newsletter signup
- Analytics/tracking integration
- Image upload for blog posts (URLs are text fields for now)
