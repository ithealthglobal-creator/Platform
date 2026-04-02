'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Breadcrumb } from '@/components/breadcrumb'
import { Company } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Add, Edit } from '@carbon/icons-react'

interface CompanyWithCount extends Company {
  user_count: number
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<CompanyWithCount | null>(
    null
  )
  const [formName, setFormName] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchCompanies = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('companies')
      .select('*, profiles(count)')
      .order('name')

    if (error) {
      toast.error('Failed to load companies')
      setLoading(false)
      return
    }

    const mapped: CompanyWithCount[] = (data ?? []).map(
      (c: Record<string, unknown>) => ({
        id: c.id as string,
        name: c.name as string,
        is_active: c.is_active as boolean,
        created_at: c.created_at as string,
        updated_at: c.updated_at as string,
        user_count:
          (
            c.profiles as Array<{ count: number }> | undefined
          )?.[0]?.count ?? 0,
      })
    )

    setCompanies(mapped)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  function openCreateDialog() {
    setEditingCompany(null)
    setFormName('')
    setFormActive(true)
    setDialogOpen(true)
  }

  function openEditDialog(company: CompanyWithCount) {
    setEditingCompany(company)
    setFormName(company.name)
    setFormActive(company.is_active)
    setDialogOpen(true)
  }

  async function handleSave() {
    const trimmedName = formName.trim()
    if (!trimmedName) {
      toast.error('Company name is required')
      return
    }

    setSaving(true)

    if (editingCompany) {
      const { error } = await supabase
        .from('companies')
        .update({ name: trimmedName, is_active: formActive })
        .eq('id', editingCompany.id)

      if (error) {
        toast.error('Failed to update company')
        setSaving(false)
        return
      }

      toast.success('Company updated successfully')
    } else {
      const { error } = await supabase
        .from('companies')
        .insert({ name: trimmedName, is_active: formActive })

      if (error) {
        toast.error('Failed to create company')
        setSaving(false)
        return
      }

      toast.success('Company created successfully')
    }

    setSaving(false)
    setDialogOpen(false)
    fetchCompanies()
  }

  return (
    <div>
      <Breadcrumb />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Companies</h1>
          <p className="text-muted-foreground text-sm">
            Manage companies and their status
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Add size={16} />
          Add Company
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-[100px]">Users</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No companies found
                </TableCell>
              </TableRow>
            ) : (
              companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>{company.user_count}</TableCell>
                  <TableCell>
                    <Badge variant={company.is_active ? 'default' : 'secondary'}>
                      {company.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEditDialog(company)}
                    >
                      <Edit size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCompany ? 'Edit Company' : 'Add Company'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
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
          </div>

          <DialogFooter>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingCompany ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
