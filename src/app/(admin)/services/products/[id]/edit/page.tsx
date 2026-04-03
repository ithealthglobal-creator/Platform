'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Breadcrumb } from '@/components/breadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LicensingModel } from '@/lib/types'
import { toast } from 'sonner'
import { ArrowLeft, Save } from '@carbon/icons-react'

const LICENSING_OPTIONS: { value: LicensingModel; label: string }[] = [
  { value: 'per_user', label: 'Per User' },
  { value: 'per_device', label: 'Per Device' },
  { value: 'flat_fee', label: 'Flat Fee' },
]

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formVendor, setFormVendor] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formLicensing, setFormLicensing] = useState<LicensingModel | ''>('')
  const [formCost, setFormCost] = useState('')
  const [formLogoUrl, setFormLogoUrl] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProduct() {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        toast.error('Failed to load product')
        router.push('/services/products')
        return
      }

      setFormName(data.name)
      setFormDescription(data.description ?? '')
      setFormVendor(data.vendor ?? '')
      setFormCategory(data.category ?? '')
      setFormLicensing(data.licensing_model ?? '')
      setFormCost(data.cost != null ? String(data.cost) : '')
      setFormLogoUrl(data.logo_url ?? '')
      setFormUrl(data.url ?? '')
      setFormActive(data.is_active)
      setLoading(false)
    }
    fetchProduct()
  }, [id, router])

  async function handleSave() {
    const trimmedName = formName.trim()
    if (!trimmedName) {
      toast.error('Product name is required')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('products')
      .update({
        name: trimmedName,
        description: formDescription.trim() || null,
        vendor: formVendor.trim() || null,
        category: formCategory.trim() || null,
        licensing_model: formLicensing || null,
        cost: formCost ? parseFloat(formCost) : null,
        logo_url: formLogoUrl.trim() || null,
        url: formUrl.trim() || null,
        is_active: formActive,
      })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update product')
      setSaving(false)
      return
    }

    toast.success('Product updated')
    router.push('/services/products')
  }

  if (loading) {
    return (
      <div>
        <Breadcrumb />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div>
      <Breadcrumb />
      <div className="mb-6">
        <button
          onClick={() => router.push('/services/products')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} /> Back to Products
        </button>
      </div>
      <h1 className="text-2xl font-bold mb-6">Edit Product</h1>

      <div className="grid gap-4 max-w-lg">
        <div className="grid gap-2">
          <Label htmlFor="product-name">Name</Label>
          <Input
            id="product-name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Product name"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="product-description">Description</Label>
          <textarea
            id="product-description"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Product description"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="product-vendor">Vendor</Label>
            <Input
              id="product-vendor"
              value={formVendor}
              onChange={(e) => setFormVendor(e.target.value)}
              placeholder="Vendor name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-category">Category</Label>
            <Input
              id="product-category"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              placeholder="Category"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="product-licensing">Licensing Model</Label>
            <select
              id="product-licensing"
              value={formLicensing}
              onChange={(e) => setFormLicensing(e.target.value as LicensingModel | '')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Select model</option>
              {LICENSING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-cost">Cost</Label>
            <Input
              id="product-cost"
              type="number"
              step="0.01"
              value={formCost}
              onChange={(e) => setFormCost(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="product-logo-url">Logo URL</Label>
          <Input
            id="product-logo-url"
            value={formLogoUrl}
            onChange={(e) => setFormLogoUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="product-url">URL</Label>
          <Input
            id="product-url"
            value={formUrl}
            onChange={(e) => setFormUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="product-active"
            checked={formActive}
            onChange={(e) => setFormActive(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <Label htmlFor="product-active">Active</Label>
        </div>

        <div>
          <Button onClick={handleSave} disabled={saving}>
            <Save size={16} className="mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}
