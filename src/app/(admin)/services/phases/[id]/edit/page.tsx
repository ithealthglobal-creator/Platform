'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save } from '@carbon/icons-react'

export default function EditPhasePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formSortOrder, setFormSortOrder] = useState(0)
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPhase() {
      const { data, error } = await supabase
        .from('phases')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        toast.error('Failed to load phase')
        router.push('/services/phases')
        return
      }

      setFormName(data.name)
      setFormDescription(data.description ?? '')
      setFormSortOrder(data.sort_order)
      setFormActive(data.is_active)
      setLoading(false)
    }
    fetchPhase()
  }, [id, router])

  async function handleSave() {
    const trimmedName = formName.trim()
    if (!trimmedName) {
      toast.error('Phase name is required')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('phases')
      .update({
        name: trimmedName,
        description: formDescription.trim() || null,
        sort_order: formSortOrder,
        is_active: formActive,
      })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update phase')
      setSaving(false)
      return
    }

    toast.success('Phase updated successfully')
    router.push('/services/phases')
  }

  if (loading) {
    return (
      <div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="grid gap-4 max-w-lg">
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

        <div>
          <Button onClick={handleSave} disabled={saving}>
            <Save size={16} className="mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}
