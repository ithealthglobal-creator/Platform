'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronRight, ChevronLeft, AiGovernanceLifecycle } from '@carbon/icons-react'
import { supabase } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { MessageList } from '@/components/ai/chat/message-list'
import { MessageInput } from '@/components/ai/chat/message-input'

const SERVICE_BUILDER_AGENT_ID = 'a0000000-0000-0000-0000-000000000005'

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

interface ServiceBuilderPanelProps {
  serviceId: string | null
  onServiceCreated: (id: string) => void
  onAgentDone: () => void
}

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// Tool name → table name. When a write tool finishes, the matching tab needs a refresh.
const WRITE_TOOL_PREFIXES = ['_create', '_update', '_delete']

function isWriteTool(toolName: string) {
  return WRITE_TOOL_PREFIXES.some((suffix) => toolName.endsWith(suffix))
}

export function ServiceBuilderPanel({
  serviceId,
  onServiceCreated,
  onAgentDone,
}: ServiceBuilderPanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [autoApprove, setAutoApprove] = useState(true)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingAgentName, setStreamingAgentName] = useState('')
  const [hasGreeted, setHasGreeted] = useState(false)

  const pendingConversationId = useRef<string | null>(null)
  const activeToolCallMessageId = useRef<string | null>(null)
  const sawWriteToolThisRun = useRef(false)
  const autoApproveRef = useRef(autoApprove)
  autoApproveRef.current = autoApprove

  const sendInternal = useCallback(
    async (
      message: string,
      opts: { resume?: boolean; resumeApproved?: boolean } = {},
    ) => {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) {
        toast.error('Not authenticated')
        return
      }

      if (!opts.resume) {
        const userMsgId = newId()
        setMessages((prev) => [...prev, { id: userMsgId, role: 'user', content: message }])
      }

      setStreamingContent('')
      setStreamingAgentName('')
      setIsStreaming(true)
      sawWriteToolThisRun.current = false

      const url = opts.resume
        ? '/api/admin/ai/chat/resume'
        : '/api/admin/ai/chat'

      const body = opts.resume
        ? {
            conversation_id: pendingConversationId.current,
            resume_value: { approved: opts.resumeApproved ?? true },
          }
        : {
            conversation_id: conversationId,
            message,
            agent_id: conversationId ? null : SERVICE_BUILDER_AGENT_ID,
          }

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const errText = await response.text()
          toast.error(`Chat error: ${errText}`)
          setIsStreaming(false)
          return
        }

        await processStream(response)
      } catch {
        toast.error('Connection error — please try again')
        setIsStreaming(false)
        setStreamingContent('')
      }
    },
    [conversationId],
  )

  async function processStream(response: Response) {
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    const headerConvId = response.headers.get('X-Conversation-Id')
    if (headerConvId && !conversationId) {
      setConversationId(headerConvId)
    }

    let assistantContent = ''
    let assistantAgentName = ''
    let assistantAgentIcon: string | null = null
    let assistantMsgId = newId()

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
            assistantContent += event.token as string
            setStreamingContent(assistantContent)
          } else if (eventType === 'agent_start') {
            assistantAgentName = (event.agent_name as string) ?? ''
            assistantAgentIcon = (event.agent_icon as string | null) ?? null
            setStreamingAgentName(assistantAgentName)
          } else if (eventType === 'tool_start') {
            const toolName = event.tool as string
            const toolInput = (event.input as Record<string, unknown>) ?? {}
            const tcMsgId = newId()
            activeToolCallMessageId.current = tcMsgId
            setMessages((prev) => [
              ...prev,
              {
                id: tcMsgId,
                role: 'assistant',
                content: '',
                agent_name: assistantAgentName || undefined,
                agent_icon: assistantAgentIcon,
                tool_calls: [{ name: toolName, input: toolInput, status: 'running' }],
              },
            ])
          } else if (eventType === 'tool_end') {
            const toolName = event.tool as string
            const toolOutput = event.output as
              | Record<string, unknown>
              | string
              | undefined
            const tcMsgId = activeToolCallMessageId.current

            if (tcMsgId) {
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== tcMsgId) return m
                  return {
                    ...m,
                    tool_calls: m.tool_calls?.map((tc) =>
                      tc.name === toolName
                        ? { ...tc, output: toolOutput, status: 'completed' }
                        : tc,
                    ),
                  }
                }),
              )
            }
            activeToolCallMessageId.current = null

            if (isWriteTool(toolName)) {
              sawWriteToolThisRun.current = true
            }

            // Detect new service creation: services_create returning a row with id.
            if (toolName === 'services_create' && !serviceId) {
              const newServiceId = extractIdFromOutput(toolOutput)
              if (newServiceId) {
                onServiceCreated(newServiceId)
              }
            }
          } else if (eventType === 'delegation') {
            const toAgent = event.to_agent as string
            assistantAgentName = toAgent
            setStreamingAgentName(toAgent)
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
            const approvalMsg =
              (event.message as string) ?? 'Approval required to proceed.'
            pendingConversationId.current = conversationId ?? headerConvId ?? null

            if (autoApproveRef.current) {
              // Skip the card entirely — resume immediately.
              setIsStreaming(false)
              await sendInternal('', { resume: true, resumeApproved: true })
              return
            }

            setMessages((prev) => [
              ...prev,
              {
                id: newId(),
                role: 'assistant',
                content: '',
                agent_name: assistantAgentName || undefined,
                agent_icon: assistantAgentIcon,
                approval_request: {
                  tool_calls: approvalToolCalls,
                  message: approvalMsg,
                },
              },
            ])
            setIsStreaming(false)
            return
          } else if (eventType === 'done') {
            if (event.conversation_id && !conversationId) {
              setConversationId(event.conversation_id as string)
            }
          } else if (eventType === 'error') {
            toast.error((event.message as string) || 'AI error')
          }
        }
      }
    } finally {
      if (assistantContent) {
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: 'assistant',
            content: assistantContent,
            agent_name: assistantAgentName || undefined,
            agent_icon: assistantAgentIcon,
          },
        ])
      }

      setIsStreaming(false)
      setStreamingContent('')
      setStreamingAgentName('')

      if (sawWriteToolThisRun.current) {
        onAgentDone()
      }
    }
  }

  // Send the opening user message once the user actually engages — we don't auto-fire so
  // they're not surprised by a stream on page load. Instead, render a friendly intro card
  // until they type.
  useEffect(() => {
    if (hasGreeted) return
    const seed: Message = {
      id: 'intro',
      role: 'assistant',
      content: serviceId
        ? `Hi — I'm the Service Builder. I can populate any of the tabs for this service. Tell me what you'd like to build out, or just say "go" and I'll walk you through it.`
        : `Hi — I'm the Service Builder. Describe the managed service you want to create (what it does, who it's for, which phase) and I'll set up every tab for you.`,
      agent_name: 'Service Builder',
      agent_icon: 'AiGovernanceLifecycle',
    }
    setMessages([seed])
    setHasGreeted(true)
  }, [serviceId, hasGreeted])

  function handleSend(text: string) {
    if (isStreaming) return
    // Inject service context on the first real user turn so the orchestrator knows what it's editing.
    const isFirstUserTurn = !messages.some((m) => m.role === 'user')
    const prefix = isFirstUserTurn
      ? serviceId
        ? `[Editing existing service id=${serviceId}] `
        : `[Creating a new service from scratch] `
      : ''
    sendInternal(prefix + text)
  }

  async function handleApprove() {
    setMessages((prev) => prev.filter((m) => !m.approval_request))
    await sendInternal('', { resume: true, resumeApproved: true })
  }

  async function handleReject() {
    setMessages((prev) => prev.filter((m) => !m.approval_request))
    await sendInternal('', { resume: true, resumeApproved: false })
  }

  if (collapsed) {
    return (
      <div className="flex h-full w-10 flex-col items-center border-l bg-white py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(false)}
          title="Open Service Builder"
        >
          <ChevronLeft size={16} />
        </Button>
        <div className="mt-3 flex flex-col items-center gap-2">
          <AiGovernanceLifecycle size={18} className="text-gray-500" />
          <span
            className="text-xs font-medium text-gray-600"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Service Builder
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-[400px] flex-col border-l bg-gray-50">
      <div className="flex items-center justify-between border-b bg-white px-3 py-2">
        <div className="flex items-center gap-2">
          <AiGovernanceLifecycle size={16} className="text-gray-700" />
          <span className="text-sm font-semibold">Service Builder</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer accent-blue-600"
            />
            Auto-approve writes
          </label>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(true)}
            title="Collapse"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

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
          serviceId
            ? 'Tell the agent what to build…'
            : 'Describe the service you want to create…'
        }
      />
    </div>
  )
}

function extractIdFromOutput(
  output: Record<string, unknown> | string | undefined,
): string | null {
  if (!output) return null
  // The Python CRUD tool returns str(result.data); since output is forwarded as-is,
  // it can arrive as a string representation of a list-of-dicts or as a parsed object.
  if (typeof output === 'string') {
    const match = output.match(
      /'id':\s*'([0-9a-f-]{36})'|"id":\s*"([0-9a-f-]{36})"/,
    )
    return match ? match[1] || match[2] : null
  }
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0] as Record<string, unknown>
    if (typeof first?.id === 'string') return first.id
  }
  if (typeof output === 'object' && 'id' in output && typeof output.id === 'string') {
    return output.id
  }
  return null
}
