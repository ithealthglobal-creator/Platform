'use client'

import { ChevronDown, ChevronUp } from '@carbon/icons-react'
import { useState } from 'react'

interface SectionEditorProps {
  title: string
  isActive: boolean
  onToggleActive: (active: boolean) => void
  sortOrder: number
  onSortOrderChange: (order: number) => void
  children: React.ReactNode
}

export function SectionEditor({
  title,
  isActive,
  onToggleActive,
  sortOrder,
  onSortOrderChange,
  children,
}: SectionEditorProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={collapsed ? 'Expand section' : 'Collapse section'}
          >
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <span className="font-poppins font-semibold text-sm text-gray-800">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Sort order */}
          <div className="flex items-center gap-2">
            <label className="font-poppins text-xs text-gray-500">Order</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => onSortOrderChange(Number(e.target.value))}
              className="w-16 rounded border border-gray-200 px-2 py-1 font-poppins text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              min={0}
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-2">
            <span className="font-poppins text-xs text-gray-500">Active</span>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => onToggleActive(!isActive)}
              className={[
                'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                isActive ? 'bg-blue-600' : 'bg-gray-200',
              ].join(' ')}
            >
              <span
                className={[
                  'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200',
                  isActive ? 'translate-x-4' : 'translate-x-0',
                ].join(' ')}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  )
}
