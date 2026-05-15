'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import type { SalesStage } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import {
  Add,
  Edit,
  TrashCan,
  ArrowUp,
  ArrowDown,
  Save,
  Close,
} from '@carbon/icons-react'

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#eab308',
  '#22c55e', '#14b8a6', '#3b82f6', '#64748b', '#ef4444',
]

type StageWithCount = SalesStage & { lead_count: number }

export default function SalesFunnelSettingsPage() {
  const [stages, setStages] = useState<StageWithCount[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStage, setEditingStage] = useState<SalesStage | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formColor, setFormColor] = useState(PRESET_COLORS[0])
  const [formActive, setFormActive] = useState(true)

  const fetchStages = useCallback(async () => {
    setLoading(true)
    const [stagesRes, leadCountsRes] = await Promise.all([
      supabase
        .from('sales_stages')
        .select('*')
        .order('sort_order', { ascending: true }),
      supabase.from('sales_leads').select('stage_id'),
    ])

    if (stagesRes.error) {
      toast.error('Failed to load sales stages')
      setLoading(false)
      return
    }

    const counts = new Map<string, number>()
    for (const row of leadCountsRes.data ?? []) {
      counts.set(row.stage_id, (counts.get(row.stage_id) ?? 0) + 1)
    }

    setStages(
      (stagesRes.data ?? []).map((s) => ({
        ...s,
        lead_count: counts.get(s.id) ?? 0,
      }))
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchStages()
  }, [fetchStages])

  const openCreateDialog = () => {
    setEditingStage(null)
    setFormName('')
    setFormColor(PRESET_COLORS[0])
    setFormActive(true)
    setDialogOpen(true)
  }

  const openEditDialog = (stage: SalesStage) => {
    setEditingStage(stage)
    setFormName(stage.name)
    setFormColor(stage.color)
    setFormActive(stage.is_active)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Stage name is required')
      return
    }
    setSaving(true)

    if (editingStage) {
      const { error } = await supabase
        .from('sales_stages')
        .update({
          name: formName.trim(),
          color: formColor,
          is_active: formActive,
        })
        .eq('id', editingStage.id)
      setSaving(false)
      if (error) {
        toast.error('Failed to update stage')
        return
      }
      toast.success('Stage updated')
    } else {
      const maxOrder = stages.reduce((m, s) => Math.max(m, s.sort_order), 0)
      const { error } = await supabase.from('sales_stages').insert({
        name: formName.trim(),
        color: formColor,
        sort_order: maxOrder + 1,
        is_active: formActive,
      })
      setSaving(false)
      if (error) {
        toast.error('Failed to add stage')
        return
      }
      toast.success('Stage added')
    }
    setDialogOpen(false)
    fetchStages()
  }

  const handleDelete = async (stage: StageWithCount) => {
    if (stage.lead_count > 0) {
      toast.error('Cannot delete a stage that still has leads')
      return
    }
    if (!confirm(`Delete stage "${stage.name}"?`)) return

    const { error } = await supabase.from('sales_stages').delete().eq('id', stage.id)
    if (error) {
      toast.error('Failed to delete stage')
    } else {
      toast.success('Stage deleted')
      fetchStages()
    }
  }

  const handleMove = async (stage: StageWithCount, direction: 'up' | 'down') => {
    const index = stages.findIndex((s) => s.id === stage.id)
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= stages.length) return

    const other = stages[swapIndex]

    // Optimistic UI
    const next = [...stages]
    next[index] = { ...other, sort_order: stage.sort_order }
    next[swapIndex] = { ...stage, sort_order: other.sort_order }
    setStages(next)

    const [r1, r2] = await Promise.all([
      supabase
        .from('sales_stages')
        .update({ sort_order: other.sort_order })
        .eq('id', stage.id),
      supabase
        .from('sales_stages')
        .update({ sort_order: stage.sort_order })
        .eq('id', other.id),
    ])

    if (r1.error || r2.error) {
      toast.error('Failed to reorder stages')
      fetchStages()
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Funnel</h1>
          <p className="text-sm text-muted-foreground">
            Define the stages every lead moves through. These columns appear on the Deals
            kanban.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Add size={16} />
          Add Stage
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Order</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="w-24">Leads</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-48 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : stages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No stages yet. Add your first one to get started.
                </TableCell>
              </TableRow>
            ) : (
              stages.map((stage, i) => (
                <TableRow key={stage.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={i === 0}
                        onClick={() => handleMove(stage, 'up')}
                      >
                        <ArrowUp size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={i === stages.length - 1}
                        onClick={() => handleMove(stage, 'down')}
                      >
                        <ArrowDown size={14} />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="font-medium">{stage.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{stage.lead_count}</Badge>
                  </TableCell>
                  <TableCell>
                    {stage.is_active ? (
                      <Badge>Active</Badge>
                    ) : (
                      <Badge variant="outline">Hidden</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(stage)}
                    >
                      <Edit size={14} />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(stage)}
                      disabled={stage.lead_count > 0}
                    >
                      <TrashCan size={14} />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingStage ? 'Edit Stage' : 'Add Stage'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stage-name">Name</Label>
              <Input
                id="stage-name"
                placeholder="e.g. Qualified, Proposal Sent, Won"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Colour</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor: formColor === color ? '#1e293b' : 'transparent',
                    }}
                    onClick={() => setFormColor(color)}
                  />
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer">
              <div>
                <p className="text-sm font-medium">Visible on Deals board</p>
                <p className="text-xs text-muted-foreground">
                  Hidden stages are kept but don&apos;t appear as columns.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              <Close size={14} />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save size={14} />
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
