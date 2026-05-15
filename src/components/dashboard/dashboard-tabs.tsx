'use client'

import { useState } from 'react'
import { StarFilled, Star, Add, Save, TrashCan, Locked, GroupAccount } from '@carbon/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { DashboardVisibility, SavedDashboard } from '@/lib/dashboard/types'

interface Props {
  dashboards: SavedDashboard[]
  activeId: string | null
  defaultId: string | null
  isDirty: boolean
  visibility: DashboardVisibility
  onSelect: (id: string | null) => void
  onNew: () => void
  onSave: (name: string, visibility: DashboardVisibility) => Promise<void>
  onSaveExisting: () => Promise<void>
  onSetDefault: (id: string | null) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onChangeVisibility: (v: DashboardVisibility) => void
}

export function DashboardTabs({
  dashboards,
  activeId,
  defaultId,
  isDirty,
  visibility,
  onSelect,
  onNew,
  onSave,
  onSaveExisting,
  onSetDefault,
  onDelete,
  onChangeVisibility,
}: Props) {
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [newName, setNewName] = useState('')
  const [newVisibility, setNewVisibility] = useState<DashboardVisibility>('private')
  const [saving, setSaving] = useState(false)

  const activeDashboard = dashboards.find((d) => d.id === activeId) ?? null
  const isExisting = activeDashboard !== null

  async function handleSave() {
    if (isExisting) {
      await onSaveExisting()
      return
    }
    setNewName('')
    setNewVisibility(visibility)
    setShowSaveDialog(true)
  }

  async function handleConfirmSave() {
    if (!newName.trim()) return
    setSaving(true)
    try {
      await onSave(newName.trim(), newVisibility)
      setShowSaveDialog(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-1 overflow-x-auto border-b bg-white px-3 py-2">
        <div className="flex items-center gap-1">
          {dashboards.map((d) => {
            const isActive = d.id === activeId
            const isDefault = d.id === defaultId
            return (
              <div
                key={d.id}
                className={cn(
                  'group flex items-center gap-1 rounded-md border px-2 py-1 text-sm transition-colors',
                  isActive
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-transparent hover:bg-muted',
                )}
              >
                <button
                  type="button"
                  className="flex items-center"
                  onClick={() => onSetDefault(isDefault ? null : d.id)}
                  title={isDefault ? 'Default — click to unset' : 'Set as default'}
                >
                  {isDefault ? (
                    <StarFilled size={14} className="text-yellow-500" />
                  ) : (
                    <Star size={14} className="text-muted-foreground group-hover:text-muted-foreground" />
                  )}
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1.5"
                  onClick={() => onSelect(d.id)}
                  title={`Open "${d.name}"`}
                >
                  <span className="max-w-[160px] truncate">{d.name}</span>
                  {d.visibility === 'company' ? (
                    <GroupAccount size={12} className="text-muted-foreground" />
                  ) : (
                    <Locked size={12} className="text-muted-foreground" />
                  )}
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="rounded px-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    …
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => onDelete(d.id)}
                      className="text-red-600"
                    >
                      <TrashCan size={14} className="mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })}

          <button
            type="button"
            className={cn(
              'flex items-center gap-1 rounded-md border border-dashed px-2 py-1 text-sm text-muted-foreground hover:bg-muted/50',
              activeId === null && 'border-primary text-primary',
            )}
            onClick={onNew}
            title="New dashboard"
          >
            <Add size={14} />
            New
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {isExisting ? (
            <select
              value={visibility}
              onChange={(e) => onChangeVisibility(e.target.value as DashboardVisibility)}
              className="rounded border border-border bg-white px-2 py-1 text-xs"
              title="Visibility"
            >
              <option value="private">Private</option>
              <option value="company">Company</option>
            </select>
          ) : null}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty && isExisting}
            title={isExisting ? 'Save changes' : 'Save as new dashboard'}
          >
            <Save size={14} className="mr-1" />
            Save
          </Button>
        </div>
      </div>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save dashboard</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My KPIs"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium">Visibility</label>
              <select
                value={newVisibility}
                onChange={(e) => setNewVisibility(e.target.value as DashboardVisibility)}
                className="mt-1 w-full rounded border border-border bg-white px-2 py-1.5 text-sm"
              >
                <option value="private">Private (only you)</option>
                <option value="company">Company (everyone in your company)</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSave} disabled={!newName.trim() || saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
