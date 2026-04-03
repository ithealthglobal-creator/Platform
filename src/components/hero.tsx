import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function Hero() {
  return (
    <section className="bg-[var(--brand-primary)] py-20 md:py-28 px-6 text-center">
      <h1 className="text-4xl md:text-5xl lg:text-[52px] font-bold text-white mb-6">
        Your IT Modernisation Champions
      </h1>
      <Button
        className="bg-[var(--brand-secondary)] text-white hover:bg-[var(--brand-secondary)]/90"
        size="lg"
        nativeButton={false}
        render={<Link href="/login" />}
      >
        Start Now
      </Button>
      <p className="text-white/80 text-lg mt-4">
        Your free modernisation journey
      </p>
      <p className="text-white/70 text-base max-w-2xl mx-auto mt-4">
        In today&apos;s world, modern IT isn&apos;t optional — we guide you through IT modernisation
        with simplicity, clarity and security, keeping your business resilient and future ready.
      </p>
    </section>
  )
}
