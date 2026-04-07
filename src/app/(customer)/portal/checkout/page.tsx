// src/app/(customer)/portal/checkout/page.tsx
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useCart } from '@/contexts/cart-context'
import { supabase } from '@/lib/supabase-client'
import { formatPrice } from '@/lib/pricing'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function CheckoutPage() {
  const { profile } = useAuth()
  const { items, subtotal, clearCart } = useCart()
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  const [billingEmail, setBillingEmail] = useState(profile?.email || '')
  const [poNumber, setPoNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [payfastUrl, setPayfastUrl] = useState('')
  const [payfastData, setPayfastData] = useState<Record<string, string>>({})

  const vatAmount = Math.round(subtotal * 0.15 * 100) / 100
  const total = Math.round((subtotal + vatAmount) * 100) / 100

  if (items.length === 0) {
    router.push('/portal/cart')
    return null
  }

  const handleCheckout = async () => {
    if (!billingEmail) { toast.error('Billing email is required'); return }
    setSubmitting(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch('/api/services/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          items: items.map(i => ({ service_id: i.service_id, price: i.price, billing_period: i.billing_period })),
          billing_email: billingEmail,
          po_number: poNumber || undefined,
          notes: notes || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Checkout failed'); setSubmitting(false); return }

      // Set PayFast form data and auto-submit
      setPayfastUrl(data.payfast_url)
      setPayfastData(data.payfast_data)
      clearCart()

      // Auto-submit after state update
      setTimeout(() => formRef.current?.submit(), 100)
    } catch {
      toast.error('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-[900px]">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Services</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">Checkout</h1>

      <div className="mt-6 grid grid-cols-[1fr_360px] gap-6">
        {/* Billing details */}
        <div className="rounded-xl border border-slate-200 bg-white p-6" style={{ borderRadius: '16px 0 16px 16px' }}>
          <h3 className="mb-4 text-base font-semibold text-slate-900">Billing Details</h3>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Company</label>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">{profile?.company?.name || '—'}</div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Billing Contact Email</label>
              <input type="email" value={billingEmail} onChange={e => setBillingEmail(e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Purchase Order Number (optional)</label>
              <input type="text" value={poNumber} onChange={e => setPoNumber(e.target.value)} placeholder="PO-2026-001" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Notes (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special requirements..." rows={3} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500" />
            </div>
          </div>
          <div className="mt-5 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
            You&apos;ll be redirected to <strong>PayFast</strong> to complete payment securely.
          </div>
        </div>

        {/* Order summary */}
        <div className="h-fit rounded-xl border border-slate-200 bg-white p-6" style={{ borderRadius: '16px 0 16px 16px' }}>
          <div className="mb-4 text-sm font-semibold text-slate-900">Order Summary</div>
          <div className="mb-4 flex flex-col gap-3">
            {items.map(item => (
              <div key={item.service_id} className="flex justify-between text-sm">
                <div><div className="font-medium text-slate-900">{item.name}</div><div className="text-[11px] text-slate-400">{item.billing_period === 'once' ? 'One-off' : item.billing_period.charAt(0).toUpperCase() + item.billing_period.slice(1)}</div></div>
                <span className="font-medium text-slate-900">R {new Intl.NumberFormat('en-ZA').format(item.price)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-200 pt-3">
            <div className="mb-1 flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span>R {new Intl.NumberFormat('en-ZA').format(subtotal)}</span></div>
            <div className="mb-2 flex justify-between text-sm"><span className="text-slate-500">VAT (15%)</span><span>R {new Intl.NumberFormat('en-ZA').format(vatAmount)}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900"><span>Total</span><span>R {new Intl.NumberFormat('en-ZA').format(total)}</span></div>
          </div>
          <Button className="mt-4 w-full bg-green-600 hover:bg-green-700" onClick={handleCheckout} disabled={submitting}>
            {submitting ? 'Processing...' : 'Pay with PayFast'}
          </Button>
          <div className="mt-2 text-center text-[11px] text-slate-400">Secure payment powered by PayFast</div>
        </div>
      </div>

      {/* Hidden PayFast form for redirect */}
      {payfastUrl && (
        <form ref={formRef} action={payfastUrl} method="POST" className="hidden">
          {Object.entries(payfastData).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        </form>
      )}
    </div>
  )
}
