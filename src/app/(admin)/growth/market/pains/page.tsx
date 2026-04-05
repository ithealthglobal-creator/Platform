'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Pain } from '@/lib/types'
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

export default function PainsPage() {
  const router = useRouter()
  const [pains, setPains] = useState<Pain[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPains = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('pains')
      .select('*')
      .order('name')

    if (error) {
      toast.error('Failed to load pains')
      setLoading(false)
      return
    }

    setPains(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPains()
  }, [fetchPains])

  async function handleDelete(item: Pain) {
    if (!confirm(`Delete pain "${item.name}"? This cannot be undone.`)) return

    const { error } = await supabase
      .from('pains')
      .delete()
      .eq('id', item.id)

    if (error) {
      toast.error('Failed to delete pain')
      return
    }

    toast.success('Pain deleted')
    fetchPains()
  }

  return (
    <div>
      <div className="flex justify-end mb-6">
        <Button onClick={() => router.push('/growth/market/pains/new')}>
          <Add size={16} />
          Add Pain
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
            ) : pains.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No pains found
                </TableCell>
              </TableRow>
            ) : (
              pains.map((item) => (
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
                        onClick={() => router.push(`/growth/market/pains/${item.id}/edit`)}
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
