'use client'

import { useRef } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { Button } from '@/components/ui/button'
import { AnimatedImage } from '@/components/animated-image'

gsap.registerPlugin(ScrollTrigger)

const phases = [
  {
    name: 'Operate',
    icon: '/phases/operate.svg',
    design: '/phases/operate-design.svg',
    color: 'var(--phase-operate)',
    description: 'Establish a stable IT foundation with proactive monitoring and management.',
  },
  {
    name: 'Secure',
    icon: '/phases/secure.svg',
    design: '/phases/secure-design.svg',
    color: 'var(--phase-secure)',
    description: 'Protect your business with enterprise-grade security tailored for SMBs.',
  },
  {
    name: 'Streamline',
    icon: '/phases/streamline.svg',
    design: '/phases/streamline-design.svg',
    color: 'var(--phase-streamline)',
    description: 'Optimise workflows and eliminate inefficiencies across your IT stack.',
  },
  {
    name: 'Accelerate',
    icon: '/phases/accelerate.svg',
    design: '/phases/accelerate-design.svg',
    color: 'var(--phase-accelerate)',
    description: 'Drive innovation and growth with advanced technology solutions.',
  },
]

export function JourneySection() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      // Animate phase nav bar
      gsap.set('.phase-icon-grid', { y: 30, opacity: 0, scale: 0.95 })
      gsap.to('.phase-icon-grid', {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.6,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.phase-icon-grid',
          start: 'top 80%',
          once: true,
        },
      })

      // Animate phase cards with stagger
      gsap.set('.phase-card', { y: 40, opacity: 0 })
      gsap.to('.phase-card', {
        y: 0,
        opacity: 1,
        stagger: 0.1,
        duration: 0.6,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.phase-card-grid',
          start: 'top 80%',
          once: true,
        },
      })

      // CTA button pulse
      gsap.set('.journey-cta', { opacity: 0, y: 30 })
      gsap.to('.journey-cta', {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.journey-cta',
          start: 'top 85%',
          once: true,
        },
      })
    },
    { scope: containerRef }
  )

  return (
    <section ref={containerRef} className="py-36 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        {/* Platform intro */}
        <div className="journey-intro">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--phase-operate)] mb-4">
            The IT Modernisation Platform
          </p>
          <h2 className="text-3xl md:text-4xl font-extralight text-[var(--brand-dark)] mb-6 max-w-3xl">
            Your entire modernisation journey, one platform
          </h2>
          <p className="text-lg font-light text-muted-foreground max-w-2xl mb-16">
            From assessments and guided learning to service delivery and progress tracking — everything you need to modernise your IT, step by step.
          </p>
        </div>

        {/* Platform screenshot with rotation */}
        <div className="mb-24">
          <AnimatedImage
            src="/images/partner-dashboard.png"
            alt="IThealth partner dashboard showing IT maturity score, phase breakdown, skill profile, and recommended services"
            width={1400}
            height={900}
            rotate={-1}
            priority
          />
        </div>

        {/* Phase navigation bar */}
        <div className="phase-icon-grid mb-16">
          <div className="mx-auto flex items-center justify-center gap-0 rounded-full border border-slate-200 bg-white p-1.5 shadow-sm w-fit">
            {phases.map((phase) => (
              <div
                key={`icon-${phase.name}`}
                className="phase-icon flex items-center gap-2.5 rounded-full px-6 py-3 transition-colors hover:bg-slate-50"
              >
                <img src={phase.icon} alt="" className="h-6 w-6" />
                <span className="text-sm font-medium text-slate-700">{phase.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Phase descriptions grid */}
        <div className="phase-card-grid grid grid-cols-1 md:grid-cols-4 gap-8">
          {phases.map((phase) => (
            <div
              key={`card-${phase.name}`}
              className="phase-card relative rounded-xl bg-white p-8 hover:shadow-lg transition-all duration-300 overflow-hidden border border-slate-100"
            >
              {/* Colored top accent */}
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ backgroundColor: phase.color }} />

              {/* Decorative design element */}
              <img
                src={phase.design}
                alt=""
                className="pointer-events-none absolute -right-2 -bottom-2 h-32 w-32 opacity-[0.06]"
              />

              {/* Colored line divider */}
              <div className="mb-6 h-0.5 w-12 rounded-full" style={{ backgroundColor: phase.color }} />

              <h3 className="text-base font-semibold text-slate-900 mb-3">{phase.name}</h3>
              <p className="text-sm font-light leading-relaxed text-slate-500">{phase.description}</p>
            </div>
          ))}
        </div>

        {/* CTA — centered */}
        <div className="journey-cta mt-24 text-center">
          <Button
            className="bg-[var(--brand-secondary)] text-white hover:bg-[var(--brand-secondary)]/90 px-12 py-5 text-xl h-auto"
            size="lg"
            nativeButton={false}
            render={<Link href="/get-started" />}
          >
            Get Started
          </Button>
          <p className="mt-3 text-sm text-muted-foreground">It&apos;s free — no credit card required</p>
        </div>
      </div>
    </section>
  )
}
