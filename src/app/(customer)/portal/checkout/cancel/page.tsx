// src/app/(customer)/portal/checkout/cancel/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { WarningAlt } from '@carbon/icons-react'

export default function CheckoutCancelPage() {
  const router = useRouter()

  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="mt-16 mb-6 flex justify-center">
        <WarningAlt size={48} className="text-amber-500" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Payment Cancelled</h1>
      <p className="mt-2 text-sm text-slate-500">Your payment was not completed. No charges were made.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Button variant="outline" onClick={() => router.push('/portal/services')}>Back to Services</Button>
        <Button onClick={() => router.push('/portal/cart')}>Return to Cart</Button>
      </div>
    </div>
  )
}
