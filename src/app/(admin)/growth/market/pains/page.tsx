'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Breadcrumb } from '@/components/breadcrumb'
import { Pain } from '@/lib/types'
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

export default function PainsPage() {
  const [pains, setPains] = useState<Pain[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Pain | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchPains = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('pains')
      .select('*')
      .order('name')

    if (error) {
      toast.error('Failed to load pains')
      setLoading(false)
      return
    }

    setPains(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPains()
  }, [fetchPains])

  function openAddDialog() {
    setEditingItem(null)
    setFormName('')
    setFormDescription('')
    setFormActive(true)
    setDialogOpen(true)
  }

  function openEditDialog(item: Pain) {
    setEditingItem(item)
    setFormName(item.name)
    setFormDescription(item.description ?? '')
    setFormActive(item.is_active)
    setDialogOpen(true)
  }

  async function handleDelete(item: Pain) {
    if (!confirm(`Delete pain "${item.name}"? This cannot be undone.`)) return

    const { error } = await supabase
      .from('pains')
      .delete()
      .eq('id', item.id)

    if (error) {
      toast.error('Failed to delete pain')
      return
    }

    toast.success('Pain deleted')
    fetchPains()
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
      is_active: formActive,
    }

    if (editingItem) {
      const { error } = await supabase
        .from('pains')
        .update(payload)
        .eq('id', editingItem.id)

      if (error) {
        toast.error('Failed to update pain')
        setSaving(false)
        return
      }

      toast.success('Pain updated')
    } else {
      const { error } = await supabase
        .from('pains')
        .insert(payload)

      if (error) {
        toast.error('Failed to create pain')
        setSaving(false)
        return
      }

      toast.success('Pain created')
    }

    setSaving(false)
    setDialogOpen(false)
    fetchPains()
  }

  return (
    <div>
      <Breadcrumb />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Pains</h1>
          <p className="text-muted-foreground text-sm">
            Customer pain points
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Add size={16} className="mr-2" />
          Add Pain
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
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
            ) : pains.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No pains found
                </TableCell>
              </TableRow>
            ) : (
              pains.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{item.description ?? '—'}</TableCell>
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
            <DialogTitle>{editingItem ? 'Edit Pain' : 'Add Pain'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="pain-name">Name</Label>
              <Input
                id="pain-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Frequent downtime"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pain-description">Description</Label>
              <Input
                id="pain-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Pain point details"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pain-active"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="pain-active">Active</Label>
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
