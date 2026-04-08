'use client'

import { useRef } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { Button } from '@/components/ui/button'

gsap.registerPlugin(ScrollTrigger)

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
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 80%',
          once: true,
        },
      })

      gsap.set('.cta-heading', { y: 40, opacity: 0 })
      gsap.set('.cta-sub', { y: 30, opacity: 0 })
      gsap.set('.cta-btn', { scale: 0.8, opacity: 0 })

      tl.to('.cta-heading', {
        y: 0,
        opacity: 1,
        duration: 0.6,
        ease: 'power3.out',
      })
        .to(
          '.cta-sub',
          { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' },
          '-=0.3'
        )
        .to(
          '.cta-btn',
          { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' },
          '-=0.2'
        )
    },
    { scope: containerRef }
  )

  return (
    <section ref={containerRef} className="bg-[var(--brand-primary)] py-36 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        <h2 className="cta-heading text-3xl md:text-4xl font-light text-white mb-8">
          {heading}
        </h2>
        <p className="cta-sub text-lg text-white/80 mb-16">{subheading}</p>
        <div className="cta-btn inline-block">
          <Button
            className="bg-[var(--brand-secondary)] text-white hover:bg-[var(--brand-secondary)]/90"
            size="lg"
            nativeButton={false}
            render={<Link href={buttonHref} />}
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </section>
  )
}
