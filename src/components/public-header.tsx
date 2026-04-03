'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
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

const resourceLinks = [
  { label: 'Blog', href: '/blog' },
  { label: 'About Us', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Partners', href: '/partners' },
]

export function PublicHeader() {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full bg-[var(--brand-primary)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-12 lg:px-16">
        {/* Logo */}
        <Link href="/">
          <Image
            src="/logos/ithealth-logo-white.svg"
            alt="IThealth"
            width={160}
            height={40}
            className="h-10 w-auto"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-4 md:flex">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-white hover:text-white/80">
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
            className="bg-[var(--brand-secondary)] text-white hover:bg-[var(--brand-secondary)]/90"
            nativeButton={false}
            render={<Link href="/login" />}
          >
            Start Now
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
                  src="/logos/ithealth-logo-white.svg"
                  alt="IThealth"
                  width={140}
                  height={35}
                  className="h-9 w-auto"
                />

                <nav className="flex flex-col gap-4">
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
                  <Button
                    className="w-full bg-white/15 text-white hover:bg-white/25"
                    nativeButton={false}
                    render={<Link href="/login" />}
                    onClick={() => setSheetOpen(false)}
                  >
                    Login
                  </Button>
                  <Button
                    className="w-full bg-[var(--brand-secondary)] text-white hover:bg-[var(--brand-secondary)]/90"
                    nativeButton={false}
                    render={<Link href="/login" />}
                    onClick={() => setSheetOpen(false)}
                  >
                    Start Now
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
