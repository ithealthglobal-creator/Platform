'use client'

import { Add, TrashCan } from '@carbon/icons-react'
import { Button } from '@/components/ui/button'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface RepeatableItemsProps<T = any> {
  items: T[]
  onItemsChange: (items: T[]) => void
  renderItem: (
    item: T,
    index: number,
    onChange: (field: string, value: unknown) => void
  ) => React.ReactNode
  createEmpty: () => T
  addLabel?: string
}

export function RepeatableItems<T>({
  items,
  onItemsChange,
  renderItem,
  createEmpty,
  addLabel = 'Add Item',
}: RepeatableItemsProps<T>) {
  function handleChange(index: number, field: string, value: unknown) {
    const updated = items.map((item, i) => {
      if (i !== index) return item
      // For primitive items (strings, numbers), field is ignored and value replaces the item
      if (typeof item !== 'object' || item === null) return value as T
      return { ...(item as object), [field]: value } as T
    })
    onItemsChange(updated)
  }

  function handleRemove(index: number) {
    const updated = items.filter((_, i) => i !== index)
    onItemsChange(updated)
  }

  function handleAdd() {
    onItemsChange([...items, createEmpty()])
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => (
        <div
          key={index}
          className="relative rounded-md border border-gray-200 bg-gray-50 p-4"
        >
          <button
            type="button"
            onClick={() => handleRemove(index)}
            className="absolute right-3 top-3 text-gray-400 hover:text-red-600 transition-colors"
            aria-label="Remove item"
          >
            <TrashCan size={16} />
          </button>

          <div className="pr-8">
            {renderItem(item, index, (field, value) =>
              handleChange(index, field, value)
            )}
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAdd}
        className="font-poppins self-start"
      >
        <Add size={16} className="mr-1.5" />
        {addLabel}
      </Button>
    </div>
  )
}
