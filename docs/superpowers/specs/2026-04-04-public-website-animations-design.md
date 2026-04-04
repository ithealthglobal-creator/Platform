# Public Website Animation & Spacing Overhaul — Design Spec

## Goal

Transform the IThealth public website from a static marketing site into an immersive, scroll-driven experience using GSAP ScrollTrigger and Motion (formerly Framer Motion). All hero areas become full-viewport height, all sections animate on scroll, white space doubles throughout, and the logo shrinks for a more modern feel.

## Dependencies

- `gsap` — core animation engine
- `@gsap/react` — `useGSAP` hook for React/Next.js SSR-safe integration
- `motion` — declarative React animations (`motion/react` import path)

Install:
```bash
npm install gsap @gsap/react motion
```

## 1. Homepage Hero — Pinned Scroll-Scrub

The homepage hero is the centrepiece. It stays pinned at 100vh while the user scrolls through a choreographed reveal sequence.

### Layout

- Section: `min-h-screen`, `bg-[var(--brand-primary)]`, centred content, overflow hidden
- Component becomes a client component (`'use client'`) using `useGSAP` hook
- Container ref scopes all GSAP selectors

### Scroll-Scrub Timeline

GSAP ScrollTrigger config:
- `trigger`: hero section
- `pin: true` — locks the hero in the viewport
- `start: "top top"`
- `end: "+=2000"` — ~2000px of scroll distance to complete the sequence
- `scrub: 1` — smooth 1-second easing tied to scroll position

Timeline sequence (tied to scroll progress):

1. **0% → 20%**: Headline "Your IT Modernisation Champions" fades in word-by-word. Each word has `opacity: 0, y: 30` → `opacity: 1, y: 0` with 0.1s stagger between words.
2. **20% → 35%**: "Start Now" CTA button scales from `scale: 0.5, opacity: 0` → `scale: 1, opacity: 1` with a slight overshoot (`ease: "back.out(1.7)"`). Subtitle "Your free modernisation journey" fades in below.
3. **35% → 75%**: Four phase icons animate in one-by-one with 10% scroll gap between each:
   - Operate icon + label slides in from left (`x: -50, opacity: 0` → `x: 0, opacity: 1`)
   - Secure icon + label slides in from bottom (`y: 50`)
   - Streamline icon + label slides in from right (`x: 50`)
   - Accelerate icon + label slides in from bottom (`y: 50`)
   - Each icon uses its phase colour for the label text
   - Phase icons are positioned in a horizontal row below the CTA (hidden initially)
4. **75% → 100%**: Background shifts from solid `--brand-primary` to a gradient. Implementation: use an absolutely-positioned overlay div with `linear-gradient(135deg, var(--brand-primary), var(--brand-dark))` starting at `opacity: 0`, and animate its opacity to 1 via GSAP (since CSS `background` is not directly animatable by GSAP). Supporting copy paragraph fades in. Pin releases.

### Phase Icons in Hero

The 4 phase lockups (icon SVG + coloured name) that currently live in the journey section are duplicated into the hero for the scroll-scrub animation. They appear in a centred horizontal row below the CTA, same styling as the journey section lockups but without arrows.

After the pin releases, the journey section below shows the phase descriptions, value strip, etc. The phase lockups row in the journey section is still present (it serves as a static reference after the animated hero reveal).

### Implementation Notes

- Register `ScrollTrigger` plugin once at module scope: `gsap.registerPlugin(useGSAP, ScrollTrigger)`
- Use `useGSAP(() => { ... }, { scope: containerRef })` for cleanup
- Word-by-word animation: split headline text into `<span>` elements wrapping each word, animate each span
- All animated elements start with `opacity: 0` via inline style or class to prevent flash of unstyled content (FOUC)

## 2. Other Page Heroes — 100vh with Motion Entrance

Blog, About, Contact, and Partners page heroes all become full-viewport height with Motion entrance animations.

### Layout Changes

- All page header sections: `min-h-screen` with `flex items-center justify-center` for vertical centering
- Existing gradient backgrounds remain unchanged

### Entrance Animations

Using Motion's declarative API on the hero content wrapper:

```tsx
<motion.div
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.8, ease: "easeOut" }}
>
  <h1>...</h1>
  <p>...</p>
</motion.div>
```

- Headline: `initial={{ opacity: 0, y: 30 }}`, `animate={{ opacity: 1, y: 0 }}`, duration 0.8s
- Subtitle: same animation with `delay: 0.3`
- These pages become client components (`'use client'`) to use Motion

## 3. Scroll-Triggered Section Reveals

Every content section across all pages animates in when scrolled into view.

### Reusable `ScrollReveal` Wrapper Component

Create `src/components/scroll-reveal.tsx` — a client component:

```tsx
'use client'

import { motion, useInView } from 'motion/react'
import { useRef } from 'react'

interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'left' | 'right' | 'none'
}
```

Props:
- `children` — content to reveal
- `className` — pass-through for styling
- `delay` — animation delay in seconds (default 0)
- `direction` — which direction to slide from: `'up'` (default, y: 40→0), `'left'` (x: -40→0), `'right'` (x: 40→0), `'none'` (fade only)

Behaviour:
- Uses `useRef` + `useInView(ref, { once: true, margin: "-100px" })` to trigger when element is 100px into the viewport
- Wraps children in `<motion.div>` with `initial` and `animate` (when `isInView` is true)
- Transition: `duration: 0.6, ease: "easeOut"` + the configured delay

### Staggered Children

For grids (blog cards, testimonial cards, partner cards, values cards, phase description cards), wrap each child in `<ScrollReveal delay={index * 0.1}>` to create a stagger effect.

### Where Applied

| Page | Section | Animation |
|------|---------|-----------|
| Homepage | Journey phase lockups row | Stagger left-to-right, delay 0.1 each |
| Homepage | Journey phase descriptions grid | Stagger, delay 0.1 each |
| Homepage | Journey value strip | Fade up |
| Homepage | Journey "Start Your Journey" CTA | Scale from 0.9 → 1 + fade |
| Homepage | "Latest Insights" heading + cards | Heading fade up, cards stagger 0.15 |
| Homepage | "What Our Clients Say" heading + cards | Heading fade up, cards stagger 0.15 |
| Homepage | CTA banner | Fade up + scale |
| Blog | Category filter pills | Fade in |
| Blog | Featured post | Slide up |
| Blog | Post grid cards | Stagger 0.1 |
| Blog post | Content sections | Fade up |
| About | Mission text + image placeholder | Text from left, image from right |
| About | Values cards | Stagger 0.15 |
| Contact | Form + info card | Form from left, card from right |
| Partners | Partner grid | Stagger 0.1 |
| Partners | Benefits cards | Stagger 0.15 |
| Partners | Application form | Fade up |
| All pages | Footer | Fade in (subtle, no slide) |

## 4. Spacing — Double White Space

All section padding, margins, and gaps double to create a more spacious, premium feel.

### Section Vertical Padding

| Current | New |
|---------|-----|
| `py-16` | `py-32` |
| `py-12` (footer) | `py-24` |
| `py-8` (blog filter) | `py-16` |

### Section Horizontal Padding

| Current | New |
|---------|-----|
| `px-6` | `px-8` |
| `md:px-12` | `md:px-16` |
| `lg:px-16` | `lg:px-24` |

### Content Gaps

| Current | New |
|---------|-----|
| `gap-6` | `gap-12` |
| `gap-8` | `gap-16` |
| `gap-4` | `gap-8` |
| `gap-3` | `gap-6` |
| `gap-2` | `gap-4` |

### Section Margins

| Current | New |
|---------|-----|
| `mt-12` | `mt-24` |
| `mb-10` | `mb-20` |
| `mb-8` | `mb-16` |
| `mb-6` | `mb-12` |
| `mb-4` | `mb-8` |
| `mb-2` | `mb-4` |
| `mb-3` | `mb-6` |
| `mt-4` | `mt-8` |
| `mt-2` | `mt-4` |

### Inner Content Padding

| Current | New |
|---------|-----|
| `p-6` (cards) | `p-10` |
| `p-8` (values, about cards) | `p-12` |

### Header Height

The header stays at `h-16` — it should remain compact since the logo is shrinking. No change here.

## 5. Logo — Smaller

| Location | Current | New |
|----------|---------|-----|
| Header desktop | `h-10 w-auto` (40px) | `h-7 w-auto` (28px) |
| Header mobile (sheet) | `h-9 w-auto` (36px) | `h-6 w-auto` (24px) |
| Footer | `h-10 w-auto` (40px) | `h-7 w-auto` (28px) |

Image `width`/`height` props on `<Image>` updated to match: desktop `width={112} height={28}`, mobile `width={96} height={24}`.

## 6. Component Architecture

### New Files

| File | Type | Purpose |
|------|------|---------|
| `src/components/scroll-reveal.tsx` | Client | Reusable scroll-triggered reveal wrapper |
| `src/components/animated-hero.tsx` | Client | Homepage pinned scroll-scrub hero (replaces static hero.tsx) |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/hero.tsx` | Deleted — replaced by `animated-hero.tsx` |
| `src/components/journey-section.tsx` | Wrap phase lockups, descriptions, values, CTA in `<ScrollReveal>` |
| `src/components/blog-card.tsx` | No change (parent wraps in ScrollReveal) |
| `src/components/testimonial-card.tsx` | No change (parent wraps in ScrollReveal) |
| `src/components/cta-banner.tsx` | Wrap in `<ScrollReveal>`, becomes client component |
| `src/components/public-header.tsx` | Logo size h-10 → h-7, mobile h-9 → h-6 |
| `src/components/public-footer.tsx` | Logo size h-10 → h-7, doubled padding |
| `src/app/(public)/page.tsx` | Import AnimatedHero, wrap sections in ScrollReveal, update spacing |
| `src/app/(public)/blog/page.tsx` | Add Motion hero entrance, ScrollReveal on sections, update spacing, becomes client component |
| `src/app/(public)/blog/[slug]/page.tsx` | ScrollReveal on content sections, update spacing. No hero entrance — this page has a cover image area and title, not a gradient hero section like the other pages. |
| `src/app/(public)/about/page.tsx` | Add Motion hero entrance, ScrollReveal on sections, update spacing, becomes client component |
| `src/app/(public)/contact/page.tsx` | Add Motion hero entrance, ScrollReveal on sections, update spacing |
| `src/app/(public)/partners/page.tsx` | Add Motion hero entrance, ScrollReveal on sections, update spacing |

### Client Component Considerations

Pages that are currently server components (about, blog listing, blog post) will need to become client components or use a hybrid approach:

- **Option A**: Make the entire page a client component. Simpler but loses SSR for data fetching.
- **Option B**: Keep the page as a server component but extract animated sections into client component wrappers that receive data as props.

**Recommended: Option B** — Keep `page.tsx` as async server components for Supabase data fetching. Pass data down to client animation wrappers. The `ScrollReveal` wrapper is already a client component that accepts `children`, so server component content can be passed through.

For Motion hero animations on inner pages, extract a `<PageHero>` client component that accepts `title` and `subtitle` as props.

### New Shared Client Components

1. **`src/components/scroll-reveal.tsx`** — Reusable scroll-triggered reveal
2. **`src/components/animated-hero.tsx`** — Homepage pinned hero with GSAP
3. **`src/components/page-hero.tsx`** — Inner page hero with Motion entrance animation (gradient bg, 100vh, centred text)

## 7. Performance Considerations

- GSAP and Motion are loaded only in client components — server-rendered HTML is unaffected
- `ScrollReveal` uses `once: true` so animations only fire once, not on every scroll
- Phase icon images in the animated hero should use `priority` to prevent layout shift during pin
- Initial states (`opacity: 0`) set via inline styles prevent FOUC before JS hydration
- GSAP cleanup handled automatically by `useGSAP` hook on unmount

## 8. No Changes

- Button styling (signature radius) — unchanged
- Colour scheme — unchanged
- RLS / database — unchanged
- Admin area — unchanged
- Mobile hamburger nav — unchanged (just logo size)
- API routes — unchanged
