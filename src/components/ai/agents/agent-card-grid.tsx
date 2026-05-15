'use client'

import { Add } from '@carbon/icons-react'
import { Button } from '@/components/ui/button'
import { AgentCard } from './agent-card'
import type { AgentRow } from './agent-table'

interface AgentCardGridProps {
  agents: AgentRow[]
  loading: boolean
  onSelect: (agent: AgentRow) => void
  onCreate: () => void
}

export function AgentCardGrid({ agents, loading, onSelect, onCreate }: AgentCardGridProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Agents</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Browse, edit, and create AI agents.
          </p>
        </div>
        <Button onClick={onCreate}>
          <Add size={16} />
          New Agent
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border bg-card p-5 h-[180px] animate-pulse"
            />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">No agents yet.</p>
          <Button onClick={onCreate} variant="outline" className="mt-4">
            <Add size={16} />
            Create your first agent
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              variant="grid"
              onClick={() => onSelect(agent)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
