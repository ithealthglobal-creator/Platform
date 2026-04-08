'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Menu, ChevronDown } from '@carbon/icons-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { supabase } from '@/lib/supabase-client'

const resourceLinks = [
  { label: 'Blog', href: '/blog' },
  { label: 'About Us', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Partners', href: '/partners' },
]

export function PublicHeader() {
  const [sheetOpen, setSheetOpen] = useState(false)
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
    <header className="sticky top-0 z-50 w-full bg-[var(--brand-primary)]">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 md:px-12 lg:px-16">
        {/* Logo */}
        <Link href="/">
          <Image
            src={logoUrl ?? '/logos/ithealth-logo-white.svg'}
            alt="Logo"
            width={96}
            height={24}
            className="h-6"
            style={{ width: 'auto' }}
            priority
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/features" className="text-sm font-light text-white hover:text-white/80">
            Features
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-light text-white hover:text-white/80">
              Resources
              <ChevronDown size={16} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8}>
              {resourceLinks.map((link) => (
                <DropdownMenuItem key={link.href}>
                  <Link href={link.href} className="w-full">
                    {link.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            className="bg-white/15 text-white hover:bg-white/25"
            nativeButton={false}
            render={<Link href="/login" />}
          >
            Login
          </Button>

          <Button
            className="bg-[var(--brand-secondary)] text-white hover:bg-[var(--brand-secondary)]/90 px-6 py-3 text-base"
            size="lg"
            nativeButton={false}
            render={<Link href="/get-started" />}
          >
            Get Started
          </Button>
        </nav>

        {/* Mobile hamburger */}
        <div className="md:hidden">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger className="text-white">
              <Menu size={24} />
            </SheetTrigger>
            <SheetContent
              side="right"
              className="bg-[var(--brand-primary)] text-white"
            >
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex flex-col gap-6 p-6">
                <Image
                  src={logoUrl ?? '/logos/ithealth-logo-white.svg'}
                  alt="Logo"
                  width={96}
                  height={24}
                  className="h-6 w-auto"
                  style={{ height: 'auto' }}
                />

                <nav className="flex flex-col gap-4">
                  <Link
                    href="/features"
                    className="text-sm font-medium text-white hover:text-white/80"
                    onClick={() => setSheetOpen(false)}
                  >
                    Features
                  </Link>
                  {resourceLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-sm font-medium text-white hover:text-white/80"
                      onClick={() => setSheetOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>

                <div className="flex flex-col gap-3 pt-4">
                  <Link
                    href="/get-started"
                    className="text-sm font-light text-white hover:text-white/80"
                    onClick={() => setSheetOpen(false)}
                  >
                    Get Started
                  </Link>
                  <Button
                    className="w-full bg-white/15 text-white hover:bg-white/25"
                    nativeButton={false}
                    render={<Link href="/login" />}
                    onClick={() => setSheetOpen(false)}
                  >
                    Login
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
