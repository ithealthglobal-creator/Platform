'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { CartItem } from '@/lib/types'

const CART_STORAGE_KEY = 'ithealth-cart'

interface CartContextType {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (serviceId: string) => void
  clearCart: () => void
  isInCart: (serviceId: string) => boolean
  itemCount: number
  subtotal: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY)
      if (stored) setItems(JSON.parse(stored))
    } catch {}
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    }
  }, [items, loaded])

  const addItem = useCallback((item: CartItem) => {
    setItems(prev => {
      if (prev.some(i => i.service_id === item.service_id)) return prev
      return [...prev, item]
    })
  }, [])

  const removeItem = useCallback((serviceId: string) => {
    setItems(prev => prev.filter(i => i.service_id !== serviceId))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const isInCart = useCallback((serviceId: string) => {
    return items.some(i => i.service_id === serviceId)
  }, [items])

  const subtotal = items.reduce((sum, i) => sum + i.price, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, isInCart, itemCount: items.length, subtotal }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
