'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Settings } from '@carbon/icons-react'
import type { SalesStage, SalesLead, Company, AssessmentAttempt } from '@/lib/types'

type LeadWithRelations = SalesLead & {
  company?: Company
  assessment_attempt?: AssessmentAttempt
}

export default function SalesDealsPage() {
  const [stages, setStages] = useState<SalesStage[]>([])
  const [leads, setLeads] = useState<LeadWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [stagesRes, leadsRes] = await Promise.all([
      supabase
        .from('sales_stages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('sales_leads')
        .select('*, company:companies(*), assessment_attempt:assessment_attempts(*)')
        .order('created_at', { ascending: false }),
    ])

    if (stagesRes.error) {
      toast.error('Failed to load sales stages')
    } else {
      setStages(stagesRes.data ?? [])
    }

    if (leadsRes.error) {
      toast.error('Failed to load sales leads')
    } else {
      setLeads((leadsRes.data ?? []) as LeadWithRelations[])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDragStart = (leadId: string) => {
    setDraggedLeadId(leadId)
  }

  const handleDrop = async (stageId: string) => {
    if (!draggedLeadId) return

    const lead = leads.find((l) => l.id === draggedLeadId)
    if (!lead || lead.stage_id === stageId) {
      setDraggedLeadId(null)
      return
    }

    setLeads((prev) =>
      prev.map((l) => (l.id === draggedLeadId ? { ...l, stage_id: stageId } : l))
    )
    setDraggedLeadId(null)

    const { error } = await supabase
      .from('sales_leads')
      .update({ stage_id: stageId })
      .eq('id', draggedLeadId)

    if (error) {
      toast.error('Failed to move lead')
      setLeads((prev) =>
        prev.map((l) => (l.id === draggedLeadId ? { ...l, stage_id: lead.stage_id } : l))
      )
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' })

  const leadsForStage = (stageId: string) => leads.filter((l) => l.stage_id === stageId)

  return (
    <div className="flex flex-col h-full gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deals</h1>
          <p className="text-sm text-muted-foreground">
            Leads captured from landing pages, moving through your sales funnel.
          </p>
        </div>
        <Button variant="outline" render={<Link href="/settings/sales-funnel" />}>
          <Settings size={16} />
          Edit Funnel
        </Button>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-72 flex-shrink-0 rounded-xl bg-slate-100 h-64 animate-pulse" />
          ))}
        </div>
      ) : stages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
          No funnel stages configured.{' '}
          <Link href="/settings/sales-funnel" className="ml-1 underline">
            Set up your sales funnel
          </Link>
          .
        </div>
      ) : (
        <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageLeads = leadsForStage(stage.id)
            return (
              <div
                key={stage.id}
                className="w-72 flex-shrink-0 rounded-xl bg-slate-100 flex flex-col"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(stage.id)}
              >
                <div className="flex items-center gap-2 px-4 py-3">
                  <span
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="font-semibold text-sm flex-1 truncate">{stage.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {stageLeads.length}
                  </Badge>
                </div>

                <div className="flex flex-col gap-2 px-3 pb-3 overflow-y-auto flex-1 min-h-[120px]">
                  {stageLeads.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">No leads</p>
                  )}
                  {stageLeads.map((lead) => (
                    <Card
                      key={lead.id}
                      draggable
                      onDragStart={() => handleDragStart(lead.id)}
                      className="cursor-grab active:cursor-grabbing shadow-sm select-none"
                    >
                      <CardContent className="p-3 space-y-1.5">
                        <p className="font-semibold text-sm leading-tight">
                          {lead.company?.name ?? '—'}
                        </p>
                        <p className="text-xs text-muted-foreground leading-tight">
                          {lead.contact_name}
                        </p>
                        <p className="text-xs text-muted-foreground leading-tight truncate">
                          {lead.contact_email}
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(lead.created_at)}
                          </span>
                          {lead.assessment_attempt && (
                            <Badge
                              variant={lead.assessment_attempt.passed ? 'default' : 'destructive'}
                              className="text-xs px-1.5 py-0"
                            >
                              {Math.round(lead.assessment_attempt.score)}%
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
