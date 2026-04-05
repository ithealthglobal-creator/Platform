'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Gain } from '@/lib/types'
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

export default function GainsPage() {
  const router = useRouter()
  const [gains, setGains] = useState<Gain[]>([])
  const [loading, setLoading] = useState(true)

  const fetchGains = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('gains')
      .select('*')
      .order('name')

    if (error) {
      toast.error('Failed to load gains')
      setLoading(false)
      return
    }

    setGains(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchGains()
  }, [fetchGains])

  async function handleDelete(item: Gain) {
    if (!confirm(`Delete gain "${item.name}"? This cannot be undone.`)) return

    const { error } = await supabase
      .from('gains')
      .delete()
      .eq('id', item.id)

    if (error) {
      toast.error('Failed to delete gain')
      return
    }

    toast.success('Gain deleted')
    fetchGains()
  }

  return (
    <div>
      <div className="flex justify-end mb-6">
        <Button onClick={() => router.push('/growth/market/gains/new')}>
          <Add size={16} />
          Add Gain
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
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
            ) : gains.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No gains found
                </TableCell>
              </TableRow>
            ) : (
              gains.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{item.description ?? '—'}</TableCell>
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
                        onClick={() => router.push(`/growth/market/gains/${item.id}/edit`)}
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
