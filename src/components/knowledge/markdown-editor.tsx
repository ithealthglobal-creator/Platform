'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Document } from '@carbon/icons-react'
import '@uiw/react-md-editor/markdown-editor.css'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

interface KnowledgeDocumentDetail {
  id: string
  title: string
  content: string
  last_ingested_at: string | null
}

interface MarkdownEditorProps {
  document: KnowledgeDocumentDetail | null
  onChange: (patch: { title?: string; content?: string }) => Promise<void>
}

export function MarkdownEditor({ document, onChange }: MarkdownEditorProps) {
  const [title, setTitle] = useState(document?.title ?? '')
  const [content, setContent] = useState(document?.content ?? '')
  const [saving, setSaving] = useState(false)
  const titleTimer = useRef<number | null>(null)
  const contentTimer = useRef<number | null>(null)
  const docId = document?.id ?? null

  useEffect(() => {
    setTitle(document?.title ?? '')
    setContent(document?.content ?? '')
  }, [docId, document?.title, document?.content])

  function scheduleSave(patch: { title?: string; content?: string }) {
    setSaving(true)
    void (async () => {
      try {
        await onChange(patch)
      } finally {
        setSaving(false)
      }
    })()
  }

  function handleTitle(value: string) {
    setTitle(value)
    if (titleTimer.current) window.clearTimeout(titleTimer.current)
    titleTimer.current = window.setTimeout(() => scheduleSave({ title: value }), 800)
  }

  function handleContent(value: string | undefined) {
    const next = value ?? ''
    setContent(next)
    if (contentTimer.current) window.clearTimeout(contentTimer.current)
    contentTimer.current = window.setTimeout(() => scheduleSave({ content: next }), 1500)
  }

  if (!document) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
        <Document size={32} />
        <p className="text-sm">Select or create a document to start editing.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col" data-color-mode="light">
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <input
          value={title}
          onChange={(e) => handleTitle(e.target.value)}
          placeholder="Untitled"
          className="flex-1 bg-transparent text-base font-semibold text-slate-800 outline-none placeholder:text-slate-300"
        />
        <span className="text-xs text-slate-400">
          {saving ? 'Saving…' : document.last_ingested_at ? 'Indexed' : 'Not indexed yet'}
        </span>
      </div>
      <div className="flex-1 overflow-hidden">
        <MDEditor
          value={content}
          onChange={handleContent}
          height="100%"
          preview="live"
          visibleDragbar={false}
          textareaProps={{ placeholder: 'Start writing markdown… use [[Title]] to link to other notes.' }}
        />
      </div>
    </div>
  )
}
