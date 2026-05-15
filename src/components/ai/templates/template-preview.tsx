'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from '@carbon/icons-react'
import {
  type TemplateBlock,
  type TemplateKind,
  type TemplateRow,
  type TemplateStatus,
  TEMPLATE_KIND_LABEL,
  TEMPLATE_STATUS_LABEL,
} from './types'

interface TemplatePreviewProps {
  template: TemplateRow | null
  loading?: boolean
  saving?: boolean
  onUpdate?: (patch: { name?: string; status?: TemplateStatus }) => Promise<void>
}

const PHASES: Array<{ name: string; color: string }> = [
  { name: 'Operate', color: 'var(--phase-operate)' },
  { name: 'Secure', color: 'var(--phase-secure)' },
  { name: 'Streamline', color: 'var(--phase-streamline)' },
  { name: 'Accelerate', color: 'var(--phase-accelerate)' },
]

export function TemplatePreview({
  template,
  loading,
  saving,
  onUpdate,
}: TemplatePreviewProps) {
  if (loading) {
    return (
      <div className="flex-1 min-w-0 overflow-y-auto bg-muted/20">
        <div className="mx-auto max-w-3xl px-8 py-10 text-sm text-muted-foreground">
          Loading template…
        </div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="flex-1 min-w-0 overflow-y-auto bg-muted/20">
        <div className="mx-auto max-w-3xl px-8 py-16 text-center">
          <h2 className="text-lg font-light text-[color:var(--brand-dark)]">
            Pick a template to preview
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Or ask the Template Builder on the right to create a new one.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 min-w-0 flex-col bg-muted/20">
      <PreviewHeader template={template} saving={saving} onUpdate={onUpdate} />
      <div className="flex-1 overflow-y-auto">
        <TemplateFrame template={template} />
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Header — inline name + status edit
// ────────────────────────────────────────────────────────────────────────────

function PreviewHeader({
  template,
  saving,
  onUpdate,
}: {
  template: TemplateRow
  saving?: boolean
  onUpdate?: (patch: { name?: string; status?: TemplateStatus }) => Promise<void>
}) {
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(template.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setNameDraft(template.name)
    setEditingName(false)
  }, [template.id, template.name])

  useEffect(() => {
    if (editingName) inputRef.current?.select()
  }, [editingName])

  async function commitName() {
    const trimmed = nameDraft.trim()
    setEditingName(false)
    if (!trimmed || trimmed === template.name) {
      setNameDraft(template.name)
      return
    }
    await onUpdate?.({ name: trimmed })
  }

  async function commitStatus(next: TemplateStatus) {
    if (next === template.status) return
    await onUpdate?.({ status: next })
  }

  return (
    <header className="flex items-center justify-between gap-4 border-b border-foreground/10 bg-background/60 px-8 py-3">
      <div className="min-w-0">
        <div
          className="text-[11px] font-semibold uppercase text-[color:var(--brand-primary)]"
          style={{ letterSpacing: '0.18em' }}
        >
          {TEMPLATE_KIND_LABEL[template.kind]}
        </div>
        {editingName ? (
          <input
            ref={inputRef}
            value={nameDraft}
            disabled={!onUpdate || saving}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitName()
              } else if (e.key === 'Escape') {
                setNameDraft(template.name)
                setEditingName(false)
              }
            }}
            className="mt-1 w-full bg-transparent text-2xl font-light text-[color:var(--brand-dark)] outline-none ring-1 ring-foreground/10 rounded-md px-1 py-0.5"
          />
        ) : (
          <button
            type="button"
            onClick={() => onUpdate && setEditingName(true)}
            disabled={!onUpdate}
            className="mt-1 block truncate text-left text-2xl font-light text-[color:var(--brand-dark)] hover:text-[color:var(--brand-primary)] disabled:cursor-default disabled:hover:text-[color:var(--brand-dark)]"
            title={onUpdate ? 'Rename' : undefined}
          >
            {template.name}
          </button>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {saving ? (
          <span className="text-[11px] text-muted-foreground">Saving…</span>
        ) : null}
        <StatusSelect
          value={template.status}
          onChange={commitStatus}
          disabled={!onUpdate || saving}
        />
      </div>
    </header>
  )
}

function StatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: TemplateStatus
  onChange: (next: TemplateStatus) => void
  disabled?: boolean
}) {
  const cls =
    value === 'published'
      ? 'bg-[color:var(--brand-primary)]/10 text-[color:var(--brand-primary)] ring-[color:var(--brand-primary)]/20'
      : value === 'in_review'
        ? 'bg-[color:var(--brand-gold)]/15 text-[color:var(--brand-dark)] ring-[color:var(--brand-gold)]/30'
        : 'bg-muted text-muted-foreground ring-foreground/10'

  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as TemplateStatus)}
      className={
        'h-7 cursor-pointer rounded-full px-3 text-[11px] font-medium ring-1 outline-none disabled:cursor-default ' +
        cls
      }
    >
      {(['draft', 'in_review', 'published'] as const).map((s) => (
        <option key={s} value={s}>
          {TEMPLATE_STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Frame — kind-aware aspect / max-width
// ────────────────────────────────────────────────────────────────────────────

function TemplateFrame({ template }: { template: TemplateRow }) {
  const blocks = template.content.blocks
  const meta = frameMeta(template)

  // Paged kinds (presentation, social_post) render the first hero/heading as a
  // single fixed-aspect slide. Everything else flows top-to-bottom inside the
  // page-shaped frame.
  if (meta.kind === 'paged') {
    return (
      <div className="flex items-start justify-center px-8 py-8">
        <div
          className="overflow-hidden rounded-xl bg-background shadow-lg ring-1 ring-foreground/10"
          style={{ width: meta.width, aspectRatio: meta.aspectRatio }}
        >
          <PagedFrame blocks={blocks} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-center px-8 py-8">
      <div
        className={
          'w-full overflow-hidden rounded-xl bg-background ring-1 ring-foreground/10 ' +
          (meta.paper ? 'shadow-lg' : 'shadow-sm')
        }
        style={{ maxWidth: meta.maxWidth }}
      >
        {blocks.map((block, i) => (
          <BlockRenderer key={i} block={block} />
        ))}
      </div>
    </div>
  )
}

type FrameMeta =
  | { kind: 'flow'; maxWidth: string; paper: boolean }
  | { kind: 'paged'; width: string; aspectRatio: string }

function frameMeta(template: TemplateRow): FrameMeta {
  switch (template.kind) {
    case 'presentation':
      return { kind: 'paged', width: '720px', aspectRatio: '16 / 9' }

    case 'social_post': {
      const aspect = inferSocialAspect(template.name)
      return { kind: 'paged', width: aspect.width, aspectRatio: aspect.ratio }
    }

    case 'brochure':
    case 'document':
      // A4 portrait — 210 × 297 mm. Render at a comfortable on-screen width.
      return { kind: 'flow', maxWidth: '560px', paper: true }

    case 'website_page':
      return { kind: 'flow', maxWidth: '960px', paper: false }

    case 'landing_page':
    default:
      return { kind: 'flow', maxWidth: '720px', paper: false }
  }
}

function inferSocialAspect(name: string): { ratio: string; width: string } {
  const match = name.match(/(\d{3,4})\s*[×x*]\s*(\d{3,4})/)
  if (match) {
    const w = Number(match[1])
    const h = Number(match[2])
    if (h > w * 1.5) {
      // Portrait story-style
      return { ratio: `${w} / ${h}`, width: '300px' }
    }
    if (Math.abs(w - h) < 20) {
      // Square
      return { ratio: '1 / 1', width: '520px' }
    }
    // Landscape link card
    return { ratio: `${w} / ${h}`, width: '640px' }
  }
  return { ratio: '1 / 1', width: '520px' }
}

// ────────────────────────────────────────────────────────────────────────────
// Paged (single-slide) renderer — used for presentations and social posts.
// Renders the first hero/heading block as the focal moment; collapses
// subsequent blocks into a small caption strip beneath the title.
// ────────────────────────────────────────────────────────────────────────────

function PagedFrame({ blocks }: { blocks: TemplateBlock[] }) {
  const hero = blocks.find((b) => b.type === 'hero')
  const heading = blocks.find((b) => b.type === 'heading')
  const eyebrow = blocks.find((b) => b.type === 'eyebrow')
  const paragraphs = blocks.filter((b) => b.type === 'paragraph')

  if (hero && hero.type === 'hero') {
    return <HeroBlock block={hero} fullBleed />
  }

  return (
    <div className="flex h-full flex-col justify-center bg-[color:var(--brand-primary)] px-10 py-12 text-white">
      {eyebrow && eyebrow.type === 'eyebrow' ? (
        <div
          className="text-[11px] font-semibold uppercase text-white/80"
          style={{ letterSpacing: '0.18em' }}
        >
          {eyebrow.text}
        </div>
      ) : null}
      {heading && heading.type === 'heading' ? (
        <h2 className="mt-3 text-3xl font-bold leading-tight">{heading.text}</h2>
      ) : null}
      {paragraphs[0] && paragraphs[0].type === 'paragraph' ? (
        <p className="mt-3 max-w-md text-sm font-light text-white/80">
          {paragraphs[0].text}
        </p>
      ) : null}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Block renderers (shared between flow and paged frames)
// ────────────────────────────────────────────────────────────────────────────

function BlockRenderer({ block }: { block: TemplateBlock }) {
  switch (block.type) {
    case 'eyebrow':
      return (
        <div className="px-8 pt-8">
          <span
            className="text-[11px] font-semibold uppercase text-[color:var(--brand-primary)]"
            style={{ letterSpacing: '0.18em' }}
          >
            {block.text}
          </span>
        </div>
      )

    case 'heading': {
      const cls =
        block.level === 1
          ? 'text-3xl font-light text-[color:var(--brand-dark)]'
          : block.level === 2
            ? 'text-2xl font-extralight text-[color:var(--brand-dark)]'
            : 'text-lg font-semibold text-[color:var(--brand-dark)]'
      return (
        <div className="px-8 pt-6 first:pt-8">
          <p className={cls}>{block.text}</p>
        </div>
      )
    }

    case 'paragraph':
      return (
        <div className="px-8 pt-4">
          <p className="text-base leading-relaxed text-[color:var(--brand-dark)]/80">
            {block.text}
          </p>
        </div>
      )

    case 'hero':
      return <HeroBlock block={block} />

    case 'cta_banner':
      return (
        <section className="mt-6 flex flex-col items-start gap-3 bg-[color:var(--brand-primary)] px-10 py-10 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-light">{block.title}</h3>
            {block.subtitle ? (
              <p className="mt-1 text-sm text-white/80">{block.subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="inline-flex h-9 flex-shrink-0 items-center gap-1.5 bg-[color:var(--brand-secondary)] px-4 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ borderRadius: '50px 0 50px 50px' }}
          >
            {block.cta}
            <ArrowRight size={14} />
          </button>
        </section>
      )

    case 'columns':
      return (
        <section className="px-8 pt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {block.items.map((item, i) => (
              <div
                key={i}
                className="rounded-xl bg-muted/40 p-5 ring-1 ring-foreground/10"
              >
                <div className="text-sm font-semibold text-[color:var(--brand-dark)]">
                  {item.title}
                </div>
                <p className="mt-1 text-sm text-[color:var(--brand-dark)]/70">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      )

    case 'phase_row':
      return (
        <section className="px-8 pt-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PHASES.map((p) => (
              <div
                key={p.name}
                className="rounded-xl bg-background p-4 text-center ring-1 ring-foreground/10"
              >
                <div
                  className="text-xs font-semibold uppercase"
                  style={{ color: p.color, letterSpacing: '0.18em' }}
                >
                  {p.name}
                </div>
              </div>
            ))}
          </div>
        </section>
      )

    case 'divider':
      return (
        <div className="px-8 pt-6">
          <div className="h-px w-full bg-foreground/10" />
        </div>
      )

    case 'footer_note':
      return (
        <div className="px-8 pb-8 pt-6">
          <p className="text-xs text-muted-foreground">{block.text}</p>
        </div>
      )

    default:
      return null
  }
}

function HeroBlock({
  block,
  fullBleed,
}: {
  block: Extract<TemplateBlock, { type: 'hero' }>
  fullBleed?: boolean
}) {
  const bg = block.bg ?? 'blue'
  const surface =
    bg === 'blue'
      ? 'bg-[color:var(--brand-primary)] text-white'
      : bg === 'dark'
        ? 'bg-[color:var(--brand-dark)] text-white'
        : 'bg-background text-[color:var(--brand-dark)]'
  const eyebrowColor =
    bg === 'white' ? 'text-[color:var(--brand-primary)]' : 'text-white/80'
  return (
    <section
      className={
        'px-10 py-14 ' + surface + (fullBleed ? ' flex h-full flex-col justify-center' : '')
      }
    >
      {block.eyebrow ? (
        <div
          className={'text-[11px] font-semibold uppercase ' + eyebrowColor}
          style={{ letterSpacing: '0.18em' }}
        >
          {block.eyebrow}
        </div>
      ) : null}
      <h2 className="mt-3 text-4xl font-bold leading-tight">{block.title}</h2>
      {block.subtitle ? (
        <p
          className={
            'mt-4 max-w-xl text-base font-light leading-relaxed ' +
            (bg === 'white' ? 'text-[color:var(--brand-dark)]/70' : 'text-white/80')
          }
        >
          {block.subtitle}
        </p>
      ) : null}
      {block.cta ? (
        <button
          type="button"
          className="mt-6 inline-flex h-9 w-fit items-center gap-1.5 bg-[color:var(--brand-secondary)] px-4 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ borderRadius: '50px 0 50px 50px' }}
        >
          {block.cta}
          <ArrowRight size={14} />
        </button>
      ) : null}
    </section>
  )
}
