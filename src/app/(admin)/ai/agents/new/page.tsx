'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { AgentForm } from '@/components/ai/agents/agent-form'
import { AgentTool } from '@/components/ai/agents/tool-permissions'

export default function NewAgentPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

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
        router.push('/ai/agents')
        return
      }
    }

    toast.success('Agent created')
    router.push('/ai/agents')
  }

  return (
    <div>
      <AgentForm onSave={handleSave} saving={saving} />
    </div>
  )
}
