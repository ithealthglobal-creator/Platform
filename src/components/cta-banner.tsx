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
    <section className="bg-[var(--brand-primary)] py-96">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        <ScrollReveal>
          <h2 className="text-3xl md:text-4xl font-light text-white mb-8">{heading}</h2>
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
      </div>
    </section>
  )
}
