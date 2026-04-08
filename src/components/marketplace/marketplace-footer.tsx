import Link from 'next/link'
import Image from 'next/image'
import { getCompanyBranding } from '@/lib/website-content'

const SERVOLU_ID = '00000000-0000-0000-0000-000000000000'

export async function MarketplaceFooter() {
  const branding = await getCompanyBranding(SERVOLU_ID)
  const logoUrl = branding?.logo_light_url ?? null

  return (
    <footer className="bg-gray-950 text-white border-t border-white/10">
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-12 lg:px-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          {/* Column 1: Logo & tagline */}
          <div className="flex flex-col gap-6">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt="Servolu Marketplace"
                width={112}
                height={28}
                className="h-7 w-auto"
                style={{ width: 'auto' }}
              />
            ) : (
              <span className="text-lg font-semibold text-white">Servolu</span>
            )}
            <p className="text-sm text-white/50">
              The IT Modernisation Marketplace. Connect with certified providers and discover services built for your journey.
            </p>
          </div>

          {/* Column 2: Browse */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Browse
            </h3>
            <nav className="flex flex-col gap-3">
              <Link href="/marketplace/providers" className="text-sm text-white/60 hover:text-white transition-colors">
                Providers
              </Link>
              <Link href="/marketplace/services" className="text-sm text-white/60 hover:text-white transition-colors">
                Services
              </Link>
            </nav>
          </div>

          {/* Column 3: Phases */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Phases
            </h3>
            <div className="flex flex-col gap-3">
              <span className="text-sm text-white/60">Operate</span>
              <span className="text-sm text-white/60">Secure</span>
              <span className="text-sm text-white/60">Streamline</span>
              <span className="text-sm text-white/60">Accelerate</span>
            </div>
          </div>

          {/* Column 4: Company */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Company
            </h3>
            <nav className="flex flex-col gap-3">
              <Link href="/marketplace/about" className="text-sm text-white/60 hover:text-white transition-colors">
                About
              </Link>
              <Link href="/marketplace/contact" className="text-sm text-white/60 hover:text-white transition-colors">
                Contact
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:flex-row">
          <p className="text-sm text-white/40">
            &copy; {new Date().getFullYear()} Servolu. All rights reserved.
          </p>
          <div className="flex gap-6">
            <span className="text-sm text-white/40">Privacy Policy</span>
            <span className="text-sm text-white/40">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
