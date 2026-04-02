'use client'

import { useMenu } from '@/contexts/menu-context'
import { useAuth } from '@/contexts/auth-context'
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
  const { signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const l1Items = menuTree.filter(item => item.level === 1)

  return (
    <TooltipProvider>
      <div className="flex h-screen w-[60px] flex-col items-center border-r bg-slate-900 py-4">
        <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white font-bold text-sm">
          IT
        </div>

        <nav className="flex flex-1 flex-col items-center gap-1">
          {l1Items.map(item => {
            const isActive = pathname.startsWith(item.route || '')
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
                      : 'text-slate-400 hover:bg-white/10 hover:text-white'
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

        <Tooltip>
          <TooltipTrigger
            delay={0}
            onClick={signOut}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            {(() => { const LogoutIcon = iconMap['logout']; return <LogoutIcon size={20} /> })()}
          </TooltipTrigger>
          <TooltipContent side="right">Logout</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
