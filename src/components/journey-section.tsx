'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
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
      // Animate journey path section
      gsap.set('.phase-card-grid', { y: 40, opacity: 0 })
      gsap.to('.phase-card-grid', {
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.phase-card-grid',
          start: 'top 80%',
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
            alt="Partner dashboard showing IT maturity score, phase breakdown, skill profile, and recommended services"
            width={1400}
            height={900}
            rotate={-1}
            priority
          />
        </div>

        {/* Journey path section */}
        <div className="phase-card-grid flex flex-col md:flex-row items-start gap-12 md:gap-16">
          {/* Left: text */}
          <div className="flex-1 max-w-lg">
            <h3 className="text-2xl md:text-3xl font-extralight text-[var(--brand-dark)] mb-6">
              Your journey to modernised IT
            </h3>
            <p className="text-base font-light leading-relaxed text-slate-500">
              From Operate&apos;s stable foundations to Secure&apos;s robust protections,
              Streamline&apos;s efficient workflows, and Accelerate&apos;s innovation, each
              phase builds seamlessly guiding businesses toward complete IT
              mastery and enduring digital confidence.
            </p>
          </div>

          {/* Right: ascending path with phase icons */}
          <div className="flex-1 flex justify-center">
            <svg viewBox="0 0 460 380" width="460" height="380" className="overflow-visible">
              {/* Dotted path ascending from bottom-left to top-right */}
              <path
                d="M 100 310 Q 160 290, 190 230 Q 220 170, 280 150 Q 310 140, 340 90 Q 360 50, 400 30"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="2"
                strokeDasharray="6 6"
              />

              {/* Operate — bottom-left, well below the path start */}
              <image href="/phases/operate.svg" x="30" y="300" width="60" height="60" />

              {/* Secure — offset to the right of the path curve */}
              <image href="/phases/secure.svg" x="220" y="200" width="60" height="60" />

              {/* Streamline — offset to the right of the path */}
              <image href="/phases/streamline.svg" x="350" y="60" width="60" height="60" />

              {/* Accelerate — top-right, above the path end */}
              <image href="/phases/accelerate.svg" x="390" y="-30" width="60" height="60" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  )
}
