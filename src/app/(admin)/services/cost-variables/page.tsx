'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Breadcrumb } from '@/components/breadcrumb'
import { CostVariable } from '@/lib/types'
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
import { Add, Edit, TrashCan } from '@carbon/icons-react'

export default function CostVariablesPage() {
  const [costVariables, setCostVariables] = useState<CostVariable[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CostVariable | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formUnitLabel, setFormUnitLabel] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchCostVariables = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('cost_variables')
      .select('*')
      .order('name')

    if (error) {
      toast.error('Failed to load cost variables')
      setLoading(false)
      return
    }

    setCostVariables(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCostVariables()
  }, [fetchCostVariables])

  function openAddDialog() {
    setEditingItem(null)
    setFormName('')
    setFormDescription('')
    setFormUnitLabel('')
    setFormActive(true)
    setDialogOpen(true)
  }

  function openEditDialog(item: CostVariable) {
    setEditingItem(item)
    setFormName(item.name)
    setFormDescription(item.description ?? '')
    setFormUnitLabel(item.unit_label ?? '')
    setFormActive(item.is_active)
    setDialogOpen(true)
  }

  async function handleDelete(item: CostVariable) {
    if (!confirm(`Delete cost variable "${item.name}"? This cannot be undone.`)) return

    const { error } = await supabase
      .from('cost_variables')
      .delete()
      .eq('id', item.id)

    if (error) {
      toast.error('Failed to delete cost variable')
      return
    }

    toast.success('Cost variable deleted')
    fetchCostVariables()
  }

  async function handleSave() {
    const trimmedName = formName.trim()
    if (!trimmedName) {
      toast.error('Name is required')
      return
    }

    setSaving(true)

    const payload = {
      name: trimmedName,
      description: formDescription.trim() || null,
      unit_label: formUnitLabel.trim() || null,
      is_active: formActive,
    }

    if (editingItem) {
      const { error } = await supabase
        .from('cost_variables')
        .update(payload)
        .eq('id', editingItem.id)

      if (error) {
        toast.error('Failed to update cost variable')
        setSaving(false)
        return
      }

      toast.success('Cost variable updated')
    } else {
      const { error } = await supabase
        .from('cost_variables')
        .insert(payload)

      if (error) {
        toast.error('Failed to create cost variable')
        setSaving(false)
        return
      }

      toast.success('Cost variable created')
    }

    setSaving(false)
    setDialogOpen(false)
    fetchCostVariables()
  }

  return (
    <div>
      <Breadcrumb />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Cost Variables</h1>
          <p className="text-muted-foreground text-sm">
            Variables used to calculate service costs
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Add size={16} />
          Add Cost Variable
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Unit Label</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : costVariables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No cost variables found
                </TableCell>
              </TableRow>
            ) : (
              costVariables.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.unit_label ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? 'default' : 'secondary'}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEditDialog(item)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(item)}
                      >
                        <TrashCan size={16} />
                      </Button>
                    </div>
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
            <DialogTitle>{editingItem ? 'Edit Cost Variable' : 'Add Cost Variable'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="cv-name">Name</Label>
              <Input
                id="cv-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Users"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cv-description">Description</Label>
              <Input
                id="cv-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="What this variable represents"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cv-unit-label">Unit Label</Label>
              <Input
                id="cv-unit-label"
                value={formUnitLabel}
                onChange={(e) => setFormUnitLabel(e.target.value)}
                placeholder="e.g., users, devices"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cv-active"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="cv-active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
