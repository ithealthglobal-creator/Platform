'use client'

import Link from 'next/link'
import { Close, Edit } from '@carbon/icons-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { iconMap } from '@/lib/icon-map'

interface AgentDetailPanelProps {
  agent: {
    id: string
    name: string
    agent_type: string
    description: string | null
    model: string
    system_prompt: string | null
    icon: string | null
    is_default: boolean
    ai_agent_tools?: Array<{ tool_name: string; operations: string[] | null }>
  } | null
  onClose: () => void
}

export function AgentDetailPanel({ agent, onClose }: AgentDetailPanelProps) {
  const isOpen = agent !== null

  return (
    <div
      className={`fixed top-0 right-0 h-full w-[350px] border-l bg-white shadow-lg z-50 flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {agent && (
        <>
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b">
            <div className="flex items-center gap-3 min-w-0">
              {agent.icon && iconMap[agent.icon] ? (
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                  {(() => {
                    const Icon = iconMap[agent.icon!]!
                    return <Icon size={20} className="text-slate-600" />
                  })()}
                </div>
              ) : null}
              <div className="min-w-0">
                <h2 className="font-semibold text-sm text-slate-900 truncate">{agent.name}</h2>
                <Badge
                  variant={agent.agent_type === 'orchestrator' ? 'secondary' : 'default'}
                  className="mt-1 text-xs"
                >
                  {agent.agent_type === 'orchestrator' ? 'Orchestrator' : 'Specialist'}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose} className="flex-shrink-0 ml-2">
              <Close size={16} />
            </Button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Description */}
            {agent.description && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Description
                </p>
                <p className="text-sm text-slate-700">{agent.description}</p>
              </div>
            )}

            {/* Model */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Model
              </p>
              <p className="text-sm text-slate-700 font-mono">{agent.model || '—'}</p>
            </div>

            {/* Tools */}
            {agent.ai_agent_tools && agent.ai_agent_tools.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Tools ({agent.ai_agent_tools.length})
                </p>
                <div className="space-y-2">
                  {agent.ai_agent_tools.map((tool, i) => (
                    <div key={i} className="bg-slate-50 rounded-md p-3">
                      <p className="text-xs font-semibold text-slate-700 mb-1">{tool.tool_name}</p>
                      {tool.operations && tool.operations.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tool.operations.map((op, j) => (
                            <Badge key={j} variant="outline" className="text-xs px-1.5 py-0">
                              {op}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Prompt */}
            {agent.system_prompt && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  System Prompt
                </p>
                <p className="text-xs text-slate-600 bg-slate-50 rounded-md p-3 leading-relaxed line-clamp-6 font-mono whitespace-pre-wrap">
                  {agent.system_prompt.length > 300
                    ? agent.system_prompt.slice(0, 300) + '…'
                    : agent.system_prompt}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t">
            <Link href={`/ai/agents/${agent.id}/edit`} className="w-full">
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Edit size={14} />
                Edit Agent
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
