'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Breadcrumb } from '@/components/breadcrumb'
import { Service } from '@/lib/types'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import { toast } from 'sonner'
import { ArrowLeft } from '@carbon/icons-react'
import { DescriptionTab } from '@/components/services/description-tab'
import { MarketTab } from '@/components/services/market-tab'
import { ProductsTab } from '@/components/services/products-tab'
import { SkillsTab } from '@/components/services/skills-tab'
import { RunbookTab } from '@/components/services/runbook-tab'
import { GrowthTab } from '@/components/services/growth-tab'

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
        <Breadcrumb />
        <p className="text-muted-foreground py-8 text-center">Loading...</p>
      </div>
    )
  }

  return (
    <div>
      <Breadcrumb />

      <div className="mb-6">
        <button
          onClick={() => router.push('/services')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Services
        </button>

        <h1 className="text-2xl font-bold mb-1">
          {isNew && !serviceId ? 'New Service' : 'Edit Service'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isNew && !serviceId
            ? 'Create a new service'
            : 'Edit service details and configuration'}
        </p>
      </div>

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
          <p className="py-8 text-center text-muted-foreground">Coming soon</p>
        </TabsContent>

        <TabsContent value="academy">
          <p className="py-8 text-center text-muted-foreground">Coming soon</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
