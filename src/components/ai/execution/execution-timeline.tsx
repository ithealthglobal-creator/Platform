'use client'

import { useState } from 'react'
import { Bot, ArrowRight, Tools, Chat, ChevronDown, ChevronRight } from '@carbon/icons-react'

export interface ExecutionStep {
  id: string
  agent_id: string | null
  step_type: 'agent_call' | 'tool_call' | 'delegation' | 'response'
  tool_name: string | null
  input: Record<string, unknown> | null
  output: Record<string, unknown> | null
  duration_ms: number | null
  status: 'running' | 'completed' | 'failed'
  created_at: string
  ai_agents?: { name: string; icon: string | null }
}

interface ExecutionTimelineProps {
  steps: ExecutionStep[]
  loading: boolean
}

const STEP_TYPE_ICON: Record<ExecutionStep['step_type'], React.ReactNode> = {
  tool_call: <Tools size={14} />,
  delegation: <ArrowRight size={14} />,
  agent_call: <Bot size={14} />,
  response: <Chat size={14} />,
}

const STATUS_COLORS: Record<ExecutionStep['status'], string> = {
  completed: 'bg-green-500 border-green-500',
  failed: 'bg-red-500 border-red-500',
  running: 'bg-blue-500 border-blue-500',
}

const STATUS_RING: Record<ExecutionStep['status'], string> = {
  completed: 'ring-green-200',
  failed: 'ring-red-200',
  running: 'ring-blue-200',
}

function formatMs(ms: number | null): string {
  if (ms === null) return ''
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function JsonPanel({
  label,
  data,
}: {
  label: string
  data: Record<string, unknown> | null
}) {
  const [open, setOpen] = useState(false)

  if (!data) return null

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {label}
      </button>
      {open && (
        <pre className="mt-1 rounded bg-slate-900 text-slate-100 text-xs p-3 overflow-auto max-h-48 font-mono">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  )
}

export function ExecutionTimeline({ steps, loading }: ExecutionTimelineProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        Loading steps...
      </div>
    )
  }

  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        No steps recorded
      </div>
    )
  }

  return (
    <div className="relative pl-8">
      {/* Vertical line */}
      <div className="absolute left-3 top-2 bottom-2 w-px bg-slate-200" />

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className="relative">
            {/* Circle indicator */}
            <div
              className={`absolute -left-5 top-1 w-4 h-4 rounded-full border-2 ring-2 ring-offset-1 ${STATUS_COLORS[step.status]} ${STATUS_RING[step.status]}`}
            />

            {/* Step content */}
            <div className="rounded-lg border bg-white p-3 shadow-sm">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Step type icon */}
                <span className="text-slate-400 flex items-center">
                  {STEP_TYPE_ICON[step.step_type]}
                </span>

                {/* Agent name */}
                {step.ai_agents?.name && (
                  <span className="text-sm font-medium text-slate-700">
                    {step.ai_agents.name}
                  </span>
                )}

                {/* Step type label */}
                <span className="text-xs text-slate-400 capitalize">
                  {step.step_type.replace('_', ' ')}
                </span>

                {/* Tool name */}
                {step.tool_name && (
                  <code className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                    {step.tool_name}
                  </code>
                )}

                {/* Duration badge */}
                {step.duration_ms !== null && (
                  <span className="ml-auto text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">
                    {formatMs(step.duration_ms)}
                  </span>
                )}

                {/* Status indicator dot */}
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    step.status === 'completed'
                      ? 'bg-green-500'
                      : step.status === 'failed'
                        ? 'bg-red-500'
                        : 'bg-blue-500 animate-pulse'
                  }`}
                />
              </div>

              {/* Delegation arrow */}
              {step.step_type === 'delegation' && !!step.output?.to_agent && (
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                  <ArrowRight size={14} className="text-amber-500" />
                  <span>Delegating to</span>
                  <span className="font-medium text-slate-700">
                    {String(step.output.to_agent)}
                  </span>
                </div>
              )}

              {/* JSON panels */}
              <JsonPanel label="Input" data={step.input} />
              <JsonPanel label="Output" data={step.output} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
