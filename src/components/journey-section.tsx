'use client'

import Image from 'next/image'
import Link from 'next/link'
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

export function JourneySection() {
  return (
    <section className="py-96 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        {/* Platform intro */}
        <ScrollReveal>
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--phase-operate)] mb-4">
            The IT Modernisation Platform
          </p>
          <h2 className="text-3xl md:text-4xl font-light text-[var(--brand-dark)] mb-6 max-w-3xl">
            Your entire modernisation journey, one platform
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mb-16">
            From assessments and guided learning to service delivery and progress tracking — everything you need to modernise your IT, step by step.
          </p>
        </ScrollReveal>

        {/* Platform screenshot */}
        <ScrollReveal className="mb-24">
          <Image
            src="/images/platform-preview.png"
            alt="IThealth platform showing the modernisation journey, academy courses, home dashboard and recommended services"
            width={1400}
            height={900}
            className="w-full h-auto"
            priority
          />
        </ScrollReveal>

        {/* Phase icons row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-6">
          {phases.map((phase, index) => (
            <ScrollReveal key={`icon-${phase.name}`} delay={index * 0.1}>
              <div className="flex items-center justify-center">
                <Image src={phase.icon} alt={phase.name} width={96} height={96} className="h-24 w-24" />
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Phase descriptions grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {phases.map((phase, index) => (
            <ScrollReveal key={`card-${phase.name}`} delay={index * 0.1}>
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

        {/* CTA */}
        <ScrollReveal className="mt-24">
          <Button
            className="bg-[var(--brand-secondary)] text-white hover:bg-[var(--brand-secondary)]/90 px-12 py-5 text-xl h-auto"
            size="lg"
            nativeButton={false}
            render={<Link href="/get-started" />}
          >
            Get Started
          </Button>
          <p className="mt-3 text-sm text-muted-foreground">It&apos;s free — no credit card required</p>
        </ScrollReveal>
      </div>
    </section>
  )
}
