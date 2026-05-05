'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChartLine } from '@carbon/icons-react'
import { supabase } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { MessageList } from '@/components/ai/chat/message-list'
import { MessageInput } from '@/components/ai/chat/message-input'
import type { ChartSpec } from '@/lib/dashboard/types'

const DASHBOARD_GENERATOR_AGENT_ID = 'a0000000-0000-0000-0000-000000000007'

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
}

interface Props {
  selectedChartId: string | null
  onChartProposed: (spec: ChartSpec) => void
  onChartUpdated: (chartId: string, patch: Partial<ChartSpec>) => void
  onChartRemoved: (chartId: string) => void
  resetSignal: number
}

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function parseToolOutput(
  output: Record<string, unknown> | string | undefined,
): Record<string, unknown> | null {
  if (!output) return null
  if (typeof output === 'string') {
    try {
      return JSON.parse(output) as Record<string, unknown>
    } catch {
      return null
    }
  }
  return output as Record<string, unknown>
}

export function DashboardGeneratorPanel({
  selectedChartId,
  onChartProposed,
  onChartUpdated,
  onChartRemoved,
  resetSignal,
}: Props) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingAgentName, setStreamingAgentName] = useState('')

  // Stash callbacks in refs so the load effect doesn't depend on parent identity
  // (avoids the description-tab refetch loop pattern from commit 6063e71).
  const onChartProposedRef = useRef(onChartProposed)
  const onChartUpdatedRef = useRef(onChartUpdated)
  const onChartRemovedRef = useRef(onChartRemoved)
  const selectedChartIdRef = useRef(selectedChartId)
  onChartProposedRef.current = onChartProposed
  onChartUpdatedRef.current = onChartUpdated
  onChartRemovedRef.current = onChartRemoved
  selectedChartIdRef.current = selectedChartId

  const activeToolCallMessageId = useRef<string | null>(null)

  // Reset conversation when the parent flips a new dashboard in.
  useEffect(() => {
    setConversationId(null)
    setMessages([
      {
        id: 'intro',
        role: 'assistant',
        content:
          "Hi — I'm the Dashboard Generator. Tell me what to chart and I'll add it to the canvas. Click any chart on the left to edit it.",
        agent_name: 'Dashboard Generator',
        agent_icon: 'ChartLine',
      },
    ])
    setStreamingContent('')
    setStreamingAgentName('')
    setIsStreaming(false)
  }, [resetSignal])

  const sendInternal = useCallback(
    async (message: string, displayMessage?: string) => {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) {
        toast.error('Not authenticated')
        return
      }

      const userMsgId = newId()
      const visible = displayMessage ?? message
      setMessages((prev) => [...prev, { id: userMsgId, role: 'user', content: visible }])

      setStreamingContent('')
      setStreamingAgentName('')
      setIsStreaming(true)

      const body = {
        conversation_id: conversationId,
        message,
        agent_id: conversationId ? null : DASHBOARD_GENERATOR_AGENT_ID,
      }

      try {
        const response = await fetch('/api/admin/ai/chat', {
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
    const assistantMsgId = newId()

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
            assistantContent += (event.token as string) ?? (event.content as string) ?? ''
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
                prev.map((m) =>
                  m.id === tcMsgId
                    ? {
                        ...m,
                        tool_calls: m.tool_calls?.map((tc) =>
                          tc.name === toolName
                            ? { ...tc, output: toolOutput, status: 'completed' }
                            : tc,
                        ),
                      }
                    : m,
                ),
              )
            }
            activeToolCallMessageId.current = null

            // Apply chart-mutation tool outputs to the canvas.
            const parsed = parseToolOutput(toolOutput)
            if (parsed && parsed.ok) {
              if (toolName === 'dashboard_propose_chart' && parsed.chart) {
                onChartProposedRef.current(parsed.chart as ChartSpec)
              } else if (toolName === 'dashboard_update_chart' && parsed.chart_id) {
                onChartUpdatedRef.current(
                  parsed.chart_id as string,
                  (parsed.patch as Partial<ChartSpec>) ?? {},
                )
              } else if (toolName === 'dashboard_remove_chart' && parsed.chart_id) {
                onChartRemovedRef.current(parsed.chart_id as string)
              }
            }
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
    }
  }

  function handleSend(text: string) {
    if (isStreaming) return
    const chartId = selectedChartIdRef.current
    const prefix = chartId ? `[Editing chart id=${chartId}] ` : ''
    sendInternal(prefix + text, text)
  }

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="flex items-center gap-2 border-b bg-white px-3 py-2">
        <ChartLine size={16} className="text-gray-700" />
        <span className="text-sm font-semibold">Dashboard Generator</span>
        {selectedChartId ? (
          <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
            Editing chart
          </span>
        ) : null}
      </div>

      <MessageList
        messages={messages}
        isStreaming={isStreaming}
        streamingContent={streamingContent}
        streamingAgentName={streamingAgentName}
        onApprove={() => {}}
        onReject={() => {}}
      />

      <MessageInput
        onSend={handleSend}
        disabled={isStreaming}
        placeholder={
          selectedChartId
            ? 'Tell the agent how to change this chart…'
            : 'Describe a chart you want to add…'
        }
      />
    </div>
  )
}
