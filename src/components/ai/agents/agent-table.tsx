'use client'

import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit, TrashCan, Locked } from '@carbon/icons-react'

export interface AgentRow {
  id: string
  name: string
  description: string | null
  agent_type: 'specialist' | 'orchestrator'
  model: string | null
  is_active: boolean
  is_default: boolean
  ai_agent_tools: { count: number }[]
}

interface AgentTableProps {
  agents: AgentRow[]
  loading: boolean
  onDelete: (agent: AgentRow) => void
  onEdit: (agent: AgentRow) => void
}

export function AgentTable({ agents, loading, onDelete, onEdit }: AgentTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="w-[130px]">Type</TableHead>
            <TableHead className="w-[160px]">Model</TableHead>
            <TableHead className="w-[80px]">Tools</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                Loading...
              </TableCell>
            </TableRow>
          ) : agents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No agents found
              </TableCell>
            </TableRow>
          ) : (
            agents.map((agent) => {
              const toolCount = agent.ai_agent_tools?.[0]?.count ?? 0
              return (
                <TableRow key={agent.id}>
                  <TableCell>
                    <div className="font-medium">{agent.name}</div>
                    {agent.description && (
                      <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                        {agent.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={agent.agent_type === 'orchestrator' ? 'secondary' : 'default'}>
                      {agent.agent_type === 'orchestrator' ? 'Orchestrator' : 'Specialist'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{agent.model ?? '—'}</TableCell>
                  <TableCell className="text-sm">{toolCount}</TableCell>
                  <TableCell>
                    <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                      {agent.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(agent)}
                        title="Edit agent"
                      >
                        <Edit size={16} />
                      </Button>
                      {agent.is_default ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled
                          title="Default agents cannot be deleted"
                        >
                          <Locked size={16} />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onDelete(agent)}
                          title="Delete agent"
                        >
                          <TrashCan size={16} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
