'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { OrgChart } from '@/components/ai/organogram/org-chart'
import { AgentDetailPanel } from '@/components/ai/organogram/agent-detail-panel'

interface AgentWithHierarchy {
  id: string
  name: string
  agent_type: string
  description: string | null
  model: string
  system_prompt: string | null
  icon: string | null
  is_default: boolean
  hierarchy?: {
    parent_agent_id: string | null
    hierarchy_level: string
    sort_order: number
  }
  ai_agent_tools: Array<{ tool_name: string; operations: string[] | null }>
}

interface SelectedAgent {
  id: string
  name: string
  agent_type: string
  description: string | null
  model: string
  system_prompt: string | null
  icon: string | null
  is_default: boolean
  ai_agent_tools?: Array<{ tool_name: string; operations: string[] | null }>
}

const LEGEND: Array<{ label: string; accent: string }> = [
  { label: 'King', accent: '#F59E0B' },
  { label: 'Department', accent: '#3B82F6' },
  { label: 'Manager', accent: '#EC4899' },
  { label: 'Worker', accent: '#475569' },
]

export default function OrganogramPage() {
  const [agents, setAgents] = useState<AgentWithHierarchy[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<SelectedAgent | null>(null)

  useEffect(() => {
    async function fetchAgents() {
      setLoading(true)

      const { data, error } = await supabase
        .from('ai_agents')
        .select('*, ai_agent_hierarchy(*), ai_agent_tools(tool_name, operations)')
        .order('name')

      if (error) {
        toast.error('Failed to load agents')
        setLoading(false)
        return
      }

      const normalised: AgentWithHierarchy[] = (data ?? []).map((row: any) => {
        const hierarchyRows: any[] = row.ai_agent_hierarchy ?? []
        return {
          id: row.id,
          name: row.name,
          agent_type: row.agent_type,
          description: row.description,
          model: row.model,
          system_prompt: row.system_prompt,
          icon: row.icon,
          is_default: row.is_default,
          hierarchy:
            hierarchyRows.length > 0
              ? {
                  parent_agent_id: hierarchyRows[0].parent_agent_id,
                  hierarchy_level: hierarchyRows[0].hierarchy_level,
                  sort_order: hierarchyRows[0].sort_order ?? 0,
                }
              : undefined,
          ai_agent_tools: row.ai_agent_tools ?? [],
        }
      })

      setAgents(normalised)
      setLoading(false)
    }

    fetchAgents()
  }, [])

  function handleNodeClick(agent: any) {
    setSelectedAgent(agent)
  }

  const assignedCount = agents.filter((a) => a.hierarchy).length
  const unassignedCount = agents.length - assignedCount

  return (
    <div className="-m-6 h-[calc(100vh-64px)] flex flex-col bg-muted/50 relative overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b flex-shrink-0">
        <div>
          <h1 className="text-base font-semibold text-foreground">Agent Organogram</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {loading
              ? 'Loading…'
              : `${assignedCount} assigned · ${unassignedCount} unassigned · drag to pan, ⌘/Ctrl + scroll to zoom`}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {LEGEND.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5">
              <span
                className="w-1 h-3.5 rounded-sm inline-block"
                style={{ background: item.accent }}
              />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 relative overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Loading agents…
          </div>
        ) : (
          <OrgChart agents={agents} onNodeClick={handleNodeClick} />
        )}
      </div>

      {/* Detail panel */}
      <AgentDetailPanel agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
    </div>
  )
}
