'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Breadcrumb } from '@/components/breadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, Save } from '@carbon/icons-react'

export default function NewPersonaPage() {
  const router = useRouter()
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const trimmedName = formName.trim()
    if (!trimmedName) {
      toast.error('Name is required')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('personas')
      .insert({
        name: trimmedName,
        description: formDescription.trim() || null,
        is_active: formActive,
      })

    if (error) {
      toast.error('Failed to create persona')
      setSaving(false)
      return
    }

    toast.success('Persona created')
    router.push('/growth/market/personas')
  }

  return (
    <div>
      <Breadcrumb />
      <div className="mb-6">
        <button
          onClick={() => router.push('/growth/market/personas')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} /> Back to Personas
        </button>
      </div>
      <h1 className="text-2xl font-bold mb-6">New Persona</h1>

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
