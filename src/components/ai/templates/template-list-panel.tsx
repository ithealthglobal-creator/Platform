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

const KIND_ORDER: TemplateKind[] = [
  'landing_page',
  'website_page',
  'presentation',
  'brochure',
  'document',
  'social_post',
]

export function TemplateListPanel({
  templates,
  selectedId,
  loading,
  onSelect,
  onCreate,
}: TemplateListPanelProps) {
  const grouped = groupByKind(templates)

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

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {loading ? (
          <div className="px-2 py-3 text-xs text-muted-foreground">Loading…</div>
        ) : templates.length === 0 ? (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            No templates yet. Ask the Template Builder on the right to create one.
          </div>
        ) : (
          KIND_ORDER.flatMap((kind) => {
            const rows = grouped.get(kind)
            if (!rows || rows.length === 0) return []
            return [
              <KindSection
                key={kind}
                kind={kind}
                count={rows.length}
                rows={rows}
                selectedId={selectedId}
                onSelect={onSelect}
              />,
            ]
          })
        )}
      </div>
    </div>
  )
}

function KindSection({
  kind,
  count,
  rows,
  selectedId,
  onSelect,
}: {
  kind: TemplateKind
  count: number
  rows: TemplateListItem[]
  selectedId: string | null
  onSelect: (t: TemplateListItem) => void
}) {
  return (
    <section>
      <header
        className="flex items-center justify-between px-2 pt-1 pb-1.5 text-[10px] font-semibold uppercase text-muted-foreground"
        style={{ letterSpacing: '0.14em' }}
      >
        <span>{TEMPLATE_KIND_LABEL[kind]}</span>
        <span className="text-muted-foreground/70">{count}</span>
      </header>
      <div className="space-y-1">
        {rows.map((t) => {
          const selected = t.id === selectedId
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t)}
              className={
                'w-full text-left rounded-md px-3 py-2 transition-colors ' +
                (selected
                  ? 'bg-background ring-1 ring-foreground/10 shadow-xs'
                  : 'hover:bg-background/60')
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 text-sm font-medium truncate">
                  {t.name}
                </div>
                <StatusDot status={t.status} />
              </div>
            </button>
          )
        })}
      </div>
    </section>
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

function groupByKind(items: TemplateListItem[]): Map<TemplateKind, TemplateListItem[]> {
  const map = new Map<TemplateKind, TemplateListItem[]>()
  for (const item of items) {
    const arr = map.get(item.kind) ?? []
    arr.push(item)
    map.set(item.kind, arr)
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => a.name.localeCompare(b.name))
  }
  return map
}
