'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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

export default function NewUserPage() {
  const router = useRouter()
  const { session } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formDisplayName, setFormDisplayName] = useState('')
  const [formCompanyId, setFormCompanyId] = useState<string>('')
  const [formRole, setFormRole] = useState<UserRole>('customer')
  const [saving, setSaving] = useState(false)

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

    const list = (data as Company[]) ?? []
    setCompanies(list)
    if (list.length > 0) setFormCompanyId(list[0].id)
  }, [])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  async function handleSave() {
    if (!formEmail.trim()) {
      toast.error('Email is required')
      return
    }
    if (!formPassword || formPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
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
        action: 'create',
        email: formEmail.trim(),
        password: formPassword,
        display_name: formDisplayName.trim(),
        company_id: formCompanyId,
        role: formRole,
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      toast.error(result.error || 'Failed to create user')
      setSaving(false)
      return
    }

    toast.success('User created successfully')
    router.push('/people/users')
  }

  return (
    <div>
      <div className="grid gap-4 max-w-lg">
        <div className="grid gap-2">
          <Label htmlFor="user-email">Email</Label>
          <Input
            id="user-email"
            type="email"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            placeholder="user@example.com"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="user-password">Password</Label>
          <Input
            id="user-password"
            type="password"
            value={formPassword}
            onChange={(e) => setFormPassword(e.target.value)}
            placeholder="Min 6 characters"
          />
        </div>

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
