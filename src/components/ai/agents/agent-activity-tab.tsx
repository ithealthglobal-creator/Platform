'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Badge } from '@/components/ui/badge'

interface AgentActivityTabProps {
  agentId: string
}

interface ActivityStep {
  id: string
  step_type: 'agent_call' | 'tool_call' | 'delegation' | 'response'
  tool_name: string | null
  status: 'running' | 'completed' | 'failed'
  duration_ms: number | null
  created_at: string
  run_id: string
  run: {
    started_at: string
    status: string
    conversation: { id: string; title: string | null } | null
  } | null
}

interface ActivityStats {
  conversationCount: number
  stepCount: number
  lastUsed: string | null
}

function formatRelative(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const seconds = Math.round((now - then) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function formatDuration(ms: number | null): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

const STEP_LABEL: Record<ActivityStep['step_type'], string> = {
  agent_call: 'Agent call',
  tool_call: 'Tool call',
  delegation: 'Delegation',
  response: 'Response',
}

export function AgentActivityTab({ agentId }: AgentActivityTabProps) {
  const [stats, setStats] = useState<ActivityStats | null>(null)
  const [steps, setSteps] = useState<ActivityStep[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivity = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [convRes, stepCountRes, stepsRes] = await Promise.all([
      supabase
        .from('ai_conversations')
        .select('id, updated_at', { count: 'exact', head: false })
        .eq('agent_id', agentId)
        .order('updated_at', { ascending: false })
        .limit(1),
      supabase
        .from('ai_execution_steps')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agentId),
      supabase
        .from('ai_execution_steps')
        .select(
          'id, step_type, tool_name, status, duration_ms, created_at, run_id, ai_execution_runs(started_at, status, conversation_id, ai_conversations(id, title))',
        )
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    if (convRes.error || stepCountRes.error || stepsRes.error) {
      setError('Failed to load activity')
      setLoading(false)
      return
    }

    const lastUsed = convRes.data?.[0]?.updated_at ?? null
    setStats({
      conversationCount: convRes.count ?? 0,
      stepCount: stepCountRes.count ?? 0,
      lastUsed,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalised: ActivityStep[] = (stepsRes.data ?? []).map((row: any) => {
      const run = row.ai_execution_runs
      const conversation = run?.ai_conversations
      return {
        id: row.id,
        step_type: row.step_type,
        tool_name: row.tool_name,
        status: row.status,
        duration_ms: row.duration_ms,
        created_at: row.created_at,
        run_id: row.run_id,
        run: run
          ? {
              started_at: run.started_at,
              status: run.status,
              conversation: conversation
                ? { id: conversation.id, title: conversation.title }
                : null,
            }
          : null,
      }
    })
    setSteps(normalised)
    setLoading(false)
  }, [agentId])

  useEffect(() => {
    fetchActivity()
  }, [fetchActivity])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-lg border bg-muted/40 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-lg border bg-muted/40 animate-pulse" />
      </div>
    )
  }

  if (error) {
    return <div className="text-sm text-destructive">{error}</div>
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Conversations" value={stats?.conversationCount ?? 0} />
        <StatCard label="Steps executed" value={stats?.stepCount ?? 0} />
        <StatCard
          label="Last used"
          value={stats?.lastUsed ? formatRelative(stats.lastUsed) : 'Never'}
          mono={false}
        />
      </div>

      {/* Recent steps */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Recent activity</h3>
        {steps.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card/50 p-8 text-center text-sm text-muted-foreground">
            This agent hasn&apos;t been used yet.
          </div>
        ) : (
          <div className="rounded-lg border divide-y bg-card">
            {steps.map((step) => (
              <div key={step.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                <Badge
                  variant={
                    step.status === 'failed'
                      ? 'destructive'
                      : step.status === 'running'
                        ? 'secondary'
                        : 'outline'
                  }
                  className="flex-shrink-0 text-[10px] uppercase tracking-wide"
                >
                  {step.status}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">
                    {STEP_LABEL[step.step_type]}
                    {step.tool_name ? (
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {step.tool_name}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {step.run?.conversation?.title || 'Untitled conversation'}
                  </div>
                </div>
                <div className="flex-shrink-0 text-xs text-muted-foreground font-mono w-14 text-right">
                  {formatDuration(step.duration_ms)}
                </div>
                <div className="flex-shrink-0 text-xs text-muted-foreground w-20 text-right">
                  {formatRelative(step.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  mono = true,
}: {
  label: string
  value: string | number
  mono?: boolean
}) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={'mt-1 text-xl font-semibold ' + (mono ? 'font-mono' : '')}>{value}</div>
    </div>
  )
}
