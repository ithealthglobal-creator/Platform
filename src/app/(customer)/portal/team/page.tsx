'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase-client'
import { getPhaseColor } from '@/lib/phase-colors'
import { StatsRow } from '@/components/team/stats-row'
import { PhaseRadar } from '@/components/team/phase-radar'
import { ServiceBars } from '@/components/team/service-bars'
import { MembersTab } from '@/components/team/members-tab'
import { TrendsTab } from '@/components/team/trends-tab'
import { InvitationsTab } from '@/components/team/invitations-tab'
import { InviteDialog } from '@/components/team/invite-dialog'
import type { TeamDashboardData, Phase, Service } from '@/lib/types'

interface RadarPhase {
  id: string
  name: string
  score: number
  color: string
}

interface ServiceBarItem {
  id: string
  name: string
  pct: number
  phaseColor: string
}

export default function TeamPage() {
  const { profile } = useAuth()
  const [dashData, setDashData] = useState<TeamDashboardData | null>(null)
  const [radarPhases, setRadarPhases] = useState<RadarPhase[]>([])
  const [serviceBars, setServiceBars] = useState<ServiceBarItem[]>([])
  const [phases, setPhases] = useState<Phase[]>([])
  const [services, setServices] = useState<Pick<Service, 'id' | 'name' | 'phase_id'>[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'members' | 'trends' | 'invitations'>('members')
  const [inviteOpen, setInviteOpen] = useState(false)

  const refreshData = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) return

    const authHeaders = { Authorization: `Bearer ${session.access_token}` }

    const [dashRes, phasesRes, servicesRes] = await Promise.all([
      fetch('/api/team/dashboard', { headers: authHeaders }),
      supabase.from('phases').select('id, name, sort_order').eq('is_active', true).order('sort_order'),
      supabase
        .from('services')
        .select('id, name, phase_id, phase:phases(id, name)')
        .eq('is_active', true),
    ])

    if (!dashRes.ok) return

    const dash: TeamDashboardData = await dashRes.json()
    setDashData(dash)

    const phases = (phasesRes.data ?? []) as Phase[]
    const services = (servicesRes.data ?? []) as unknown as (Service & { phase?: Phase })[]
    setPhases(phases)
    setServices(services.map(s => ({ id: s.id, name: s.name, phase_id: s.phase_id })))

    const built: RadarPhase[] = phases.map(p => ({
      id: p.id,
      name: p.name,
      score: Math.round(dash.teamAverages.phases[p.id] ?? 0),
      color: getPhaseColor(p.name),
    }))
    setRadarPhases(built)

    const bars: ServiceBarItem[] = services
      .filter(s => s.id in dash.teamAverages.services)
      .map(s => ({
        id: s.id,
        name: s.name,
        pct: Math.round(dash.teamAverages.services[s.id]?.pct ?? 0),
        phaseColor: getPhaseColor(s.phase?.name),
      }))
    setServiceBars(bars)
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setLoading(false)
        return
      }
      await refreshData()
      setLoading(false)
    }
    load()
  }, [refreshData])

  if (loading) {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-brand-primary">Team</p>
        <h1 className="mt-1 text-2xl font-bold text-brand-dark">Your Team</h1>
        <div className="mt-6 space-y-3">
          <div className="h-24 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    )
  }

  if (!profile?.is_company_admin) {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-brand-primary">Team</p>
        <h1 className="mt-1 text-2xl font-bold text-brand-dark">Your Team</h1>
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Only company administrators can view the team dashboard.
        </div>
      </div>
    )
  }

  if (!dashData) {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-brand-primary">Team</p>
        <h1 className="mt-1 text-2xl font-bold text-brand-dark">Your Team</h1>
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          No team data available yet.
        </div>
      </div>
    )
  }

  const { stats } = dashData

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-brand-primary">Team</p>
          <h1 className="mt-1 text-2xl font-bold text-brand-dark">Your Team</h1>
        </div>
        <button
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: '#1175E4' }}
          onClick={() => setInviteOpen(true)}
        >
          Invite Member
        </button>
      </div>

      {/* Stats Row */}
      <div className="mt-6">
        <StatsRow
          memberCount={stats.memberCount}
          avgMaturity={stats.avgMaturity}
          trend30d={stats.trend30d}
          coursesCompleted={stats.coursesCompleted}
        />
      </div>

      {/* Charts Row */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        {/* Phase Radar */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-base font-semibold text-slate-900">Phase Breakdown</h3>
          <PhaseRadar phases={radarPhases} overall={stats.avgMaturity} />
        </div>

        {/* Service Bars */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-base font-semibold text-slate-900">Service Scores</h3>
          <ServiceBars services={serviceBars} />
        </div>
      </div>

      {/* Tabbed Section */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white">
        {/* Tab headers */}
        <div className="flex border-b border-slate-200">
          {(['members', 'trends', 'invitations'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'members' && dashData && (
            <MembersTab
              members={dashData.members}
              phases={phases}
              services={services}
              teamAverages={dashData.teamAverages}
            />
          )}
          {activeTab === 'trends' && (
            <TrendsTab phases={phases} />
          )}
          {activeTab === 'invitations' && profile?.company_id && (
            <InvitationsTab companyId={profile.company_id} />
          )}
        </div>
      </div>

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvitesSent={refreshData}
      />
    </div>
  )
}
