'use client'

import { Close, TrashCan } from '@carbon/icons-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChartRenderer } from './chart-renderer'
import { cn } from '@/lib/utils'
import type { ChartSpec } from '@/lib/dashboard/types'

interface Props {
  charts: ChartSpec[]
  selectedChartId: string | null
  onSelectChart: (id: string | null) => void
  onRemoveChart: (id: string) => void
}

export function DashboardCanvas({
  charts,
  selectedChartId,
  onSelectChart,
  onRemoveChart,
}: Props) {
  if (charts.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-12 text-center text-sm text-muted-foreground">
        <div className="max-w-md space-y-2">
          <p className="font-medium">No charts yet.</p>
          <p>
            Use the Dashboard Generator on the right to add your first chart —
            try asking for &ldquo;services by phase&rdquo; or &ldquo;tickets per
            week.&rdquo;
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="grid h-full auto-rows-[minmax(220px,1fr)] grid-cols-12 gap-4 overflow-y-auto p-4"
      onClick={() => onSelectChart(null)}
    >
      {charts.map((chart) => {
        const isSelected = selectedChartId === chart.id
        return (
          <Card
            key={chart.id}
            size="sm"
            className={cn(
              'flex cursor-pointer flex-col overflow-hidden transition-all',
              isSelected && 'ring-2 ring-primary',
            )}
            style={{
              gridColumn: `span ${Math.max(1, Math.min(12, chart.layout.w))} / span ${Math.max(1, Math.min(12, chart.layout.w))}`,
              gridRow: `span ${Math.max(1, Math.min(6, chart.layout.h))} / span ${Math.max(1, Math.min(6, chart.layout.h))}`,
            }}
            onClick={(e) => {
              e.stopPropagation()
              onSelectChart(isSelected ? null : chart.id)
            }}
          >
            <div className="flex items-start justify-between gap-2 px-3 pt-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{chart.title}</div>
                {chart.description ? (
                  <div className="truncate text-xs text-muted-foreground">
                    {chart.description}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-1">
                {isSelected ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Remove chart"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveChart(chart.id)
                      }}
                    >
                      <TrashCan size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Deselect"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectChart(null)
                      }}
                    >
                      <Close size={14} />
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <ChartRenderer spec={chart} />
            </div>
          </Card>
        )
      })}
    </div>
  )
}
