'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Phase, Service, ServiceStatus } from '@/lib/types'
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
import { Save } from '@carbon/icons-react'

interface DescriptionTabProps {
  serviceId: string | null
  onServiceCreated: (id: string) => void
  onDescriptionChange: (desc: string) => void
}

export function DescriptionTab({
  serviceId,
  onServiceCreated,
  onDescriptionChange,
}: DescriptionTabProps) {
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [phaseId, setPhaseId] = useState<string>('')
  const [status, setStatus] = useState<ServiceStatus>('draft')
  const [phases, setPhases] = useState<Phase[]>([])
  const [loaded, setLoaded] = useState(false)

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

      const [phasesRes, serviceRes] = await Promise.all([
        phasesPromise,
        servicePromise,
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
        setPhaseId(service.phase_id ?? '')
        setStatus(service.status)
        onDescriptionChange(service.description ?? '')
      }

      setLoaded(true)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [serviceId, onDescriptionChange])

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
      phase_id: phaseId || null,
      status,
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

      toast.success('Service updated successfully')
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
      toast.success('Service created successfully')
    }

    setSaving(false)
  }

  if (!loaded) {
    return null
  }

  return (
    <div className="max-w-2xl space-y-6 pt-4">
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
        <Label htmlFor="service-description">Description</Label>
        <textarea
          id="service-description"
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="Service description"
          rows={4}
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
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
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
