'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase-client'
import { Company, UserRole } from '@/lib/types'
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

const ROLES: UserRole[] = ['admin', 'customer', 'partner']

export default function EditUserPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { session } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [formDisplayName, setFormDisplayName] = useState('')
  const [formCompanyId, setFormCompanyId] = useState<string>('')
  const [formRole, setFormRole] = useState<UserRole>('customer')
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchCompanies = useCallback(async () => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .in('status', ['active', 'approved'])
      .order('name')

    if (error) {
      toast.error('Failed to load companies')
      return
    }

    setCompanies((data as Company[]) ?? [])
  }, [])

  useEffect(() => {
    async function fetchUser() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        toast.error('Failed to load user')
        router.push('/people/users')
        return
      }

      setFormDisplayName(data.display_name)
      setFormCompanyId(data.company_id)
      setFormRole(data.role)
      setFormActive(data.is_active)
      setLoading(false)
    }

    fetchUser()
    fetchCompanies()
  }, [id, router, fetchCompanies])

  async function handleSave() {
    if (!formDisplayName.trim()) {
      toast.error('Display name is required')
      return
    }
    if (!formCompanyId) {
      toast.error('Company is required')
      return
    }

    setSaving(true)

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        action: 'update',
        user_id: id,
        display_name: formDisplayName.trim(),
        company_id: formCompanyId,
        role: formRole,
        is_active: formActive,
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      toast.error(result.error || 'Failed to update user')
      setSaving(false)
      return
    }

    toast.success('User updated successfully')
    router.push('/people/users')
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
          <Label htmlFor="user-display-name">Display Name</Label>
          <Input
            id="user-display-name"
            value={formDisplayName}
            onChange={(e) => setFormDisplayName(e.target.value)}
            placeholder="Full name"
          />
        </div>

        <div className="grid gap-2">
          <Label>Company</Label>
          <Select value={formCompanyId} onValueChange={(v) => setFormCompanyId(v ?? '')}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Role</Label>
          <Select value={formRole} onValueChange={(v) => setFormRole(v as UserRole)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="user-active"
            checked={formActive}
            onChange={(e) => setFormActive(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <Label htmlFor="user-active">Active</Label>
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
