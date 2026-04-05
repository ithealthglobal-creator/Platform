'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/auth-context'
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
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Add, Edit, Password } from '@carbon/icons-react'

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
  const router = useRouter()
  const { session } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCompanyId, setFilterCompanyId] = useState<string>('all')

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
      .in('status', ['active', 'approved'])
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

  async function handleResetPassword(user: Profile) {
    if (!confirm(`Send a password reset email to ${user.email}?`)) return
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
      <div className="flex justify-end mb-6">
        <Button onClick={() => router.push('/people/users/new')}>
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
                        onClick={() => router.push(`/people/users/${user.id}/edit`)}
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
    </div>
  )
}
