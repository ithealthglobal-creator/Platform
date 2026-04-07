'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'

interface AgentSelectorProps {
  value: string | null
  onChange: (agentId: string) => void
}

interface Agent {
  id: string
  name: string
  agent_type: 'orchestrator' | 'specialist'
}

export function AgentSelector({ value, onChange }: AgentSelectorProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAgents() {
      const { data } = await supabase
        .from('ai_agents')
        .select('id, name, agent_type')
        .eq('is_active', true)
        .order('agent_type', { ascending: false }) // orchestrators first (o > s)
        .order('name')

      if (data) setAgents(data)
      setLoading(false)
    }

    fetchAgents()
  }, [])

  const orchestrators = agents.filter((a) => a.agent_type === 'orchestrator')
  const specialists = agents.filter((a) => a.agent_type === 'specialist')

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={loading}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="" disabled>
        {loading ? 'Loading agents…' : 'Select an agent'}
      </option>

      {orchestrators.length > 0 && (
        <optgroup label="Orchestrators">
          {orchestrators.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name} (orchestrator)
            </option>
          ))}
        </optgroup>
      )}

      {specialists.length > 0 && (
        <optgroup label="Specialists">
          {specialists.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name} (specialist)
            </option>
          ))}
        </optgroup>
      )}
    </select>
  )
}
