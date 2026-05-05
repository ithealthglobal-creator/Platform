'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Service } from '@/lib/types'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import { toast } from 'sonner'
import { DescriptionTab } from '@/components/services/description-tab'
import { MarketTab } from '@/components/services/market-tab'
import { ProductsTab } from '@/components/services/products-tab'
import { SkillsTab } from '@/components/services/skills-tab'
import { RunbookTab } from '@/components/services/runbook-tab'
import { GrowthTab } from '@/components/services/growth-tab'
import { CostingTab } from '@/components/services/costing-tab'
import { AcademyTab } from '@/components/services/academy-tab'
import { SlaTab } from '@/components/services/sla-tab'
import { ServiceBuilderPanel } from '@/components/services/service-builder-panel'

export default function ServiceEditorPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const isNew = id === 'new'

  const [serviceId, setServiceId] = useState<string | null>(isNew ? null : id)
  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(!isNew)
  const [description, setDescription] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchService = useCallback(
    async (idToLoad: string | null) => {
      if (!idToLoad) {
        setService(null)
        setLoading(false)
        return
      }

      setLoading(true)
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', idToLoad)
        .single()

      if (error) {
        toast.error('Failed to load service')
        setLoading(false)
        return
      }

      const svc = data as Service
      setService(svc)
      setServiceId(svc.id)
      setDescription(svc.description ?? '')
      setLoading(false)
    },
    [],
  )

  useEffect(() => {
    fetchService(isNew ? null : id)
  }, [fetchService, id, isNew])

  function handleServiceCreated(newId: string) {
    setServiceId(newId)
    router.replace(`/services/${newId}/edit`)
    fetchService(newId)
  }

  function handleServiceUpdated() {
    if (serviceId) fetchService(serviceId)
  }

  function handleDescriptionChange(desc: string) {
    setDescription(desc)
  }

  // Toggle gates for optional tabs. Default to true when service hasn't loaded.
  const showProducts = service?.includes_products ?? true
  const showGrowth = service?.includes_marketing_content ?? true
  const showAcademy = service?.includes_academy ?? false
  const showSla = service?.includes_sla ?? true

  if (loading) {
    return (
      <div>
        <p className="text-muted-foreground py-8 text-center">Loading...</p>
      </div>
    )
  }

  return (
    <div className="-m-6 flex h-full">
      <div
        key={refreshKey}
        className="min-w-0 flex-1 overflow-y-auto p-6"
      >
        <Tabs defaultValue="description">
          <TabsList>
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="market" disabled={!serviceId}>
              Market
            </TabsTrigger>
            {showProducts && (
              <TabsTrigger value="products" disabled={!serviceId}>
                Products
              </TabsTrigger>
            )}
            <TabsTrigger value="skills" disabled={!serviceId}>
              Skills
            </TabsTrigger>
            <TabsTrigger value="runbook" disabled={!serviceId}>
              Runbook
            </TabsTrigger>
            {showGrowth && (
              <TabsTrigger value="growth" disabled={!serviceId}>
                Growth
              </TabsTrigger>
            )}
            <TabsTrigger value="costing" disabled={!serviceId}>
              Costing
            </TabsTrigger>
            {showAcademy && (
              <TabsTrigger value="academy" disabled={!serviceId}>
                Academy
              </TabsTrigger>
            )}
            {showSla && (
              <TabsTrigger value="sla" disabled={!serviceId}>
                SLA
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="description">
            <DescriptionTab
              serviceId={serviceId}
              onServiceCreated={handleServiceCreated}
              onServiceUpdated={handleServiceUpdated}
              onDescriptionChange={handleDescriptionChange}
            />
          </TabsContent>

          <TabsContent value="market">
            <MarketTab serviceId={serviceId!} />
          </TabsContent>

          <TabsContent value="products">
            <ProductsTab serviceId={serviceId!} />
          </TabsContent>

          <TabsContent value="skills">
            <SkillsTab serviceId={serviceId!} />
          </TabsContent>

          <TabsContent value="runbook">
            <RunbookTab serviceId={serviceId!} />
          </TabsContent>

          <TabsContent value="growth">
            <GrowthTab serviceId={serviceId!} description={description} />
          </TabsContent>

          <TabsContent value="costing">
            <CostingTab serviceId={serviceId!} />
          </TabsContent>

          <TabsContent value="academy">
            <AcademyTab serviceId={serviceId!} />
          </TabsContent>

          <TabsContent value="sla">
            <SlaTab serviceId={serviceId!} />
          </TabsContent>
        </Tabs>
      </div>

      <ServiceBuilderPanel
        serviceId={serviceId}
        onServiceCreated={handleServiceCreated}
        onAgentDone={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}
