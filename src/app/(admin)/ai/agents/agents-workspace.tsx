'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase-client'
import { AgentCardGrid } from '@/components/ai/agents/agent-card-grid'
import { AgentListPanel } from '@/components/ai/agents/agent-list-panel'
import { AgentForm } from '@/components/ai/agents/agent-form'
import { AgentBuilderPanel } from '@/components/ai/agents/agent-builder-panel'
import type { AgentRow } from '@/components/ai/agents/agent-table'
import type { AgentTool } from '@/components/ai/agents/tool-permissions'

interface FullAgent {
  id: string
  name: string
  description: string | null
  agent_type: 'specialist' | 'orchestrator'
  model: string | null
  system_prompt: string | null
  temperature: number | null
  icon: string | null
  is_default: boolean
  is_active: boolean
  tools: AgentTool[]
}

interface SaveData {
  name: string
  description: string
  agent_type: 'specialist' | 'orchestrator'
  system_prompt: string
  model: string
  temperature: number
  icon: string
  tools: AgentTool[]
}

export function AgentsWorkspace() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('id')
  const isNew = searchParams.get('new') === '1'
  const inSplitView = !!selectedId || isNew

  const [agents, setAgents] = useState<AgentRow[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<FullAgent | null>(null)
  const [loadingSelected, setLoadingSelected] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchAgents = useCallback(async () => {
    setLoadingList(true)
    const { data, error } = await supabase
      .from('ai_agents')
      .select('*, ai_agent_tools(count)')
      .order('created_at')

    if (error) {
      toast.error('Failed to load agents')
      setLoadingList(false)
      return
    }
    setAgents((data as AgentRow[]) ?? [])
    setLoadingList(false)
  }, [])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  const fetchSelected = useCallback(async (id: string) => {
    setLoadingSelected(true)
    const [agentRes, toolsRes] = await Promise.all([
      supabase.from('ai_agents').select('*').eq('id', id).single(),
      supabase.from('ai_agent_tools').select('*').eq('agent_id', id),
    ])

    if (agentRes.error || !agentRes.data) {
      toast.error('Failed to load agent')
      setSelectedAgent(null)
      setLoadingSelected(false)
      router.replace('/ai/agents')
      return
    }

    const tools: AgentTool[] = (toolsRes.data ?? []).map((t) => ({
      tool_type: t.tool_type,
      tool_name: t.tool_name,
      operations: t.operations,
      is_active: t.is_active,
    }))

    setSelectedAgent({ ...(agentRes.data as Omit<FullAgent, 'tools'>), tools })
    setLoadingSelected(false)
  }, [router])

  useEffect(() => {
    if (selectedId) {
      fetchSelected(selectedId)
    } else {
      setSelectedAgent(null)
    }
  }, [selectedId, fetchSelected])

  function goToCards() {
    router.replace('/ai/agents')
  }

  function selectAgent(agent: AgentRow) {
    router.replace(`/ai/agents?id=${agent.id}`)
  }

  function startCreate() {
    router.replace('/ai/agents?new=1')
  }

  async function createAgent(data: SaveData) {
    const trimmedName = data.name.trim()
    if (!trimmedName) {
      toast.error('Name is required')
      return
    }

    setSaving(true)
    const { data: agent, error } = await supabase
      .from('ai_agents')
      .insert({
        name: trimmedName,
        description: data.description.trim() || null,
        agent_type: data.agent_type,
        system_prompt: data.system_prompt.trim() || null,
        model: data.model,
        temperature: data.temperature,
        icon: data.icon.trim() || null,
        is_default: false,
        is_active: true,
      })
      .select('id')
      .single()

    if (error || !agent) {
      toast.error('Failed to create agent')
      setSaving(false)
      return
    }

    if (data.tools.length > 0) {
      const toolRows = data.tools.map((t) => ({
        agent_id: agent.id,
        tool_type: t.tool_type,
        tool_name: t.tool_name,
        operations: t.operations,
        is_active: t.is_active,
      }))
      const { error: toolsError } = await supabase.from('ai_agent_tools').insert(toolRows)
      if (toolsError) {
        toast.error('Agent created but failed to save tool permissions')
        setSaving(false)
        await fetchAgents()
        router.replace(`/ai/agents?id=${agent.id}`)
        return
      }
    }

    toast.success('Agent created')
    setSaving(false)
    await fetchAgents()
    router.replace(`/ai/agents?id=${agent.id}`)
  }

  async function updateAgent(data: SaveData) {
    if (!selectedAgent) return
    const trimmedName = data.name.trim()
    if (!trimmedName) {
      toast.error('Name is required')
      return
    }

    setSaving(true)
    const updatePayload: Record<string, unknown> = {
      description: data.description.trim() || null,
      agent_type: data.agent_type,
      system_prompt: data.system_prompt.trim() || null,
      model: data.model,
      temperature: data.temperature,
      icon: data.icon.trim() || null,
    }
    if (!selectedAgent.is_default) {
      updatePayload.name = trimmedName
    }

    const { error: updateError } = await supabase
      .from('ai_agents')
      .update(updatePayload)
      .eq('id', selectedAgent.id)

    if (updateError) {
      toast.error('Failed to update agent')
      setSaving(false)
      return
    }

    const { error: deleteError } = await supabase
      .from('ai_agent_tools')
      .delete()
      .eq('agent_id', selectedAgent.id)
    if (deleteError) {
      toast.error('Agent updated but failed to refresh tool permissions')
      setSaving(false)
      await refreshAll()
      return
    }

    if (data.tools.length > 0) {
      const toolRows = data.tools.map((t) => ({
        agent_id: selectedAgent.id,
        tool_type: t.tool_type,
        tool_name: t.tool_name,
        operations: t.operations,
        is_active: t.is_active,
      }))
      const { error: insertError } = await supabase.from('ai_agent_tools').insert(toolRows)
      if (insertError) {
        toast.error('Agent updated but failed to save tool permissions')
        setSaving(false)
        await refreshAll()
        return
      }
    }

    toast.success('Agent updated')
    setSaving(false)
    await refreshAll()
  }

  async function deleteAgent() {
    if (!selectedAgent) return
    if (selectedAgent.is_default) {
      toast.error('Default agents cannot be deleted')
      return
    }
    if (!confirm(`Delete "${selectedAgent.name}"? This cannot be undone.`)) return

    const { error } = await supabase
      .from('ai_agents')
      .delete()
      .eq('id', selectedAgent.id)

    if (error) {
      toast.error('Failed to delete agent')
      return
    }

    toast.success('Agent deleted')
    await fetchAgents()
    router.replace('/ai/agents')
  }

  const refreshAll = useCallback(async () => {
    await fetchAgents()
    if (selectedId) await fetchSelected(selectedId)
  }, [fetchAgents, fetchSelected, selectedId])

  // ────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────
  if (!inSplitView) {
    return (
      <AgentCardGrid
        agents={agents}
        loading={loadingList}
        onSelect={selectAgent}
        onCreate={startCreate}
      />
    )
  }

  const showCreating = isNew && !selectedId
  const builderAgentName = selectedAgent?.name ?? null

  return (
    <div className="flex h-[calc(100vh-7rem)] -mx-6 -mb-6 border-t">
      <AgentListPanel
        agents={agents}
        selectedId={selectedId}
        onSelect={selectAgent}
        onCreate={startCreate}
        onBack={goToCards}
      />

      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="px-6 py-6 max-w-3xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">
              {showCreating
                ? 'New agent'
                : loadingSelected
                  ? 'Loading…'
                  : selectedAgent?.name ?? 'Agent'}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {showCreating
                ? 'Fill in the details below, or ask the Agent Builder on the right to set it up for you.'
                : 'Edit the configuration below, or ask the Agent Builder on the right to make changes.'}
            </p>
          </div>

          {showCreating ? (
            <AgentForm
              onSave={createAgent}
              onCancel={goToCards}
              saving={saving}
            />
          ) : loadingSelected || !selectedAgent ? (
            <div className="text-sm text-muted-foreground">Loading agent…</div>
          ) : (
            <AgentForm
              key={selectedAgent.id}
              initialData={selectedAgent}
              onSave={updateAgent}
              onCancel={goToCards}
              onDelete={deleteAgent}
              saving={saving}
            />
          )}
        </div>
      </div>

      <AgentBuilderPanel
        agentId={selectedId}
        agentName={builderAgentName}
        onAgentMutated={refreshAll}
        onAgentCreated={(id) => router.replace(`/ai/agents?id=${id}`)}
      />
    </div>
  )
}
