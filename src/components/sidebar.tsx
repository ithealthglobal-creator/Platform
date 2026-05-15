'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useMenu } from '@/contexts/menu-context'
import { useAuth } from '@/contexts/auth-context'
import { useBranding } from '@/contexts/branding-context'
import { usePathname, useRouter } from 'next/navigation'
import { iconMap } from '@/lib/icon-map'

function getIcon(iconName: string | null, size = 20) {
  if (!iconName) {
    const Fallback = iconMap['circle-dash']
    return <Fallback size={size} />
  }
  const Icon = iconMap[iconName] ?? iconMap['circle-dash']
  return <Icon size={size} />
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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  return (
    <aside className="flex h-screen w-[76px] flex-col bg-[var(--brand-secondary)] text-white flex-shrink-0">
      {/* Logo cell — h-12 to match the mega-menu bar */}
      <div className="flex h-12 w-full items-center justify-center border-b border-white/[0.18]">
        <Image
          src={branding?.icon_url ?? branding?.logo_light_url ?? '/logos/ithealth-icon-white.svg'}
          alt="Logo"
          width={28}
          height={28}
          className="h-7 w-7"
        />
      </div>

      {/* Nav items — icon over label, full-width square cells */}
      <nav className="flex flex-1 flex-col overflow-y-auto">
        {l1Items.map(item => {
          const isActive = item.route ? (pathname === item.route || pathname.startsWith(item.route + '/')) : false
          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              onClick={() => {
                const firstChild = item.children?.[0]
                router.push(firstChild?.route || item.route || '/')
              }}
              className={`flex w-full flex-col items-center justify-center gap-2 px-1 pt-[18px] pb-4 transition-colors ${
                isActive ? 'bg-white/[0.22]' : 'hover:bg-white/[0.10]'
              }`}
            >
              {getIcon(item.icon, 20)}
              <span
                className="text-[10px] leading-[1.1] text-white"
                style={{
                  fontWeight: isActive ? 600 : 500,
                  letterSpacing: '-0.005em',
                }}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Avatar cell with top border */}
      <div className="relative border-t border-white/[0.18]" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen(o => !o)}
          className="flex h-16 w-full items-center justify-center transition-colors hover:bg-white/[0.10]"
          title={profile?.display_name ?? 'Account'}
        >
          {profile?.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.display_name ?? ''}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-[11px] font-semibold text-white">
              {initials}
            </div>
          )}
        </button>

        {menuOpen && (
          <div className="absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 rounded-lg bg-popover py-1 shadow-lg ring-1 ring-foreground/10">
            <div className="border-b border-border px-3 py-2">
              <p className="truncate text-sm font-medium text-foreground">{profile?.display_name}</p>
              <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
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
    </aside>
  )
}
