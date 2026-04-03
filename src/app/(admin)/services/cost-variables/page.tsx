'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Breadcrumb } from '@/components/breadcrumb'
import { CostVariable } from '@/lib/types'
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
import { Add, Edit, TrashCan } from '@carbon/icons-react'

export default function CostVariablesPage() {
  const router = useRouter()
  const [costVariables, setCostVariables] = useState<CostVariable[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCostVariables = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('cost_variables')
      .select('*')
      .order('name')

    if (error) {
      toast.error('Failed to load cost variables')
      setLoading(false)
      return
    }

    setCostVariables(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCostVariables()
  }, [fetchCostVariables])

  async function handleDelete(item: CostVariable) {
    if (!confirm(`Delete cost variable "${item.name}"? This cannot be undone.`)) return

    const { error } = await supabase
      .from('cost_variables')
      .delete()
      .eq('id', item.id)

    if (error) {
      toast.error('Failed to delete cost variable')
      return
    }

    toast.success('Cost variable deleted')
    fetchCostVariables()
  }

  return (
    <div>
      <Breadcrumb />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Cost Variables</h1>
          <p className="text-muted-foreground text-sm">
            Variables used to calculate service costs
          </p>
        </div>
        <Button onClick={() => router.push('/services/cost-variables/new')}>
          <Add size={16} />
          Add Cost Variable
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Unit Label</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : costVariables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No cost variables found
                </TableCell>
              </TableRow>
            ) : (
              costVariables.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.unit_label ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? 'default' : 'secondary'}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => router.push(`/services/cost-variables/${item.id}/edit`)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(item)}
                      >
                        <TrashCan size={16} />
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
