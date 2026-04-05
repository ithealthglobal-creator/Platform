'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { CompanyType, CompanyStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Save } from '@carbon/icons-react'

const COMPANY_TYPES: CompanyType[] = ['admin', 'customer', 'partner']
const COMPANY_STATUSES: CompanyStatus[] = ['prospect', 'active', 'churned', 'pending', 'approved', 'inactive']

export default function EditCompanyPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<CompanyType>('customer')
  const [formStatus, setFormStatus] = useState<CompanyStatus>('active')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCompany() {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        toast.error('Failed to load company')
        router.push('/people/companies')
        return
      }

      setFormName(data.name)
      setFormType(data.type as CompanyType)
      setFormStatus(data.status as CompanyStatus)
      setLoading(false)
    }
    fetchCompany()
  }, [id, router])

  async function handleSave() {
    const trimmedName = formName.trim()
    if (!trimmedName) {
      toast.error('Company name is required')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('companies')
      .update({ name: trimmedName, type: formType, status: formStatus })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update company')
      setSaving(false)
      return
    }

    toast.success('Company updated successfully')
    router.push('/people/companies')
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

        <div className="grid gap-2">
          <Label>Type</Label>
          <Select value={formType} onValueChange={(v) => setFormType(v as CompanyType)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Status</Label>
          <Select value={formStatus} onValueChange={(v) => setFormStatus(v as CompanyStatus)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
