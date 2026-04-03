'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Breadcrumb } from '@/components/breadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, Save } from '@carbon/icons-react'

export default function EditCostVariablePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formUnitLabel, setFormUnitLabel] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchItem() {
      const { data, error } = await supabase
        .from('cost_variables')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        toast.error('Failed to load cost variable')
        router.push('/services/cost-variables')
        return
      }

      setFormName(data.name)
      setFormDescription(data.description ?? '')
      setFormUnitLabel(data.unit_label ?? '')
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
      .from('cost_variables')
      .update({
        name: trimmedName,
        description: formDescription.trim() || null,
        unit_label: formUnitLabel.trim() || null,
        is_active: formActive,
      })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update cost variable')
      setSaving(false)
      return
    }

    toast.success('Cost variable updated')
    router.push('/services/cost-variables')
  }

  if (loading) {
    return (
      <div>
        <Breadcrumb />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div>
      <Breadcrumb />
      <div className="mb-6">
        <button
          onClick={() => router.push('/services/cost-variables')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} /> Back to Cost Variables
        </button>
      </div>
      <h1 className="text-2xl font-bold mb-6">Edit Cost Variable</h1>

      <div className="grid gap-4 max-w-lg">
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
