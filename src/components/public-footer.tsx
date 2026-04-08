'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { ScrollReveal } from '@/components/scroll-reveal'
import { supabase } from '@/lib/supabase-client'

export function PublicFooter() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    const companyId = process.env.NEXT_PUBLIC_DEFAULT_COMPANY_ID
    if (!companyId) return
    supabase
      .from('company_branding')
      .select('logo_light_url')
      .eq('company_id', companyId)
      .maybeSingle()
      .then(({ data }: { data: { logo_light_url: string | null } | null }) => { if (data?.logo_light_url) setLogoUrl(data.logo_light_url) })
  }, [])

  return (
    <footer className="bg-[var(--brand-footer)] text-white">
      <ScrollReveal direction="none">
      <div className="mx-auto max-w-7xl px-8 py-24 md:px-16 lg:px-24">
        <div className="grid grid-cols-1 gap-16 md:grid-cols-4">
          {/* Column 1: Logo & tagline */}
          <div className="flex flex-col gap-8">
            <Image
              src={logoUrl ?? '/logos/ithealth-logo-white.svg'}
              alt="Logo"
              width={112}
              height={28}
              className="h-7 w-auto"
              style={{ height: 'auto' }}
            />
            <p className="text-sm text-white/70">
              Your IT Modernisation Champions
            </p>
          </div>

          {/* Column 2: Resources */}
          <div className="flex flex-col gap-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50">
              Resources
            </h3>
            <nav className="flex flex-col gap-4">
              <Link href="/blog" className="text-sm text-white/70 hover:text-white">
                Blog
              </Link>
              <Link href="/about" className="text-sm text-white/70 hover:text-white">
                About Us
              </Link>
              <Link href="/contact" className="text-sm text-white/70 hover:text-white">
                Contact
              </Link>
              <Link href="/partners" className="text-sm text-white/70 hover:text-white">
                Partners
              </Link>
            </nav>
          </div>

          {/* Column 3: Journey */}
          <div className="flex flex-col gap-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50">
              Journey
            </h3>
            <div className="flex flex-col gap-4">
              <span className="text-sm text-white/70">Operate</span>
              <span className="text-sm text-white/70">Secure</span>
              <span className="text-sm text-white/70">Streamline</span>
              <span className="text-sm text-white/70">Accelerate</span>
            </div>
          </div>

          {/* Column 4: Get Started */}
          <div className="flex flex-col gap-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50">
              Get Started
            </h3>
            <nav className="flex flex-col gap-4">
              <Link href="/login" className="text-sm text-white/70 hover:text-white">
                Login
              </Link>
              <Link href="/login" className="text-sm text-white/70 hover:text-white">
                Start Now
              </Link>
              <Link href="/contact" className="text-sm text-white/70 hover:text-white">
                Contact Us
              </Link>
            </nav>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-24 flex flex-col items-center justify-between gap-8 border-t border-white/10 pt-16 md:flex-row">
          <p className="text-sm text-white/50">
            &copy; {new Date().getFullYear()} All rights reserved.
          </p>
          <div className="flex gap-6">
            <span className="text-sm text-white/50">Privacy Policy</span>
            <span className="text-sm text-white/50">Terms of Service</span>
          </div>
        </div>
      </div>
      </ScrollReveal>
    </footer>
  )
}
