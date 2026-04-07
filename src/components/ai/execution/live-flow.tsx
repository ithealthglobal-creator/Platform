'use client'

import { useEffect, useState } from 'react'
import { Activity } from '@carbon/icons-react'
import type { ExecutionRun } from './execution-table'

interface LiveFlowProps {
  runs: ExecutionRun[]
}

function ElapsedTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState<string>('')

  useEffect(() => {
    function tick() {
      const ms = Date.now() - new Date(startedAt).getTime()
      if (ms < 1000) {
        setElapsed(`${ms}ms`)
      } else if (ms < 60000) {
        setElapsed(`${(ms / 1000).toFixed(0)}s`)
      } else {
        const mins = Math.floor(ms / 60000)
        const secs = Math.floor((ms % 60000) / 1000)
        setElapsed(`${mins}m ${secs}s`)
      }
    }

    tick()
    const interval = setInterval(tick, 500)
    return () => clearInterval(interval)
  }, [startedAt])

  return (
    <span className="font-mono text-sm text-blue-600 tabular-nums">{elapsed}</span>
  )
}

export function LiveFlow({ runs }: LiveFlowProps) {
  const runningRuns = runs.filter((r) => r.status === 'running')

  if (runningRuns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
        <Activity size={32} />
        <p className="text-sm font-medium">No active executions</p>
        <p className="text-xs text-slate-300">
          Executions will appear here when agents are running
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {runningRuns.map((run) => (
        <div
          key={run.id}
          className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm ring-1 ring-blue-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
              </span>
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                Running
              </span>
            </div>
            <ElapsedTimer startedAt={run.started_at} />
          </div>

          {/* Conversation title */}
          <div className="mb-1">
            <p className="text-sm font-medium text-slate-800 truncate">
              {run.ai_conversations?.title ?? 'Untitled conversation'}
            </p>
          </div>

          {/* Run ID */}
          <p className="text-xs font-mono text-slate-400 truncate">{run.id}</p>
        </div>
      ))}
    </div>
  )
}
