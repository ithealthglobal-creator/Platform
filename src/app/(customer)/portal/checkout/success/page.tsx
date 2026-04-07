// src/app/(customer)/portal/checkout/success/page.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckmarkFilled } from '@carbon/icons-react'

export default function CheckoutSuccessPage() {
  const router = useRouter()
  const params = useSearchParams()
  const orderId = params.get('order_id')

  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="mt-16 mb-6 flex justify-center">
        <CheckmarkFilled size={48} className="text-green-600" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Payment Successful!</h1>
      <p className="mt-2 text-sm text-slate-500">Your services are now active. You can view them in your services dashboard.</p>
      {orderId && <p className="mt-1 text-xs text-slate-400">Order reference: {orderId}</p>}
      <div className="mt-8 flex justify-center gap-3">
        <Button onClick={() => router.push('/portal/services')}>View My Services</Button>
      </div>
    </div>
  )
}
