import type { ServiceCostingItem } from './types'

/**
 * Derives display price from service costing items.
 * Sums base_cost of maintenance items (recurring) or setup items (one-off).
 * For tiered pricing, uses tier-1 minimum rate.
 */
export function deriveDisplayPrice(
  costingItems: ServiceCostingItem[]
): { price: number; billingPeriod: 'once' | 'monthly' } {
  const maintenanceItems = costingItems.filter(i => i.category === 'maintenance' && i.is_active)
  const setupItems = costingItems.filter(i => i.category === 'setup' && i.is_active)

  const items = maintenanceItems.length > 0 ? maintenanceItems : setupItems
  const billingPeriod = maintenanceItems.length > 0 ? 'monthly' as const : 'once' as const

  let total = 0
  for (const item of items) {
    if (item.pricing_type === 'tiered' && item.tiers && item.tiers.length > 0) {
      total += item.tiers[0].rate
    } else if (item.base_cost) {
      total += parseFloat(item.base_cost)
    }
  }

  return { price: total, billingPeriod }
}

/**
 * Format price for display: "R 4,500/mo" or "R 12,000 once"
 */
export function formatPrice(price: number, billingPeriod: string): string {
  const formatted = new Intl.NumberFormat('en-ZA').format(price)
  const suffix = billingPeriod === 'once' ? ' once'
    : billingPeriod === 'monthly' ? '/mo'
    : billingPeriod === 'quarterly' ? '/qtr'
    : '/yr'
  return `R ${formatted}${suffix}`
}
