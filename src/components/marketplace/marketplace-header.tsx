import Link from 'next/link'
import Image from 'next/image'
import { getCompanyBranding } from '@/lib/website-content'

const SERVOLU_ID = '00000000-0000-0000-0000-000000000000'

const navLinks = [
  { label: 'Providers', href: '/marketplace/providers' },
  { label: 'Services', href: '/marketplace/services' },
  { label: 'About', href: '/marketplace/about' },
  { label: 'Contact', href: '/marketplace/contact' },
]

export async function MarketplaceHeader() {
  const branding = await getCompanyBranding(SERVOLU_ID)
  const logoUrl = branding?.logo_light_url ?? null

  return (
    <header className="sticky top-0 z-50 w-full bg-gray-950 border-b border-white/10">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 md:px-12 lg:px-16">
        {/* Logo */}
        <Link href="/marketplace" className="flex items-center gap-3">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="Servolu Marketplace"
              width={120}
              height={30}
              className="h-7 w-auto"
              style={{ width: 'auto' }}
              priority
            />
          ) : (
            <span className="text-lg font-semibold text-white tracking-tight">
              Servolu
              <span className="ml-2 text-xs font-normal bg-white/15 text-white/80 px-2 py-0.5 rounded-full">
                Marketplace
              </span>
            </span>
          )}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-light text-white/70 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
