'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Breadcrumb } from '@/components/breadcrumb'
import { Persona } from '@/lib/types'
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

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Persona | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchPersonas = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('personas')
      .select('*')
      .order('name')

    if (error) {
      toast.error('Failed to load personas')
      setLoading(false)
      return
    }

    setPersonas(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPersonas()
  }, [fetchPersonas])

  function openAddDialog() {
    setEditingItem(null)
    setFormName('')
    setFormDescription('')
    setFormActive(true)
    setDialogOpen(true)
  }

  function openEditDialog(item: Persona) {
    setEditingItem(item)
    setFormName(item.name)
    setFormDescription(item.description ?? '')
    setFormActive(item.is_active)
    setDialogOpen(true)
  }

  async function handleDelete(item: Persona) {
    if (!confirm(`Delete persona "${item.name}"? This cannot be undone.`)) return

    const { error } = await supabase
      .from('personas')
      .delete()
      .eq('id', item.id)

    if (error) {
      toast.error('Failed to delete persona')
      return
    }

    toast.success('Persona deleted')
    fetchPersonas()
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
        .from('personas')
        .update(payload)
        .eq('id', editingItem.id)

      if (error) {
        toast.error('Failed to update persona')
        setSaving(false)
        return
      }

      toast.success('Persona updated')
    } else {
      const { error } = await supabase
        .from('personas')
        .insert(payload)

      if (error) {
        toast.error('Failed to create persona')
        setSaving(false)
        return
      }

      toast.success('Persona created')
    }

    setSaving(false)
    setDialogOpen(false)
    fetchPersonas()
  }

  return (
    <div>
      <Breadcrumb />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Personas</h1>
          <p className="text-muted-foreground text-sm">
            Target buyer personas
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Add size={16} />
          Add Persona
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
            ) : personas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No personas found
                </TableCell>
              </TableRow>
            ) : (
              personas.map((item) => (
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
            <DialogTitle>{editingItem ? 'Edit Persona' : 'Add Persona'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="persona-name">Name</Label>
              <Input
                id="persona-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., IT Manager, Business Owner"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="persona-description">Description</Label>
              <Input
                id="persona-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Persona description"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="persona-active"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="persona-active">Active</Label>
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
