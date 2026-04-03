'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Breadcrumb } from '@/components/breadcrumb'
import { Product, LicensingModel } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Add, Edit, TrashCan } from '@carbon/icons-react'

const LICENSING_OPTIONS: { value: LicensingModel; label: string }[] = [
  { value: 'per_user', label: 'Per User' },
  { value: 'per_device', label: 'Per Device' },
  { value: 'flat_fee', label: 'Flat Fee' },
]

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formVendor, setFormVendor] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formLicensing, setFormLicensing] = useState<LicensingModel | ''>('')
  const [formCost, setFormCost] = useState('')
  const [formLogoUrl, setFormLogoUrl] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [formActive, setFormActive] = useState(true)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name')

    if (error) {
      toast.error('Failed to load products')
      setLoading(false)
      return
    }

    setProducts(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  function resetForm() {
    setFormName('')
    setFormDescription('')
    setFormVendor('')
    setFormCategory('')
    setFormLicensing('')
    setFormCost('')
    setFormLogoUrl('')
    setFormUrl('')
    setFormActive(true)
  }

  function openCreateDialog() {
    setEditingProduct(null)
    resetForm()
    setDialogOpen(true)
  }

  function openEditDialog(product: Product) {
    setEditingProduct(product)
    setFormName(product.name)
    setFormDescription(product.description ?? '')
    setFormVendor(product.vendor ?? '')
    setFormCategory(product.category ?? '')
    setFormLicensing(product.licensing_model ?? '')
    setFormCost(product.cost ?? '')
    setFormLogoUrl(product.logo_url ?? '')
    setFormUrl(product.url ?? '')
    setFormActive(product.is_active)
    setDialogOpen(true)
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id)

    if (error) {
      toast.error('Failed to delete product')
      return
    }

    toast.success('Product deleted')
    fetchProducts()
  }

  async function handleSave() {
    const trimmedName = formName.trim()
    if (!trimmedName) {
      toast.error('Product name is required')
      return
    }

    setSaving(true)

    const payload = {
      name: trimmedName,
      description: formDescription.trim() || null,
      vendor: formVendor.trim() || null,
      category: formCategory.trim() || null,
      licensing_model: formLicensing || null,
      cost: formCost ? parseFloat(formCost) : null,
      logo_url: formLogoUrl.trim() || null,
      url: formUrl.trim() || null,
      is_active: formActive,
    }

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingProduct.id)

      if (error) {
        toast.error('Failed to update product')
        setSaving(false)
        return
      }

      toast.success('Product updated successfully')
    } else {
      const { error } = await supabase.from('products').insert(payload)

      if (error) {
        toast.error('Failed to create product')
        setSaving(false)
        return
      }

      toast.success('Product created successfully')
    }

    setSaving(false)
    setDialogOpen(false)
    fetchProducts()
  }

  return (
    <div>
      <Breadcrumb />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Products</h1>
          <p className="text-muted-foreground text-sm">
            Manage products and software catalogue
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Add size={16} />
          Add Product
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="w-[120px]">Licensing</TableHead>
              <TableHead className="w-[100px]">Cost</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.vendor ?? '—'}</TableCell>
                  <TableCell>{product.category ?? '—'}</TableCell>
                  <TableCell>
                    {product.licensing_model
                      ? LICENSING_OPTIONS.find((o) => o.value === product.licensing_model)?.label ?? product.licensing_model
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {product.cost != null ? '$' + Number(product.cost).toFixed(2) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.is_active ? 'default' : 'secondary'}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEditDialog(product)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(product)}
                      >
                        <TrashCan size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
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
              <Input
                id="product-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Product description"
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
                <Select
                  value={formLicensing}
                  onValueChange={(val) => setFormLicensing(val as LicensingModel | '')}
                >
                  <SelectTrigger id="product-licensing">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {LICENSING_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
          </div>

          <DialogFooter>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingProduct ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
