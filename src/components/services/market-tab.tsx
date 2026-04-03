'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Close } from '@carbon/icons-react'

interface MarketTabProps {
  serviceId: string
}

interface ReferenceItem {
  id: string
  name: string
}

interface MultiSelectSectionProps {
  label: string
  tableName: string
  junctionTable: string
  foreignKey: string
  serviceId: string
}

function MultiSelectSection({
  label,
  tableName,
  junctionTable,
  foreignKey,
  serviceId,
}: MultiSelectSectionProps) {
  const [allItems, setAllItems] = useState<ReferenceItem[]>([])
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const [refResult, junctionResult] = await Promise.all([
      supabase
        .from(tableName)
        .select('id, name')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from(junctionTable)
        .select(foreignKey)
        .eq('service_id', serviceId),
    ])

    if (refResult.error) {
      toast.error(`Failed to load ${label.toLowerCase()}`)
      setLoading(false)
      return
    }

    if (junctionResult.error) {
      toast.error(`Failed to load linked ${label.toLowerCase()}`)
      setLoading(false)
      return
    }

    setAllItems((refResult.data as ReferenceItem[]) ?? [])
    setLinkedIds(
      new Set(
        (junctionResult.data as Record<string, string>[]).map(
          (row) => row[foreignKey]
        )
      )
    )
    setLoading(false)
  }, [tableName, junctionTable, foreignKey, serviceId, label])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const availableItems = allItems.filter((item) => !linkedIds.has(item.id))
  const selectedItems = allItems.filter((item) => linkedIds.has(item.id))

  async function handleAdd(itemId: string) {
    if (!itemId) return

    const { error } = await supabase
      .from(junctionTable)
      .insert({ service_id: serviceId, [foreignKey]: itemId })

    if (error) {
      toast.error(`Failed to add ${label.toLowerCase().slice(0, -1)}`)
      return
    }

    setLinkedIds((prev) => new Set([...prev, itemId]))
  }

  async function handleRemove(itemId: string) {
    const { error } = await supabase
      .from(junctionTable)
      .delete()
      .eq('service_id', serviceId)
      .eq(foreignKey, itemId)

    if (error) {
      toast.error(`Failed to remove ${label.toLowerCase().slice(0, -1)}`)
      return
    }

    setLinkedIds((prev) => {
      const next = new Set(prev)
      next.delete(itemId)
      return next
    })
  }

  if (loading) return null

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <select
        className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
        value=""
        onChange={(e) => {
          handleAdd(e.target.value)
          e.target.value = ''
        }}
      >
        <option value="" disabled>
          Select a {label.toLowerCase().replace(/s$/, '')}...
        </option>
        {availableItems.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {selectedItems.map((item) => (
            <Badge key={item.id} variant="secondary" className="gap-1 pr-1">
              {item.name}
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <Close size={12} />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

export function MarketTab({ serviceId }: MarketTabProps) {
  const sections: Omit<MultiSelectSectionProps, 'serviceId'>[] = [
    {
      label: 'Verticals',
      tableName: 'verticals',
      junctionTable: 'service_verticals',
      foreignKey: 'vertical_id',
    },
    {
      label: 'Personas',
      tableName: 'personas',
      junctionTable: 'service_personas',
      foreignKey: 'persona_id',
    },
    {
      label: 'Pains',
      tableName: 'pains',
      junctionTable: 'service_pains',
      foreignKey: 'pain_id',
    },
    {
      label: 'Gains',
      tableName: 'gains',
      junctionTable: 'service_gains',
      foreignKey: 'gain_id',
    },
  ]

  return (
    <div className="max-w-2xl space-y-6 pt-4">
      {sections.map((section) => (
        <MultiSelectSection
          key={section.tableName}
          {...section}
          serviceId={serviceId}
        />
      ))}
    </div>
  )
}
