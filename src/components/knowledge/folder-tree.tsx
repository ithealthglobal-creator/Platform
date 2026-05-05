'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Tree,
  type NodeApi,
  type NodeRendererProps,
  type TreeApi,
} from 'react-arborist'
import {
  Add,
  ChevronRight,
  Document,
  Folder,
  FolderOpen,
  TrashCan,
} from '@carbon/icons-react'
import { toast } from 'sonner'

export interface KFolder {
  id: string
  parent_id: string | null
  name: string
  sort_order: number
}

export interface KDocument {
  id: string
  folder_id: string | null
  title: string
  sort_order: number
}

export interface KTreeNode {
  id: string
  name: string
  kind: 'folder' | 'document'
  parentId: string | null
  sortOrder: number
  children?: KTreeNode[]
  documentId?: string
  folderId?: string
}

interface FolderTreeProps {
  folders: KFolder[]
  documents: KDocument[]
  selectedDocumentId: string | null
  onSelectDocument: (id: string) => void
  onCreateFolder: (parentId: string | null) => Promise<void>
  onCreateDocument: (folderId: string | null) => Promise<void>
  onRenameFolder: (id: string, name: string) => Promise<void>
  onRenameDocument: (id: string, name: string) => Promise<void>
  onDeleteFolder: (id: string) => Promise<void>
  onDeleteDocument: (id: string) => Promise<void>
  onMoveFolder: (id: string, parentId: string | null, sortOrder: number) => Promise<void>
  onMoveDocument: (id: string, folderId: string | null, sortOrder: number) => Promise<void>
}

function buildTree(folders: KFolder[], documents: KDocument[]): KTreeNode[] {
  const folderById = new Map<string, KTreeNode>()
  for (const f of folders) {
    folderById.set(f.id, {
      id: `f:${f.id}`,
      name: f.name,
      kind: 'folder',
      parentId: f.parent_id,
      sortOrder: f.sort_order,
      folderId: f.id,
      children: [],
    })
  }

  const roots: KTreeNode[] = []
  for (const f of folders) {
    const node = folderById.get(f.id)!
    if (f.parent_id && folderById.has(f.parent_id)) {
      folderById.get(f.parent_id)!.children!.push(node)
    } else {
      roots.push(node)
    }
  }

  for (const d of documents) {
    const node: KTreeNode = {
      id: `d:${d.id}`,
      name: d.title,
      kind: 'document',
      parentId: d.folder_id,
      sortOrder: d.sort_order,
      documentId: d.id,
    }
    if (d.folder_id && folderById.has(d.folder_id)) {
      folderById.get(d.folder_id)!.children!.push(node)
    } else {
      roots.push(node)
    }
  }

  function sort(nodes: KTreeNode[]) {
    nodes.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
      return a.name.localeCompare(b.name)
    })
    for (const n of nodes) if (n.children) sort(n.children)
  }
  sort(roots)
  return roots
}

function NodeRow({
  node,
  style,
  dragHandle,
  tree,
  onSelectDocument,
  onCreateDocument,
  onCreateFolder,
  onDelete,
}: NodeRendererProps<KTreeNode> & {
  onSelectDocument: (id: string) => void
  onCreateDocument: (folderId: string) => Promise<void>
  onCreateFolder: (parentId: string) => Promise<void>
  onDelete: (node: NodeApi<KTreeNode>) => Promise<void>
}) {
  const data = node.data
  const isFolder = data.kind === 'folder'

  return (
    <div
      ref={dragHandle}
      style={style}
      onClick={(e) => {
        e.stopPropagation()
        if (isFolder) {
          node.toggle()
        } else if (data.documentId) {
          onSelectDocument(data.documentId)
        }
      }}
      onDoubleClick={() => node.edit()}
      className={`group/row flex h-7 w-full items-center gap-1 rounded px-1 text-sm cursor-pointer ${
        node.isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-100'
      }`}
    >
      {isFolder ? (
        <button
          onClick={(e) => { e.stopPropagation(); node.toggle() }}
          className="flex h-4 w-4 items-center justify-center text-slate-500"
        >
          <ChevronRight
            size={14}
            className={node.isOpen ? 'rotate-90 transition-transform' : 'transition-transform'}
          />
        </button>
      ) : (
        <span className="w-4" />
      )}
      <span className="flex-shrink-0 text-slate-500">
        {isFolder ? (
          node.isOpen ? <FolderOpen size={14} /> : <Folder size={14} />
        ) : (
          <Document size={14} />
        )}
      </span>
      {node.isEditing ? (
        <input
          autoFocus
          defaultValue={data.name}
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => node.submit(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') node.submit(e.currentTarget.value)
            if (e.key === 'Escape') node.reset()
          }}
          className="flex-1 rounded border border-slate-300 bg-white px-1 text-sm outline-none focus:border-blue-500"
        />
      ) : (
        <span className="flex-1 truncate">{data.name}</span>
      )}
      <div className="hidden gap-0.5 group-hover/row:flex">
        {isFolder && (
          <>
            <button
              title="New document"
              onClick={(e) => {
                e.stopPropagation()
                if (data.folderId) {
                  void onCreateDocument(data.folderId)
                  node.open()
                }
              }}
              className="rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
            >
              <Document size={12} />
            </button>
            <button
              title="New folder"
              onClick={(e) => {
                e.stopPropagation()
                if (data.folderId) {
                  void onCreateFolder(data.folderId)
                  node.open()
                }
              }}
              className="rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
            >
              <Add size={12} />
            </button>
          </>
        )}
        <button
          title="Delete"
          onClick={(e) => {
            e.stopPropagation()
            void onDelete(node)
          }}
          className="rounded p-0.5 text-slate-500 hover:bg-red-100 hover:text-red-600"
        >
          <TrashCan size={12} />
        </button>
      </div>
    </div>
  )
}

export function FolderTree({
  folders,
  documents,
  selectedDocumentId,
  onSelectDocument,
  onCreateFolder,
  onCreateDocument,
  onRenameFolder,
  onRenameDocument,
  onDeleteFolder,
  onDeleteDocument,
  onMoveFolder,
  onMoveDocument,
}: FolderTreeProps) {
  const data = useMemo(() => buildTree(folders, documents), [folders, documents])
  const treeRef = useRef<TreeApi<KTreeNode> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect
      setSize({ width: rect.width, height: rect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const selection = selectedDocumentId ? `d:${selectedDocumentId}` : undefined

  async function handleDelete(node: NodeApi<KTreeNode>) {
    const data = node.data
    const label = data.kind === 'folder' ? 'folder (and everything in it)' : 'document'
    if (!window.confirm(`Delete this ${label}?`)) return
    try {
      if (data.kind === 'folder' && data.folderId) {
        await onDeleteFolder(data.folderId)
      } else if (data.documentId) {
        await onDeleteDocument(data.documentId)
      }
    } catch {
      toast.error('Delete failed')
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Knowledge
        </span>
        <div className="flex gap-0.5">
          <button
            title="New folder at root"
            onClick={() => void onCreateFolder(null)}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <Folder size={14} />
            <span className="sr-only">New folder</span>
          </button>
          <button
            title="New document at root"
            onClick={() => void onCreateDocument(null)}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <Document size={14} />
            <span className="sr-only">New document</span>
          </button>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 overflow-hidden p-1">
        {size.width > 0 && (
          <Tree<KTreeNode>
            ref={treeRef}
            data={data}
            width={size.width}
            height={size.height}
            indent={16}
            rowHeight={28}
            openByDefault={false}
            disableMultiSelection
            selection={selection}
            onRename={async ({ id, name, node }) => {
              const real = node.data
              try {
                if (real.kind === 'folder' && real.folderId) {
                  await onRenameFolder(real.folderId, name)
                } else if (real.documentId) {
                  await onRenameDocument(real.documentId, name)
                }
              } catch {
                toast.error('Rename failed')
              }
            }}
            onMove={async ({ dragNodes, parentNode, index }) => {
              const newParentFolderId = parentNode?.data.folderId ?? null
              for (let i = 0; i < dragNodes.length; i++) {
                const n = dragNodes[i].data
                const newSortOrder = (index ?? 0) + i
                try {
                  if (n.kind === 'folder' && n.folderId) {
                    if (n.folderId === newParentFolderId) continue
                    await onMoveFolder(n.folderId, newParentFolderId, newSortOrder)
                  } else if (n.documentId) {
                    await onMoveDocument(n.documentId, newParentFolderId, newSortOrder)
                  }
                } catch {
                  toast.error('Move failed')
                }
              }
            }}
            disableDrop={({ parentNode, dragNodes }) => {
              // Documents can only sit at root or inside a folder.
              if (!parentNode) return false
              if (parentNode.data.kind !== 'folder') return true
              // Prevent moving a folder into its own subtree.
              for (const n of dragNodes) {
                if (n.data.kind === 'folder') {
                  let p: NodeApi<KTreeNode> | null = parentNode
                  while (p) {
                    if (p.id === n.id) return true
                    p = p.parent
                  }
                }
              }
              return false
            }}
          >
            {(props) => (
              <NodeRow
                {...props}
                onSelectDocument={onSelectDocument}
                onCreateDocument={(folderId) => onCreateDocument(folderId)}
                onCreateFolder={(parentId) => onCreateFolder(parentId)}
                onDelete={handleDelete}
              />
            )}
          </Tree>
        )}
      </div>
    </div>
  )
}
