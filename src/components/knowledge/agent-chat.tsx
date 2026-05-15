'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Add, ChevronDown, Document } from '@carbon/icons-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase-client'
import { MessageList } from '@/components/ai/chat/message-list'
import { MessageInput } from '@/components/ai/chat/message-input'

const KNOWLEDGE_AGENT_ID = 'a0000000-0000-0000-0000-0000000000a1'

interface Conversation {
  id: string
  title: string | null
  document_id: string | null
  updated_at: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  agent_name?: string
  agent_icon?: string | null
  tool_calls?: Array<{
    name: string
    input: Record<string, unknown>
    output?: Record<string, unknown> | string
    status: 'running' | 'completed' | 'failed'
  }>
}

interface AgentChatProps {
  selectedDocumentId: string | null
  /** Called after the assistant finishes streaming so the page can refresh tree + active doc. */
  onChatComplete?: () => void
}

type Mode = 'document' | 'workspace'

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function AgentChat({ selectedDocumentId, onChatComplete }: AgentChatProps) {
  const [mode, setMode] = useState<Mode>('document')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const activeToolCallMessageId = useRef<string | null>(null)

  const effectiveMode: Mode = mode === 'document' && !selectedDocumentId ? 'workspace' : mode

  const fetchConversations = useCallback(async () => {
    let query = supabase
      .from('ai_conversations')
      .select('id, title, document_id, updated_at')
      .eq('agent_id', KNOWLEDGE_AGENT_ID)
      .order('updated_at', { ascending: false })

    if (effectiveMode === 'document' && selectedDocumentId) {
      query = query.eq('document_id', selectedDocumentId)
    } else {
      query = query.is('document_id', null)
    }

    const { data, error } = await query
    if (error) {
      toast.error('Failed to load conversations')
      return
    }
    setConversations(data ?? [])
  }, [effectiveMode, selectedDocumentId])

  useEffect(() => {
    setActiveConversationId(null)
    setMessages([])
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([])
      return
    }
    void (async () => {
      const { data, error } = await supabase
        .from('ai_messages')
        .select('id, role, content')
        .eq('conversation_id', activeConversationId)
        .order('created_at', { ascending: true })

      if (error) {
        toast.error('Failed to load messages')
        return
      }
      setMessages(
        (data ?? []).map((m) => ({
          id: m.id as string,
          role: m.role as ChatMessage['role'],
          content: (m.content as string) ?? '',
        })),
      )
    })()
  }, [activeConversationId])

  function handleNewChat() {
    setActiveConversationId(null)
    setMessages([])
    setStreamingContent('')
  }

  async function processStream(response: Response) {
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    const headerConvId = response.headers.get('X-Conversation-Id')
    if (headerConvId) setActiveConversationId(headerConvId)

    let assistantContent = ''
    setIsStreaming(true)
    setStreamingContent('')

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // SSE messages are separated by blank lines.
        const blocks = buffer.split('\n\n')
        buffer = blocks.pop() ?? ''

        for (const block of blocks) {
          let eventName = 'message'
          let dataPayload = ''
          for (const line of block.split('\n')) {
            if (line.startsWith('event: ')) eventName = line.slice(7).trim()
            else if (line.startsWith('data: ')) dataPayload += line.slice(6)
          }
          if (!dataPayload) continue

          let event: Record<string, unknown> = {}
          try {
            event = JSON.parse(dataPayload)
          } catch {
            continue
          }

          if (eventName === 'token') {
            assistantContent += (event.content as string) ?? ''
            setStreamingContent(assistantContent)
          } else if (eventName === 'tool_start') {
            const tcId = newId()
            activeToolCallMessageId.current = tcId
            setMessages((prev) => [
              ...prev,
              {
                id: tcId,
                role: 'assistant',
                content: '',
                tool_calls: [{
                  name: (event.tool as string) ?? 'tool',
                  input: (event.input as Record<string, unknown>) ?? {},
                  status: 'running',
                }],
              },
            ])
          } else if (eventName === 'tool_end') {
            const tcId = activeToolCallMessageId.current
            const toolName = (event.tool as string) ?? 'tool'
            const output = event.output as Record<string, unknown> | string | undefined
            if (tcId) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === tcId
                    ? {
                        ...m,
                        tool_calls: m.tool_calls?.map((tc) =>
                          tc.name === toolName
                            ? { ...tc, output, status: 'completed' as const }
                            : tc,
                        ),
                      }
                    : m,
                ),
              )
            }
            activeToolCallMessageId.current = null
          } else if (eventName === 'error') {
            toast.error((event.message as string) || 'Agent error')
          }
        }
      }
    } finally {
      if (assistantContent) {
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: 'assistant',
            content: assistantContent,
            agent_name: 'Knowledge',
            agent_icon: 'notebook',
          },
        ])
      }
      setIsStreaming(false)
      setStreamingContent('')
      await fetchConversations()
      onChatComplete?.()
    }
  }

  async function handleSend(message: string) {
    if (isStreaming) return
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (!token) {
      toast.error('Not authenticated')
      return
    }

    setMessages((prev) => [...prev, { id: newId(), role: 'user', content: message }])

    try {
      const response = await fetch('/api/admin/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversation_id: activeConversationId,
          message,
          agent_id: activeConversationId ? null : KNOWLEDGE_AGENT_ID,
          document_id: effectiveMode === 'document' ? selectedDocumentId : null,
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        toast.error(`Chat error: ${text}`)
        return
      }

      await processStream(response)
    } catch {
      toast.error('Connection error — please try again')
      setIsStreaming(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="flex items-center gap-2 border-b bg-white px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Knowledge agent
        </span>
        <div className="ml-auto flex items-center gap-1">
          <div className="inline-flex overflow-hidden rounded border border-slate-200 text-xs">
            <button
              onClick={() => setMode('document')}
              disabled={!selectedDocumentId}
              className={`px-2 py-1 ${
                effectiveMode === 'document'
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300'
              }`}
            >
              Document
            </button>
            <button
              onClick={() => setMode('workspace')}
              className={`px-2 py-1 ${
                effectiveMode === 'workspace'
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Workspace
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b bg-white px-3 py-1.5">
        <div className="relative flex-1">
          <select
            value={activeConversationId ?? ''}
            onChange={(e) => setActiveConversationId(e.target.value || null)}
            className="h-7 w-full appearance-none rounded border border-slate-200 bg-white pl-2 pr-6 text-xs text-slate-600 outline-none focus:border-blue-500"
          >
            <option value="">New conversation</option>
            {conversations.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title ?? new Date(c.updated_at).toLocaleString()}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>
        <button
          onClick={handleNewChat}
          title="Start new conversation"
          className="flex h-7 items-center gap-1 rounded border border-slate-200 bg-white px-2 text-xs text-slate-600 hover:bg-slate-100"
        >
          <Add size={12} />
          New
        </button>
      </div>

      {effectiveMode === 'document' && selectedDocumentId && (
        <div className="flex items-center gap-1 border-b bg-blue-50/40 px-3 py-1 text-xs text-blue-700">
          <Document size={12} />
          Scoped to current document
        </div>
      )}

      <MessageList
        messages={messages}
        isStreaming={isStreaming}
        streamingContent={streamingContent}
        streamingAgentName="Knowledge"
        onApprove={() => undefined}
        onReject={() => undefined}
      />

      <MessageInput
        onSend={handleSend}
        disabled={isStreaming}
        placeholder={
          effectiveMode === 'document'
            ? 'Ask about this document…'
            : 'Ask about anything in your knowledge base…'
        }
      />
    </div>
  )
}
