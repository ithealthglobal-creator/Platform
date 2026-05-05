'use client'

import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Area,
  AreaChart,
  Pie,
  PieChart,
  Cell,
  RadialBar,
  RadialBarChart,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig as ShadcnChartConfig,
} from '@/components/ui/chart'
import type { ChartSpec } from '@/lib/dashboard/types'
import { runChartQuery } from '@/lib/dashboard/api'

const PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

function buildShadcnConfig(spec: ChartSpec): ShadcnChartConfig {
  const cfg: ShadcnChartConfig = {}
  spec.query.measures.forEach((m, i) => {
    const fromSpec = spec.config?.[m.label]
    cfg[m.label] = {
      label: fromSpec?.label ?? m.label,
      color: fromSpec?.color ?? PALETTE[i % PALETTE.length],
    }
  })
  return cfg
}

export function ChartRenderer({ spec }: { spec: ChartSpec }) {
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setRows(null)
    setError(null)
    runChartQuery(spec.query)
      .then((res) => {
        if (!cancelled) setRows(res.rows)
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message ?? e))
      })
    return () => {
      cancelled = true
    }
  }, [spec.query])

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-xs text-red-600">
        {error}
      </div>
    )
  }

  if (!rows) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-xs text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-xs text-muted-foreground">
        No data
      </div>
    )
  }

  const config = buildShadcnConfig(spec)
  const xKey = spec.query.dimensions[0] ?? 'category'
  const measures = spec.query.measures

  if (spec.chart_type === 'bar') {
    return (
      <ChartContainer config={config} className="h-full w-full">
        <BarChart data={rows} margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {measures.map((m) => (
            <Bar
              key={m.label}
              dataKey={m.label}
              fill={`var(--color-${m.label})`}
              radius={4}
            />
          ))}
        </BarChart>
      </ChartContainer>
    )
  }

  if (spec.chart_type === 'line') {
    return (
      <ChartContainer config={config} className="h-full w-full">
        <LineChart data={rows} margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {measures.map((m) => (
            <Line
              key={m.label}
              type="monotone"
              dataKey={m.label}
              stroke={`var(--color-${m.label})`}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
    )
  }

  if (spec.chart_type === 'area') {
    return (
      <ChartContainer config={config} className="h-full w-full">
        <AreaChart data={rows} margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {measures.map((m) => (
            <Area
              key={m.label}
              type="monotone"
              dataKey={m.label}
              fill={`var(--color-${m.label})`}
              stroke={`var(--color-${m.label})`}
              fillOpacity={0.4}
            />
          ))}
        </AreaChart>
      </ChartContainer>
    )
  }

  if (spec.chart_type === 'pie' || spec.chart_type === 'radial') {
    const measure = measures[0]
    if (spec.chart_type === 'pie') {
      return (
        <ChartContainer config={config} className="h-full w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie data={rows} dataKey={measure.label} nameKey={xKey} innerRadius={50}>
              {rows.map((_row, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey={xKey} />} />
          </PieChart>
        </ChartContainer>
      )
    }
    return (
      <ChartContainer config={config} className="h-full w-full">
        <RadialBarChart data={rows} innerRadius={30} outerRadius={110}>
          <ChartTooltip content={<ChartTooltipContent />} />
          <RadialBar dataKey={measure.label} background>
            {rows.map((_row, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </RadialBar>
          <ChartLegend content={<ChartLegendContent nameKey={xKey} />} />
        </RadialBarChart>
      </ChartContainer>
    )
  }

  if (spec.chart_type === 'radar') {
    return (
      <ChartContainer config={config} className="h-full w-full">
        <RadarChart data={rows}>
          <ChartTooltip content={<ChartTooltipContent />} />
          <PolarGrid />
          <PolarAngleAxis dataKey={xKey} />
          {measures.map((m) => (
            <Radar
              key={m.label}
              dataKey={m.label}
              stroke={`var(--color-${m.label})`}
              fill={`var(--color-${m.label})`}
              fillOpacity={0.4}
            />
          ))}
          <ChartLegend content={<ChartLegendContent />} />
        </RadarChart>
      </ChartContainer>
    )
  }

  return null
}
