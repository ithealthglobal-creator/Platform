'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import {
  ServiceCostingItem,
  CostingTier,
  CostVariable,
  CostingCategory,
  PricingType,
} from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Add, TrashCan, Save } from '@carbon/icons-react'
import { evaluateFormula } from '@/lib/formula-parser'

interface CostingTabProps {
  serviceId: string
}

interface LocalItem extends ServiceCostingItem {
  _dirty?: boolean
}

const selectClass =
  'flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30'

const inputClass =
  'flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none dark:bg-input/30'

export function CostingTab({ serviceId }: CostingTabProps) {
  const [items, setItems] = useState<LocalItem[]>([])
  const [costVariables, setCostVariables] = useState<CostVariable[]>([])
  const [loading, setLoading] = useState(true)
  const [sampleValue, setSampleValue] = useState(25)

  const fetchData = useCallback(async () => {
    const [itemsResult, varsResult] = await Promise.all([
      supabase
        .from('service_costing_items')
        .select('*, cost_variable:cost_variables(name, unit_label)')
        .eq('service_id', serviceId)
        .order('category')
        .order('sort_order'),
      supabase
        .from('cost_variables')
        .select('*')
        .eq('is_active', true)
        .order('name'),
    ])

    if (itemsResult.error) {
      toast.error('Failed to load costing items')
      setLoading(false)
      return
    }

    if (varsResult.error) {
      toast.error('Failed to load cost variables')
      setLoading(false)
      return
    }

    setItems((itemsResult.data as LocalItem[]) ?? [])
    setCostVariables((varsResult.data as CostVariable[]) ?? [])
    setLoading(false)
  }, [serviceId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function updateItem(id: string, updates: Partial<LocalItem>) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...updates, _dirty: true } : item
      )
    )
  }

  async function handleAdd(category: CostingCategory) {
    const categoryItems = items.filter((i) => i.category === category)
    const nextSort =
      categoryItems.length > 0
        ? Math.max(...categoryItems.map((i) => i.sort_order)) + 1
        : 0

    const { data, error } = await supabase
      .from('service_costing_items')
      .insert({
        service_id: serviceId,
        name: 'New Item',
        category,
        pricing_type: 'tiered',
        sort_order: nextSort,
      })
      .select('*, cost_variable:cost_variables(name, unit_label)')
      .single()

    if (error) {
      toast.error('Failed to add line item')
      return
    }

    setItems((prev) => [...prev, data as LocalItem])
    toast.success('Line item added')
  }

  async function handleSave(item: LocalItem) {
    if (!item.name.trim()) {
      toast.error('Name is required')
      return
    }

    const payload: Record<string, unknown> = {
      name: item.name.trim(),
      pricing_type: item.pricing_type,
      cost_variable_id: item.cost_variable_id || null,
      sort_order: item.sort_order,
    }

    if (item.pricing_type === 'tiered') {
      payload.tiers = item.tiers ?? []
      payload.formula = null
      payload.base_cost = null
    } else {
      payload.formula = item.formula || null
      payload.base_cost = item.base_cost || null
      payload.tiers = null
    }

    const { error } = await supabase
      .from('service_costing_items')
      .update(payload)
      .eq('id', item.id)

    if (error) {
      toast.error('Failed to save item')
      return
    }

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, _dirty: false } : i))
    )
    toast.success('Item saved')
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this line item?')) return

    const { error } = await supabase
      .from('service_costing_items')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete item')
      return
    }

    setItems((prev) => prev.filter((i) => i.id !== id))
    toast.success('Item deleted')
  }

  function addTier(itemId: string) {
    const item = items.find((i) => i.id === itemId)
    if (!item) return

    const tiers = item.tiers ?? []
    const lastMax = tiers.length > 0 ? tiers[tiers.length - 1].max : 0
    const newMin = lastMax !== null ? lastMax + 1 : 1

    updateItem(itemId, {
      tiers: [...tiers, { min: newMin, max: null, rate: 0 }],
    })
  }

  function updateTier(
    itemId: string,
    tierIdx: number,
    field: keyof CostingTier,
    value: string
  ) {
    const item = items.find((i) => i.id === itemId)
    if (!item || !item.tiers) return

    const newTiers = item.tiers.map((t, i) => {
      if (i !== tierIdx) return t
      if (field === 'max') {
        return { ...t, max: value === '' ? null : Number(value) }
      }
      return { ...t, [field]: Number(value) }
    })

    updateItem(itemId, { tiers: newTiers })
  }

  function removeTier(itemId: string, tierIdx: number) {
    const item = items.find((i) => i.id === itemId)
    if (!item || !item.tiers) return

    updateItem(itemId, {
      tiers: item.tiers.filter((_, i) => i !== tierIdx),
    })
  }

  function calculateCost(item: LocalItem, value: number): number | null {
    if (item.pricing_type === 'tiered') {
      const tiers = item.tiers ?? []
      const tier = tiers.find(
        (t) => value >= t.min && (t.max === null || value <= t.max)
      )
      if (!tier) return null
      return Math.round(value * tier.rate * 100) / 100
    }

    if (item.pricing_type === 'formula' && item.formula) {
      const baseCost = item.base_cost ? Number(item.base_cost) : 0
      const formulaResult = evaluateFormula(item.formula, value)
      if (formulaResult === null) return null
      return Math.round((baseCost + formulaResult) * 100) / 100
    }

    return null
  }

  function renderSection(category: CostingCategory, title: string) {
    const sectionItems = items.filter((i) => i.category === category)

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAdd(category)}
          >
            <Add size={16} />
            Add Line Item
          </Button>
        </div>

        {sectionItems.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">
            No line items yet. Click &quot;Add Line Item&quot; to create one.
          </p>
        )}

        {sectionItems.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border p-4 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="grid gap-1">
                <Label className="text-xs">Name</Label>
                <Input
                  value={item.name}
                  onChange={(e) =>
                    updateItem(item.id, { name: e.target.value })
                  }
                  placeholder="Item name"
                />
              </div>

              <div className="grid gap-1">
                <Label className="text-xs">Pricing Type</Label>
                <select
                  className={selectClass}
                  value={item.pricing_type}
                  onChange={(e) =>
                    updateItem(item.id, {
                      pricing_type: e.target.value as PricingType,
                    })
                  }
                >
                  <option value="tiered">Tiered</option>
                  <option value="formula">Formula</option>
                </select>
              </div>

              <div className="grid gap-1">
                <Label className="text-xs">Cost Variable</Label>
                <select
                  className={selectClass}
                  value={item.cost_variable_id ?? ''}
                  onChange={(e) =>
                    updateItem(item.id, {
                      cost_variable_id: e.target.value || null,
                    })
                  }
                >
                  <option value="">None</option>
                  {costVariables.map((cv) => (
                    <option key={cv.id} value={cv.id}>
                      {cv.name}
                      {cv.unit_label ? ` (${cv.unit_label})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {item.pricing_type === 'tiered' && (
              <div className="space-y-2">
                <Label className="text-xs">Tiers</Label>
                {(item.tiers ?? []).length > 0 && (
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-1.5 text-left font-medium">
                            Min
                          </th>
                          <th className="px-3 py-1.5 text-left font-medium">
                            Max
                          </th>
                          <th className="px-3 py-1.5 text-left font-medium">
                            Rate ($)
                          </th>
                          <th className="px-3 py-1.5 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(item.tiers ?? []).map((tier, idx) => (
                          <tr
                            key={idx}
                            className="border-b last:border-0"
                          >
                            <td className="px-3 py-1.5">
                              <input
                                type="number"
                                className={inputClass}
                                value={tier.min}
                                onChange={(e) =>
                                  updateTier(
                                    item.id,
                                    idx,
                                    'min',
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="number"
                                className={inputClass}
                                value={tier.max ?? ''}
                                placeholder="Unlimited"
                                onChange={(e) =>
                                  updateTier(
                                    item.id,
                                    idx,
                                    'max',
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="number"
                                className={inputClass}
                                value={tier.rate}
                                onChange={(e) =>
                                  updateTier(
                                    item.id,
                                    idx,
                                    'rate',
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <button
                                type="button"
                                onClick={() => removeTier(item.id, idx)}
                                className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <TrashCan size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addTier(item.id)}
                >
                  <Add size={14} />
                  Add Tier
                </Button>
              </div>
            )}

            {item.pricing_type === 'formula' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-1">
                  <Label className="text-xs">Base Cost ($)</Label>
                  <Input
                    type="number"
                    value={item.base_cost ?? ''}
                    onChange={(e) =>
                      updateItem(item.id, { base_cost: e.target.value || null })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Formula</Label>
                  <Input
                    value={item.formula ?? ''}
                    onChange={(e) =>
                      updateItem(item.id, { formula: e.target.value || null })
                    }
                    placeholder="{users} * 10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {'{variable}'} as placeholder. Operators: + - * / ()
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" onClick={() => handleSave(item)}>
                <Save size={16} />
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(item.id)}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <TrashCan size={16} />
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (loading) return null

  const setupTotal = items
    .filter((i) => i.category === 'setup')
    .reduce((sum, item) => {
      const cost = calculateCost(item, sampleValue)
      return sum + (cost ?? 0)
    }, 0)

  const maintenanceTotal = items
    .filter((i) => i.category === 'maintenance')
    .reduce((sum, item) => {
      const cost = calculateCost(item, sampleValue)
      return sum + (cost ?? 0)
    }, 0)

  const variableLabel =
    costVariables.length > 0
      ? costVariables[0].unit_label ?? 'units'
      : 'units'

  return (
    <div className="max-w-4xl space-y-8 pt-4">
      {renderSection('setup', 'Setup (One-time)')}
      {renderSection('maintenance', 'Maintenance (Recurring)')}

      <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
        <h3 className="text-lg font-semibold">Cost Preview</h3>

        <div className="grid gap-2 max-w-xs">
          <Label>Sample Value</Label>
          <Input
            type="number"
            value={sampleValue}
            onChange={(e) => setSampleValue(Number(e.target.value) || 0)}
            placeholder="25"
          />
        </div>

        {items.length > 0 && (
          <div className="space-y-2">
            <div className="rounded-md border bg-background">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium">Item</th>
                    <th className="px-4 py-2 text-left font-medium">
                      Category
                    </th>
                    <th className="px-4 py-2 text-left font-medium">Type</th>
                    <th className="px-4 py-2 text-right font-medium">
                      Estimated Cost
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const cost = calculateCost(item, sampleValue)
                    return (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-4 py-2">{item.name}</td>
                        <td className="px-4 py-2 text-muted-foreground capitalize">
                          {item.category}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground capitalize">
                          {item.pricing_type}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {cost !== null ? `$${cost.toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-sm font-medium pt-2">
              For {sampleValue} {variableLabel}: ${setupTotal.toFixed(2)} setup,
              ${maintenanceTotal.toFixed(2)}/month maintenance
            </p>
          </div>
        )}

        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Add line items above to see a cost preview.
          </p>
        )}
      </div>
    </div>
  )
}
