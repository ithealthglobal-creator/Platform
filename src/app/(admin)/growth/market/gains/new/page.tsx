'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save } from '@carbon/icons-react'

export default function NewGainPage() {
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
      .from('gains')
      .insert({
        name: trimmedName,
        description: formDescription.trim() || null,
        is_active: formActive,
      })

    if (error) {
      toast.error('Failed to create gain')
      setSaving(false)
      return
    }

    toast.success('Gain created')
    router.push('/growth/market/gains')
  }

  return (
    <div>
      <div className="grid gap-4 max-w-lg">
        <div className="grid gap-2">
          <Label htmlFor="gain-name">Name</Label>
          <Input
            id="gain-name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g., Reduced IT costs"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="gain-description">Description</Label>
          <Input
            id="gain-description"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Gain/outcome details"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="gain-active"
            checked={formActive}
            onChange={(e) => setFormActive(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <Label htmlFor="gain-active">Active</Label>
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
