'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Phase, Service, ServiceBusinessOutcome, ServiceStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Add, Save, TrashCan } from '@carbon/icons-react'

interface DescriptionTabProps {
  serviceId: string | null
  onServiceCreated: (id: string) => void
  onServiceUpdated?: () => void
  onDescriptionChange: (desc: string) => void
}

export function DescriptionTab({
  serviceId,
  onServiceCreated,
  onServiceUpdated,
  onDescriptionChange,
}: DescriptionTabProps) {
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [longDescription, setLongDescription] = useState('')
  const [phaseId, setPhaseId] = useState<string>('')
  const [status, setStatus] = useState<ServiceStatus>('draft')
  const [includesProducts, setIncludesProducts] = useState(true)
  const [includesMarketingContent, setIncludesMarketingContent] = useState(true)
  const [includesAcademy, setIncludesAcademy] = useState(false)
  const [includesSla, setIncludesSla] = useState(true)
  const [phases, setPhases] = useState<Phase[]>([])
  const [outcomes, setOutcomes] = useState<ServiceBusinessOutcome[]>([])
  const [loaded, setLoaded] = useState(false)

  const onDescriptionChangeRef = useRef(onDescriptionChange)
  useEffect(() => {
    onDescriptionChangeRef.current = onDescriptionChange
  }, [onDescriptionChange])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const phasesPromise = supabase
        .from('phases')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      const servicePromise = serviceId
        ? supabase.from('services').select('*').eq('id', serviceId).single()
        : Promise.resolve({ data: null, error: null })

      const outcomesPromise = serviceId
        ? supabase
            .from('service_business_outcomes')
            .select('*')
            .eq('service_id', serviceId)
            .order('sort_order')
        : Promise.resolve({ data: [], error: null })

      const [phasesRes, serviceRes, outcomesRes] = await Promise.all([
        phasesPromise,
        servicePromise,
        outcomesPromise,
      ])

      if (cancelled) return

      if (phasesRes.error) toast.error('Failed to load phases')
      else setPhases(phasesRes.data ?? [])

      if (serviceRes.error) {
        toast.error('Failed to load service')
      } else if (serviceRes.data) {
        const service = serviceRes.data as Service
        setName(service.name)
        setDescription(service.description ?? '')
        setLongDescription(service.long_description ?? '')
        setPhaseId(service.phase_id ?? '')
        setStatus(service.status)
        setIncludesProducts(service.includes_products ?? true)
        setIncludesMarketingContent(service.includes_marketing_content ?? true)
        setIncludesAcademy(service.includes_academy ?? false)
        setIncludesSla(service.includes_sla ?? true)
        onDescriptionChangeRef.current(service.description ?? '')
      }

      if (outcomesRes.error) toast.error('Failed to load outcomes')
      else setOutcomes((outcomesRes.data as ServiceBusinessOutcome[]) ?? [])

      setLoaded(true)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [serviceId])

  function handleDescriptionChange(value: string) {
    setDescription(value)
    onDescriptionChange(value)
  }

  async function handleSave() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.error('Service name is required')
      return
    }

    setSaving(true)

    const payload = {
      name: trimmedName,
      description: description.trim() || null,
      long_description: longDescription.trim() || null,
      phase_id: phaseId || null,
      status,
      includes_products: includesProducts,
      includes_marketing_content: includesMarketingContent,
      includes_academy: includesAcademy,
      includes_sla: includesSla,
    }

    if (serviceId) {
      const { error } = await supabase
        .from('services')
        .update(payload)
        .eq('id', serviceId)

      if (error) {
        toast.error('Failed to update service')
        setSaving(false)
        return
      }

      toast.success('Service updated')
      onServiceUpdated?.()
    } else {
      const { data, error } = await supabase
        .from('services')
        .insert(payload)
        .select()
        .single()

      if (error) {
        toast.error('Failed to create service')
        setSaving(false)
        return
      }

      const newService = data as Service
      onServiceCreated(newService.id)
      toast.success('Service created')
    }

    setSaving(false)
  }

  // Outcomes — save inline (per-row) since they're a separate table.
  async function handleAddOutcome() {
    if (!serviceId) {
      toast.error('Save the service first')
      return
    }
    const nextOrder = outcomes.length
      ? Math.max(...outcomes.map((o) => o.sort_order)) + 1
      : 0
    const { data, error } = await supabase
      .from('service_business_outcomes')
      .insert({
        service_id: serviceId,
        outcome: '',
        explanation: null,
        sort_order: nextOrder,
      })
      .select()
      .single()
    if (error) {
      toast.error('Failed to add outcome')
      return
    }
    setOutcomes((prev) => [...prev, data as ServiceBusinessOutcome])
  }

  async function handleOutcomeBlur(o: ServiceBusinessOutcome) {
    const { error } = await supabase
      .from('service_business_outcomes')
      .update({
        outcome: o.outcome,
        explanation: o.explanation,
      })
      .eq('id', o.id)
    if (error) toast.error('Failed to save outcome')
  }

  async function handleOutcomeDelete(id: string) {
    const { error } = await supabase
      .from('service_business_outcomes')
      .delete()
      .eq('id', id)
    if (error) {
      toast.error('Failed to delete outcome')
      return
    }
    setOutcomes((prev) => prev.filter((o) => o.id !== id))
  }

  function patchOutcome(id: string, patch: Partial<ServiceBusinessOutcome>) {
    setOutcomes((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)))
  }

  if (!loaded) return null

  return (
    <div className="max-w-3xl space-y-6 pt-4">
      <div className="grid gap-2">
        <Label htmlFor="service-name">Name</Label>
        <Input
          id="service-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Service name"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="service-description">Short Description</Label>
        <textarea
          id="service-description"
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="One or two sentence elevator pitch"
          rows={3}
          className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="service-long-description">Long Description</Label>
        <textarea
          id="service-long-description"
          value={longDescription}
          onChange={(e) => setLongDescription(e.target.value)}
          placeholder="Detailed description (also editable on the Growth tab)"
          rows={6}
          className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="service-phase">Phase</Label>
        <Select
          value={phaseId}
          onValueChange={(val) => setPhaseId(val as string)}
        >
          <SelectTrigger id="service-phase">
            <SelectValue placeholder="Select a phase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            {phases.map((phase) => (
              <SelectItem key={phase.id} value={phase.id}>
                {phase.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Business Outcomes</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddOutcome}
            disabled={!serviceId}
            className="gap-1"
          >
            <Add size={14} />
            Add outcome
          </Button>
        </div>
        {!serviceId && (
          <p className="text-muted-foreground text-xs">
            Save the service first to add outcomes.
          </p>
        )}
        {serviceId && outcomes.length === 0 && (
          <p className="text-muted-foreground text-xs">
            No outcomes yet. Aim for 3–5 short statements (e.g. &quot;Faster
            decisions&quot;, &quot;Lower cloud spend&quot;).
          </p>
        )}
        {outcomes.length > 0 && (
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="border-b text-left">
                  <th className="w-1/3 px-3 py-2 font-medium">Outcome</th>
                  <th className="px-3 py-2 font-medium">Explanation</th>
                  <th className="w-12 px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {outcomes.map((o) => (
                  <tr key={o.id} className="border-b last:border-b-0">
                    <td className="px-3 py-1.5 align-top">
                      <Input
                        value={o.outcome}
                        onChange={(e) =>
                          patchOutcome(o.id, { outcome: e.target.value })
                        }
                        onBlur={() => handleOutcomeBlur(o)}
                        placeholder="Faster decisions"
                        className="border-0 px-1 shadow-none focus-visible:ring-0"
                      />
                    </td>
                    <td className="px-3 py-1.5 align-top">
                      <Input
                        value={o.explanation ?? ''}
                        onChange={(e) =>
                          patchOutcome(o.id, { explanation: e.target.value })
                        }
                        onBlur={() => handleOutcomeBlur(o)}
                        placeholder="Why this matters for the customer"
                        className="border-0 px-1 shadow-none focus-visible:ring-0"
                      />
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOutcomeDelete(o.id)}
                        title="Delete outcome"
                      >
                        <TrashCan size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="service-status">Status</Label>
        <Select
          value={status}
          onValueChange={(val) => setStatus(val as ServiceStatus)}
        >
          <SelectTrigger id="service-status">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>This service includes</Label>
        <div className="grid gap-2 rounded-lg border p-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includesProducts}
              onChange={(e) => setIncludesProducts(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-blue-600"
            />
            Products
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includesMarketingContent}
              onChange={(e) => setIncludesMarketingContent(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-blue-600"
            />
            Marketing content (Growth tab)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includesAcademy}
              onChange={(e) => setIncludesAcademy(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-blue-600"
            />
            Academy courses
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includesSla}
              onChange={(e) => setIncludesSla(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-blue-600"
            />
            SLA
          </label>
        </div>
      </div>

      <div className="pt-2">
        <Button onClick={handleSave} disabled={saving}>
          <Save size={16} />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
