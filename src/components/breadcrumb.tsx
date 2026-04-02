'use client'

import { useMenu } from '@/contexts/menu-context'
import { usePathname } from 'next/navigation'
import { iconMap } from '@/lib/icon-map'

const ChevronRight = iconMap['chevron-right']

export function Breadcrumb() {
  const { flatMenu } = useMenu()
  const pathname = usePathname()

  const crumbs = flatMenu
    .filter(item => item.route && pathname.startsWith(item.route))
    .sort((a, b) => a.level - b.level)

  if (crumbs.length === 0) return null

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      {crumbs.map((crumb, i) => (
        <span key={crumb.id} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={12} />}
          <span className={i === crumbs.length - 1 ? 'text-foreground font-medium' : ''}>
            {crumb.label}
          </span>
        </span>
      ))}
    </nav>
  )
}
