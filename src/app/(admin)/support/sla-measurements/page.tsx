'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SlaKpiCards } from '@/components/support/sla-kpi-cards'
import { SlaCompanyTable } from '@/components/support/sla-company-table'
import { SlaServiceTable } from '@/components/support/sla-service-table'
import { SlaTicketTable } from '@/components/support/sla-ticket-table'
import { getCompanySlaSummary } from '@/lib/supabase/queries/sla-measurements'
import { supabase } from '@/lib/supabase-client'

type Period = '7' | '30' | '90' | 'all'
interface DrillDown { companyId: string; companyName: string; serviceId?: string; serviceName?: string }

function getPeriod(p: Period) {
  const to = new Date().toISOString()
  if (p === 'all') return { from: '2000-01-01T00:00:00Z', to }
  const from = new Date(Date.now() - parseInt(p) * 86400000).toISOString()
  return { from, to }
}

export default function SlaMeasurementsPage() {
  const [period, setPeriod] = useState<Period>('30')
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [drillDown, setDrillDown] = useState<DrillDown | null>(null)

  useEffect(() => {
    supabase.from('companies').select('id, name').order('name').then(({ data }) => {
      if (data) setCompanies(data)
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    const p = getPeriod(period)
    const compId = companyFilter !== 'all' ? companyFilter : undefined
    getCompanySlaSummary(p, compId).then(({ data, error }) => {
      if (error) toast.error('Failed to load SLA data')
      else setTickets(data ?? [])
      setLoading(false)
    })
  }, [period, companyFilter])

  const drillTickets = drillDown
    ? tickets.filter((t) => {
        const matchCompany = t.company_id === drillDown.companyId
        const matchService = drillDown.serviceId
          ? (drillDown.serviceId === 'general' ? t.service_id == null : t.service_id === drillDown.serviceId)
          : true
        return matchCompany && matchService
      })
    : []

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Support</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">SLA Measurements</h1>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>

          <Select value={companyFilter} onValueChange={(v) => setCompanyFilter(v ?? 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400">Loading…</div>
      ) : drillDown ? (
        /* Drill-down view */
        <div>
          <button
            onClick={() => setDrillDown(null)}
            className="mb-4 text-sm text-blue-600 hover:underline"
          >
            ← Back to overview
          </button>
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {drillDown.companyName}
            </p>
            <h2 className="text-xl font-bold text-slate-900">
              {drillDown.serviceName ?? 'All Services'}
            </h2>
          </div>
          <div className="mb-6">
            <SlaKpiCards tickets={drillTickets} />
          </div>
          <SlaTicketTable tickets={drillTickets} />
        </div>
      ) : (
        /* Overview */
        <div className="space-y-6">
          <SlaKpiCards tickets={tickets} />

          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">By Company</h2>
            <SlaCompanyTable
              tickets={tickets}
              onRowClick={(companyId, companyName) => setDrillDown({ companyId, companyName })}
            />
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">By Service</h2>
            <SlaServiceTable
              tickets={tickets}
              onRowClick={(serviceId, serviceName) =>
                setDrillDown({ companyId: companyFilter !== 'all' ? companyFilter : '', companyName: '', serviceId, serviceName })
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}
