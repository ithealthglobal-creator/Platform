'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AI_TOOLS_CATALOG } from '@/lib/ai-tools-catalog'
import { cn } from '@/lib/utils'

export default function AiToolsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full -m-6 bg-white">
      <nav className="w-72 shrink-0 border-r bg-white overflow-y-auto py-3">
        <div className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tools
        </div>
        <ul>
          {AI_TOOLS_CATALOG.map((tool) => {
            const route = `/ai/tools/${tool.slug}`
            const isActive = pathname === route || pathname.startsWith(route + '/')
            return (
              <li key={tool.slug}>
                <Link
                  href={route}
                  className={cn(
                    'block border-l-2 px-4 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'border-[var(--brand-primary)] bg-muted text-foreground'
                      : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  )}
                >
                  <div className="font-medium">{tool.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {tool.summary}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">{children}</div>
    </div>
  )
}
