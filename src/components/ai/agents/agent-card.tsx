'use client'

import { Badge } from '@/components/ui/badge'
import { iconMap } from '@/lib/icon-map'
import { cn } from '@/lib/utils'
import type { AgentRow } from './agent-table'

interface AgentCardProps {
  agent: AgentRow
  variant?: 'grid' | 'compact'
  selected?: boolean
  onClick?: () => void
}

export function AgentCard({ agent, variant = 'grid', selected = false, onClick }: AgentCardProps) {
  const Icon = agent.icon && iconMap[agent.icon] ? iconMap[agent.icon] : null
  const toolCount = agent.ai_agent_tools?.[0]?.count ?? 0
  const typeLabel = agent.agent_type === 'orchestrator' ? 'Orchestrator' : 'Specialist'

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-current={selected ? 'true' : undefined}
        className={cn(
          'w-full text-left rounded-lg border bg-card px-3 py-2.5 flex items-center gap-3 transition-colors',
          'hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          selected && 'border-primary bg-primary/5 hover:bg-primary/5'
        )}
      >
        <div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center',
            selected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          )}
        >
          {Icon ? <Icon size={16} /> : <span className="text-xs font-semibold">{agent.name.slice(0, 1).toUpperCase()}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{agent.name}</div>
          <div className="text-xs text-muted-foreground truncate">
            {typeLabel}
            {agent.model ? ` · ${agent.model}` : ''}
          </div>
        </div>
        {!agent.is_active && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            Inactive
          </Badge>
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group text-left rounded-xl border bg-card p-5 flex flex-col gap-3 transition-all',
        'hover:border-foreground/20 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected && 'border-primary ring-1 ring-primary'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
            {Icon ? <Icon size={20} /> : <span className="text-sm font-semibold">{agent.name.slice(0, 1).toUpperCase()}</span>}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">{agent.name}</div>
            <Badge
              variant={agent.agent_type === 'orchestrator' ? 'secondary' : 'default'}
              className="mt-1 text-[10px]"
            >
              {typeLabel}
            </Badge>
          </div>
        </div>
        {!agent.is_active && (
          <Badge variant="secondary" className="text-[10px] flex-shrink-0">
            Inactive
          </Badge>
        )}
      </div>

      {agent.description && (
        <p className="text-xs text-muted-foreground line-clamp-3 min-h-[3rem]">
          {agent.description}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
        <span className="font-mono">{agent.model ?? '—'}</span>
        <span>
          {toolCount} {toolCount === 1 ? 'tool' : 'tools'}
        </span>
      </div>
    </button>
  )
}
