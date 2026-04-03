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

export default function NewCompanyPage() {
  const router = useRouter()
  const [formName, setFormName] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const trimmedName = formName.trim()
    if (!trimmedName) {
      toast.error('Company name is required')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('companies')
      .insert({ name: trimmedName, is_active: formActive })

    if (error) {
      toast.error('Failed to create company')
      setSaving(false)
      return
    }

    toast.success('Company created successfully')
    router.push('/people/companies')
  }

  return (
    <div>
      <Breadcrumb />
      <div className="mb-6">
        <button
          onClick={() => router.push('/people/companies')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} /> Back to Companies
        </button>
      </div>
      <h1 className="text-2xl font-bold mb-6">New Company</h1>

      <div className="grid gap-4 max-w-lg">
        <div className="grid gap-2">
          <Label htmlFor="company-name">Name</Label>
          <Input
            id="company-name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Company name"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !saving) handleSave()
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="company-active"
            checked={formActive}
            onChange={(e) => setFormActive(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <Label htmlFor="company-active">Active</Label>
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
