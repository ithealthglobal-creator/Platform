'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/auth-context'
import { Breadcrumb } from '@/components/breadcrumb'
import { Profile, Company, UserRole } from '@/lib/types'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Add, Edit, Password } from '@carbon/icons-react'

const ROLES: UserRole[] = ['admin', 'customer', 'partner']

function roleBadgeVariant(role: UserRole): 'default' | 'secondary' | 'outline' {
  switch (role) {
    case 'admin':
      return 'default'
    case 'partner':
      return 'secondary'
    default:
      return 'outline'
  }
}

export default function UsersPage() {
  const { session } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCompanyId, setFilterCompanyId] = useState<string>('all')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)

  // Create form fields
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formDisplayName, setFormDisplayName] = useState('')
  const [formCompanyId, setFormCompanyId] = useState<string>('')
  const [formRole, setFormRole] = useState<UserRole>('customer')
  const [formActive, setFormActive] = useState(true)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*, company:companies(*)')
      .order('display_name')

    if (error) {
      toast.error('Failed to load users')
      setLoading(false)
      return
    }

    setUsers((data as Profile[]) ?? [])
    setLoading(false)
  }, [])

  const fetchCompanies = useCallback(async () => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      toast.error('Failed to load companies')
      return
    }

    setCompanies((data as Company[]) ?? [])
  }, [])

  useEffect(() => {
    fetchUsers()
    fetchCompanies()
  }, [fetchUsers, fetchCompanies])

  const filteredUsers =
    filterCompanyId === 'all'
      ? users
      : users.filter((u) => u.company_id === filterCompanyId)

  function openCreateDialog() {
    setEditingUser(null)
    setFormEmail('')
    setFormPassword('')
    setFormDisplayName('')
    setFormCompanyId(companies[0]?.id ?? '')
    setFormRole('customer')
    setFormActive(true)
    setDialogOpen(true)
  }

  function openEditDialog(user: Profile) {
    setEditingUser(user)
    setFormDisplayName(user.display_name)
    setFormCompanyId(user.company_id)
    setFormRole(user.role)
    setFormActive(user.is_active)
    setDialogOpen(true)
  }

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

    if (editingUser) {
      // Update existing user
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'update',
          user_id: editingUser.id,
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
    } else {
      // Create new user
      if (!formEmail.trim()) {
        toast.error('Email is required')
        setSaving(false)
        return
      }
      if (!formPassword || formPassword.length < 6) {
        toast.error('Password must be at least 6 characters')
        setSaving(false)
        return
      }

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
    }

    setSaving(false)
    setDialogOpen(false)
    fetchUsers()
  }

  async function handleResetPassword(user: Profile) {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        action: 'reset-password',
        email: user.email,
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      toast.error(result.error || 'Failed to send reset email')
      return
    }

    toast.success(`Password reset email sent to ${user.email}`)
  }

  return (
    <div>
      <Breadcrumb />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Users</h1>
          <p className="text-muted-foreground text-sm">
            Manage users, roles, and company assignments
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Add size={16} />
          Add User
        </Button>
      </div>

      {/* Company filter */}
      <div className="mb-4 flex items-center gap-2">
        <Label className="text-sm text-muted-foreground">Filter by company:</Label>
        <Select value={filterCompanyId} onValueChange={(v) => setFilterCompanyId(v ?? 'all')}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead className="w-[100px]">Role</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.display_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.company?.name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariant(user.role)}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'default' : 'secondary'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEditDialog(user)}
                        title="Edit user"
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleResetPassword(user)}
                        title="Reset password"
                      >
                        <Password size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Edit User' : 'Add User'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Email & password only for create */}
            {!editingUser && (
              <>
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
              </>
            )}

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

            {editingUser && (
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
            )}
          </div>

          <DialogFooter>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingUser ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
