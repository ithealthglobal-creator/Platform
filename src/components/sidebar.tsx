'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useMenu } from '@/contexts/menu-context'
import { useAuth } from '@/contexts/auth-context'
import { useBranding } from '@/contexts/branding-context'
import { usePathname, useRouter } from 'next/navigation'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { iconMap } from '@/lib/icon-map'

function getIcon(iconName: string | null) {
  if (!iconName) {
    const Fallback = iconMap['circle-dash']
    return <Fallback size={20} />
  }
  const Icon = iconMap[iconName]
  if (!Icon) {
    const Fallback = iconMap['circle-dash']
    return <Fallback size={20} />
  }
  return <Icon size={20} />
}

export function Sidebar() {
  const { menuTree } = useMenu()
  const { profile, signOut } = useAuth()
  const { branding } = useBranding()
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const l1Items = menuTree.filter(item => item.level === 1)

  const initials = profile?.display_name
    ? profile.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  return (
    <TooltipProvider>
      <div className="flex h-screen w-[60px] flex-col items-center border-r bg-[var(--brand-secondary)] pb-6">
        {/* Logo row — same height as MegaMenu (h-12) so the logo aligns with the header tab text */}
        <div className="flex h-12 w-full items-center justify-center">
          <Image
            src={branding?.icon_url ?? branding?.logo_light_url ?? '/logos/ithealth-icon-white.svg'}
            alt="Logo"
            width={28}
            height={28}
            className="h-7 w-7"
          />
        </div>

        {/* Nav items */}
        <nav className="flex flex-1 flex-col items-center gap-1 pt-4">
          {l1Items.map(item => {
            const isActive = item.route ? (pathname === item.route || pathname.startsWith(item.route + '/')) : false
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger
                  delay={0}
                  onClick={() => {
                    const firstChild = item.children?.[0]
                    router.push(firstChild?.route || item.route || '/')
                  }}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {getIcon(item.icon)}
                </TooltipTrigger>
                <TooltipContent side="right">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </nav>

        {/* Avatar & dropdown */}
        <div className="relative" ref={menuRef}>
          <Tooltip>
            <TooltipTrigger
              delay={0}
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
            >
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.display_name ?? ''}
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-[10px] font-semibold text-white">
                  {initials}
                </div>
              )}
            </TooltipTrigger>
            {!menuOpen && (
              <TooltipContent side="right">
                {profile?.display_name ?? 'Account'}
              </TooltipContent>
            )}
          </Tooltip>

          {/* Dropdown menu */}
          {menuOpen && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded-lg bg-popover py-1 shadow-lg ring-1 ring-foreground/10 z-50">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-medium text-foreground truncate">{profile?.display_name}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
              </div>
              <button
                onClick={() => { setMenuOpen(false); router.push('/settings') }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
              >
                {iconMap['user-avatar'] ? (() => { const I = iconMap['user-avatar']; return <I size={16} /> })() : null}
                Profile & Settings
              </button>
              <div className="mx-3 my-0.5 border-t border-border" />
              <button
                onClick={async () => { await signOut(); router.replace('/login') }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
              >
                {iconMap['logout'] ? (() => { const I = iconMap['logout']; return <I size={16} /> })() : null}
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
