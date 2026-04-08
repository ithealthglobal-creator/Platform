'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Company, CompanyType, CompanyStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
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
import { Add, Edit } from '@carbon/icons-react'

interface CompanyWithCount extends Company {
  user_count: number
}

export default function CompaniesPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<CompanyWithCount[]>([])
  const [loading, setLoading] = useState(true)

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
        type: c.type as CompanyType,
        status: c.status as CompanyStatus,
        parent_company_id: (c.parent_company_id as string | null) ?? null,
        domain: (c.domain as string | null) ?? null,
        tagline: (c.tagline as string | null) ?? null,
        support_email: (c.support_email as string | null) ?? null,
        contact_email: (c.contact_email as string | null) ?? null,
        slug: (c.slug as string | null) ?? null,
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

  return (
    <div>
      <div className="flex justify-end mb-6">
        <Button onClick={() => router.push('/people/companies/new')}>
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
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No companies found
                </TableCell>
              </TableRow>
            ) : (
              companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>{company.user_count}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {company.type.charAt(0).toUpperCase() + company.type.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={company.status === 'active' || company.status === 'approved' ? 'default' : 'secondary'}>
                      {company.status.charAt(0).toUpperCase() + company.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => router.push(`/people/companies/${company.id}/edit`)}
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
    </div>
  )
}
