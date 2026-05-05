'use client'

import { useCallback, useEffect, useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase-client'
import { FolderTree, type KFolder, type KDocument } from '@/components/knowledge/folder-tree'
import { MarkdownEditor } from '@/components/knowledge/markdown-editor'
import { AgentChat } from '@/components/knowledge/agent-chat'

interface DocumentDetail {
  id: string
  title: string
  content: string
  last_ingested_at: string | null
}

async function authedFetch(input: RequestInfo, init?: RequestInit) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not authenticated')
  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Bearer ${token}`)
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(input, { ...init, headers })
}

export default function KnowledgePage() {
  const [folders, setFolders] = useState<KFolder[]>([])
  const [documents, setDocuments] = useState<KDocument[]>([])
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [activeDocument, setActiveDocument] = useState<DocumentDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshTree = useCallback(async () => {
    try {
      const [foldersRes, docsRes] = await Promise.all([
        authedFetch('/api/admin/knowledge/folders'),
        authedFetch('/api/admin/knowledge/documents'),
      ])
      if (!foldersRes.ok) throw new Error('Failed to load folders')
      if (!docsRes.ok) throw new Error('Failed to load documents')
      const foldersJson = await foldersRes.json()
      const docsJson = await docsRes.json()
      setFolders(foldersJson.folders ?? [])
      setDocuments(docsJson.documents ?? [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshTree()
  }, [refreshTree])

  useEffect(() => {
    if (!selectedDocumentId) {
      setActiveDocument(null)
      return
    }
    void (async () => {
      try {
        const res = await authedFetch(`/api/admin/knowledge/documents/${selectedDocumentId}`)
        if (!res.ok) throw new Error('Failed to load document')
        const json = await res.json()
        setActiveDocument(json.document)
      } catch (err) {
        toast.error((err as Error).message)
      }
    })()
  }, [selectedDocumentId])

  async function handleCreateFolder(parentId: string | null) {
    const res = await authedFetch('/api/admin/knowledge/folders', {
      method: 'POST',
      body: JSON.stringify({ name: 'New folder', parent_id: parentId, sort_order: 9999 }),
    })
    if (!res.ok) {
      toast.error('Failed to create folder')
      return
    }
    await refreshTree()
  }

  async function handleCreateDocument(folderId: string | null) {
    const res = await authedFetch('/api/admin/knowledge/documents', {
      method: 'POST',
      body: JSON.stringify({ title: 'Untitled', folder_id: folderId, content: '', sort_order: 9999 }),
    })
    if (!res.ok) {
      toast.error('Failed to create document')
      return
    }
    const json = await res.json()
    await refreshTree()
    if (json.document?.id) setSelectedDocumentId(json.document.id)
  }

  async function handleRenameFolder(id: string, name: string) {
    const res = await authedFetch(`/api/admin/knowledge/folders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    })
    if (!res.ok) throw new Error('rename failed')
    await refreshTree()
  }

  async function handleRenameDocument(id: string, title: string) {
    const res = await authedFetch(`/api/admin/knowledge/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    })
    if (!res.ok) throw new Error('rename failed')
    await refreshTree()
    if (id === selectedDocumentId) {
      setActiveDocument((prev) => (prev ? { ...prev, title } : prev))
    }
  }

  async function handleDeleteFolder(id: string) {
    const res = await authedFetch(`/api/admin/knowledge/folders/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('delete failed')
    await refreshTree()
  }

  async function handleDeleteDocument(id: string) {
    const res = await authedFetch(`/api/admin/knowledge/documents/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('delete failed')
    if (id === selectedDocumentId) setSelectedDocumentId(null)
    await refreshTree()
  }

  async function handleMoveFolder(id: string, parentId: string | null, sortOrder: number) {
    const res = await authedFetch(`/api/admin/knowledge/folders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ parent_id: parentId, sort_order: sortOrder }),
    })
    if (!res.ok) throw new Error('move failed')
    await refreshTree()
  }

  async function handleMoveDocument(id: string, folderId: string | null, sortOrder: number) {
    const res = await authedFetch(`/api/admin/knowledge/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ folder_id: folderId, sort_order: sortOrder }),
    })
    if (!res.ok) throw new Error('move failed')
    await refreshTree()
  }

  async function handleEditorChange(patch: { title?: string; content?: string }) {
    if (!selectedDocumentId) return
    const res = await authedFetch(`/api/admin/knowledge/documents/${selectedDocumentId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      toast.error('Failed to save')
      return
    }
    if (typeof patch.title === 'string') {
      setDocuments((prev) =>
        prev.map((d) => (d.id === selectedDocumentId ? { ...d, title: patch.title! } : d)),
      )
      setActiveDocument((prev) => (prev ? { ...prev, title: patch.title! } : prev))
    }
    if (typeof patch.content === 'string') {
      setActiveDocument((prev) => (prev ? { ...prev, content: patch.content! } : prev))
    }
  }

  return (
    <div className="flex h-full -m-6">
      <PanelGroup direction="horizontal" className="flex-1">
        <Panel defaultSize={20} minSize={14} className="border-r bg-white">
          {loading ? (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">
              Loading…
            </div>
          ) : (
            <FolderTree
              folders={folders}
              documents={documents}
              selectedDocumentId={selectedDocumentId}
              onSelectDocument={setSelectedDocumentId}
              onCreateFolder={handleCreateFolder}
              onCreateDocument={handleCreateDocument}
              onRenameFolder={handleRenameFolder}
              onRenameDocument={handleRenameDocument}
              onDeleteFolder={handleDeleteFolder}
              onDeleteDocument={handleDeleteDocument}
              onMoveFolder={handleMoveFolder}
              onMoveDocument={handleMoveDocument}
            />
          )}
        </Panel>
        <PanelResizeHandle className="w-1 bg-slate-100 hover:bg-blue-300 transition-colors" />
        <Panel defaultSize={50} minSize={25} className="bg-white">
          <MarkdownEditor document={activeDocument} onChange={handleEditorChange} />
        </Panel>
        <PanelResizeHandle className="w-1 bg-slate-100 hover:bg-blue-300 transition-colors" />
        <Panel defaultSize={30} minSize={20}>
          <AgentChat selectedDocumentId={selectedDocumentId} />
        </Panel>
      </PanelGroup>
    </div>
  )
}
