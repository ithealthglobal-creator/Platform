'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase-client'
import {
  TemplateListPanel,
  type TemplateListItem,
} from '@/components/ai/templates/template-list-panel'
import { TemplatePreview } from '@/components/ai/templates/template-preview'
import { TemplateBuilderPanel } from '@/components/ai/templates/template-builder-panel'
import type {
  TemplateContent,
  TemplateRow,
  TemplateStatus,
} from '@/components/ai/templates/types'

type ListRow = TemplateListItem & {
  description: string | null
  updated_at: string
}

const TEMPLATE_COLUMNS =
  'id, name, description, kind, status, updated_at'

export function TemplatesWorkspace() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('id')

  const [templates, setTemplates] = useState<ListRow[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [selected, setSelected] = useState<TemplateRow | null>(null)
  const [loadingSelected, setLoadingSelected] = useState(false)
  const [savingMeta, setSavingMeta] = useState(false)

  const fetchList = useCallback(async () => {
    setLoadingList(true)
    const { data, error } = await supabase
      .from('ai_templates')
      .select(TEMPLATE_COLUMNS)
      .order('updated_at', { ascending: false })

    if (error) {
      toast.error('Failed to load templates')
      setLoadingList(false)
      return
    }
    setTemplates((data as ListRow[]) ?? [])
    setLoadingList(false)
  }, [])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const fetchSelected = useCallback(
    async (id: string) => {
      setLoadingSelected(true)
      const { data, error } = await supabase
        .from('ai_templates')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        toast.error('Failed to load template')
        setSelected(null)
        setLoadingSelected(false)
        router.replace('/ai/templates')
        return
      }
      const row = data as Omit<TemplateRow, 'content'> & {
        content: TemplateContent | null
      }
      const content: TemplateContent = row.content ?? { blocks: [] }
      setSelected({ ...row, content })
      setLoadingSelected(false)
    },
    [router],
  )

  useEffect(() => {
    if (selectedId) {
      fetchSelected(selectedId)
    } else {
      setSelected(null)
    }
  }, [selectedId, fetchSelected])

  function selectTemplate(t: { id: string }) {
    router.replace(`/ai/templates?id=${t.id}`)
  }

  function startCreate() {
    router.replace('/ai/templates')
    // No-op beyond clearing selection — Template Builder handles the
    // "no template selected → create one" greeting and tool flow.
  }

  const refreshAll = useCallback(async () => {
    await fetchList()
    if (selectedId) await fetchSelected(selectedId)
  }, [fetchList, fetchSelected, selectedId])

  const updateMeta = useCallback(
    async (patch: { name?: string; status?: TemplateStatus }) => {
      if (!selected) return
      const payload: Record<string, unknown> = {}
      if (patch.name !== undefined) payload.name = patch.name
      if (patch.status !== undefined) payload.status = patch.status
      if (Object.keys(payload).length === 0) return

      setSavingMeta(true)
      const { error } = await supabase
        .from('ai_templates')
        .update(payload)
        .eq('id', selected.id)
      setSavingMeta(false)

      if (error) {
        toast.error('Failed to save template')
        return
      }
      toast.success('Saved')
      await refreshAll()
    },
    [selected, refreshAll],
  )

  return (
    <div className="flex h-[calc(100vh-7rem)] -mx-6 -mb-6 border-t">
      <TemplateListPanel
        templates={templates}
        selectedId={selectedId}
        loading={loadingList}
        onSelect={selectTemplate}
        onCreate={startCreate}
      />

      <TemplatePreview
        template={selected}
        loading={loadingSelected}
        saving={savingMeta}
        onUpdate={updateMeta}
      />

      <TemplateBuilderPanel
        templateId={selectedId}
        templateName={selected?.name ?? null}
        onTemplateMutated={refreshAll}
        onTemplateCreated={(id) => router.replace(`/ai/templates?id=${id}`)}
      />
    </div>
  )
}
