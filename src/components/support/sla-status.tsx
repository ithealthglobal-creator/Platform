'use client'

import { Badge } from '@/components/ui/badge'

interface SlaStatusProps {
  dueAt: string | null
  completedAt: string | null
  label?: string
}

export function getSlaState(dueAt: string | null, completedAt: string | null, createdAt?: string): 'met' | 'on_track' | 'warning' | 'breached' {
  if (!dueAt) return 'on_track'
  const due = new Date(dueAt).getTime()
  if (completedAt) {
    return new Date(completedAt).getTime() <= due ? 'met' : 'breached'
  }
  const now = Date.now()
  if (now > due) return 'breached'
  // If we have created_at, compute % elapsed; if > 75%, show warning
  if (createdAt) {
    const created = new Date(createdAt).getTime()
    const total = due - created
    const elapsed = now - created
    if (total > 0 && elapsed / total >= 0.75) return 'warning'
  }
  return 'on_track'
}

export function SlaStatus({ dueAt, completedAt, label }: SlaStatusProps) {
  const state = getSlaState(dueAt, completedAt)
  if (!dueAt) return null

  const due = new Date(dueAt)
  const now = new Date()

  if (state === 'met') {
    return <span className="text-xs font-semibold text-green-600">✓ {label || 'Met'}</span>
  }
  if (state === 'breached') {
    return <span className="text-xs font-semibold text-red-600">✗ {label || 'Breached'}</span>
  }
  if (state === 'warning') {
    const hoursLeft = Math.max(0, Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60) * 10) / 10)
    return <span className="text-xs font-semibold text-amber-500">⚠ {hoursLeft}h left</span>
  }
  const hoursLeft = Math.max(0, Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60) * 10) / 10)
  return <span className="text-xs font-semibold text-green-600">✓ {hoursLeft}h left</span>
}

export function SlaProgressBar({ dueAt, completedAt }: { dueAt: string | null; completedAt: string | null }) {
  if (!dueAt) return null
  const state = getSlaState(dueAt, completedAt)
  const colors: Record<string, string> = {
    met: 'bg-green-500',
    on_track: 'bg-green-500',
    warning: 'bg-amber-500',
    breached: 'bg-red-500',
  }

  let pct = 100
  if (!completedAt && dueAt) {
    const due = new Date(dueAt).getTime()
    const now = Date.now()
    // Approximate: assume SLA window started ~proportionally before due
    // In real usage, pass createdAt for accurate calculation
    const remaining = Math.max(0, due - now)
    const window = 24 * 60 * 60 * 1000 // fallback 24h window
    pct = Math.min(100, Math.max(0, (1 - remaining / window) * 100))
  }

  return (
    <div className="h-1 w-full rounded-full bg-slate-200">
      <div className={`h-1 rounded-full ${colors[state]}`} style={{ width: `${pct}%` }} />
    </div>
  )
}
