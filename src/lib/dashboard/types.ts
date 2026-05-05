export type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'radial' | 'radar'

export type Aggregation = 'count' | 'sum' | 'avg' | 'min' | 'max'

export type FilterOp = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in'

export type TimeGrain = 'day' | 'week' | 'month' | 'quarter' | 'year'

export interface QueryMeasure {
  agg: Aggregation
  field?: string
  label: string
}

export interface QueryFilter {
  field: string
  op: FilterOp
  value: string | number | boolean | Array<string | number | boolean> | null
}

export interface QuerySpec {
  source: 'data' | 'knowledge'
  entity: string
  dimensions: string[]
  measures: QueryMeasure[]
  filters?: QueryFilter[]
  time_field?: string
  time_grain?: TimeGrain
  order_by?: { field: string; dir: 'asc' | 'desc' }
  limit?: number
}

export interface ChartLayout {
  x: number
  y: number
  w: number
  h: number
}

export type ChartConfig = Record<
  string,
  { label: string; color?: string }
>

export interface ChartSpec {
  id: string
  title: string
  description?: string
  chart_type: ChartType
  query: QuerySpec
  config: ChartConfig
  layout: ChartLayout
}

export interface DashboardLayout {
  charts: ChartSpec[]
}

export type DashboardVisibility = 'private' | 'company'

export interface SavedDashboard {
  id: string
  user_id: string
  company_id: string
  name: string
  layout: DashboardLayout
  visibility: DashboardVisibility
  created_at: string
  updated_at: string
}

export interface UserDashboardPrefs {
  user_id: string
  default_dashboard_id: string | null
}
