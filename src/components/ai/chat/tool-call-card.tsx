'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from '@carbon/icons-react'
import { Badge } from '@/components/ui/badge'

interface ToolCallCardProps {
  toolName: string
  input: Record<string, unknown>
  output?: Record<string, unknown> | string
  duration?: number
  status: 'running' | 'completed' | 'failed'
}

export function ToolCallCard({ toolName, input, output, duration, status }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(status === 'running')

  const statusIndicator = () => {
    if (status === 'running') {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-blue-600">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          Running
        </span>
      )
    }
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-green-600">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          Done
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-600">
        <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
        Failed
      </span>
    )
  }

  return (
    <div className="border rounded-lg p-3 my-2 bg-white text-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex-shrink-0 text-gray-500 hover:text-gray-700"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <Badge variant="secondary" className="font-mono text-xs truncate">
            {toolName}
          </Badge>
          {statusIndicator()}
        </div>
        {status === 'completed' && duration !== undefined && (
          <Badge variant="outline" className="text-xs flex-shrink-0">
            {duration}ms
          </Badge>
        )}
      </div>

      {expanded && (
        <div className="mt-2 space-y-2">
          <div>
            <p className="text-xs text-gray-500 mb-1 font-medium">Input</p>
            <pre className="bg-gray-100 rounded p-2 text-xs overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(input, null, 2)}
            </pre>
          </div>
          {output !== undefined && (
            <div>
              <p className="text-xs text-gray-500 mb-1 font-medium">Output</p>
              <pre className="bg-gray-100 rounded p-2 text-xs overflow-x-auto whitespace-pre-wrap">
                {typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
