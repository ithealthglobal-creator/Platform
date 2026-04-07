'use client'

import { useRouter } from 'next/navigation'
import { useCart } from '@/contexts/cart-context'
import { getPhaseColor } from '@/lib/phase-colors'
import { formatPrice } from '@/lib/pricing'
import type { Service, CustomerContract, BillingPeriod } from '@/lib/types'
import { Button } from '@/components/ui/button'

interface MyServiceCardProps {
  mode: 'my-service'
  service: Service & { phase_name: string }
  contract: CustomerContract
  academyProgress?: { completed: number; total: number }
}

interface CatalogCardProps {
  mode: 'catalog'
  service: Service & { phase_name: string }
  displayPrice: number
  billingPeriod: BillingPeriod
  isSubscribed: boolean
}

type Props = MyServiceCardProps | CatalogCardProps

export function CustomerServiceCard(props: Props) {
  const router = useRouter()
  const { addItem, removeItem, isInCart } = useCart()
  const { service } = props
  const phaseColor = getPhaseColor(service.phase_name)
  const inCart = isInCart(service.id)

  const cardBorder = props.mode === 'catalog' && inCart
    ? '2px solid #3b82f6'
    : '1px solid #e5e7eb'

  return (
    <div
      className="flex flex-col overflow-hidden bg-white"
      style={{ borderRadius: '16px 0 16px 16px', border: cardBorder }}
    >
      {/* Phase header */}
      <div
        className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white"
        style={{ backgroundColor: phaseColor }}
      >
        {service.phase_name}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {props.mode === 'my-service' ? (
          <>
            {/* Service name + status */}
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold text-slate-900">{service.name}</h3>
              <StatusBadge status={props.contract.status} />
            </div>

            {/* Contract info grid */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-slate-400">Price:</span> <span className="font-medium text-slate-900">{formatPrice(props.contract.contracted_price, props.contract.billing_period)}</span></div>
              <div><span className="text-slate-400">Billing:</span> <span className="text-slate-900">{props.contract.billing_period === 'once' ? 'One-off' : props.contract.billing_period.charAt(0).toUpperCase() + props.contract.billing_period.slice(1)}</span></div>
              <div><span className="text-slate-400">Started:</span> <span className="text-slate-900">{props.contract.started_at ? new Date(props.contract.started_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span></div>
              <div>
                {props.contract.payment_status === 'overdue'
                  ? <><span className="text-slate-400">Payment:</span> <span className="font-medium text-red-600">Overdue</span></>
                  : <><span className="text-slate-400">Renewal:</span> <span className="text-slate-900">{props.contract.renewal_date ? new Date(props.contract.renewal_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span></>
                }
              </div>
            </div>

            {/* Progress section */}
            <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Journey Progress</span>
                <span className="font-medium text-slate-900">—</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded bg-slate-100">
                <div className="h-full rounded" style={{ backgroundColor: phaseColor, width: '0%' }} />
              </div>
              <div className="flex justify-between text-xs">
                <div><span className="text-slate-500">Academy:</span> <span className="font-medium text-green-600">{props.academyProgress ? `${props.academyProgress.completed}/${props.academyProgress.total} courses` : '—'}</span></div>
                <div><span className="text-slate-500">Runbook:</span> <span className="text-slate-400">Not tracked yet</span></div>
              </div>
            </div>

            <button
              onClick={() => router.push(`/portal/services/${service.id}`)}
              className="mt-auto text-left text-sm font-medium text-blue-500 hover:underline"
            >
              View details →
            </button>
          </>
        ) : (
          <>
            {/* Catalog mode */}
            <h3 className="text-[15px] font-semibold text-slate-900">{service.name}</h3>
            <p className="flex-1 text-sm leading-relaxed text-slate-500">{service.description || ''}</p>
            <div className="text-sm text-slate-600">
              <span className="text-slate-400">From</span>{' '}
              <span className="font-semibold">{formatPrice(props.displayPrice, props.billingPeriod)}</span>
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.push(`/portal/services/${service.id}`)}
                className="text-sm font-medium text-blue-500 hover:underline"
              >
                View details →
              </button>
              {props.isSubscribed ? (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Subscribed</span>
              ) : inCart ? (
                <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => removeItem(service.id)}>Remove</Button>
              ) : (
                <Button size="sm" onClick={() => addItem({ service_id: service.id, name: service.name, phase_name: service.phase_name, phase_color: phaseColor, price: props.displayPrice, billing_period: props.billingPeriod })}>Add to Cart</Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    paused: 'bg-amber-100 text-amber-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-slate-100 text-slate-600',
    pending: 'bg-slate-100 text-slate-600',
  }
  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || styles.pending}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
