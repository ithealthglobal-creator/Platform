'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Save, Reset, TrashCan } from '@carbon/icons-react'
import { ToolPermissions, AgentTool } from './tool-permissions'
import { AgentActivityTab } from './agent-activity-tab'

interface AgentFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData?: any
  onSave: (data: any) => Promise<void>
  onCancel?: () => void
  onDelete?: () => void
  saving: boolean
}

export function AgentForm({ initialData, onSave, onCancel, onDelete, saving }: AgentFormProps) {
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
  const isExisting = !!initialData?.id
  const originalSystemPrompt = initialData?.system_prompt ?? ''

  // Re-sync form state when the parent swaps to a different agent or fires a live
  // refresh after the AI assistant mutates the row.
  useEffect(() => {
    setName(initialData?.name ?? '')
    setDescription(initialData?.description ?? '')
    setAgentType(initialData?.agent_type ?? 'specialist')
    setSystemPrompt(initialData?.system_prompt ?? '')
    setModel(initialData?.model ?? 'gemini-2.5-flash')
    setTemperature(initialData?.temperature != null ? Number(initialData.temperature) : 0.7)
    setIcon(initialData?.icon ?? '')
    setTools(initialData?.tools ?? [])
  }, [initialData])

  async function handleSave() {
    await onSave({ name, description, agent_type: agentType, system_prompt: systemPrompt, model, temperature, icon, tools })
  }

  function handleResetPrompt() {
    setSystemPrompt(originalSystemPrompt)
  }

  function handleCancel() {
    if (onCancel) onCancel()
    else router.push('/ai/agents')
  }

  const inputClass =
    'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

  return (
    <div className="max-w-2xl">
      <Tabs defaultValue="overview">
        <TabsList variant="line" className="w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="activity" disabled={!isExisting}>
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <div className="grid gap-6">
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
          </div>
        </TabsContent>

        <TabsContent value="tools" className="pt-4">
          <div className="grid gap-2">
            <Label>Tool Permissions</Label>
            <p className="text-xs text-muted-foreground -mt-1">
              Select which tables this agent can read or modify. Tools take effect on the next conversation.
            </p>
            <div className="mt-2">
              <ToolPermissions tools={tools} onChange={setTools} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="pt-4">
          {isExisting ? (
            <AgentActivityTab agentId={initialData.id} />
          ) : (
            <div className="rounded-lg border border-dashed bg-card/50 p-8 text-center text-sm text-muted-foreground">
              Activity will appear here once the agent is saved and used.
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Actions — always visible across tabs */}
      <div className="flex items-center justify-between gap-3 pt-6 mt-6 border-t">
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            <Save size={16} className="mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
        {isExisting && onDelete && (
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            disabled={saving || isDefault}
            title={isDefault ? 'Default agents cannot be deleted' : 'Delete agent'}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <TrashCan size={16} className="mr-2" />
            Delete
          </Button>
        )}
      </div>
    </div>
  )
}
