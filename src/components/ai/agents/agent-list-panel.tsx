'use client'

import { Add, ArrowLeft } from '@carbon/icons-react'
import { Button } from '@/components/ui/button'
import { AgentCard } from './agent-card'
import type { AgentRow } from './agent-table'

interface AgentListPanelProps {
  agents: AgentRow[]
  selectedId: string | null
  onSelect: (agent: AgentRow) => void
  onCreate: () => void
  onBack: () => void
}

export function AgentListPanel({
  agents,
  selectedId,
  onSelect,
  onCreate,
  onBack,
}: AgentListPanelProps) {
  return (
    <div className="flex flex-col h-full w-72 flex-shrink-0 border-r bg-muted/30">
      <div className="px-3 py-3 border-b bg-background flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="-ml-2 gap-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} />
          All agents
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onCreate}
          title="New agent"
        >
          <Add size={16} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            variant="compact"
            selected={agent.id === selectedId}
            onClick={() => onSelect(agent)}
          />
        ))}
      </div>
    </div>
  )
}
