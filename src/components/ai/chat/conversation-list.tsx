'use client'

import { Add, Chat, TrashCan } from '@carbon/icons-react'
import { Button } from '@/components/ui/button'

interface Conversation {
  id: string
  title: string | null
  agent_id: string | null
  updated_at: string
  is_active: boolean
  ai_agents?: { name: string; icon: string | null }
}

interface ConversationListProps {
  conversations: Conversation[]
  activeConversationId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onNewChat: () => void
}

// Map known icon slugs to Carbon icon components
const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  chat: Chat,
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function getBucket(dateStr: string): 'today' | 'yesterday' | 'week' | 'older' {
  const date = new Date(dateStr)
  const now = new Date()

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000)
  const startOfWeek = new Date(startOfToday.getTime() - 6 * 86400000)

  if (date >= startOfToday) return 'today'
  if (date >= startOfYesterday) return 'yesterday'
  if (date >= startOfWeek) return 'week'
  return 'older'
}

const BUCKET_LABELS: Record<string, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'This Week',
  older: 'Older',
}

function ConversationItem({
  conv,
  isActive,
  onSelect,
  onDelete,
}: {
  conv: Conversation
  isActive: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}) {
  const iconSlug = conv.ai_agents?.icon ?? null
  const IconComponent = iconSlug ? (iconMap[iconSlug.toLowerCase()] ?? Chat) : Chat

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (confirm(`Delete "${conv.title ?? 'New Conversation'}"? This cannot be undone.`)) {
      onDelete(conv.id)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(conv.id)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(conv.id)}
      className={`group flex items-start gap-2 rounded-md px-3 py-2 cursor-pointer select-none transition-colors ${
        isActive
          ? 'bg-blue-50 border-l-2 border-blue-500 pl-[10px]'
          : 'hover:bg-slate-50 border-l-2 border-transparent pl-[10px]'
      }`}
    >
      <div className="mt-0.5 shrink-0 text-slate-400">
        <IconComponent size={16} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-medium text-slate-700">
          {conv.title ?? 'New Conversation'}
        </div>
        {conv.ai_agents?.name && (
          <div className="truncate text-xs text-slate-400">{conv.ai_agents.name}</div>
        )}
        <div className="text-xs text-slate-400">{formatRelativeTime(conv.updated_at)}</div>
      </div>

      <button
        onClick={handleDelete}
        title="Delete conversation"
        className="shrink-0 mt-0.5 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 hover:bg-red-50"
      >
        <TrashCan size={14} />
      </button>
    </div>
  )
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelect,
  onDelete,
  onNewChat,
}: ConversationListProps) {
  const active = conversations.filter((c) => c.is_active)
  const archived = conversations.filter((c) => !c.is_active)

  // Group active conversations by date bucket
  const buckets: Record<string, Conversation[]> = { today: [], yesterday: [], week: [], older: [] }
  for (const conv of active) {
    buckets[getBucket(conv.updated_at)].push(conv)
  }

  const bucketOrder = ['today', 'yesterday', 'week', 'older'] as const

  return (
    <aside className="w-[280px] shrink-0 border-r flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-3 border-b">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={onNewChat}
        >
          <Add size={16} />
          New Chat
        </Button>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto py-2 space-y-4">
        {bucketOrder.map((bucket) => {
          const items = buckets[bucket]
          if (items.length === 0) return null
          return (
            <div key={bucket}>
              <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {BUCKET_LABELS[bucket]}
              </div>
              {items.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  isActive={conv.id === activeConversationId}
                  onSelect={onSelect}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )
        })}

        {active.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-slate-400">
            No conversations yet. Start a new chat!
          </div>
        )}

        {/* Archived section */}
        {archived.length > 0 && (
          <div>
            <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Archived
            </div>
            {archived.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isActive={conv.id === activeConversationId}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
