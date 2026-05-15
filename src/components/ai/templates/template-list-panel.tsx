'use client'

import { Add, Template as TemplateIcon } from '@carbon/icons-react'
import { Button } from '@/components/ui/button'
import {
  type TemplateKind,
  type TemplateStatus,
  TEMPLATE_KIND_LABEL,
  TEMPLATE_STATUS_LABEL,
} from './types'

export interface TemplateListItem {
  id: string
  name: string
  kind: TemplateKind
  status: TemplateStatus
}

interface TemplateListPanelProps {
  templates: TemplateListItem[]
  selectedId: string | null
  loading: boolean
  onSelect: (template: TemplateListItem) => void
  onCreate: () => void
}

export function TemplateListPanel({
  templates,
  selectedId,
  loading,
  onSelect,
  onCreate,
}: TemplateListPanelProps) {
  return (
    <div className="flex flex-col h-full w-72 flex-shrink-0 border-r bg-muted/30">
      <div className="px-3 py-3 border-b bg-background flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 px-1">
          <TemplateIcon size={16} className="text-muted-foreground" />
          <span className="text-sm font-semibold">Templates</span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onCreate}
          title="New template"
        >
          <Add size={16} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="px-2 py-3 text-xs text-muted-foreground">Loading…</div>
        ) : templates.length === 0 ? (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            No templates yet. Ask the Template Builder on the right to create one.
          </div>
        ) : (
          templates.map((t) => {
            const selected = t.id === selectedId
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelect(t)}
                className={
                  'w-full text-left rounded-md px-3 py-2.5 transition-colors ' +
                  (selected
                    ? 'bg-background ring-1 ring-foreground/10 shadow-xs'
                    : 'hover:bg-background/60')
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {TEMPLATE_KIND_LABEL[t.kind]}
                    </div>
                  </div>
                  <StatusDot status={t.status} />
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: TemplateStatus }) {
  const cls =
    status === 'published'
      ? 'bg-[color:var(--brand-primary)]'
      : status === 'in_review'
        ? 'bg-[color:var(--brand-gold)]'
        : 'bg-muted-foreground/40'
  return (
    <span
      className={'mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full ' + cls}
      title={TEMPLATE_STATUS_LABEL[status]}
    />
  )
}
