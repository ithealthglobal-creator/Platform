'use client'

import { useState, useEffect, useRef } from 'react'
import { useMenu } from '@/contexts/menu-context'
import { usePathname, useRouter } from 'next/navigation'
import { MenuItem } from '@/lib/types'

export function MegaMenu() {
  const { menuTree } = useMenu()
  const pathname = usePathname()
  const router = useRouter()
  const [expandedL2, setExpandedL2] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setExpandedL2(null)
      }
    }
    if (expandedL2) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [expandedL2])

  if (pathname.startsWith('/settings')) return null

  const activeL1 = menuTree.find(item =>
    item.level === 1 && pathname.startsWith(item.route || '')
  )

  if (!activeL1) return <div className="h-12 border-b bg-white" />

  const l2Items = activeL1.children || []

  return (
    <div ref={menuRef} className="relative border-b bg-white">
      <div className="flex h-12 items-center gap-1 px-4">
        {l2Items.map(item => {
          const isActive = pathname.startsWith(item.route || '')
          const hasChildren = item.children && item.children.length > 0
          return (
            <button
              key={item.id}
              onClick={() => {
                if (hasChildren) {
                  setExpandedL2(expandedL2 === item.id ? null : item.id)
                } else {
                  router.push(item.route || '/')
                  setExpandedL2(null)
                }
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {expandedL2 && (
        <MegaMenuDropdown
          l2Item={l2Items.find(i => i.id === expandedL2)!}
          onNavigate={(route) => {
            router.push(route)
            setExpandedL2(null)
          }}
        />
      )}
    </div>
  )
}

function MegaMenuDropdown({ l2Item, onNavigate }: { l2Item: MenuItem; onNavigate: (route: string) => void }) {
  if (!l2Item.children || l2Item.children.length === 0) return null

  return (
    <div className="absolute left-0 right-0 top-12 z-50 border-b border-border bg-popover p-4 shadow-lg">
      <div className="flex gap-8">
        {l2Item.children.map(l3 => (
          <div key={l3.id} className="space-y-2">
            <button
              onClick={() => l3.route && onNavigate(l3.route)}
              className="text-sm font-semibold text-foreground hover:underline"
            >
              {l3.label}
            </button>
            {l3.children && l3.children.length > 0 && (
              <ul className="space-y-1">
                {l3.children.map(l4 => (
                  <li key={l4.id}>
                    <button
                      onClick={() => l4.route && onNavigate(l4.route)}
                      className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {l4.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
