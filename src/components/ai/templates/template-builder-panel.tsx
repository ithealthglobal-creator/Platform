'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronRight, ChevronLeft, Template as TemplateIcon } from '@carbon/icons-react'
import { supabase } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { MessageList } from '@/components/ai/chat/message-list'
import { MessageInput } from '@/components/ai/chat/message-input'

const TEMPLATE_BUILDER_AGENT_ID = 'a0000000-0000-0000-0000-000000000030'

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

interface TemplateBuilderPanelProps {
  /** Selected template id (null when no template is selected — agent will create one). */
  templateId: string | null
  /** Human-readable name for context priming. */
  templateName: string | null
  /** Fires after any write-tool run so the parent can re-fetch the list. */
  onTemplateMutated: () => void
  /** Fires once a brand-new template is created, with the new uuid. */
  onTemplateCreated?: (id: string) => void
}

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const WRITE_TOOL_SUFFIXES = ['_create', '_update', '_delete']

function isWriteTool(toolName: string) {
  return WRITE_TOOL_SUFFIXES.some((suffix) => toolName.endsWith(suffix))
}

export function TemplateBuilderPanel({
  templateId,
  templateName,
  onTemplateMutated,
  onTemplateCreated,
}: TemplateBuilderPanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [autoApprove, setAutoApprove] = useState(true)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingAgentName, setStreamingAgentName] = useState('')
  const hasGreetedFor = useRef<string>('')

  const pendingConversationId = useRef<string | null>(null)
  const activeToolCallMessageId = useRef<string | null>(null)
  const sawWriteToolThisRun = useRef(false)
  const autoApproveRef = useRef(autoApprove)
  autoApproveRef.current = autoApprove

  const sendInternal = useCallback(
    async (
      message: string,
      opts: {
        resume?: boolean
        resumeApproved?: boolean
        displayMessage?: string
      } = {},
    ) => {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) {
        toast.error('Not authenticated')
        return
      }

      if (!opts.resume) {
        const userMsgId = newId()
        const visible = opts.displayMessage ?? message
        setMessages((prev) => [...prev, { id: userMsgId, role: 'user', content: visible }])
      }

      setStreamingContent('')
      setStreamingAgentName('')
      setIsStreaming(true)
      sawWriteToolThisRun.current = false

      const url = opts.resume ? '/api/admin/ai/chat/resume' : '/api/admin/ai/chat'

      const body = opts.resume
        ? {
            conversation_id: pendingConversationId.current,
            resume_value: { approved: opts.resumeApproved ?? true },
          }
        : {
            conversation_id: conversationId,
            message,
            agent_id: conversationId ? null : TEMPLATE_BUILDER_AGENT_ID,
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
    [conversationId], // eslint-disable-line react-hooks/exhaustive-deps
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

    const handleEvent = async (
      eventName: string,
      data: Record<string, unknown>,
    ): Promise<'pause' | void> => {
      if (eventName === 'token') {
        const text = extractTokenText(data.content)
        if (text) {
          assistantContent += text
          setStreamingContent(assistantContent)
        }
      } else if (eventName === 'agent_start') {
        assistantAgentName = (data.agent_name as string) ?? ''
        assistantAgentIcon = (data.agent_icon as string | null) ?? null
        setStreamingAgentName(assistantAgentName)
      } else if (eventName === 'tool_start') {
        const toolName = data.tool as string
        const toolInput = (data.input as Record<string, unknown>) ?? {}
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
      } else if (eventName === 'tool_end') {
        const toolName = data.tool as string
        const toolOutput = data.output as
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

        if (toolName === 'ai_templates_create' && !templateId && onTemplateCreated) {
          const newTemplateId = extractIdFromOutput(toolOutput)
          if (newTemplateId) {
            onTemplateCreated(newTemplateId)
          }
        }
      } else if (eventName === 'interrupt') {
        const approvalToolCalls =
          (data.tool_calls as Array<{
            name: string
            args: Record<string, unknown>
            id: string
          }>) ?? []
        const approvalMsg = (data.message as string) ?? 'Approval required to proceed.'
        pendingConversationId.current = conversationId ?? headerConvId ?? null

        if (autoApproveRef.current) {
          setIsStreaming(false)
          await sendInternal('', { resume: true, resumeApproved: true })
          return 'pause'
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
        return 'pause'
      } else if (eventName === 'done') {
        if (data.conversation_id && !conversationId) {
          setConversationId(data.conversation_id as string)
        }
      } else if (eventName === 'error') {
        toast.error((data.message as string) || 'AI error')
      }
    }

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const records = buffer.split('\n\n')
        buffer = records.pop() ?? ''

        for (const record of records) {
          let eventName = ''
          let dataPayload = ''
          for (const line of record.split('\n')) {
            if (line.startsWith('event: ')) eventName = line.slice(7).trim()
            else if (line.startsWith('data: ')) dataPayload += line.slice(6)
          }
          if (!dataPayload || dataPayload === '[DONE]') continue

          let data: Record<string, unknown>
          try {
            data = JSON.parse(dataPayload) as Record<string, unknown>
          } catch {
            continue
          }

          if (!eventName) eventName = (data.type as string) ?? ''
          const result = await handleEvent(eventName, data)
          if (result === 'pause') return
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
        onTemplateMutated()
      }
    }
  }

  // Reset the conversation whenever the selection swaps so context doesn't bleed.
  useEffect(() => {
    const key = templateId ?? '__new__'
    if (hasGreetedFor.current === key) return
    hasGreetedFor.current = key

    setConversationId(null)
    setMessages([
      {
        id: 'intro-' + key,
        role: 'assistant',
        content: templateId
          ? `Hi — I'm the Template Builder. I can rewrite copy, swap blocks, or change the layout on **${templateName ?? 'this template'}** while staying inside the brand rules. What would you like to change?`
          : `Hi — I'm the Template Builder. Tell me the kind of brand template you want (landing page, brochure, presentation, document, website page, social post) and roughly what it's for, and I'll draft it.`,
        agent_name: 'Template Builder',
        agent_icon: 'Template',
      },
    ])
  }, [templateId, templateName])

  function handleSend(text: string) {
    if (isStreaming) return
    const isFirstUserTurn = !messages.some((m) => m.role === 'user')
    const prefix = isFirstUserTurn
      ? templateId
        ? `[Editing existing template id=${templateId}${templateName ? ` name="${templateName}"` : ''}] `
        : `[Creating a new template from scratch] `
      : ''
    sendInternal(prefix + text, { displayMessage: text })
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
          title="Open Template Builder"
        >
          <ChevronLeft size={16} />
        </Button>
        <div className="mt-3 flex flex-col items-center gap-2">
          <TemplateIcon size={18} className="text-gray-500" />
          <span
            className="text-xs font-medium text-gray-600"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Template Builder
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-[400px] flex-shrink-0 flex-col border-l bg-gray-50">
      <div className="flex items-center justify-between border-b bg-white px-3 py-2">
        <div className="flex items-center gap-2">
          <TemplateIcon size={16} className="text-gray-700" />
          <span className="text-sm font-semibold">Template Builder</span>
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
          templateId
            ? 'Tell the builder what to change…'
            : 'Describe the template you want to create…'
        }
      />
    </div>
  )
}

function extractIdFromOutput(
  output: Record<string, unknown> | string | undefined,
): string | null {
  if (!output) return null
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

function extractTokenText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((c) => {
        if (typeof c === 'string') return c
        if (c && typeof c === 'object' && 'text' in c) {
          const t = (c as { text?: unknown }).text
          return typeof t === 'string' ? t : ''
        }
        return ''
      })
      .join('')
  }
  return ''
}
