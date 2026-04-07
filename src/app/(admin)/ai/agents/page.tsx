'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Add } from '@carbon/icons-react'
import { AgentTable, AgentRow } from '@/components/ai/agents/agent-table'

export default function AgentsPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAgents = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('ai_agents')
      .select('*, ai_agent_tools(count)')
      .order('created_at')

    if (error) {
      toast.error('Failed to load agents')
      setLoading(false)
      return
    }

    setAgents((data as AgentRow[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  async function handleDelete(agent: AgentRow) {
    if (agent.is_default) {
      toast.error('Default agents cannot be deleted')
      return
    }

    if (!confirm(`Delete "${agent.name}"? This cannot be undone.`)) return

    const { error } = await supabase
      .from('ai_agents')
      .delete()
      .eq('id', agent.id)

    if (error) {
      toast.error('Failed to delete agent')
      return
    }

    toast.success('Agent deleted')
    fetchAgents()
  }

  function handleEdit(agent: AgentRow) {
    router.push(`/ai/agents/${agent.id}/edit`)
  }

  return (
    <div>
      <div className="flex justify-end mb-6">
        <Button onClick={() => router.push('/ai/agents/new')}>
          <Add size={16} />
          New Agent
        </Button>
      </div>

      <AgentTable
        agents={agents}
        loading={loading}
        onDelete={handleDelete}
        onEdit={handleEdit}
      />
    </div>
  )
}
