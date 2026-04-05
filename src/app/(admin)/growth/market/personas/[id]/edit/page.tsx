'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save } from '@carbon/icons-react'

export default function EditPersonaPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchItem() {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        toast.error('Failed to load persona')
        router.push('/growth/market/personas')
        return
      }

      setFormName(data.name)
      setFormDescription(data.description ?? '')
      setFormActive(data.is_active)
      setLoading(false)
    }
    fetchItem()
  }, [id, router])

  async function handleSave() {
    const trimmedName = formName.trim()
    if (!trimmedName) {
      toast.error('Name is required')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('personas')
      .update({
        name: trimmedName,
        description: formDescription.trim() || null,
        is_active: formActive,
      })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update persona')
      setSaving(false)
      return
    }

    toast.success('Persona updated')
    router.push('/growth/market/personas')
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
