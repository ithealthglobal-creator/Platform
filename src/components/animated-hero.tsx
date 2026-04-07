'use client'

import { useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import gsap from 'gsap'
import { ChevronRight } from '@carbon/icons-react'
import { useGSAP } from '@gsap/react'
import { Button } from '@/components/ui/button'

const headlineLines = [
  { text: 'Your IT', className: 'text-5xl md:text-6xl lg:text-7xl' },
  { text: 'Modernisation', className: 'text-5xl md:text-6xl lg:text-7xl' },
  { text: 'Champions', className: 'text-5xl md:text-6xl lg:text-7xl' },
]

export function AnimatedHero() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const tl = gsap.timeline({ delay: 0.2 })

      gsap.set('.hero-badge', { y: 20 })
      gsap.set('.hero-line', { y: 30 })
      gsap.set('.hero-desc', { y: 20 })
      gsap.set('.hero-cta', { scale: 0.5 })

      // Badge fades in
      tl.to('.hero-badge', {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: 'power2.out',
      })

      // Headline lines fade in one by one
      tl.to('.hero-line', {
        opacity: 1,
        y: 0,
        stagger: 0.15,
        duration: 0.5,
        ease: 'power2.out',
      })

      // Description fades in
      tl.to('.hero-desc', {
        opacity: 1,
        y: 0,
        duration: 0.4,
      }, '-=0.2')

      // CTA button scales up
      tl.to('.hero-cta', {
        scale: 1,
        opacity: 1,
        duration: 0.5,
        ease: 'back.out(1.7)',
      }, '-=0.2')
    },
    { scope: containerRef }
  )

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen bg-[var(--brand-primary)] flex flex-col justify-center overflow-hidden"
    >
      {/* Hero person image — right-aligned, 80% height */}
      <div className="absolute right-0 bottom-0 h-[95%] w-auto">
        <Image
          src="/images/hero-person.png"
          alt=""
          width={1024}
          height={1024}
          className="h-full w-auto object-contain object-right-bottom"
          priority
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full px-6 md:px-12 lg:px-16">
        {/* Badge */}
        <div className="hero-badge mb-8" style={{ opacity: 0 }}>
          <span className="inline-block text-sm font-light text-white/70">
            Designed for small and medium size businesses
          </span>
        </div>

        {/* Headline — 3 lines */}
        <h1 className="font-bold text-white mb-8 text-left">
          {headlineLines.map((line, i) => (
            <span key={i} className={`hero-line block ${line.className} leading-tight`} style={{ opacity: 0 }}>
              {line.text}
            </span>
          ))}
        </h1>

        {/* Description */}
        <p className="hero-desc text-white/80 text-base max-w-lg mb-10" style={{ opacity: 0 }}>
          We help small and medium-sized businesses grow stronger, smarter, and more
          successful by modernising their IT, from core IT infrastructure to advanced
          digital platforms.
        </p>

        {/* CTA button */}
        <div className="hero-cta" style={{ opacity: 0 }}>
          <Button
            className="bg-[var(--brand-secondary)] text-white hover:bg-[var(--brand-secondary)]/90 px-8 py-4 text-lg gap-2"
            size="lg"
            nativeButton={false}
            render={<Link href="/get-started" />}
          >
            Get started
            <ChevronRight size={20} />
          </Button>
        </div>
      </div>
    </section>
  )
}
