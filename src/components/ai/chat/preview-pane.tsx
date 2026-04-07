'use client'

import { ChevronLeft, ChevronRight } from '@carbon/icons-react'

interface ToolEvent {
  type: 'tool_start' | 'tool_end'
  tool: string
  input?: Record<string, unknown>
  output?: Record<string, unknown> | string
}

interface PreviewPaneProps {
  events: ToolEvent[]
  collapsed: boolean
  onToggle: () => void
}

// Detect what content type to render based on tool names
function detectContentType(events: ToolEvent[]): 'service' | 'blog' | 'json' | null {
  for (const event of events) {
    if (event.tool.includes('services_')) return 'service'
    if (event.tool.includes('blog_posts_')) return 'blog'
  }
  if (events.length > 0) return 'json'
  return null
}

// Get the latest tool_end event output
function getLatestOutput(events: ToolEvent[]): { tool: string; output: ToolEvent['output'] } | null {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].type === 'tool_end' && events[i].output !== undefined) {
      return { tool: events[i].tool, output: events[i].output }
    }
  }
  return null
}

// Phase badge colours
const PHASE_COLOURS: Record<string, string> = {
  operate: 'bg-blue-100 text-blue-700',
  secure: 'bg-pink-100 text-pink-700',
  streamline: 'bg-navy-100 text-slate-700',
  accelerate: 'bg-amber-100 text-amber-700',
}

function ServiceCardPreview({ output }: { output: Record<string, unknown> | string | undefined }) {
  if (!output || typeof output === 'string') {
    return (
      <div className="p-4 text-sm text-slate-500 italic">No service data available</div>
    )
  }

  const name = output.name as string | undefined
  const description = output.description as string | undefined
  const phase = (output.phase as string | undefined)?.toLowerCase()
  const phaseColour = phase ? (PHASE_COLOURS[phase] ?? 'bg-slate-100 text-slate-700') : null

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-800 text-sm leading-tight">
          {name ?? 'Service'}
        </h3>
        {phase && phaseColour && (
          <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full capitalize ${phaseColour}`}>
            {phase}
          </span>
        )}
      </div>
      {description && (
        <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
      )}
      {/* Additional fields */}
      {Object.entries(output)
        .filter(([k]) => !['name', 'description', 'phase'].includes(k))
        .map(([key, value]) => (
          <div key={key} className="text-xs">
            <span className="font-medium text-slate-500 capitalize">{key.replace(/_/g, ' ')}: </span>
            <span className="text-slate-700">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
          </div>
        ))}
    </div>
  )
}

function BlogPreview({ output }: { output: Record<string, unknown> | string | undefined }) {
  if (!output) {
    return (
      <div className="p-4 text-sm text-slate-500 italic">No blog content available</div>
    )
  }

  const content = typeof output === 'string' ? output : (output.content as string | undefined ?? output.body as string | undefined ?? JSON.stringify(output, null, 2))
  const title = typeof output !== 'string' ? (output.title as string | undefined) : undefined

  return (
    <div className="p-4 space-y-3">
      {title && (
        <h3 className="font-semibold text-slate-800 text-sm leading-tight">{title}</h3>
      )}
      <div className="prose prose-sm max-w-none text-slate-600">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{content}</pre>
      </div>
    </div>
  )
}

function JsonDataTable({ tool, output }: { tool: string; output: Record<string, unknown> | string | undefined }) {
  if (!output) {
    return (
      <div className="p-4 text-sm text-slate-500 italic">No data available</div>
    )
  }

  const data = typeof output === 'string' ? output : output

  return (
    <div className="p-4 space-y-2">
      <div className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border truncate">
        {tool}
      </div>
      <pre className="text-xs font-mono text-slate-700 bg-slate-50 rounded border p-3 overflow-auto max-h-[500px] whitespace-pre-wrap">
        {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}

export function PreviewPane({ events, collapsed, onToggle }: PreviewPaneProps) {
  const contentType = detectContentType(events)
  const latest = getLatestOutput(events)

  // Running tool names (tool_start without matching tool_end)
  const runningTools = events
    .filter((e) => e.type === 'tool_start')
    .filter((e) => !events.some((e2) => e2.type === 'tool_end' && e2.tool === e.tool))

  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        title="Expand preview"
        className="flex items-center justify-center w-8 border-l bg-white hover:bg-slate-50 transition-colors shrink-0"
      >
        <ChevronLeft size={16} className="text-slate-400" />
      </button>
    )
  }

  return (
    <aside className="w-[400px] shrink-0 border-l bg-white flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <button
          onClick={onToggle}
          title="Collapse preview"
          className="p-0.5 rounded hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
        >
          <ChevronRight size={16} />
        </button>
        <span className="text-sm font-semibold text-slate-700">Preview</span>
        {runningTools.length > 0 && (
          <span className="ml-auto text-xs text-blue-500 animate-pulse">
            Running…
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12 text-slate-400">
            <div className="text-sm">Tool outputs will appear here as the agent works</div>
          </div>
        ) : (
          <>
            {/* Tool event log */}
            <div className="border-b">
              <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Tool Activity
              </div>
              <div className="px-4 pb-3 space-y-1 max-h-[140px] overflow-y-auto">
                {events.map((event, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <span
                      className={`shrink-0 h-1.5 w-1.5 rounded-full ${
                        event.type === 'tool_end' ? 'bg-green-400' : 'bg-blue-400 animate-pulse'
                      }`}
                    />
                    <span className="font-mono text-slate-500 truncate">{event.tool}</span>
                    <span className="shrink-0 text-slate-400">
                      {event.type === 'tool_end' ? 'done' : 'running'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Main preview area */}
            {latest && (
              <div>
                <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b">
                  {contentType === 'service' && 'Service Card'}
                  {contentType === 'blog' && 'Blog Preview'}
                  {contentType === 'json' && 'Output Data'}
                </div>

                {contentType === 'service' && (
                  <ServiceCardPreview output={latest.output} />
                )}
                {contentType === 'blog' && (
                  <BlogPreview output={latest.output} />
                )}
                {contentType === 'json' && (
                  <JsonDataTable tool={latest.tool} output={latest.output} />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  )
}
