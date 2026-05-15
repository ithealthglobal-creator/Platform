'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { ExecutionTable, type ExecutionRun } from '@/components/ai/execution/execution-table'
import { ExecutionTimeline, type ExecutionStep } from '@/components/ai/execution/execution-timeline'
import { LiveFlow } from '@/components/ai/execution/live-flow'

type Tab = 'live' | 'history'

export default function ExecutionPage() {
  const [activeTab, setActiveTab] = useState<Tab>('live')
  const [runs, setRuns] = useState<ExecutionRun[]>([])
  const [runsLoading, setRunsLoading] = useState(true)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [steps, setSteps] = useState<ExecutionStep[]>([])
  const [stepsLoading, setStepsLoading] = useState(false)
  const liveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ─── Fetch execution runs ──────────────────────────────────────────────────

  const fetchRuns = useCallback(async () => {
    const { data, error } = await supabase
      .from('ai_execution_runs')
      .select('*, ai_conversations(title)')
      .order('started_at', { ascending: false })
      .limit(100)

    if (error) {
      toast.error('Failed to load execution runs')
      setRunsLoading(false)
      return
    }

    // Normalise joined ai_conversations (Supabase returns array for to-one joins)
    const normalised = (data ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      ai_conversations: Array.isArray(r.ai_conversations)
        ? (r.ai_conversations[0] ?? null)
        : r.ai_conversations,
    })) as unknown as ExecutionRun[]

    setRuns(normalised)
    setRunsLoading(false)
  }, [])

  // ─── Fetch steps for selected run ─────────────────────────────────────────

  const fetchSteps = useCallback(async (runId: string) => {
    setStepsLoading(true)
    const { data, error } = await supabase
      .from('ai_execution_steps')
      .select('*, ai_agents(name, icon)')
      .eq('run_id', runId)
      .order('created_at', { ascending: true })

    if (error) {
      toast.error('Failed to load execution steps')
      setStepsLoading(false)
      return
    }

    const normalised = (data ?? []).map((s: Record<string, unknown>) => ({
      ...s,
      ai_agents: Array.isArray(s.ai_agents)
        ? (s.ai_agents[0] ?? null)
        : s.ai_agents,
    })) as unknown as ExecutionStep[]

    setSteps(normalised)
    setStepsLoading(false)
  }, [])

  // ─── Handle run selection ──────────────────────────────────────────────────

  function handleSelectRun(runId: string) {
    setSelectedRunId(runId)
    fetchSteps(runId)
  }

  // ─── Live tab auto-refresh every 5 seconds ─────────────────────────────────

  useEffect(() => {
    fetchRuns()
  }, [fetchRuns])

  useEffect(() => {
    if (activeTab === 'live') {
      liveIntervalRef.current = setInterval(() => {
        fetchRuns()
      }, 5000)
    }
    return () => {
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current)
    }
  }, [activeTab, fetchRuns])

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full gap-0">
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b mb-6">
        {(['live', 'history'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'border-foreground/40 text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {tab === 'live' ? 'Live' : 'History'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'live' && (
        <div>
          <LiveFlow runs={runs} />
        </div>
      )}

      {activeTab === 'history' && (
        <div className="flex gap-6 min-h-0 flex-1">
          {/* Left: execution table */}
          <div className="flex-1 min-w-0 overflow-auto">
            <ExecutionTable
              runs={runs}
              loading={runsLoading}
              onSelectRun={handleSelectRun}
              selectedRunId={selectedRunId}
            />
          </div>

          {/* Right: timeline detail */}
          <div className="w-[420px] shrink-0">
            {selectedRunId ? (
              <div className="rounded-lg border bg-muted/50 p-4 overflow-auto max-h-[calc(100vh-220px)]">
                <h3 className="text-sm font-semibold text-foreground mb-4">
                  Execution Steps
                </h3>
                <ExecutionTimeline steps={steps} loading={stepsLoading} />
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/50 p-6 flex items-center justify-center h-48">
                <p className="text-sm text-muted-foreground">
                  Select a run to view its steps
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
