# Public Website Animation & Spacing Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the IThealth public website into an immersive, scroll-driven experience with GSAP ScrollTrigger hero pinning, Motion entrance animations, doubled white space, and smaller logos.

**Architecture:** Three new client components (`scroll-reveal.tsx`, `animated-hero.tsx`, `page-hero.tsx`) wrap existing server-component pages. The homepage hero uses GSAP ScrollTrigger for a pinned scroll-scrub sequence; other page heroes use Motion for fade-in entrances. Every content section wraps in `<ScrollReveal>` for scroll-triggered reveals. Pages stay as server components — animation wrappers receive data as props.

**Tech Stack:** GSAP + @gsap/react (ScrollTrigger), Motion (motion/react), Next.js 16 App Router, Tailwind CSS v4, React 19

**Spec:** `docs/superpowers/specs/2026-04-04-public-website-animations-design.md`

---

## File Structure

| File | Type | Responsibility |
|------|------|---------------|
| `src/components/scroll-reveal.tsx` | Create (client) | Reusable scroll-triggered reveal wrapper using Motion `useInView` |
| `src/components/animated-hero.tsx` | Create (client) | Homepage pinned scroll-scrub hero using GSAP ScrollTrigger + useGSAP |
| `src/components/page-hero.tsx` | Create (client) | Inner page hero (100vh, gradient bg, Motion fade-in entrance) |
| `src/components/hero.tsx` | Delete | Replaced by `animated-hero.tsx` |
| `src/components/journey-section.tsx` | Modify | Wrap sub-sections in `<ScrollReveal>`, double spacing |
| `src/components/cta-banner.tsx` | Modify | Wrap in `<ScrollReveal>`, double spacing |
| `src/components/public-header.tsx` | Modify | Logo h-10 → h-7, mobile h-9 → h-6 |
| `src/components/public-footer.tsx` | Modify | Logo h-10 → h-7, double padding |
| `src/app/(public)/page.tsx` | Modify | Import AnimatedHero, wrap sections in ScrollReveal, double spacing |
| `src/app/(public)/blog/page.tsx` | Modify | Use PageHero, wrap sections in ScrollReveal, double spacing |
| `src/app/(public)/blog/[slug]/page.tsx` | Modify | Wrap content in ScrollReveal, double spacing |
| `src/app/(public)/about/page.tsx` | Modify | Use PageHero, wrap sections in ScrollReveal, double spacing |
| `src/app/(public)/contact/page.tsx` | Modify | Use PageHero, wrap sections in ScrollReveal, double spacing |
| `src/app/(public)/partners/page.tsx` | Modify | Use PageHero, wrap sections in ScrollReveal, double spacing |

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install gsap, @gsap/react, and motion**

```bash
cd /Users/futuvara/Documents/Claude/Projects/IThealth.ai
npm install gsap @gsap/react motion
```

Expected: packages added to `dependencies` in package.json. Verify with:

```bash
node -e "require('gsap'); require('@gsap/react'); require('motion/react'); console.log('OK')"
```

- [ ] **Step 2: Verify dev server starts**

```bash
npm run dev -- --port 3002 &
sleep 15
curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/
kill $(lsof -ti :3002)
```

Expected: HTTP 200

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install gsap, @gsap/react, and motion for animations"
```

---

## Task 2: Create ScrollReveal Component

**Files:**
- Create: `src/components/scroll-reveal.tsx`

- [ ] **Step 1: Create the ScrollReveal component**

This is a client component that wraps children in a `motion.div` that fades in when scrolled into view. It supports directional slides (up, left, right) and stagger delays.

```tsx
'use client'

import { useRef } from 'react'
import { motion, useInView } from 'motion/react'

interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'left' | 'right' | 'none'
}

export function ScrollReveal({
  children,
  className,
  delay = 0,
  direction = 'up',
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const directionOffset = {
    up: { x: 0, y: 40 },
    left: { x: -40, y: 0 },
    right: { x: 40, y: 0 },
    none: { x: 0, y: 0 },
  }

  const offset = directionOffset[direction]

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, x: offset.x, y: offset.y }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x: offset.x, y: offset.y }}
      transition={{ duration: 0.6, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/futuvara/Documents/Claude/Projects/IThealth.ai
npx tsc --noEmit src/components/scroll-reveal.tsx 2>&1 || true
```

The component is simple enough that a type-check pass confirms correctness. If tsc complains about JSX/module config, just verify the dev server renders any page without errors (the component isn't imported yet so it just needs to not break the build).

- [ ] **Step 3: Commit**

```bash
git add src/components/scroll-reveal.tsx
git commit -m "feat: add ScrollReveal component for scroll-triggered animations"
```

---

## Task 3: Create PageHero Component

**Files:**
- Create: `src/components/page-hero.tsx`

- [ ] **Step 1: Create the PageHero component**

This is used by blog, about, contact, and partners pages. It renders a 100vh gradient hero with Motion entrance animations for the title and subtitle.

```tsx
'use client'

import { motion } from 'motion/react'

interface PageHeroProps {
  title: string
  subtitle?: string
}

export function PageHero({ title, subtitle }: PageHeroProps) {
  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-dark)] px-8 text-center text-white">
      <div>
        <motion.h1
          className="text-4xl md:text-5xl font-bold"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            className="text-white/80 text-lg mt-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
          >
            {subtitle}
          </motion.p>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/page-hero.tsx
git commit -m "feat: add PageHero component with Motion entrance animations"
```

---

## Task 4: Create AnimatedHero Component

**Files:**
- Create: `src/components/animated-hero.tsx`

This is the most complex component. It replaces the static hero with a GSAP ScrollTrigger pinned scroll-scrub sequence. The old `hero.tsx` is deleted in Task 8 when `page.tsx` switches its import.

- [ ] **Step 1: Create the AnimatedHero component**

The component:
1. Renders a `min-h-screen` section with `--brand-primary` background
2. Splits the headline "Your IT Modernisation Champions" into individual `<span>` elements
3. Uses `useGSAP` with a scoped container ref to build a ScrollTrigger timeline
4. Pins the hero and scrubs through: headline words → CTA button → 4 phase icons → gradient overlay + supporting copy
5. All animated elements start at `opacity: 0` (inline style) to prevent FOUC

```tsx
'use client'

import { useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { Button } from '@/components/ui/button'

gsap.registerPlugin(ScrollTrigger)

const phases = [
  { name: 'Operate', icon: '/phases/operate.svg', color: 'var(--phase-operate)', from: { x: -50, opacity: 0 } },
  { name: 'Secure', icon: '/phases/secure.svg', color: 'var(--phase-secure)', from: { y: 50, opacity: 0 } },
  { name: 'Streamline', icon: '/phases/streamline.svg', color: 'var(--phase-streamline)', from: { x: 50, opacity: 0 } },
  { name: 'Accelerate', icon: '/phases/accelerate.svg', color: 'var(--phase-accelerate)', from: { y: 50, opacity: 0 } },
]

const headlineWords = 'Your IT Modernisation Champions'.split(' ')

export function AnimatedHero() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          pin: true,
          start: 'top top',
          end: '+=2000',
          scrub: 1,
        },
      })

      // 0% → 20%: Headline words fade in one by one
      tl.from('.hero-word', {
        opacity: 0,
        y: 30,
        stagger: 0.1,
        duration: 0.3,
      })

      // 20% → 35%: CTA button scales up, subtitle fades in
      tl.from('.hero-cta', {
        scale: 0.5,
        opacity: 0,
        duration: 0.3,
        ease: 'back.out(1.7)',
      })
      tl.from(
        '.hero-subtitle',
        {
          opacity: 0,
          y: 20,
          duration: 0.2,
        },
        '-=0.1'
      )

      // 35% → 75%: Phase icons animate in one by one
      phases.forEach((phase, i) => {
        tl.from(`.hero-phase-${i}`, {
          ...phase.from,
          duration: 0.25,
        })
      })

      // 75% → 100%: Gradient overlay fades in, supporting copy appears
      tl.to('.hero-gradient-overlay', {
        opacity: 1,
        duration: 0.3,
      })
      tl.from(
        '.hero-copy',
        {
          opacity: 0,
          y: 20,
          duration: 0.25,
        },
        '-=0.15'
      )
    },
    { scope: containerRef }
  )

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen bg-[var(--brand-primary)] flex flex-col items-center justify-center px-8 text-center overflow-hidden"
    >
      {/* Gradient overlay — animated from opacity 0 → 1 */}
      <div
        className="hero-gradient-overlay absolute inset-0 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-dark)]"
        style={{ opacity: 0 }}
      />

      {/* Content sits above overlay */}
      <div className="relative z-10">
        {/* Headline — split into words */}
        <h1 className="text-4xl md:text-5xl lg:text-[52px] font-bold text-white mb-12">
          {headlineWords.map((word, i) => (
            <span key={i} className="hero-word inline-block mr-3" style={{ opacity: 0 }}>
              {word}
            </span>
          ))}
        </h1>

        {/* CTA button */}
        <div className="hero-cta mb-6" style={{ opacity: 0 }}>
          <Button
            className="bg-[var(--brand-secondary)] text-white hover:bg-[var(--brand-secondary)]/90"
            size="lg"
            nativeButton={false}
            render={<Link href="/login" />}
          >
            Start Now
          </Button>
        </div>

        {/* Subtitle */}
        <p className="hero-subtitle text-white/80 text-lg mb-16" style={{ opacity: 0 }}>
          Your free modernisation journey
        </p>

        {/* Phase icons row */}
        <div className="flex flex-wrap items-center justify-center gap-8">
          {phases.map((phase, i) => (
            <div
              key={phase.name}
              className={`hero-phase-${i} flex items-center gap-2`}
              style={{ opacity: 0 }}
            >
              <Image
                src={phase.icon}
                alt={phase.name}
                width={48}
                height={48}
                className="h-12 w-12"
                priority
              />
              <span className="font-semibold text-lg" style={{ color: phase.color }}>
                {phase.name}
              </span>
            </div>
          ))}
        </div>

        {/* Supporting copy */}
        <p className="hero-copy text-white/70 text-base max-w-2xl mx-auto mt-12" style={{ opacity: 0 }}>
          In today&apos;s world, modern IT isn&apos;t optional — we guide you through IT modernisation
          with simplicity, clarity and security, keeping your business resilient and future ready.
        </p>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify the component compiles**

Check for syntax errors:

```bash
npx tsc --noEmit 2>&1 | head -20
```

The component isn't imported anywhere yet, so this just validates types. Any existing errors are unrelated.

- [ ] **Step 3: Commit**

```bash
git add src/components/animated-hero.tsx
git commit -m "feat: add AnimatedHero with GSAP ScrollTrigger pinned scroll-scrub"
```

---

## Task 5: Update Logo Sizes

**Files:**
- Modify: `src/components/public-header.tsx`
- Modify: `src/components/public-footer.tsx`

- [ ] **Step 1: Update public-header.tsx logos**

Three logo instances to change:

1. **Desktop logo** (line 39–41): `width={160} height={40} className="h-10 w-auto"` → `width={112} height={28} className="h-7 w-auto"`
2. **Mobile sheet logo** (line 94–98): `width={140} height={35} className="h-9 w-auto"` → `width={96} height={24} className="h-6 w-auto"`

- [ ] **Step 2: Update public-footer.tsx logo**

1. **Footer logo** (line 12–16): `width={160} height={40} className="h-10 w-auto"` → `width={112} height={28} className="h-7 w-auto"`

- [ ] **Step 3: Verify visually**

Start dev server, navigate to homepage, confirm logos are visibly smaller but still crisp. Check both desktop header, mobile sheet (resize browser), and footer.

- [ ] **Step 4: Commit**

```bash
git add src/components/public-header.tsx src/components/public-footer.tsx
git commit -m "style: shrink logo from h-10 to h-7 (desktop) and h-9 to h-6 (mobile)"
```

---

## Task 6: Update Spacing — Footer and CTA Banner

**Files:**
- Modify: `src/components/public-footer.tsx`
- Modify: `src/components/cta-banner.tsx`

These are standalone components, so we can update spacing + add ScrollReveal without touching pages.

- [ ] **Step 1: Update public-footer.tsx spacing**

Current line 7:
```tsx
<div className="mx-auto max-w-7xl px-6 py-12 md:px-12 lg:px-16">
```
Change to:
```tsx
<div className="mx-auto max-w-7xl px-8 py-24 md:px-16 lg:px-24">
```

Current line 8:
```tsx
<div className="grid grid-cols-1 gap-8 md:grid-cols-4">
```
Change to:
```tsx
<div className="grid grid-cols-1 gap-16 md:grid-cols-4">
```

Current line 77:
```tsx
<div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:flex-row">
```
Change to:
```tsx
<div className="mt-24 flex flex-col items-center justify-between gap-8 border-t border-white/10 pt-16 md:flex-row">
```

Also in the footer column internals, change `gap-3` to `gap-6`, `gap-2` to `gap-4`, `gap-4` to `gap-8`.

- [ ] **Step 2: Update cta-banner.tsx — add ScrollReveal wrapper and double spacing**

The CTA banner becomes a client component. Add `'use client'` directive. Wrap the inner content in `<ScrollReveal>`.

Updated `cta-banner.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ScrollReveal } from '@/components/scroll-reveal'

interface CTABannerProps {
  heading?: string
  subheading?: string
  buttonText?: string
  buttonHref?: string
}

export function CTABanner({
  heading = 'Ready to Modernise Your IT?',
  subheading = 'Start your free modernisation journey today',
  buttonText = 'Start Now',
  buttonHref = '/login',
}: CTABannerProps) {
  return (
    <section className="bg-[var(--brand-primary)] py-32 px-8 text-center">
      <ScrollReveal>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">{heading}</h2>
        <p className="text-lg text-white/80 mb-16">{subheading}</p>
        <Button
          className="bg-[var(--brand-secondary)] text-white hover:bg-[var(--brand-secondary)]/90"
          size="lg"
          nativeButton={false}
          render={<Link href={buttonHref} />}
        >
          {buttonText}
        </Button>
      </ScrollReveal>
    </section>
  )
}
```

Key changes: `py-16` → `py-32`, `px-6` → `px-8`, `mb-4` → `mb-8`, `mb-8` → `mb-16`, wrapped content in `<ScrollReveal>`, added `'use client'` + import.

- [ ] **Step 3: Commit**

```bash
git add src/components/public-footer.tsx src/components/cta-banner.tsx
git commit -m "style: double spacing in footer and CTA banner, add scroll reveal to CTA"
```

---

## Task 7: Update Journey Section with ScrollReveal and Spacing

**Files:**
- Modify: `src/components/journey-section.tsx`

- [ ] **Step 1: Add 'use client' and ScrollReveal import**

The journey section needs to become a client component to use ScrollReveal. Add at the top:
```tsx
'use client'
```
And add import:
```tsx
import { ScrollReveal } from '@/components/scroll-reveal'
```

- [ ] **Step 2: Update spacing and wrap sub-sections**

Updated component (full replacement):

```tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from '@carbon/icons-react'
import { Button } from '@/components/ui/button'
import { ScrollReveal } from '@/components/scroll-reveal'

const phases = [
  {
    name: 'Operate',
    icon: '/phases/operate.svg',
    color: 'var(--phase-operate)',
    description: 'Establish a stable IT foundation with proactive monitoring and management.',
  },
  {
    name: 'Secure',
    icon: '/phases/secure.svg',
    color: 'var(--phase-secure)',
    description: 'Protect your business with enterprise-grade security tailored for SMBs.',
  },
  {
    name: 'Streamline',
    icon: '/phases/streamline.svg',
    color: 'var(--phase-streamline)',
    description: 'Optimise workflows and eliminate inefficiencies across your IT stack.',
  },
  {
    name: 'Accelerate',
    icon: '/phases/accelerate.svg',
    color: 'var(--phase-accelerate)',
    description: 'Drive innovation and growth with advanced technology solutions.',
  },
]

const values = [
  {
    heading: 'Enterprise Solutions',
    description: 'Access enterprise-grade IT without the enterprise price tag.',
  },
  {
    heading: 'Guided Journey',
    description: 'Step-by-step modernisation with expert support at every stage.',
  },
  {
    heading: 'Strategic Partnership',
    description: 'A dedicated IT partner invested in your long-term success.',
  },
]

export function JourneySection() {
  return (
    <section className="py-32 px-8 md:px-16 lg:px-24 bg-white text-center">
      {/* Phase lockups row — staggered reveal */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
        {phases.map((phase, index) => (
          <ScrollReveal key={phase.name} delay={index * 0.1}>
            <div className="flex items-center gap-8 md:gap-16">
              <div className="flex items-center gap-4">
                <Image src={phase.icon} alt={phase.name} width={48} height={48} className="h-12 w-12" />
                <span className="font-semibold text-lg" style={{ color: phase.color }}>
                  {phase.name}
                </span>
              </div>
              {index < phases.length - 1 && (
                <ArrowRight size={24} className="hidden md:block text-gray-400" />
              )}
            </div>
          </ScrollReveal>
        ))}
      </div>

      {/* Phase descriptions grid — staggered reveal */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mt-24 max-w-6xl mx-auto">
        {phases.map((phase, index) => (
          <ScrollReveal key={phase.name} delay={index * 0.1}>
            <div
              className="text-left rounded-lg p-10"
              style={{ borderTop: `4px solid ${phase.color}` }}
            >
              <h3 className="font-bold mb-4">{phase.name}</h3>
              <p className="text-sm text-muted-foreground">{phase.description}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>

      {/* Value strip — fade up */}
      <ScrollReveal className="mt-24">
        <div className="bg-white shadow-md rounded-lg p-12 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            {values.map((value) => (
              <div key={value.heading} className="text-center">
                <h4 className="font-bold mb-4">{value.heading}</h4>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* CTA — scale reveal */}
      <ScrollReveal className="mt-24">
        <Button
          className="bg-[var(--brand-secondary)] text-white hover:bg-[var(--brand-secondary)]/90"
          size="lg"
          nativeButton={false}
          render={<Link href="/login" />}
        >
          Start Your Journey
        </Button>
      </ScrollReveal>
    </section>
  )
}
```

Key spacing changes: `py-16` → `py-32`, `px-6 md:px-12 lg:px-16` → `px-8 md:px-16 lg:px-24`, `gap-4 md:gap-8` → `gap-8 md:gap-16`, `gap-6` → `gap-12`, `mt-12` → `mt-24`, `p-6` → `p-10`, `p-8` → `p-12`, `gap-8` → `gap-16`, `mb-2` → `mb-4`.

- [ ] **Step 3: Commit**

```bash
git add src/components/journey-section.tsx
git commit -m "feat: add scroll reveal animations and double spacing to journey section"
```

---

## Task 8: Update Homepage (page.tsx)

**Files:**
- Modify: `src/app/(public)/page.tsx`
- Delete: `src/components/hero.tsx`

- [ ] **Step 1: Delete the old hero.tsx**

```bash
rm src/components/hero.tsx
```

- [ ] **Step 2: Replace Hero import with AnimatedHero, add ScrollReveal, update spacing**

The homepage stays as a server component (async data fetching). AnimatedHero and ScrollReveal are client components that accept children.

Updated `page.tsx`:

```tsx
import { AnimatedHero } from '@/components/animated-hero'
import { JourneySection } from '@/components/journey-section'
import { BlogCard } from '@/components/blog-card'
import { TestimonialCard } from '@/components/testimonial-card'
import { CTABanner } from '@/components/cta-banner'
import { ScrollReveal } from '@/components/scroll-reveal'
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
      <AnimatedHero />
      <JourneySection />

      {/* Blog Highlights */}
      <section className="py-32 px-8 md:px-16 lg:px-24 bg-white">
        <ScrollReveal>
          <h2 className="text-center text-3xl font-bold text-[var(--brand-dark)] mb-4">Latest Insights</h2>
          <p className="text-center text-muted-foreground mb-20">Expert advice on IT modernisation</p>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 max-w-6xl mx-auto">
          {(posts as BlogPost[] ?? []).map((post, index) => (
            <ScrollReveal key={post.id} delay={index * 0.15}>
              <BlogCard post={post} />
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 px-8 md:px-16 lg:px-24 bg-[var(--brand-dark)]">
        <ScrollReveal>
          <h2 className="text-center text-3xl font-bold text-white mb-4">What Our Clients Say</h2>
          <p className="text-center text-white/60 mb-20">Trusted by businesses across industries</p>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 max-w-6xl mx-auto">
          {(testimonials as Testimonial[] ?? []).map((t, index) => (
            <ScrollReveal key={t.id} delay={index * 0.15}>
              <TestimonialCard testimonial={t} />
            </ScrollReveal>
          ))}
        </div>
      </section>

      <CTABanner />
    </>
  )
}
```

Key changes: `Hero` → `AnimatedHero`, `py-16` → `py-32`, `px-6 md:px-12 lg:px-16` → `px-8 md:px-16 lg:px-24`, `gap-6` → `gap-12`, `mb-2` → `mb-4`, `mb-10` → `mb-20`, added `<ScrollReveal>` wrappers with stagger delays on cards.

- [ ] **Step 3: Verify homepage renders**

Start dev server, navigate to `http://localhost:3001/`. Verify:
- Animated hero pins and scrubs on scroll
- Journey section reveals on scroll with stagger
- Blog cards stagger in
- Testimonial cards stagger in
- CTA banner fades in
- Zero console errors

- [ ] **Step 4: Commit**

```bash
git rm src/components/hero.tsx
git add src/app/\(public\)/page.tsx
git commit -m "feat: integrate AnimatedHero and ScrollReveal on homepage, double spacing"
```

---

## Task 9: Update Blog Listing Page

**Files:**
- Modify: `src/app/(public)/blog/page.tsx`

- [ ] **Step 1: Replace inline hero with PageHero, add ScrollReveal, update spacing**

The blog page stays as a server component. Replace the inline `<section>` hero with the `<PageHero>` client component. Wrap content sections in `<ScrollReveal>`.

Changes to make:

1. Add imports at top:
```tsx
import { PageHero } from '@/components/page-hero'
import { ScrollReveal } from '@/components/scroll-reveal'
```

2. Replace the hero section (lines 58–63):
```tsx
{/* OLD */}
<section className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-dark)] py-16 px-6 text-center">
  <h1 className="text-4xl font-bold text-white mb-4">Blog</h1>
  <p className="text-white/80 text-lg">Expert insights on IT modernisation</p>
</section>
```
With:
```tsx
<PageHero title="Blog" subtitle="Expert insights on IT modernisation" />
```

3. Update the content wrapper spacing (line 66):
```tsx
{/* OLD */}
<div className="max-w-6xl mx-auto px-6 py-8">
```
To:
```tsx
<div className="max-w-6xl mx-auto px-8 py-16">
```

4. Update filter pills gap (line 67): `gap-2 mb-10` → `gap-4 mb-20`

5. Wrap featured post in `<ScrollReveal>`: `<ScrollReveal>` around the `<Link>` for the featured post, change `mb-12` → `mb-24`

6. Wrap the post grid in `<ScrollReveal>`, update grid gap: `gap-8` → `gap-12`. Wrap each `<BlogCard>` in `<ScrollReveal delay={index * 0.1}>`:
```tsx
{remaining.length > 0 && (
  <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
    {remaining.map((post, index) => (
      <ScrollReveal key={post.id} delay={index * 0.1}>
        <BlogCard post={post} />
      </ScrollReveal>
    ))}
  </div>
)}
```

- [ ] **Step 2: Verify blog page renders**

Navigate to `/blog`. Verify: 100vh hero with fade-in title, pills visible, featured post slides up, grid cards stagger in.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(public\)/blog/page.tsx
git commit -m "feat: add PageHero and ScrollReveal to blog listing, double spacing"
```

---

## Task 10: Update Blog Post Page

**Files:**
- Modify: `src/app/(public)/blog/[slug]/page.tsx`

- [ ] **Step 1: Add ScrollReveal to content sections, update spacing**

This page has a cover image hero (not a gradient hero), so no PageHero needed. Just wrap content sections in ScrollReveal and double spacing.

Add import:
```tsx
import { ScrollReveal } from '@/components/scroll-reveal'
```

Changes:

1. Cover image height: `h-64 md:h-80` → `h-80 md:h-[480px]` (taller, more dramatic)

2. Article wrapper: `px-6 py-12` → `px-8 py-24`

3. Title margin: `mb-4` → `mb-8`

4. Meta row margin: `mb-8` → `mb-16`

5. Wrap the article content in ScrollReveal:
```tsx
<ScrollReveal>
  <article className="max-w-3xl mx-auto px-8 py-24">
    <h1 className="text-3xl md:text-4xl font-bold mb-8">{post.title}</h1>
    <div className="flex items-center gap-8 mb-16">
      {/* ... meta row ... */}
    </div>
    <div
      className="prose prose-lg max-w-3xl mx-auto"
      dangerouslySetInnerHTML={{ __html: post.content ?? '' }}
    />
  </article>
</ScrollReveal>
```

6. Meta row inner gap: `gap-4` → `gap-8`

- [ ] **Step 2: Verify blog post page**

Navigate to `/blog/<any-slug>`. Verify content fades in on scroll, spacing is generous.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(public\)/blog/\[slug\]/page.tsx
git commit -m "feat: add ScrollReveal and double spacing to blog post page"
```

---

## Task 11: Update About Page

**Files:**
- Modify: `src/app/(public)/about/page.tsx`

- [ ] **Step 1: Replace inline hero with PageHero, add ScrollReveal, update spacing**

Add imports:
```tsx
import { PageHero } from '@/components/page-hero'
import { ScrollReveal } from '@/components/scroll-reveal'
```

Replace the hero section (lines 8–11):
```tsx
<PageHero title="About IThealth" subtitle="Your IT Modernisation Champions" />
```

Update mission section:
- Section: `py-16 px-6 md:px-12` → `py-32 px-8 md:px-16`
- Grid gap: `gap-12` stays (already doubled)
- Wrap left text column in `<ScrollReveal direction="left">`, wrap right image placeholder in `<ScrollReveal direction="right">`
- Text margins: `mb-2` → `mb-4`, `mb-4` → `mb-8`

Update values section:
- Section: `py-16 px-6 md:px-12` → `py-32 px-8 md:px-16`
- Heading margin: `mb-10` → `mb-20`
- Grid gap: `gap-8` → `gap-12`
- Wrap each value card in `<ScrollReveal delay={index * 0.15}>`
- Card padding: `p-8` → `p-12`
- Icon margin: `mt-4 mb-2` → `mt-8 mb-4`

The about page currently is a server component (no 'use client'). It can STAY as a server component because ScrollReveal and PageHero are both client components that accept children as props — server components can render client components.

- [ ] **Step 2: Verify about page**

Navigate to `/about`. Verify: 100vh hero, mission text slides from left, image from right, values cards stagger in.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(public\)/about/page.tsx
git commit -m "feat: add PageHero and ScrollReveal to about page, double spacing"
```

---

## Task 12: Update Contact Page

**Files:**
- Modify: `src/app/(public)/contact/page.tsx`

- [ ] **Step 1: Replace inline hero with PageHero, add ScrollReveal, update spacing**

Add imports:
```tsx
import { PageHero } from '@/components/page-hero'
import { ScrollReveal } from '@/components/scroll-reveal'
```

Replace the hero section (lines 52–55):
```tsx
<PageHero title="Contact Us" subtitle="Get in touch with our team" />
```

Update contact content section:
- Section: `py-16 px-6 md:px-12` → `py-32 px-8 md:px-16`
- Grid gap: `gap-12` stays
- Wrap form in `<ScrollReveal direction="left">`
- Wrap contact info card in `<ScrollReveal direction="right">`
- Form field spacing: `space-y-5` → `space-y-8`
- Contact info card: `p-8` → `p-12`, `mb-6` → `mb-12`, `space-y-5` → `space-y-8`
- Contact info bottom section: `mt-8 pt-6` → `mt-16 pt-12`, `mb-4` → `mb-8`

- [ ] **Step 2: Verify contact page**

Navigate to `/contact`. Verify: 100vh hero, form slides from left, info card from right, generous spacing.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(public\)/contact/page.tsx
git commit -m "feat: add PageHero and ScrollReveal to contact page, double spacing"
```

---

## Task 13: Update Partners Page

**Files:**
- Modify: `src/app/(public)/partners/page.tsx`

- [ ] **Step 1: Replace inline hero with PageHero, add ScrollReveal, update spacing**

Add imports:
```tsx
import { PageHero } from '@/components/page-hero'
import { ScrollReveal } from '@/components/scroll-reveal'
```

Replace the hero section (lines 92–95):
```tsx
<PageHero title="Our Partners" subtitle="Trusted technology partnerships" />
```

Update partner grid section:
- Section: `py-16 px-6` → `py-32 px-8`
- Grid gap: `gap-6` → `gap-12`
- Wrap each partner card in `<ScrollReveal delay={index * 0.1}>`
- Card padding: `p-6` → `p-10`
- Card inner spacing: `mb-3` → `mb-6`

Update "Become a Partner" section:
- Section: `py-16 px-6` → `py-32 px-8`
- Heading margin: `mb-10` → `mb-20`
- Benefits grid gap: `gap-6 mb-16` → `gap-12 mb-24`
- Wrap each benefit card in `<ScrollReveal delay={index * 0.15}>`
- Benefit card padding: `p-6` → `p-10`
- Benefit card inner: `mb-3` → `mb-6`, `mb-2` → `mb-4`
- Application form: wrap in `<ScrollReveal>`, `space-y-5` → `space-y-8`

- [ ] **Step 2: Verify partners page**

Navigate to `/partners`. Verify: 100vh hero, partner cards stagger in, benefits stagger in, form fades up.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(public\)/partners/page.tsx
git commit -m "feat: add PageHero and ScrollReveal to partners page, double spacing"
```

---

## Task 14: Add ScrollReveal to Footer

**Files:**
- Modify: `src/components/public-footer.tsx`

- [ ] **Step 1: Make footer a client component and wrap content in ScrollReveal**

Add at top of file:
```tsx
'use client'
```

Add import:
```tsx
import { ScrollReveal } from '@/components/scroll-reveal'
```

Wrap the entire footer inner content (`<div className="mx-auto max-w-7xl ...">`) in `<ScrollReveal direction="none">` for a subtle fade-in without slide.

- [ ] **Step 2: Verify footer animates**

Scroll to bottom of any page, confirm footer fades in subtly.

- [ ] **Step 3: Commit**

```bash
git add src/components/public-footer.tsx
git commit -m "feat: add subtle scroll reveal to footer"
```

---

## Task 15: Full Visual QA and Fix

**Files:**
- Potentially any modified file

- [ ] **Step 1: Start dev server and open Chrome DevTools**

```bash
cd /Users/futuvara/Documents/Claude/Projects/IThealth.ai
npm run dev -- --port 3001
```

Navigate to `http://localhost:3001/`

- [ ] **Step 2: Check homepage end-to-end**

Verify:
- Hero pins on scroll and plays the full sequence (words → CTA → phases → gradient → copy)
- Hero releases pin and journey section follows naturally
- Journey phase lockups stagger in left-to-right
- Phase description cards stagger in
- Value strip fades up
- "Start Your Journey" CTA fades up
- Blog cards stagger in (0.15s between each)
- Testimonial cards stagger in
- CTA banner fades up
- Footer fades in
- All spacing is doubled (generous white space)
- Logo is smaller (h-7)
- Zero console errors

- [ ] **Step 3: Check all inner pages**

Navigate to each page and verify:
- `/blog` — 100vh hero with fade-in title, filter pills, featured post slides up, grid staggers
- `/blog/<slug>` — Cover image, content fades in, doubled spacing
- `/about` — 100vh hero, mission section left/right reveal, values stagger
- `/contact` — 100vh hero, form from left, card from right
- `/partners` — 100vh hero, partner grid staggers, benefits stagger, form fades

- [ ] **Step 4: Check mobile responsive**

Resize browser to ~375px width. Verify:
- Mobile header hamburger still works, logo is h-6
- Hero still works (may not pin on mobile — that's OK, GSAP ScrollTrigger handles this)
- Sections stack vertically
- No horizontal overflow

- [ ] **Step 5: Fix any issues found**

If console errors, layout breaks, or animation glitches are found, fix them. Common issues:
- GSAP class selectors not scoped (already using `scope: containerRef`)
- Motion SSR hydration mismatch (initial styles set inline prevent this)
- ScrollReveal margin too aggressive on mobile (the `-100px` margin is fine)

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "fix: visual QA fixes for animation overhaul"
```

Only if there were actual fixes. Skip this step if everything passed clean.

---

## Summary

| Task | Component | What |
|------|-----------|------|
| 1 | Dependencies | Install gsap, @gsap/react, motion |
| 2 | ScrollReveal | Create reusable scroll-triggered reveal wrapper |
| 3 | PageHero | Create inner page 100vh hero with Motion entrance |
| 4 | AnimatedHero | Create homepage pinned scroll-scrub hero with GSAP |
| 5 | Logos | Shrink all logos (h-10→h-7, h-9→h-6) |
| 6 | Footer + CTA | Double spacing, add ScrollReveal to CTA |
| 7 | Journey Section | Double spacing, add ScrollReveal to all sub-sections |
| 8 | Homepage | Integrate AnimatedHero + ScrollReveal, double spacing |
| 9 | Blog Listing | PageHero + ScrollReveal, double spacing |
| 10 | Blog Post | ScrollReveal on content, double spacing |
| 11 | About | PageHero + ScrollReveal, double spacing |
| 12 | Contact | PageHero + ScrollReveal, double spacing |
| 13 | Partners | PageHero + ScrollReveal, double spacing |
| 14 | Footer | Add subtle scroll reveal |
| 15 | Visual QA | Full end-to-end visual verification |
