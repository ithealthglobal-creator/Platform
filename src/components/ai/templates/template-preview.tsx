'use client'

import { ArrowRight } from '@carbon/icons-react'
import {
  type TemplateBlock,
  type TemplateRow,
  TEMPLATE_KIND_LABEL,
  TEMPLATE_STATUS_LABEL,
} from './types'

interface TemplatePreviewProps {
  template: TemplateRow | null
  loading?: boolean
}

const PHASES: Array<{ name: string; color: string }> = [
  { name: 'Operate', color: 'var(--phase-operate)' },
  { name: 'Secure', color: 'var(--phase-secure)' },
  { name: 'Streamline', color: 'var(--phase-streamline)' },
  { name: 'Accelerate', color: 'var(--phase-accelerate)' },
]

export function TemplatePreview({ template, loading }: TemplatePreviewProps) {
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
    <div className="flex-1 min-w-0 overflow-y-auto bg-muted/20">
      <div className="mx-auto max-w-3xl px-8 py-8 space-y-6">
        <PreviewHeader template={template} />
        <div className="overflow-hidden rounded-xl bg-background shadow-sm ring-1 ring-foreground/10">
          {template.content.blocks.map((block, i) => (
            <BlockRenderer key={i} block={block} />
          ))}
        </div>
      </div>
    </div>
  )
}

function PreviewHeader({ template }: { template: TemplateRow }) {
  return (
    <header className="flex items-end justify-between gap-4 border-b border-foreground/10 pb-4">
      <div className="min-w-0">
        <div
          className="text-[11px] font-semibold uppercase text-[color:var(--brand-primary)]"
          style={{ letterSpacing: '0.18em' }}
        >
          {TEMPLATE_KIND_LABEL[template.kind]}
        </div>
        <h1 className="mt-1 truncate text-2xl font-light text-[color:var(--brand-dark)]">
          {template.name}
        </h1>
        {template.description ? (
          <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
        ) : null}
      </div>
      <span
        className={
          'inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-medium ' +
          (template.status === 'published'
            ? 'bg-[color:var(--brand-primary)]/10 text-[color:var(--brand-primary)]'
            : template.status === 'in_review'
              ? 'bg-[color:var(--brand-gold)]/15 text-[color:var(--brand-dark)]'
              : 'bg-muted text-muted-foreground')
        }
      >
        {TEMPLATE_STATUS_LABEL[template.status]}
      </span>
    </header>
  )
}

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
      return <div className="px-8 pt-6 first:pt-8">
        <p className={cls}>{block.text}</p>
      </div>
    }

    case 'paragraph':
      return (
        <div className="px-8 pt-4">
          <p className="text-base leading-relaxed text-[color:var(--brand-dark)]/80">
            {block.text}
          </p>
        </div>
      )

    case 'hero': {
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
        <section className={'px-10 py-14 ' + surface}>
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
              className="mt-6 inline-flex h-9 items-center gap-1.5 bg-[color:var(--brand-secondary)] px-4 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ borderRadius: '50px 0 50px 50px' }}
            >
              {block.cta}
              <ArrowRight size={14} />
            </button>
          ) : null}
        </section>
      )
    }

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
