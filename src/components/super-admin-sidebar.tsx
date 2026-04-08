'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { usePathname, useRouter } from 'next/navigation'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dashboard,
  Building,
  Store,
  Settings,
  UserAvatar,
  Logout,
} from '@carbon/icons-react'

interface NavItem {
  label: string
  route: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Platform', route: '/platform', icon: <Dashboard size={20} /> },
  { label: 'Companies', route: '/platform/companies', icon: <Building size={20} /> },
  { label: 'Marketplace', route: '/platform/marketplace', icon: <Store size={20} /> },
  { label: 'Settings', route: '/platform/settings', icon: <Settings size={20} /> },
]

export function SuperAdminSidebar() {
  const { profile, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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
    <TooltipProvider>
      <div className="flex h-screen w-[60px] flex-col items-center border-r bg-[#0D1B2A] py-6">
        {/* Logo / Brand mark */}
        <div className="mb-8 flex h-10 w-10 items-center justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/20">
            <span className="text-[10px] font-bold text-white tracking-tight">SA</span>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex flex-1 flex-col items-center gap-1">
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.route || pathname.startsWith(item.route + '/')
            return (
              <Tooltip key={item.route}>
                <TooltipTrigger
                  delay={0}
                  onClick={() => router.push(item.route)}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {item.icon}
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            )
          })}
        </nav>

        {/* Avatar & dropdown */}
        <div className="relative" ref={menuRef}>
          <Tooltip>
            <TooltipTrigger
              delay={0}
              onClick={() => setMenuOpen(o => !o)}
              className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-[10px] font-semibold text-white">
                {initials}
              </div>
            </TooltipTrigger>
            {!menuOpen && (
              <TooltipContent side="right">
                {profile?.display_name ?? 'Account'}
              </TooltipContent>
            )}
          </Tooltip>

          {menuOpen && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded-lg bg-white py-1 shadow-lg z-50">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-800 truncate">{profile?.display_name}</p>
                <p className="text-xs text-slate-400 truncate">{profile?.email}</p>
                <span className="mt-1 inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                  Super Admin
                </span>
              </div>
              <button
                onClick={() => { setMenuOpen(false); router.push('/platform/settings') }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <UserAvatar size={16} />
                Profile &amp; Settings
              </button>
              <div className="mx-3 my-0.5 border-t border-slate-100" />
              <button
                onClick={async () => { await signOut(); router.replace('/login') }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Logout size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
