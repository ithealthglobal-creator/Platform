'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Breadcrumb } from '@/components/breadcrumb'
import { Phase } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Edit } from '@carbon/icons-react'

export default function PhasesPage() {
  const [phases, setPhases] = useState<Phase[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formSortOrder, setFormSortOrder] = useState(0)
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchPhases = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('phases')
      .select('*')
      .order('sort_order')

    if (error) {
      toast.error('Failed to load phases')
      setLoading(false)
      return
    }

    setPhases(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPhases()
  }, [fetchPhases])

  function openEditDialog(phase: Phase) {
    setEditingPhase(phase)
    setFormName(phase.name)
    setFormDescription(phase.description ?? '')
    setFormSortOrder(phase.sort_order)
    setFormActive(phase.is_active)
    setDialogOpen(true)
  }

  async function handleSave() {
    const trimmedName = formName.trim()
    if (!trimmedName) {
      toast.error('Phase name is required')
      return
    }

    if (!editingPhase) return

    setSaving(true)

    const { error } = await supabase
      .from('phases')
      .update({
        name: trimmedName,
        description: formDescription.trim() || null,
        sort_order: formSortOrder,
        is_active: formActive,
      })
      .eq('id', editingPhase.id)

    if (error) {
      toast.error('Failed to update phase')
      setSaving(false)
      return
    }

    toast.success('Phase updated successfully')
    setSaving(false)
    setDialogOpen(false)
    fetchPhases()
  }

  return (
    <div>
      <Breadcrumb />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Phases</h1>
          <p className="text-muted-foreground text-sm">
            Manage modernisation phases and their status
          </p>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[120px]">Sort Order</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : phases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No phases found
                </TableCell>
              </TableRow>
            ) : (
              phases.map((phase) => (
                <TableRow key={phase.id}>
                  <TableCell className="font-medium">{phase.name}</TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {phase.description}
                  </TableCell>
                  <TableCell>{phase.sort_order}</TableCell>
                  <TableCell>
                    <Badge variant={phase.is_active ? 'default' : 'secondary'}>
                      {phase.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEditDialog(phase)}
                    >
                      <Edit size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Phase</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="phase-name">Name</Label>
              <Input
                id="phase-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Phase name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phase-description">Description</Label>
              <Input
                id="phase-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Phase description"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phase-sort-order">Sort Order</Label>
              <Input
                id="phase-sort-order"
                type="number"
                value={formSortOrder}
                onChange={(e) => setFormSortOrder(Number(e.target.value))}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="phase-active"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="phase-active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
