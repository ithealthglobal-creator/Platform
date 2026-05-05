'use client'

import { Fragment, useEffect, useRef } from 'react'
import { iconMap } from '@/lib/icon-map'
import { ToolCallCard } from './tool-call-card'
import { ApprovalCard } from './approval-card'

const CITATION_RE = /\(source:\s*([^)]+)\)/g

function renderWithCitations(text: string) {
  const parts: Array<string | { kind: 'cite'; title: string }> = []
  let lastIndex = 0
  for (const match of text.matchAll(CITATION_RE)) {
    const start = match.index ?? 0
    if (start > lastIndex) parts.push(text.slice(lastIndex, start))
    parts.push({ kind: 'cite', title: match[1].trim() })
    lastIndex = start + match[0].length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}

function CitationBadge({ title }: { title: string }) {
  return (
    <span
      className="mx-0.5 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700"
      title={`Source: ${title}`}
    >
      {title}
    </span>
  )
}

function CitedText({ text }: { text: string }) {
  const parts = renderWithCitations(text)
  if (parts.length === 1 && typeof parts[0] === 'string') {
    return <p className="text-sm whitespace-pre-wrap break-words">{text}</p>
  }
  return (
    <p className="text-sm whitespace-pre-wrap break-words">
      {parts.map((part, idx) =>
        typeof part === 'string' ? (
          <Fragment key={idx}>{part}</Fragment>
        ) : (
          <CitationBadge key={idx} title={part.title} />
        ),
      )}
    </p>
  )
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

interface MessageListProps {
  messages: Message[]
  isStreaming: boolean
  streamingContent: string
  streamingAgentName?: string
  onApprove: () => void
  onReject: () => void
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      <span
        className="inline-block h-2 w-2 rounded-full bg-gray-400 animate-bounce"
        style={{ animationDelay: '0ms' }}
      />
      <span
        className="inline-block h-2 w-2 rounded-full bg-gray-400 animate-bounce"
        style={{ animationDelay: '150ms' }}
      />
      <span
        className="inline-block h-2 w-2 rounded-full bg-gray-400 animate-bounce"
        style={{ animationDelay: '300ms' }}
      />
    </div>
  )
}

function AgentAvatar({ name, icon }: { name?: string; icon?: string | null }) {
  const IconComponent = icon ? iconMap[icon] : null

  return (
    <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
      {IconComponent ? (
        <IconComponent size={14} />
      ) : (
        <span>{name ? name[0].toUpperCase() : 'A'}</span>
      )}
    </div>
  )
}

export function MessageList({
  messages,
  isStreaming,
  streamingContent,
  streamingAgentName,
  onApprove,
  onReject,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent, isStreaming])

  return (
    <div className="relative flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map(message => {
        const isUser = message.role === 'user'
        const isAssistant = message.role === 'assistant'

        return (
          <div key={message.id}>
            {/* Tool calls rendered before assistant message content */}
            {isAssistant && message.tool_calls && message.tool_calls.length > 0 && (
              <div className="mb-1">
                {message.tool_calls.map((tc, idx) => (
                  <ToolCallCard
                    key={idx}
                    toolName={tc.name}
                    input={tc.input}
                    output={tc.output}
                    status={tc.status}
                  />
                ))}
              </div>
            )}

            {/* Approval request */}
            {isAssistant && message.approval_request && (
              <ApprovalCard
                toolCalls={message.approval_request.tool_calls}
                message={message.approval_request.message}
                onApprove={onApprove}
                onReject={onReject}
              />
            )}

            {/* Message bubble (skip empty assistant messages that only have tool calls) */}
            {message.content && (
              <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                {isAssistant && (
                  <AgentAvatar name={message.agent_name} icon={message.agent_icon} />
                )}

                <div className="flex flex-col gap-0.5 max-w-[70%]">
                  {isAssistant && message.agent_name && (
                    <span className="text-xs text-gray-500 ml-1">{message.agent_name}</span>
                  )}
                  <div
                    className={
                      isUser
                        ? 'bg-blue-500 text-white rounded-2xl rounded-br-sm px-4 py-2'
                        : 'bg-white border rounded-2xl rounded-bl-sm px-4 py-2'
                    }
                  >
                    {isAssistant ? (
                      <CitedText text={message.content} />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Streaming indicator */}
      {isStreaming && (
        <div className="flex justify-start items-end gap-2">
          <AgentAvatar name={streamingAgentName} />

          <div className="flex flex-col gap-0.5 max-w-[70%]">
            {streamingAgentName && (
              <span className="text-xs text-gray-500 ml-1">{streamingAgentName}</span>
            )}
            <div className="bg-white border rounded-2xl rounded-bl-sm px-4 py-2">
              {streamingContent ? (
                <CitedText text={streamingContent} />
              ) : (
                <ThinkingDots />
              )}
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
