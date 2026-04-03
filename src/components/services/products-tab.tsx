'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Product, ServiceProduct } from '@/lib/types'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { TrashCan } from '@carbon/icons-react'

interface ProductsTabProps {
  serviceId: string
}

export function ProductsTab({ serviceId }: ProductsTabProps) {
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [linked, setLinked] = useState<ServiceProduct[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const [productsResult, linkedResult] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('service_products')
        .select('*, product:products(*)')
        .eq('service_id', serviceId),
    ])

    if (productsResult.error) {
      toast.error('Failed to load products')
      setLoading(false)
      return
    }

    if (linkedResult.error) {
      toast.error('Failed to load linked products')
      setLoading(false)
      return
    }

    setAllProducts((productsResult.data as Product[]) ?? [])
    setLinked((linkedResult.data as ServiceProduct[]) ?? [])
    setLoading(false)
  }, [serviceId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const linkedIds = new Set(linked.map((l) => l.product_id))
  const availableProducts = allProducts.filter((p) => !linkedIds.has(p.id))

  async function handleAdd(productId: string) {
    if (!productId) return

    const { error } = await supabase
      .from('service_products')
      .insert({ service_id: serviceId, product_id: productId })

    if (error) {
      toast.error('Failed to add product')
      return
    }

    const product = allProducts.find((p) => p.id === productId)
    if (product) {
      setLinked((prev) => [
        ...prev,
        { service_id: serviceId, product_id: productId, notes: null, product },
      ])
    }
  }

  async function handleRemove(productId: string) {
    const { error } = await supabase
      .from('service_products')
      .delete()
      .eq('service_id', serviceId)
      .eq('product_id', productId)

    if (error) {
      toast.error('Failed to remove product')
      return
    }

    setLinked((prev) => prev.filter((l) => l.product_id !== productId))
  }

  async function handleNotesBlur(productId: string, notes: string) {
    const { error } = await supabase
      .from('service_products')
      .update({ notes })
      .eq('service_id', serviceId)
      .eq('product_id', productId)

    if (error) {
      toast.error('Failed to update notes')
    }
  }

  function handleNotesChange(productId: string, notes: string) {
    setLinked((prev) =>
      prev.map((l) =>
        l.product_id === productId ? { ...l, notes } : l
      )
    )
  }

  if (loading) return null

  return (
    <div className="max-w-4xl space-y-4 pt-4">
      <div className="grid gap-2 max-w-md">
        <Label>Add Product</Label>
        <div className="relative">
          <select
            className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
            value=""
            onChange={(e) => {
              handleAdd(e.target.value)
              e.target.value = ''
            }}
          >
            <option value="" disabled>
              Select a product...
            </option>
            {availableProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {linked.length > 0 && (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Vendor</th>
                <th className="px-4 py-2 text-left font-medium">Category</th>
                <th className="px-4 py-2 text-left font-medium">Notes</th>
                <th className="px-4 py-2 text-right font-medium w-16"></th>
              </tr>
            </thead>
            <tbody>
              {linked.map((sp) => (
                <tr key={sp.product_id} className="border-b last:border-0">
                  <td className="px-4 py-2">{sp.product?.name ?? '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {sp.product?.vendor ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {sp.product?.category ?? '—'}
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none dark:bg-input/30"
                      value={sp.notes ?? ''}
                      onChange={(e) =>
                        handleNotesChange(sp.product_id, e.target.value)
                      }
                      onBlur={(e) =>
                        handleNotesBlur(sp.product_id, e.target.value)
                      }
                      placeholder="Add notes..."
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(sp.product_id)}
                      className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <TrashCan size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {linked.length === 0 && (
        <p className="text-sm text-muted-foreground py-4">
          No products linked yet. Use the dropdown above to add products.
        </p>
      )}
    </div>
  )
}
