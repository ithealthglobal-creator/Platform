'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { ConversationList } from '@/components/ai/chat/conversation-list'
import { MessageList } from '@/components/ai/chat/message-list'
import { MessageInput } from '@/components/ai/chat/message-input'
import { AgentSelector } from '@/components/ai/chat/agent-selector'
import { PreviewPane } from '@/components/ai/chat/preview-pane'

interface Conversation {
  id: string
  title: string | null
  agent_id: string | null
  updated_at: string
  is_active: boolean
  ai_agents?: { name: string; icon: string | null }
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  agent_id?: string | null
  agent_name?: string
  agent_icon?: string | null
  tool_calls?: Array<{
    name: string
    input: Record<string, unknown>
    output?: Record<string, unknown> | string
    status: 'running' | 'completed' | 'failed'
  }>
  approval_request?: {
    tool_calls: Array<{ name: string; args: Record<string, unknown>; id: string }>
    message: string
  }
}

interface PreviewEvent {
  type: 'tool_start' | 'tool_end'
  tool: string
  input?: Record<string, unknown>
  output?: Record<string, unknown> | string
}

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingAgentName, setStreamingAgentName] = useState('')
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [previewEvents, setPreviewEvents] = useState<PreviewEvent[]>([])
  const [previewCollapsed, setPreviewCollapsed] = useState(false)

  // Track pending interrupt state for resume
  const pendingConversationId = useRef<string | null>(null)
  // Track tool calls currently in flight (keyed by tool name, value = message id)
  const activeToolCallMessageId = useRef<string | null>(null)

  // ─── Load conversations ────────────────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('id, title, agent_id, updated_at, is_active, ai_agents(name, icon)')
      .order('updated_at', { ascending: false })

    if (error) {
      toast.error('Failed to load conversations')
      return
    }

    // Supabase returns ai_agents as an array for to-one joins; normalise to object
    const normalised = (data ?? []).map((c) => ({
      ...c,
      ai_agents: Array.isArray(c.ai_agents) ? c.ai_agents[0] ?? null : c.ai_agents,
    })) as unknown as Conversation[]
    setConversations(normalised)
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // ─── Load messages for active conversation ─────────────────────────────────

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([])
      return
    }

    async function fetchMessages() {
      const { data, error } = await supabase
        .from('ai_messages')
        .select('id, role, content, agent_id, tool_calls, approval_request, ai_agents(name, icon)')
        .eq('conversation_id', activeConversationId)
        .order('created_at', { ascending: true })

      if (error) {
        toast.error('Failed to load messages')
        return
      }

      const mapped: Message[] = (data ?? []).map((m: Record<string, unknown>) => ({
        id: m.id as string,
        role: m.role as Message['role'],
        content: m.content as string,
        agent_id: m.agent_id as string | null | undefined,
        agent_name: (m.ai_agents as { name: string; icon: string | null } | null)?.name,
        agent_icon: (m.ai_agents as { name: string; icon: string | null } | null)?.icon,
        tool_calls: m.tool_calls as Message['tool_calls'],
        approval_request: m.approval_request as Message['approval_request'],
      }))

      setMessages(mapped)
    }

    fetchMessages()
    setPreviewEvents([])
  }, [activeConversationId])

  // ─── New chat ──────────────────────────────────────────────────────────────

  function handleNewChat() {
    setActiveConversationId(null)
    setMessages([])
    setStreamingContent('')
    setStreamingAgentName('')
    setPreviewEvents([])
  }

  // ─── Delete conversation ───────────────────────────────────────────────────

  async function handleDeleteConversation(id: string) {
    const { error } = await supabase.from('ai_conversations').delete().eq('id', id)

    if (error) {
      toast.error('Failed to delete conversation')
      return
    }

    toast.success('Conversation deleted')
    if (activeConversationId === id) {
      handleNewChat()
    }
    fetchConversations()
  }

  // ─── SSE stream processing ─────────────────────────────────────────────────

  async function processStream(
    response: Response,
    conversationId: string | null,
    userMessageId: string,
  ) {
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let resolvedConversationId = conversationId

    // The ID returned from the response header (new conversation)
    const headerConvId = response.headers.get('X-Conversation-Id')
    if (headerConvId && !resolvedConversationId) {
      resolvedConversationId = headerConvId
      setActiveConversationId(headerConvId)
    }

    // Current assistant message being built
    let assistantMsgId = newId()
    let assistantContent = ''
    let assistantAgentName = ''
    let assistantAgentIcon: string | null = null
    const toolCalls: Message['tool_calls'] = []

    setIsStreaming(true)
    setStreamingContent('')

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw || raw === '[DONE]') continue

          let event: Record<string, unknown>
          try {
            event = JSON.parse(raw) as Record<string, unknown>
          } catch {
            continue
          }

          const eventType = event.type as string

          if (eventType === 'token') {
            const token = event.token as string
            assistantContent += token
            setStreamingContent(assistantContent)
          } else if (eventType === 'agent_start') {
            assistantAgentName = (event.agent_name as string) ?? ''
            assistantAgentIcon = (event.agent_icon as string | null) ?? null
            setStreamingAgentName(assistantAgentName)
          } else if (eventType === 'tool_start') {
            const toolName = event.tool as string
            const toolInput = (event.input as Record<string, unknown>) ?? {}

            // Add a running tool_call entry to a new assistant message
            const tcMsgId = newId()
            activeToolCallMessageId.current = tcMsgId

            const tcMsg: Message = {
              id: tcMsgId,
              role: 'assistant',
              content: '',
              agent_name: assistantAgentName || undefined,
              agent_icon: assistantAgentIcon,
              tool_calls: [{ name: toolName, input: toolInput, status: 'running' }],
            }
            setMessages((prev) => [...prev, tcMsg])

            setPreviewEvents((prev) => [
              ...prev,
              { type: 'tool_start', tool: toolName, input: toolInput },
            ])
          } else if (eventType === 'tool_end') {
            const toolName = event.tool as string
            const toolOutput = event.output as Record<string, unknown> | string | undefined
            const tcMsgId = activeToolCallMessageId.current

            if (tcMsgId) {
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== tcMsgId) return m
                  return {
                    ...m,
                    tool_calls: m.tool_calls?.map((tc) =>
                      tc.name === toolName ? { ...tc, output: toolOutput, status: 'completed' } : tc,
                    ),
                  }
                }),
              )
            }

            setPreviewEvents((prev) => [
              ...prev,
              { type: 'tool_end', tool: toolName, output: toolOutput },
            ])

            // Reset for next tool
            activeToolCallMessageId.current = null
          } else if (eventType === 'delegation') {
            const toAgent = event.to_agent as string
            setStreamingAgentName(toAgent)
            assistantAgentName = toAgent

            // Add a system-style info message
            setMessages((prev) => [
              ...prev,
              {
                id: newId(),
                role: 'system',
                content: `Delegating to: ${toAgent}`,
              },
            ])
          } else if (eventType === 'interrupt') {
            const approvalToolCalls = event.tool_calls as Array<{
              name: string
              args: Record<string, unknown>
              id: string
            }>
            const approvalMsg = (event.message as string) ?? 'Approval required to proceed.'

            pendingConversationId.current = resolvedConversationId

            const approvalMsgObj: Message = {
              id: newId(),
              role: 'assistant',
              content: '',
              agent_name: assistantAgentName || undefined,
              agent_icon: assistantAgentIcon,
              approval_request: {
                tool_calls: approvalToolCalls,
                message: approvalMsg,
              },
            }
            setMessages((prev) => [...prev, approvalMsgObj])
            setIsStreaming(false)
            return // Pause — wait for approve/reject
          } else if (eventType === 'done') {
            // Extract conversation id if not yet known
            if (event.conversation_id && !resolvedConversationId) {
              resolvedConversationId = event.conversation_id as string
              setActiveConversationId(resolvedConversationId)
            }
          } else if (eventType === 'error') {
            toast.error((event.message as string) || 'An error occurred')
          }
        }
      }
    } finally {
      // Finalize streaming assistant message if content exists
      if (assistantContent) {
        const finalMsg: Message = {
          id: assistantMsgId,
          role: 'assistant',
          content: assistantContent,
          agent_name: assistantAgentName || undefined,
          agent_icon: assistantAgentIcon,
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        }
        setMessages((prev) => [...prev, finalMsg])
      }

      setIsStreaming(false)
      setStreamingContent('')
      setStreamingAgentName('')

      // Refresh conversation list
      await fetchConversations()
    }
  }

  // ─── Send message ──────────────────────────────────────────────────────────

  async function handleSend(message: string) {
    if (isStreaming) return

    // Require an agent for new conversations
    if (!activeConversationId && !selectedAgentId) {
      toast.error('Please select an agent to start a conversation')
      return
    }

    // Get auth session for the Bearer token
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (!token) {
      toast.error('Not authenticated')
      return
    }

    // Optimistically add user message
    const userMsgId = newId()
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', content: message },
    ])

    setStreamingContent('')
    setStreamingAgentName('')

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
          agent_id: selectedAgentId,
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        toast.error(`Chat error: ${errText}`)
        return
      }

      await processStream(response, activeConversationId, userMsgId)
    } catch (err) {
      toast.error('Connection error — please try again')
      setIsStreaming(false)
      setStreamingContent('')
    }
  }

  // ─── Approval handlers ─────────────────────────────────────────────────────

  async function handleApprove() {
    const convId = pendingConversationId.current
    if (!convId) return

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (!token) return

    // Remove the approval card message
    setMessages((prev) => prev.filter((m) => !m.approval_request))

    try {
      const response = await fetch('/api/admin/ai/chat/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversation_id: convId,
          resume_value: { approved: true },
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        toast.error(`Resume error: ${errText}`)
        return
      }

      pendingConversationId.current = null
      await processStream(response, convId, newId())
    } catch {
      toast.error('Failed to resume — please try again')
    }
  }

  async function handleReject() {
    const convId = pendingConversationId.current
    if (!convId) return

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (!token) return

    try {
      await fetch('/api/admin/ai/chat/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversation_id: convId,
          resume_value: { approved: false },
        }),
      })
    } catch {
      // best-effort
    }

    pendingConversationId.current = null
    setMessages((prev) => prev.filter((m) => !m.approval_request))
    toast.info('Action rejected')
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const isNewChat = !activeConversationId

  return (
    <div className="flex h-full -m-6">
      {/* Left panel: conversation list */}
      <ConversationList
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelect={(id) => setActiveConversationId(id)}
        onDelete={handleDeleteConversation}
        onNewChat={handleNewChat}
      />

      {/* Center panel: messages + input */}
      <div className="flex flex-1 flex-col min-w-0 bg-muted/50">
        {/* Agent selector for new chats */}
        {isNewChat && (
          <div className="border-b bg-white px-6 py-3 flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground shrink-0">Agent:</span>
            <div className="max-w-xs w-full">
              <AgentSelector value={selectedAgentId} onChange={setSelectedAgentId} />
            </div>
          </div>
        )}

        <MessageList
          messages={messages}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          streamingAgentName={streamingAgentName}
          onApprove={handleApprove}
          onReject={handleReject}
        />

        <MessageInput
          onSend={handleSend}
          disabled={isStreaming}
          placeholder={
            isNewChat && !selectedAgentId
              ? 'Select an agent above, then type a message…'
              : 'Type a message… (Shift+Enter for new line)'
          }
        />
      </div>

      {/* Right panel: preview pane */}
      <PreviewPane
        events={previewEvents}
        collapsed={previewCollapsed}
        onToggle={() => setPreviewCollapsed((c) => !c)}
      />
    </div>
  )
}
