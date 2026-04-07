'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { AgentForm } from '@/components/ai/agents/agent-form'
import { AgentTool } from '@/components/ai/agents/tool-permissions'

export default function EditAgentPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [initialData, setInitialData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchAgent() {
      const [agentRes, toolsRes] = await Promise.all([
        supabase.from('ai_agents').select('*').eq('id', id).single(),
        supabase.from('ai_agent_tools').select('*').eq('agent_id', id),
      ])

      if (agentRes.error || !agentRes.data) {
        toast.error('Failed to load agent')
        router.push('/ai/agents')
        return
      }

      const tools: AgentTool[] = (toolsRes.data ?? []).map((t) => ({
        tool_type: t.tool_type,
        tool_name: t.tool_name,
        operations: t.operations,
        is_active: t.is_active,
      }))

      setInitialData({ ...agentRes.data, tools })
      setLoading(false)
    }

    fetchAgent()
  }, [id, router])

  async function handleSave(data: {
    name: string
    description: string
    agent_type: 'specialist' | 'orchestrator'
    system_prompt: string
    model: string
    temperature: number
    icon: string
    tools: AgentTool[]
  }) {
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

    // Default agents cannot have their name changed
    if (!initialData?.is_default) {
      updatePayload.name = trimmedName
    }

    const { error: updateError } = await supabase
      .from('ai_agents')
      .update(updatePayload)
      .eq('id', id)

    if (updateError) {
      toast.error('Failed to update agent')
      setSaving(false)
      return
    }

    // Replace all tools: delete old, insert new
    const { error: deleteError } = await supabase
      .from('ai_agent_tools')
      .delete()
      .eq('agent_id', id)

    if (deleteError) {
      toast.error('Agent updated but failed to update tool permissions')
      router.push('/ai/agents')
      return
    }

    if (data.tools.length > 0) {
      const toolRows = data.tools.map((t) => ({
        agent_id: id,
        tool_type: t.tool_type,
        tool_name: t.tool_name,
        operations: t.operations,
        is_active: t.is_active,
      }))

      const { error: insertError } = await supabase.from('ai_agent_tools').insert(toolRows)

      if (insertError) {
        toast.error('Agent updated but failed to save tool permissions')
        router.push('/ai/agents')
        return
      }
    }

    toast.success('Agent updated')
    router.push('/ai/agents')
  }

  if (loading) {
    return (
      <div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div>
      <AgentForm initialData={initialData} onSave={handleSave} saving={saving} />
    </div>
  )
}
