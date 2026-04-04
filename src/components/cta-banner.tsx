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
