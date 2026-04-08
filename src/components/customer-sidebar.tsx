'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useMenu } from '@/contexts/menu-context'
import { useBranding } from '@/contexts/branding-context'
import { useRouter, usePathname } from 'next/navigation'
import { iconMap } from '@/lib/icon-map'
import Image from 'next/image'

export function CustomerSidebar() {
  const { profile, signOut } = useAuth()
  const { menuTree, flatMenu } = useMenu()
  const { branding } = useBranding()
  const router = useRouter()
  const pathname = usePathname()
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
    <aside className="flex h-screen w-60 flex-col bg-[#1175E4] text-white flex-shrink-0">
      {/* Logo */}
      <div className="border-b border-white/15 px-5 py-7">
        <Image
          src={branding?.logo_light_url ?? '/logos/ithealth-logo-white.svg'}
          alt="Logo"
          width={140}
          height={17}
          className="h-6"
          style={{ width: 'auto' }}
          priority
        />
      </div>

      {/* Menu items */}
      <nav className="flex-1 space-y-0.5 p-2 overflow-y-auto">
        {l1Items.map((item) => {
          const isActive = item.route
            ? pathname === item.route || pathname.startsWith(item.route + '/')
            : false
          const Icon = item.icon ? iconMap[item.icon] : null

          return (
            <div key={item.id}>
              <button
                onClick={() => router.push(item.route || '/')}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-[12px] transition-colors ${
                  isActive
                    ? 'bg-white/[0.18] font-medium text-white'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                {Icon && <Icon size={18} />}
                {item.label}
              </button>
              {isActive && (() => {
                const children = flatMenu.filter(
                  (child) => child.parent_id === item.id && child.level === 2
                )
                if (children.length === 0) return null
                return (
                  <div className="ml-6 mt-0.5 space-y-0.5">
                    {children.map((child) => {
                      const childActive = child.route
                        ? pathname === child.route
                        : false
                      const ChildIcon = child.icon ? iconMap[child.icon] : null
                      return (
                        <button
                          key={child.id}
                          onClick={() => router.push(child.route || '/')}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] transition-colors ${
                            childActive
                              ? 'bg-white/[0.18] font-medium text-white'
                              : 'text-white/60 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {ChildIcon && <ChildIcon size={16} />}
                          {child.label}
                        </button>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          )
        })}
      </nav>

      {/* User avatar & menu */}
      <div className="relative border-t border-white/15 p-3" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-white/10"
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
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-semibold text-white">
              {initials}
            </div>
          )}
          <div className="flex-1 text-left min-w-0">
            <p className="truncate text-[12px] font-medium text-white">{profile?.display_name ?? 'User'}</p>
            <p className="truncate text-[11px] text-white/50">{profile?.email}</p>
          </div>
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-1 rounded-lg bg-white py-1 shadow-lg">
            <button
              onClick={() => { setMenuOpen(false); router.push('/portal/settings') }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              {iconMap['user-avatar'] ? (() => { const I = iconMap['user-avatar']; return <I size={16} /> })() : null}
              Profile & Settings
            </button>
            <div className="mx-3 my-1 border-t border-slate-100" />
            <button
              onClick={async () => { await signOut(); router.replace('/login') }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
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
