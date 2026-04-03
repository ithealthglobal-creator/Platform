'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Breadcrumb } from '@/components/breadcrumb'
import { Service, ServiceStatus } from '@/lib/types'
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

interface ServiceWithDetails extends Service {
  product_count: number
  phase_name: string | null
}

function statusBadgeVariant(status: ServiceStatus) {
  switch (status) {
    case 'active':
      return 'default'
    case 'draft':
      return 'secondary'
    case 'archived':
      return 'outline'
  }
}

export default function ServicesPage() {
  const router = useRouter()
  const [services, setServices] = useState<ServiceWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  const fetchServices = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('services')
      .select('*, phase:phases(name), service_products(count)')
      .order('name')

    if (error) {
      toast.error('Failed to load services')
      setLoading(false)
      return
    }

    const mapped: ServiceWithDetails[] = (data ?? []).map(
      (s: Record<string, unknown>) => ({
        id: s.id as string,
        name: s.name as string,
        description: s.description as string | null,
        long_description: s.long_description as string | null,
        phase_id: s.phase_id as string,
        status: s.status as ServiceStatus,
        hero_image_url: s.hero_image_url as string | null,
        thumbnail_url: s.thumbnail_url as string | null,
        is_active: s.is_active as boolean,
        created_at: s.created_at as string,
        updated_at: s.updated_at as string,
        phase_name:
          (s.phase as { name: string } | null)?.name ?? null,
        product_count:
          (
            s.service_products as Array<{ count: number }> | undefined
          )?.[0]?.count ?? 0,
      })
    )

    setServices(mapped)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const handleDelete = useCallback(
    async (id: string, name: string) => {
      if (!confirm(`Are you sure you want to delete "${name}"?`)) return

      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id)

      if (error) {
        toast.error('Failed to delete service')
        return
      }

      toast.success('Service deleted successfully')
      fetchServices()
    },
    [fetchServices]
  )

  return (
    <div>
      <Breadcrumb />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Services</h1>
          <p className="text-muted-foreground text-sm">
            Manage services and their products
          </p>
        </div>
        <Button onClick={() => router.push('/services/new/edit')}>
          <Add size={16} />
          Add Service
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-[140px]">Phase</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Products</TableHead>
              <TableHead className="w-[120px]">Created</TableHead>
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
            ) : services.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No services found
                </TableCell>
              </TableRow>
            ) : (
              services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell>{service.phase_name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(service.status)}>
                      {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{service.product_count}</TableCell>
                  <TableCell>
                    {new Date(service.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => router.push(`/services/${service.id}/edit`)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(service.id, service.name)}
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
