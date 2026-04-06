'use client'

import { useAuth } from '@/contexts/auth-context'
import { useMenu } from '@/contexts/menu-context'
import { useRouter, usePathname } from 'next/navigation'
import { iconMap } from '@/lib/icon-map'
import Image from 'next/image'

export function CustomerSidebar() {
  const { signOut } = useAuth()
  const { menuTree } = useMenu()
  const router = useRouter()
  const pathname = usePathname()

  const l1Items = menuTree.filter(item => item.level === 1)

  return (
    <aside className="flex h-screen w-60 flex-col bg-[#1175E4] text-white flex-shrink-0">
      {/* Logo */}
      <div className="border-b border-white/15 px-5 py-5">
        <Image
          src="/logos/ithealth-logo-white.svg"
          alt="IThealth"
          width={140}
          height={17}
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
            <button
              key={item.id}
              onClick={() => router.push(item.route || '/')}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-[13px] transition-colors ${
                isActive
                  ? 'bg-white/[0.18] font-medium text-white'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              {Icon && <Icon size={18} />}
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-white/15 p-2 pb-4">
        <button
          onClick={async () => { await signOut(); router.replace('/login') }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-[13px] text-white/50 hover:bg-white/10 hover:text-white/75 transition-colors"
        >
          {iconMap['logout'] && (() => { const LogoutIcon = iconMap['logout']; return <LogoutIcon size={18} /> })()}
          Logout
        </button>
      </div>
    </aside>
  )
}
