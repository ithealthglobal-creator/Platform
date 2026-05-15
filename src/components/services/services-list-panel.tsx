'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, Search, Add } from '@carbon/icons-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getPhaseColor } from '@/lib/phase-colors'
import type { ServiceStatus } from '@/lib/types'

export interface ServicesListItem {
  id: string
  name: string
  phaseName: string | null
  status: ServiceStatus
}

interface ServicesListPanelProps {
  services: ServicesListItem[]
  selectedId: string | null
  /** Distinct phase names present in the catalog, for the filter dropdown. */
  phaseOptions: string[]
  onSelect: (id: string) => void
  onBack: () => void
  onNew: () => void
}

const ALL = '__all__'

export function ServicesListPanel({
  services,
  selectedId,
  phaseOptions,
  onSelect,
  onBack,
  onNew,
}: ServicesListPanelProps) {
  const [search, setSearch] = useState('')
  const [phase, setPhase] = useState<string>(ALL)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return services.filter((s) => {
      if (phase !== ALL && (s.phaseName ?? '') !== phase) return false
      if (q && !s.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [services, search, phase])

  return (
    <div className="flex h-full w-[280px] shrink-0 flex-col border-r bg-white">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-8 gap-1.5 px-2">
          <ArrowLeft size={14} />
          All services
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onNew} title="New service">
          <Add size={16} />
        </Button>
      </div>

      <div className="flex flex-col gap-2 border-b px-3 py-3">
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services…"
            className="pl-8"
          />
        </div>
        <Select value={phase} onValueChange={(val) => setPhase(val as string)}>
          <SelectTrigger className="h-8 w-full">
            <SelectValue placeholder="All phases" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All phases</SelectItem>
            {phaseOptions.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-slate-500">No services match.</p>
        ) : (
          <ul className="divide-y">
            {filtered.map((s) => {
              const isSelected = s.id === selectedId
              const phaseColor = getPhaseColor(s.phaseName)
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(s.id)}
                    className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors ${
                      isSelected ? 'bg-slate-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span
                      aria-hidden
                      className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: phaseColor }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {s.name}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {s.phaseName ?? 'Unphased'} · {statusLabel(s.status)}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function statusLabel(status: ServiceStatus): string {
  if (status === 'in_review') return 'In Review'
  return status.charAt(0).toUpperCase() + status.slice(1)
}
