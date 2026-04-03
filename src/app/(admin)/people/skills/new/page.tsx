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

export default function NewSkillPage() {
  const router = useRouter()
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCategory, setFormCategory] = useState('')
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
      .from('skills')
      .insert({
        name: trimmedName,
        description: formDescription.trim() || null,
        category: formCategory.trim() || null,
        is_active: formActive,
      })

    if (error) {
      toast.error('Failed to create skill')
      setSaving(false)
      return
    }

    toast.success('Skill created')
    router.push('/people/skills')
  }

  return (
    <div>
      <Breadcrumb />
      <div className="mb-6">
        <button
          onClick={() => router.push('/people/skills')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} /> Back to Skills
        </button>
      </div>
      <h1 className="text-2xl font-bold mb-6">New Skill</h1>

      <div className="grid gap-4 max-w-lg">
        <div className="grid gap-2">
          <Label htmlFor="skill-name">Name</Label>
          <Input
            id="skill-name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g., Network Engineering"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="skill-category">Category</Label>
          <Input
            id="skill-category"
            value={formCategory}
            onChange={(e) => setFormCategory(e.target.value)}
            placeholder="e.g., Infrastructure, Security"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="skill-description">Description</Label>
          <Input
            id="skill-description"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Skill description"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="skill-active"
            checked={formActive}
            onChange={(e) => setFormActive(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <Label htmlFor="skill-active">Active</Label>
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
