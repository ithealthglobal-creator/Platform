'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase-client'
import { getCustomerTickets } from '@/lib/supabase/queries/support-tickets'
import { getCustomerSlaSummary } from '@/lib/supabase/queries/sla-measurements'
import { SlaKpiCards } from '@/components/support/sla-kpi-cards'
import { SlaServiceCard } from '@/components/support/sla-service-card'
import { SlaStatus, getSlaState } from '@/components/support/sla-status'
import { TicketForm } from '@/components/support/ticket-form'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { SupportTicket, SlaTemplate } from '@/lib/types'

const PERIODS = [
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 30 days', value: '30' },
  { label: 'Last 90 days', value: '90' },
]

function periodToRange(days: string): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - parseInt(days, 10))
  return { from: from.toISOString(), to: to.toISOString() }
}

type SlaTicket = {
  response_due_at: string | null
  resolution_due_at: string | null
  first_responded_at: string | null
  resolved_at: string | null
  status: string
  created_at: string
  service_id: string | null
  priority: string
}

interface ServiceCardData {
  serviceId: string
  serviceName: string
  templateName: string
  responseCompliance: number
  resolutionCompliance: number
  slaTargets: { response: Record<string, string | null>; resolution: Record<string, string | null> }
  supportHours: string | null
  ticketCount: number
}

function computeCompliance(tickets: SlaTicket[]): { response: number; resolution: number } {
  const withResp = tickets.filter((t) => t.first_responded_at)
  const respMet = withResp.filter((t) => getSlaState(t.response_due_at, t.first_responded_at) === 'met').length
  const resolved = tickets.filter((t) => t.resolved_at)
  const resMet = resolved.filter((t) => getSlaState(t.resolution_due_at, t.resolved_at) === 'met').length
  return {
    response: withResp.length ? Math.round((respMet / withResp.length) * 100) : 100,
    resolution: resolved.length ? Math.round((resMet / resolved.length) * 100) : 100,
  }
}

function priorityBadge(priority: string) {
  const map: Record<string, string> = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-slate-100 text-slate-600',
  }
  return map[priority] ?? 'bg-slate-100 text-slate-600'
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-indigo-100 text-indigo-700',
    waiting_on_customer: 'bg-amber-100 text-amber-700',
    resolved: 'bg-green-100 text-green-700',
    closed: 'bg-slate-100 text-slate-500',
  }
  return map[status] ?? 'bg-slate-100 text-slate-600'
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function categoryBadge(category: string) {
  const map: Record<string, string> = {
    general: 'bg-slate-100 text-slate-600',
    billing: 'bg-purple-100 text-purple-700',
    service: 'bg-cyan-100 text-cyan-700',
  }
  return map[category] ?? 'bg-slate-100 text-slate-600'
}

export default function SupportPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const [period, setPeriod] = useState('30')
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [slaTickets, setSlaTickets] = useState<SlaTicket[]>([])
  const [serviceCards, setServiceCards] = useState<ServiceCardData[]>([])
  const [formOpen, setFormOpen] = useState(false)

  const fetchData = useCallback(async () => {
    if (!profile?.company_id) return
    setLoading(true)

    const range = periodToRange(period)

    const [{ data: ticketData }, { data: slaData }, { data: contractData }] = await Promise.all([
      getCustomerTickets(profile.company_id),
      getCustomerSlaSummary(profile.company_id, range),
      supabase
        .from('customer_contracts')
        .select('*, service:services(*, service_sla:service_sla(*, sla_template:sla_templates(*)))')
        .eq('company_id', profile.company_id),
    ])

    setTickets((ticketData as SupportTicket[]) ?? [])
    const slaTix = (slaData ?? []) as SlaTicket[]
    setSlaTickets(slaTix)

    // Build service cards from contracts
    const cards: ServiceCardData[] = []
    for (const contract of contractData ?? []) {
      const svc = contract.service as { id: string; name: string; service_sla?: { sla_template?: SlaTemplate; override_support_hours?: string | null } } | null
      if (!svc) continue
      const tmpl = svc.service_sla?.sla_template
      if (!tmpl) continue
      const svcTickets = slaTix.filter((t) => t.service_id === svc.id)
      const compliance = computeCompliance(svcTickets)
      cards.push({
        serviceId: svc.id,
        serviceName: svc.name,
        templateName: tmpl.name,
        responseCompliance: compliance.response,
        resolutionCompliance: compliance.resolution,
        slaTargets: {
          response: {
            critical: tmpl.response_critical,
            high: tmpl.response_high,
            medium: tmpl.response_medium,
            low: tmpl.response_low,
          },
          resolution: {
            critical: tmpl.resolution_critical,
            high: tmpl.resolution_high,
            medium: tmpl.resolution_medium,
            low: tmpl.resolution_low,
          },
        },
        supportHours: svc.service_sla?.override_support_hours ?? tmpl.support_hours ?? null,
        ticketCount: svcTickets.length,
      })
    }

    // Add General & Billing card using overall SLA tickets without a service
    const generalTickets = slaTix.filter((t) => !t.service_id)
    if (generalTickets.length > 0 || cards.length === 0) {
      const gc = computeCompliance(generalTickets)
      cards.push({
        serviceId: '__general',
        serviceName: 'General & Billing',
        templateName: 'Standard SLA',
        responseCompliance: gc.response,
        resolutionCompliance: gc.resolution,
        slaTargets: {
          response: { critical: null, high: null, medium: null, low: null },
          resolution: { critical: null, high: null, medium: null, low: null },
        },
        supportHours: null,
        ticketCount: generalTickets.length,
      })
    }

    setServiceCards(cards)
    setLoading(false)
  }, [profile?.company_id, period])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Support</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Your Support</h1>
        <div className="mt-6 flex items-center justify-center rounded-xl border border-slate-200 bg-white p-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#1175E4]" />
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Support</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Your Support</h1>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v ?? '30')}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1175E4] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0d5fc4]"
          >
            + New Ticket
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mt-6">
        <SlaKpiCards tickets={slaTickets} />
      </div>

      {/* SLA Performance by Service */}
      {serviceCards.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-base font-semibold text-slate-800">SLA Performance by Service</h2>
          <div className="grid grid-cols-3 gap-4">
            {serviceCards.map((card) => (
              <SlaServiceCard
                key={card.serviceId}
                serviceName={card.serviceName}
                templateName={card.templateName}
                responseCompliance={card.responseCompliance}
                resolutionCompliance={card.resolutionCompliance}
                slaTargets={card.slaTargets}
                supportHours={card.supportHours}
                ticketCount={card.ticketCount}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tickets Table */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-800">Your Tickets</h2>
          <span className="text-sm text-slate-400">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</span>
        </div>

        {tickets.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400">
            No tickets yet.{' '}
            <button onClick={() => setFormOpen(true)} className="font-medium text-[#1175E4] hover:underline">
              Open your first ticket
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3">Ticket #</th>
                  <th className="px-6 py-3">Subject</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Priority</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">SLA</th>
                  <th className="px-6 py-3">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => router.push(`/portal/support/tickets/${ticket.id}`)}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                  >
                    <td className="px-6 py-3 font-mono text-xs text-slate-500">{ticket.ticket_number}</td>
                    <td className="px-6 py-3 font-medium text-slate-800 max-w-[260px] truncate">{ticket.subject}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${categoryBadge(ticket.category)}`}>
                        {ticket.category}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${priorityBadge(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(ticket.status)}`}>
                        {statusLabel(ticket.status)}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <SlaStatus
                        dueAt={ticket.resolution_due_at ?? ticket.response_due_at}
                        completedAt={ticket.resolved_at ?? ticket.first_responded_at}
                      />
                    </td>
                    <td className="px-6 py-3 text-slate-400">
                      {new Date(ticket.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TicketForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchData}
        isAdmin={false}
      />
    </div>
  )
}
