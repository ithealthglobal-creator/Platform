'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { ServiceStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Add } from '@carbon/icons-react'
import { ServiceGridCard } from '@/components/services/service-grid-card'
import { ServicesListPanel } from '@/components/services/services-list-panel'
import { ServiceEditorWorkspace } from '@/components/services/service-editor-workspace'

// Only the fields the catalog grid + list panel actually need. The editor
// workspace fetches the full Service row separately by id, so we don't carry
// every Service column on this page.
interface ServiceSummary {
  id: string
  name: string
  description: string | null
  status: ServiceStatus
  phase_name: string | null
  product_count: number
}

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceSummary[]>([])
  const [loading, setLoading] = useState(true)
  // null in workspace mode means "new service draft". `mode` keeps us out of the
  // workspace until the user actually clicks a card or "Add Service".
  const [mode, setMode] = useState<'grid' | 'workspace'>('grid')
  const [selectedId, setSelectedId] = useState<string | null>(null)

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

    const mapped: ServiceSummary[] = (data ?? []).map((s: Record<string, unknown>) => ({
      id: s.id as string,
      name: s.name as string,
      description: (s.description as string | null) ?? null,
      status: s.status as ServiceStatus,
      phase_name: (s.phase as { name: string } | null)?.name ?? null,
      product_count:
        (s.service_products as Array<{ count: number }> | undefined)?.[0]?.count ?? 0,
    }))

    setServices(mapped)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const phaseOptions = useMemo(() => {
    const set = new Set<string>()
    for (const s of services) {
      if (s.phase_name) set.add(s.phase_name)
    }
    return Array.from(set).sort()
  }, [services])

  const listItems = useMemo(
    () =>
      services.map((s) => ({
        id: s.id,
        name: s.name,
        phaseName: s.phase_name,
        status: s.status,
      })),
    [services],
  )

  const openWorkspace = (id: string | null) => {
    setSelectedId(id)
    setMode('workspace')
  }

  const backToGrid = () => {
    setMode('grid')
    setSelectedId(null)
    // Pick up any edits the user made in the workspace.
    fetchServices()
  }

  if (mode === 'workspace') {
    return (
      <div className="-m-6 flex h-full">
        <ServicesListPanel
          services={listItems}
          selectedId={selectedId}
          phaseOptions={phaseOptions}
          onSelect={(id) => setSelectedId(id)}
          onBack={backToGrid}
          onNew={() => openWorkspace(null)}
        />
        <ServiceEditorWorkspace
          // Force a remount when the selected service changes so each editor
          // boots cleanly without leaking tab state between services.
          key={selectedId ?? 'new'}
          serviceId={selectedId}
          onServiceCreated={(newId) => {
            setSelectedId(newId)
            fetchServices()
          }}
        />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Services</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">Catalog</h1>
        </div>
        <Button onClick={() => openWorkspace(null)}>
          <Add size={16} />
          Add Service
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No services yet. Click <strong>Add Service</strong> to create your first one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {services.map((s) => (
            <ServiceGridCard
              key={s.id}
              name={s.name}
              description={s.description}
              phaseName={s.phase_name}
              status={s.status}
              productCount={s.product_count}
              onClick={() => openWorkspace(s.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
