'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Save, Reset } from '@carbon/icons-react'
import { ToolPermissions, AgentTool } from './tool-permissions'

interface AgentFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData?: any
  onSave: (data: any) => Promise<void>
  saving: boolean
}

export function AgentForm({ initialData, onSave, saving }: AgentFormProps) {
  const router = useRouter()

  const [name, setName] = useState<string>(initialData?.name ?? '')
  const [description, setDescription] = useState<string>(initialData?.description ?? '')
  const [agentType, setAgentType] = useState<'specialist' | 'orchestrator'>(
    initialData?.agent_type ?? 'specialist'
  )
  const [systemPrompt, setSystemPrompt] = useState<string>(initialData?.system_prompt ?? '')
  const [model, setModel] = useState<string>(initialData?.model ?? 'gemini-2.5-flash')
  const [temperature, setTemperature] = useState<number>(
    initialData?.temperature != null ? Number(initialData.temperature) : 0.7
  )
  const [icon, setIcon] = useState<string>(initialData?.icon ?? '')
  const [tools, setTools] = useState<AgentTool[]>(initialData?.tools ?? [])

  const isDefault = initialData?.is_default === true
  const originalSystemPrompt = initialData?.system_prompt ?? ''

  async function handleSave() {
    await onSave({ name, description, agent_type: agentType, system_prompt: systemPrompt, model, temperature, icon, tools })
  }

  function handleResetPrompt() {
    setSystemPrompt(originalSystemPrompt)
  }

  const inputClass =
    'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

  return (
    <div className="grid gap-6 max-w-2xl">

      {/* Name */}
      <div className="grid gap-2">
        <Label htmlFor="agent-name">Name <span className="text-destructive">*</span></Label>
        <Input
          id="agent-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Blog Writer"
          disabled={isDefault}
        />
        {isDefault && (
          <p className="text-xs text-muted-foreground">Default agent names cannot be changed.</p>
        )}
      </div>

      {/* Description */}
      <div className="grid gap-2">
        <Label htmlFor="agent-description">Description</Label>
        <textarea
          id="agent-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this agent do?"
          rows={2}
          className={inputClass + ' resize-none h-auto py-2'}
        />
      </div>

      {/* Type */}
      <div className="grid gap-2">
        <Label>Type</Label>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="agent-type"
              value="specialist"
              checked={agentType === 'specialist'}
              onChange={() => setAgentType('specialist')}
              className="h-4 w-4 border-border"
            />
            <span className="text-sm">Specialist</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="agent-type"
              value="orchestrator"
              checked={agentType === 'orchestrator'}
              onChange={() => setAgentType('orchestrator')}
              className="h-4 w-4 border-border"
            />
            <span className="text-sm">Orchestrator</span>
          </label>
        </div>
      </div>

      {/* System Prompt */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="agent-system-prompt">System Prompt</Label>
          {isDefault && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetPrompt}
            >
              <Reset size={14} className="mr-1" />
              Reset to Default
            </Button>
          )}
        </div>
        <textarea
          id="agent-system-prompt"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="You are a helpful assistant..."
          rows={8}
          className={inputClass + ' resize-y h-auto py-2 min-h-[200px]'}
        />
      </div>

      {/* Model */}
      <div className="grid gap-2">
        <Label htmlFor="agent-model">Model</Label>
        <select
          id="agent-model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className={inputClass}
        >
          <option value="gemini-2.5-flash">gemini-2.5-flash</option>
          <option value="gemini-2.5-pro">gemini-2.5-pro</option>
        </select>
      </div>

      {/* Temperature */}
      <div className="grid gap-2">
        <Label htmlFor="agent-temperature">
          Temperature <span className="ml-2 font-mono text-sm text-muted-foreground">{temperature.toFixed(1)}</span>
        </Label>
        <input
          id="agent-temperature"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={temperature}
          onChange={(e) => setTemperature(Number(e.target.value))}
          className="w-full h-2 accent-primary cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0 — Precise</span>
          <span>1 — Creative</span>
        </div>
      </div>

      {/* Icon */}
      <div className="grid gap-2">
        <Label htmlFor="agent-icon">Icon</Label>
        <Input
          id="agent-icon"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="Carbon icon name, e.g. AiGovernanceLifecycle"
        />
        <p className="text-xs text-muted-foreground">
          Use a Carbon icon name from{' '}
          <a
            href="https://carbondesignsystem.com/elements/icons/library/"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            carbondesignsystem.com
          </a>
        </p>
      </div>

      {/* Tool Permissions */}
      <div className="grid gap-2">
        <Label>Tool Permissions</Label>
        <ToolPermissions tools={tools} onChange={setTools} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleSave} disabled={saving}>
          <Save size={16} className="mr-2" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/ai/agents')}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
