'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/auth-context'
import { useCart } from '@/contexts/cart-context'
import { SlaDisplay } from '@/components/services/sla-display'
import { getPhaseColor } from '@/lib/phase-colors'
import { formatPrice, deriveDisplayPrice } from '@/lib/pricing'
import { Button } from '@/components/ui/button'
import type { Service, CustomerContract, ServiceSla, SlaTemplate, ServiceCostingItem, ServiceRunbookStep } from '@/lib/types'

type ServiceDetail = Omit<Service, 'phase'> & {
  phase_name: string
  phase?: { name: string }
  service_products: { notes: string | null; product: { name: string; vendor: string | null; category: string | null } }[]
  service_skills: { notes: string | null; skill: { name: string; category: string | null } }[]
  service_runbook_steps: ServiceRunbookStep[]
  service_costing_items: ServiceCostingItem[]
  service_academy_links: { is_required: boolean; course: { id: string; name: string; phase_id: string } }[]
  service_sla: (ServiceSla & { sla_template: SlaTemplate })[]
}

export default function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { profile } = useAuth()
  const { addItem, removeItem, isInCart } = useCart()
  const router = useRouter()
  const [service, setService] = useState<ServiceDetail | null>(null)
  const [contract, setContract] = useState<CustomerContract | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)

    const { data: svc } = await supabase
      .from('services')
      .select(`
        *,
        phase:phases(name),
        service_products(notes, product:products(name, vendor, category)),
        service_skills(notes, skill:skills(name, category)),
        service_runbook_steps(*),
        service_costing_items(*),
        service_academy_links(is_required, course:courses(id, name, phase_id)),
        service_sla(*, sla_template:sla_templates(*))
      `)
      .eq('id', id)
      .single()

    if (svc) {
      setService({ ...svc, phase_name: svc.phase?.name || '—' })
    }

    // Fetch contract if customer
    if (profile?.company_id) {
      const { data: contractData } = await supabase
        .from('customer_contracts')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('service_id', id)
        .in('status', ['active', 'paused', 'pending'])
        .maybeSingle()

      setContract(contractData)
    }

    setLoading(false)
  }, [id, profile?.company_id])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading || !service) {
    return <div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 rounded-xl bg-slate-100" />)}</div>
  }

  const phaseColor = getPhaseColor(service.phase_name)
  const { price: displayPrice, billingPeriod } = deriveDisplayPrice(service.service_costing_items || [])
  const inCart = isInCart(service.id)
  const isSubscribed = !!contract
  const sla = service.service_sla?.[0]

  const setupItems = (service.service_costing_items || []).filter(i => i.category === 'setup' && i.is_active)
  const maintenanceItems = (service.service_costing_items || []).filter(i => i.category === 'maintenance' && i.is_active)
  const runbookSteps = (service.service_runbook_steps || []).sort((a, b) => a.sort_order - b.sort_order)
  const totalMinutes = runbookSteps.reduce((sum, s) => sum + (s.estimated_minutes || 0), 0)

  return (
    <div className="mx-auto max-w-[900px]">
      {/* Breadcrumb */}
      <div className="mb-4 text-sm text-slate-400">
        <button onClick={() => router.push('/portal/services')} className="text-blue-500 hover:underline">Services</button>
        <span className="mx-1.5">/</span>
        {service.name}
      </div>

      {/* 1. Header */}
      <div className="mb-6 px-8 py-6 text-white" style={{ backgroundColor: phaseColor, borderRadius: '16px 0 16px 16px' }}>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider opacity-80">{service.phase_name}</div>
        <h1 className="mb-2 text-[22px] font-semibold">{service.name}</h1>
        <p className="text-sm leading-relaxed opacity-90">{service.long_description || service.description}</p>
      </div>

      {/* 2. Contract (if subscribed) */}
      {contract && (
        <div className="mb-4 border border-slate-200 bg-white p-6" style={{ borderRadius: '16px 0 16px 16px', borderLeft: '3px solid #16a34a' }}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-slate-900">Your Contract</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${contract.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}</span>
          </div>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div><div className="text-slate-400">Contracted Price</div><div className="text-base font-semibold text-slate-900">{formatPrice(contract.contracted_price, contract.billing_period)}</div></div>
            <div><div className="text-slate-400">Billing Period</div><div className="font-medium text-slate-900">{contract.billing_period === 'once' ? 'One-off' : contract.billing_period.charAt(0).toUpperCase() + contract.billing_period.slice(1)}</div></div>
            <div><div className="text-slate-400">Started</div><div className="font-medium text-slate-900">{contract.started_at ? new Date(contract.started_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</div></div>
            <div><div className="text-slate-400">Renewal Date</div><div className="font-medium text-slate-900">{contract.renewal_date ? new Date(contract.renewal_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</div></div>
          </div>
        </div>
      )}

      {/* 3. About */}
      {service.long_description && (
        <div className="mb-4 border border-slate-200 bg-white p-6" style={{ borderRadius: '16px 0 16px 16px' }}>
          <h3 className="mb-3 text-[15px] font-semibold text-slate-900">About this Service</h3>
          <p className="text-sm leading-relaxed text-slate-600">{service.long_description}</p>
        </div>
      )}

      {/* 4. SLA */}
      {sla && <div className="mb-4"><SlaDisplay serviceSla={sla} /></div>}

      {/* 5. Products */}
      {service.service_products.length > 0 && (
        <div className="mb-4 border border-slate-200 bg-white p-6" style={{ borderRadius: '16px 0 16px 16px' }}>
          <h3 className="mb-3 text-[15px] font-semibold text-slate-900">Products & Tools</h3>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 bg-slate-50"><th className="px-3 py-2 text-left font-medium text-slate-500">Product</th><th className="px-3 py-2 text-left font-medium text-slate-500">Vendor</th><th className="px-3 py-2 text-left font-medium text-slate-500">Category</th><th className="px-3 py-2 text-left font-medium text-slate-500">Notes</th></tr></thead>
            <tbody>{service.service_products.map((sp, i) => (
              <tr key={i} className="border-b border-slate-100"><td className="px-3 py-2 font-medium text-slate-900">{sp.product.name}</td><td className="px-3 py-2 text-slate-600">{sp.product.vendor || '—'}</td><td className="px-3 py-2 text-slate-600">{sp.product.category || '—'}</td><td className="px-3 py-2 text-slate-500">{sp.notes || '—'}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {/* 6. Skills */}
      {service.service_skills.length > 0 && (
        <div className="mb-4 border border-slate-200 bg-white p-6" style={{ borderRadius: '16px 0 16px 16px' }}>
          <h3 className="mb-3 text-[15px] font-semibold text-slate-900">Skills & Expertise</h3>
          <div className="flex flex-wrap gap-2">
            {service.service_skills.map((ss, i) => (
              <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{ss.skill.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* 7. Runbook */}
      {runbookSteps.length > 0 && (
        <div className="mb-4 border border-slate-200 bg-white p-6" style={{ borderRadius: '16px 0 16px 16px' }}>
          <h3 className="mb-3 text-[15px] font-semibold text-slate-900">Delivery Runbook</h3>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 bg-slate-50"><th className="w-8 px-3 py-2 text-left font-medium text-slate-500">#</th><th className="px-3 py-2 text-left font-medium text-slate-500">Step</th><th className="px-3 py-2 text-left font-medium text-slate-500">Role</th><th className="px-3 py-2 text-right font-medium text-slate-500">Est. Time</th></tr></thead>
            <tbody>{runbookSteps.map((step, i) => (
              <tr key={step.id} className="border-b border-slate-100"><td className="px-3 py-2 text-slate-400">{i + 1}</td><td className="px-3 py-2 font-medium text-slate-900">{step.title}</td><td className="px-3 py-2 text-slate-600">{step.role || '—'}</td><td className="px-3 py-2 text-right text-slate-600">{step.estimated_minutes ? `${step.estimated_minutes} min` : '—'}</td></tr>
            ))}</tbody>
            <tfoot><tr><td colSpan={3} className="px-3 pt-3 font-semibold text-slate-900">Total estimated time</td><td className="px-3 pt-3 text-right font-semibold text-slate-900">{(totalMinutes / 60).toFixed(1)} hrs</td></tr></tfoot>
          </table>
        </div>
      )}

      {/* 8. Costing */}
      {(setupItems.length > 0 || maintenanceItems.length > 0) && (
        <div className="mb-4 border border-slate-200 bg-white p-6" style={{ borderRadius: '16px 0 16px 16px' }}>
          <h3 className="mb-3 text-[15px] font-semibold text-slate-900">Costing Breakdown</h3>
          {setupItems.length > 0 && (
            <>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Setup Costs</div>
              <table className="mb-5 w-full text-sm">
                <thead><tr className="border-b border-slate-200 bg-slate-50"><th className="px-3 py-2 text-left font-medium text-slate-500">Item</th><th className="px-3 py-2 text-left font-medium text-slate-500">Type</th><th className="px-3 py-2 text-right font-medium text-slate-500">Cost</th></tr></thead>
                <tbody>{setupItems.map(item => (
                  <tr key={item.id} className="border-b border-slate-100"><td className="px-3 py-2 text-slate-900">{item.name}</td><td className="px-3 py-2 text-slate-600">{item.pricing_type === 'tiered' ? 'Tiered' : 'Fixed'}</td><td className="px-3 py-2 text-right font-medium text-slate-900">{item.base_cost ? `R ${new Intl.NumberFormat('en-ZA').format(parseFloat(item.base_cost))}` : '—'}</td></tr>
                ))}</tbody>
              </table>
            </>
          )}
          {maintenanceItems.length > 0 && (
            <>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Monthly Maintenance</div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-200 bg-slate-50"><th className="px-3 py-2 text-left font-medium text-slate-500">Item</th><th className="px-3 py-2 text-left font-medium text-slate-500">Type</th><th className="px-3 py-2 text-right font-medium text-slate-500">Cost</th></tr></thead>
                <tbody>{maintenanceItems.map(item => (
                  <tr key={item.id} className="border-b border-slate-100"><td className="px-3 py-2 text-slate-900">{item.name}</td><td className="px-3 py-2 text-slate-600">{item.pricing_type === 'tiered' ? 'Tiered' : 'Fixed'}</td><td className="px-3 py-2 text-right font-medium text-slate-900">{item.base_cost ? `R ${new Intl.NumberFormat('en-ZA').format(parseFloat(item.base_cost))}` : '—'}</td></tr>
                ))}</tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* 9. Academy Courses */}
      {service.service_academy_links.length > 0 && (
        <div className="mb-4 border border-slate-200 bg-white p-6" style={{ borderRadius: '16px 0 16px 16px' }}>
          <h3 className="mb-3 text-[15px] font-semibold text-slate-900">Related Academy Courses</h3>
          <div className="flex flex-col gap-2.5">
            {service.service_academy_links.map((link, i) => (
              <div key={i} className="flex items-center justify-between border-b border-slate-100 py-2.5 last:border-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: phaseColor }} />
                  <span className="text-sm font-medium text-slate-900">{link.course.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${link.is_required ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>{link.is_required ? 'Required' : 'Optional'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 10. Action buttons */}
      <div className="mt-2 flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push('/portal/services')}>← Back to Services</Button>
        {isSubscribed ? (
          <span className="flex items-center rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-800">Subscribed</span>
        ) : inCart ? (
          <Button variant="outline" className="border-red-200 text-red-600" onClick={() => removeItem(service.id)}>Remove from Cart</Button>
        ) : (
          <Button onClick={() => { addItem({ service_id: service.id, name: service.name, phase_name: service.phase_name, phase_color: phaseColor, price: displayPrice, billing_period: billingPeriod }); }}>Add to Cart</Button>
        )}
      </div>
    </div>
  )
}
