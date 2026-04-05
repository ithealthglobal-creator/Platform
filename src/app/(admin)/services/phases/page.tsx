'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Phase } from '@/lib/types'
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
import { Edit } from '@carbon/icons-react'

export default function PhasesPage() {
  const router = useRouter()
  const [phases, setPhases] = useState<Phase[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPhases = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('phases')
      .select('*')
      .order('sort_order')

    if (error) {
      toast.error('Failed to load phases')
      setLoading(false)
      return
    }

    setPhases(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPhases()
  }, [fetchPhases])

  return (
    <div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[120px]">Sort Order</TableHead>
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
            ) : phases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No phases found
                </TableCell>
              </TableRow>
            ) : (
              phases.map((phase) => (
                <TableRow key={phase.id}>
                  <TableCell className="font-medium">{phase.name}</TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {phase.description}
                  </TableCell>
                  <TableCell>{phase.sort_order}</TableCell>
                  <TableCell>
                    <Badge variant={phase.is_active ? 'default' : 'secondary'}>
                      {phase.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => router.push(`/services/phases/${phase.id}/edit`)}
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
