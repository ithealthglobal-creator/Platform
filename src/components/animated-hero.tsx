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
  { name: 'Operate', icon: '/phases/operate.svg', color: 'var(--phase-operate)', initialOffset: { x: -50 } },
  { name: 'Secure', icon: '/phases/secure.svg', color: 'var(--phase-secure)', initialOffset: { y: 50 } },
  { name: 'Streamline', icon: '/phases/streamline.svg', color: 'var(--phase-streamline)', initialOffset: { x: 50 } },
  { name: 'Accelerate', icon: '/phases/accelerate.svg', color: 'var(--phase-accelerate)', initialOffset: { y: 50 } },
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

      // Set initial positions for phase icons (they start at opacity:0 via inline style)
      phases.forEach((phase, i) => {
        gsap.set(`.hero-phase-${i}`, { ...phase.initialOffset })
      })
      // Set initial offset for hero words
      gsap.set('.hero-word', { y: 30 })
      gsap.set('.hero-cta', { scale: 0.5 })
      gsap.set('.hero-subtitle', { y: 20 })
      gsap.set('.hero-copy', { y: 20 })

      // 0% → 20%: Headline words fade in one by one
      tl.to('.hero-word', {
        opacity: 1,
        y: 0,
        stagger: 0.1,
        duration: 0.3,
      })

      // 20% → 35%: CTA button scales up, subtitle fades in
      tl.to('.hero-cta', {
        scale: 1,
        opacity: 1,
        duration: 0.3,
        ease: 'back.out(1.7)',
      })
      tl.to(
        '.hero-subtitle',
        {
          opacity: 1,
          y: 0,
          duration: 0.2,
        },
        '-=0.1'
      )

      // 35% → 75%: Phase icons animate in one by one
      phases.forEach((phase, i) => {
        tl.to(`.hero-phase-${i}`, {
          opacity: 1,
          x: 0,
          y: 0,
          duration: 0.25,
        })
      })

      // 75% → 100%: Gradient overlay fades in, supporting copy appears
      tl.to('.hero-gradient-overlay', {
        opacity: 1,
        duration: 0.3,
      })
      tl.to(
        '.hero-copy',
        {
          opacity: 1,
          y: 0,
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
