'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMenu } from '@/contexts/menu-context'
import { iconMap } from '@/lib/icon-map'
import { MenuItem } from '@/lib/types'
import { cn } from '@/lib/utils'

function findSettingsRoot(menuTree: MenuItem[]): MenuItem | undefined {
  return menuTree.find(
    item => item.level === 1 && (item.route === '/settings' || item.label.toLowerCase() === 'settings')
  )
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { menuTree } = useMenu()
  const pathname = usePathname()

  const settingsRoot = findSettingsRoot(menuTree)
  const l2Items = settingsRoot?.children ?? []

  const activeL2 = l2Items.find(item => item.route && pathname.startsWith(item.route))
  const l3Items = activeL2?.children ?? []

  return (
    <div className="flex h-full -m-6 bg-white">
      <nav className="w-60 shrink-0 border-r bg-white overflow-y-auto py-3">
        <div className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Settings
        </div>
        <ul>
          {l2Items.map(item => {
            const Icon = item.icon ? iconMap[item.icon] : null
            const isActive = item.route ? pathname.startsWith(item.route) : false
            return (
              <li key={item.id}>
                <Link
                  href={item.route || '#'}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-muted text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  )}
                >
                  {Icon && <Icon size={16} />}
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="flex flex-1 flex-col overflow-hidden">
        {l3Items.length > 0 && (
          <div className="flex h-12 items-center gap-1 border-b bg-white px-6">
            {l3Items.map(l3 => {
              const isActive = l3.route ? pathname.startsWith(l3.route) : false
              return (
                <Link
                  key={l3.id}
                  href={l3.route || '#'}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  {l3.label}
                </Link>
              )
            })}
          </div>
        )}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">{children}</div>
      </div>
    </div>
  )
}
