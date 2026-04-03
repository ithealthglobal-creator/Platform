import Link from 'next/link'
import { Button } from '@/components/ui/button'

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
    <section className="bg-[var(--brand-primary)] py-16 px-6 text-center">
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{heading}</h2>
      <p className="text-lg text-white/80 mb-8">{subheading}</p>
      <Button
        className="bg-[var(--brand-secondary)] text-white hover:bg-[var(--brand-secondary)]/90"
        size="lg"
        nativeButton={false}
        render={<Link href={buttonHref} />}
      >
        {buttonText}
      </Button>
    </section>
  )
}
