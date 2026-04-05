'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import type { SalesStage, SalesLead, Company, AssessmentAttempt } from '@/lib/types'

type LeadWithRelations = SalesLead & {
  company?: Company
  assessment_attempt?: AssessmentAttempt
}

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#eab308',
  '#22c55e', '#14b8a6', '#3b82f6', '#64748b', '#ef4444',
]

export default function SalesPage() {
  const [stages, setStages] = useState<SalesStage[]>([])
  const [leads, setLeads] = useState<LeadWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Stage form state
  const [newStageName, setNewStageName] = useState('')
  const [newStageColor, setNewStageColor] = useState(PRESET_COLORS[0])
  const [addingStage, setAddingStage] = useState(false)

  // Drag state
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

  // ── Stage management ────────────────────────────────────────────────────────

  const handleAddStage = async () => {
    if (!newStageName.trim()) {
      toast.error('Stage name is required')
      return
    }
    setAddingStage(true)
    const maxOrder = stages.reduce((m, s) => Math.max(m, s.sort_order), 0)
    const { error } = await supabase.from('sales_stages').insert({
      name: newStageName.trim(),
      color: newStageColor,
      sort_order: maxOrder + 1,
      is_active: true,
    })
    setAddingStage(false)
    if (error) {
      toast.error('Failed to add stage')
    } else {
      toast.success('Stage added')
      setNewStageName('')
      setNewStageColor(PRESET_COLORS[0])
      fetchData()
    }
  }

  const handleDeleteStage = async (stage: SalesStage) => {
    const hasLeads = leads.some((l) => l.stage_id === stage.id)
    if (hasLeads) {
      toast.error('Cannot delete a stage that still has leads')
      return
    }
    const { error } = await supabase.from('sales_stages').delete().eq('id', stage.id)
    if (error) {
      toast.error('Failed to delete stage')
    } else {
      toast.success('Stage deleted')
      fetchData()
    }
  }

  // ── Drag & Drop ─────────────────────────────────────────────────────────────

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

    // Optimistic update
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
      // Revert
      setLeads((prev) =>
        prev.map((l) => (l.id === draggedLeadId ? { ...l, stage_id: lead.stage_id } : l))
      )
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' })

  const leadsForStage = (stageId: string) => leads.filter((l) => l.stage_id === stageId)

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Sales Pipeline</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button variant="outline" />}>
            Manage Stages
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Manage Stages</DialogTitle>
            </DialogHeader>

            {/* Existing stages list */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {stages.length === 0 && (
                <p className="text-sm text-muted-foreground">No stages yet.</p>
              )}
              {stages.map((stage) => (
                <div key={stage.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                  <span
                    className="h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="flex-1 text-sm font-medium">{stage.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive h-7 px-2"
                    onClick={() => handleDeleteStage(stage)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>

            {/* Add stage form */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">Add Stage</p>
              <Input
                placeholder="Stage name"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddStage() }}
              />
              {/* Color picker */}
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor: newStageColor === color ? '#1e293b' : 'transparent',
                    }}
                    onClick={() => setNewStageColor(color)}
                  />
                ))}
              </div>
              <Button onClick={handleAddStage} disabled={addingStage} className="w-full">
                {addingStage ? 'Adding…' : 'Add Stage'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-72 flex-shrink-0 rounded-xl bg-slate-100 h-64 animate-pulse" />
          ))}
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
                {/* Column header */}
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

                {/* Lead cards */}
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
                        {/* Company name */}
                        <p className="font-semibold text-sm leading-tight">
                          {lead.company?.name ?? '—'}
                        </p>

                        {/* Contact info */}
                        <p className="text-xs text-muted-foreground leading-tight">
                          {lead.contact_name}
                        </p>
                        <p className="text-xs text-muted-foreground leading-tight truncate">
                          {lead.contact_email}
                        </p>

                        {/* Footer row */}
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

          {stages.length === 0 && (
            <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
              No stages configured. Click &ldquo;Manage Stages&rdquo; to get started.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
