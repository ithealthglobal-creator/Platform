'use client'

import type { AwarenessSourceType } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  dateFrom: Date
  dateTo: Date
  sourceTypes: AwarenessSourceType[]
  onDateFromChange: (d: Date) => void
  onDateToChange: (d: Date) => void
  onSourceTypesChange: (s: AwarenessSourceType[]) => void
}

const SOURCE_OPTIONS: { value: AwarenessSourceType; label: string }[] = [
  { value: 'paid', label: 'Paid' },
  { value: 'social', label: 'Social' },
  { value: 'blog', label: 'Blog' },
]

function toInputDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function FunnelToolbar({
  dateFrom, dateTo, sourceTypes,
  onDateFromChange, onDateToChange, onSourceTypesChange,
}: Props) {
  function toggleSource(s: AwarenessSourceType) {
    const has = sourceTypes.includes(s)
    onSourceTypesChange(has ? sourceTypes.filter((x) => x !== s) : [...sourceTypes, s])
  }

  return (
    <div className="flex items-end gap-4 border-b bg-white px-6 py-3">
      <div className="grid gap-1">
        <Label htmlFor="funnel-from" className="text-xs">From</Label>
        <Input
          id="funnel-from"
          type="date"
          value={toInputDate(dateFrom)}
          onChange={(e) => onDateFromChange(new Date(e.target.value))}
          className="h-8 w-[150px]"
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="funnel-to" className="text-xs">To</Label>
        <Input
          id="funnel-to"
          type="date"
          value={toInputDate(dateTo)}
          onChange={(e) => onDateToChange(new Date(e.target.value))}
          className="h-8 w-[150px]"
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-700">Show sources</span>
        <div className="flex gap-1">
          {SOURCE_OPTIONS.map((opt) => {
            const active = sourceTypes.includes(opt.value)
            return (
              <button
                key={opt.value}
                onClick={() => toggleSource(opt.value)}
                className={`h-8 rounded-md border px-3 text-xs font-medium transition-colors ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
