'use client'

import { useRouter } from 'next/navigation'
import { useCart } from '@/contexts/cart-context'
import { ShoppingCart } from '@carbon/icons-react'

export function CartIndicator() {
  const { itemCount, subtotal } = useCart()
  const router = useRouter()

  if (itemCount === 0) return null

  const formatted = new Intl.NumberFormat('en-ZA').format(subtotal)

  return (
    <button
      onClick={() => router.push('/portal/cart')}
      className="flex items-center gap-1.5 border border-slate-200 bg-white px-3.5 py-1.5 text-sm hover:bg-slate-50"
      style={{ borderRadius: '16px 0 16px 16px' }}
    >
      <ShoppingCart size={16} />
      <span className="font-semibold">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
      <span className="text-slate-500">— R {formatted}</span>
    </button>
  )
}
