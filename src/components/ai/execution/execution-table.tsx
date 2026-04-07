'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface ExecutionRun {
  id: string
  conversation_id: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  started_at: string
  completed_at: string | null
  trigger_message_id: string | null
  ai_conversations?: { title: string | null }
}

interface ExecutionTableProps {
  runs: ExecutionRun[]
  loading: boolean
  onSelectRun: (runId: string) => void
  selectedRunId: string | null
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return 'Running...'
  const start = new Date(startedAt).getTime()
  const end = new Date(completedAt).getTime()
  const ms = end - start
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const mins = Math.floor(ms / 60000)
  const secs = Math.floor((ms % 60000) / 1000)
  return `${mins}m ${secs}s`
}

const STATUS_VARIANTS: Record<
  ExecutionRun['status'],
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  running: 'default',
  completed: 'default',
  failed: 'destructive',
  cancelled: 'secondary',
}

const STATUS_CLASSES: Record<ExecutionRun['status'], string> = {
  running: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
}

type StatusFilter = 'all' | ExecutionRun['status']

export function ExecutionTable({
  runs,
  loading,
  onSelectRun,
  selectedRunId,
}: ExecutionTableProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const filtered =
    statusFilter === 'all' ? runs : runs.filter((r) => r.status === statusFilter)

  return (
    <div className="flex flex-col gap-3">
      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500 shrink-0">Status:</span>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Conversation</TableHead>
              <TableHead className="w-[120px]">Duration</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-8 text-muted-foreground"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-8 text-muted-foreground"
                >
                  No execution runs found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((run) => (
                <TableRow
                  key={run.id}
                  className={`cursor-pointer transition-colors ${
                    selectedRunId === run.id
                      ? 'bg-blue-50 hover:bg-blue-50'
                      : 'hover:bg-slate-50'
                  }`}
                  onClick={() => onSelectRun(run.id)}
                >
                  <TableCell className="text-sm font-mono text-slate-600">
                    {formatTimestamp(run.started_at)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {run.ai_conversations?.title ?? 'Untitled'}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {formatDuration(run.started_at, run.completed_at)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[run.status]}`}
                    >
                      {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
