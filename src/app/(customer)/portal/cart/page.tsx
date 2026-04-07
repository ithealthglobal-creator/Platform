// src/app/(customer)/portal/cart/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useCart } from '@/contexts/cart-context'
import { formatPrice } from '@/lib/pricing'
import { Button } from '@/components/ui/button'

export default function CartPage() {
  const { items, removeItem, subtotal, itemCount } = useCart()
  const router = useRouter()

  const formatted = new Intl.NumberFormat('en-ZA').format(subtotal)

  return (
    <div className="mx-auto max-w-[900px]">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Services</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">Your Cart</h1>

      {itemCount === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Your cart is empty.{' '}
          <button
            onClick={() => router.push('/portal/services')}
            className="font-medium text-blue-500 hover:underline"
          >
            Browse All Services
          </button>{' '}
          to find what you need.
        </div>
      ) : (
        <div className="mt-6">
          {/* Item list */}
          <div
            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
            style={{ borderRadius: '16px 0 16px 16px' }}
          >
            {items.map((item, i) => (
              <div
                key={item.service_id}
                className={`flex items-center justify-between px-5 py-4 ${i < items.length - 1 ? 'border-b border-slate-100' : ''}`}
              >
                <div>
                  <div className="text-[11px] uppercase text-slate-400">{item.phase_name}</div>
                  <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-900">
                      {formatPrice(item.price, item.billing_period)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {item.billing_period === 'once'
                        ? 'One-off'
                        : `${item.billing_period.charAt(0).toUpperCase() + item.billing_period.slice(1)} billing`}
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.service_id)}
                    className="text-lg text-slate-400 hover:text-slate-600"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order summary */}
          <div
            className="ml-auto mt-5 max-w-[360px] rounded-xl border border-slate-200 bg-white p-5"
            style={{ borderRadius: '16px 0 16px 16px' }}
          >
            <div className="mb-3 text-sm font-semibold text-slate-900">Order Summary</div>
            {items.map(item => (
              <div key={item.service_id} className="mb-1.5 flex justify-between text-sm">
                <span className="text-slate-500">{item.name}</span>
                <span className="text-slate-900">
                  R {new Intl.NumberFormat('en-ZA').format(item.price)}
                </span>
              </div>
            ))}
            <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-[15px] font-semibold text-slate-900">
              <span>Total</span>
              <span>R {formatted}</span>
            </div>
            <div className="mt-1 text-right text-[11px] text-slate-400">excl. VAT</div>
            <Button className="mt-4 w-full" onClick={() => router.push('/portal/checkout')}>
              Proceed to Checkout
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
