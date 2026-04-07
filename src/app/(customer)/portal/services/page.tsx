'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/auth-context'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CustomerServiceCard } from '@/components/services/customer-service-card'
import { CartIndicator } from '@/components/cart/cart-indicator'
import { deriveDisplayPrice } from '@/lib/pricing'
import { getPhaseColor } from '@/lib/phase-colors'
import type { Service, CustomerContract, ServiceCostingItem } from '@/lib/types'

type ServiceWithPhase = Service & { phase_name: string; phase?: { name: string } }
type ServiceWithPricing = ServiceWithPhase & { displayPrice: number; billingPeriod: 'once' | 'monthly' }

const PHASE_FILTERS = ['All', 'Operate', 'Secure', 'Streamline', 'Accelerate']

export default function ServicesPage() {
  const { profile } = useAuth()
  const [contracts, setContracts] = useState<(CustomerContract & { service: ServiceWithPhase })[]>([])
  const [allServices, setAllServices] = useState<ServiceWithPricing[]>([])
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set())
  const [phaseFilter, setPhaseFilter] = useState('All')
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!profile?.company_id) return
    setLoading(true)

    // Fetch customer contracts with service + phase
    const { data: contractData } = await supabase
      .from('customer_contracts')
      .select('*, service:services(*, phase:phases(name))')
      .eq('company_id', profile.company_id)
      .in('status', ['active', 'paused', 'pending'])

    const mappedContracts = (contractData || []).map(c => ({
      ...c,
      service: { ...c.service, phase_name: c.service?.phase?.name || '—' },
    }))
    setContracts(mappedContracts)
    setSubscribedIds(new Set(mappedContracts.map(c => c.service_id)))

    // Fetch all active services with phase + costing items
    const { data: serviceData } = await supabase
      .from('services')
      .select('*, phase:phases(name), service_costing_items(*)')
      .eq('status', 'active')

    const mappedServices: ServiceWithPricing[] = (serviceData || []).map(s => {
      const { price, billingPeriod } = deriveDisplayPrice(s.service_costing_items || [])
      return { ...s, phase_name: s.phase?.name || '—', displayPrice: price, billingPeriod }
    })
    setAllServices(mappedServices)

    setLoading(false)
  }, [profile?.company_id])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredServices = phaseFilter === 'All'
    ? allServices
    : allServices.filter(s => s.phase_name === phaseFilter)

  if (loading) {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Services</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Your Services</h1>
        <div className="mt-6 animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-xl bg-slate-100" />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Services</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">Your Services</h1>

      <Tabs defaultValue="all-services" className="mt-6">
        <TabsList variant="line">
          <TabsTrigger value="all-services">All Services</TabsTrigger>
          <TabsTrigger value="my-services">My Services</TabsTrigger>
        </TabsList>

        <TabsContent value="my-services" className="mt-6">
          {contracts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              You haven&apos;t subscribed to any services yet. Switch to <strong>All Services</strong> to get started.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {contracts.map(c => (
                <CustomerServiceCard
                  key={c.id}
                  mode="my-service"
                  service={c.service}
                  contract={c}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all-services" className="mt-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex gap-2">
              {PHASE_FILTERS.map(f => {
                const isActive = phaseFilter === f
                const color = f === 'All' ? '#0f172a' : getPhaseColor(f)
                return (
                  <button
                    key={f}
                    onClick={() => setPhaseFilter(f)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${isActive ? 'text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    style={isActive ? { backgroundColor: color } : undefined}
                  >
                    {f === 'All' ? 'All' : (
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                        {f}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <CartIndicator />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {filteredServices.map(s => (
              <CustomerServiceCard
                key={s.id}
                mode="catalog"
                service={s}
                displayPrice={s.displayPrice}
                billingPeriod={s.billingPeriod}
                isSubscribed={subscribedIds.has(s.id)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
