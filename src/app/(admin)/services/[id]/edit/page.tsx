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

export default function ServiceEditorPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const isNew = id === 'new'

  const [serviceId, setServiceId] = useState<string | null>(isNew ? null : id)
  const [loading, setLoading] = useState(!isNew)
  const [description, setDescription] = useState('')

  const fetchService = useCallback(async () => {
    if (isNew) return

    setLoading(true)
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      toast.error('Failed to load service')
      setLoading(false)
      return
    }

    const service = data as Service
    setServiceId(service.id)
    setDescription(service.description ?? '')
    setLoading(false)
  }, [id, isNew])

  useEffect(() => {
    fetchService()
  }, [fetchService])

  function handleServiceCreated(newId: string) {
    setServiceId(newId)
    router.replace(`/services/${newId}/edit`)
  }

  function handleDescriptionChange(desc: string) {
    setDescription(desc)
  }

  if (loading) {
    return (
      <div>
        <p className="text-muted-foreground py-8 text-center">Loading...</p>
      </div>
    )
  }

  return (
    <div>
      <Tabs defaultValue="description">
        <TabsList>
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="market" disabled={!serviceId}>
            Market
          </TabsTrigger>
          <TabsTrigger value="products" disabled={!serviceId}>
            Products
          </TabsTrigger>
          <TabsTrigger value="skills" disabled={!serviceId}>
            Skills
          </TabsTrigger>
          <TabsTrigger value="runbook" disabled={!serviceId}>
            Runbook
          </TabsTrigger>
          <TabsTrigger value="growth" disabled={!serviceId}>
            Growth
          </TabsTrigger>
          <TabsTrigger value="costing" disabled={!serviceId}>
            Costing
          </TabsTrigger>
          <TabsTrigger value="academy" disabled={!serviceId}>
            Academy
          </TabsTrigger>
          <TabsTrigger value="sla" disabled={!serviceId}>
            SLA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="description">
          <DescriptionTab
            serviceId={serviceId}
            onServiceCreated={handleServiceCreated}
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
  )
}
