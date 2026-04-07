'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { SlaTemplate, ServiceSla } from '@/lib/types'
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
import { Save, Reset } from '@carbon/icons-react'

interface SlaTabProps {
  serviceId: string
}

const SLA_FIELDS = [
  { key: 'response_critical', label: 'Response - Critical', overrideKey: 'override_response_critical' },
  { key: 'response_high', label: 'Response - High', overrideKey: 'override_response_high' },
  { key: 'response_medium', label: 'Response - Medium', overrideKey: 'override_response_medium' },
  { key: 'response_low', label: 'Response - Low', overrideKey: 'override_response_low' },
  { key: 'resolution_critical', label: 'Resolution - Critical', overrideKey: 'override_resolution_critical' },
  { key: 'resolution_high', label: 'Resolution - High', overrideKey: 'override_resolution_high' },
  { key: 'resolution_medium', label: 'Resolution - Medium', overrideKey: 'override_resolution_medium' },
  { key: 'resolution_low', label: 'Resolution - Low', overrideKey: 'override_resolution_low' },
  { key: 'uptime_guarantee', label: 'Uptime Guarantee', overrideKey: 'override_uptime_guarantee' },
  { key: 'support_hours', label: 'Support Hours', overrideKey: 'override_support_hours' },
] as const

type OverrideKey = (typeof SLA_FIELDS)[number]['overrideKey']
type TemplateKey = (typeof SLA_FIELDS)[number]['key']

export function SlaTab({ serviceId }: SlaTabProps) {
  const [templates, setTemplates] = useState<SlaTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [selectedTemplate, setSelectedTemplate] = useState<SlaTemplate | null>(null)
  const [serviceSla, setServiceSla] = useState<ServiceSla | null>(null)
  const [overrides, setOverrides] = useState<Record<OverrideKey, string>>({
    override_response_critical: '',
    override_response_high: '',
    override_response_medium: '',
    override_response_low: '',
    override_resolution_critical: '',
    override_resolution_high: '',
    override_resolution_medium: '',
    override_resolution_low: '',
    override_uptime_guarantee: '',
    override_support_hours: '',
  })
  const [overrideSupportChannels, setOverrideSupportChannels] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchTemplates = useCallback(async () => {
    const { data, error } = await supabase
      .from('sla_templates')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      toast.error('Failed to load SLA templates')
      return
    }

    setTemplates((data ?? []) as SlaTemplate[])
  }, [])

  const fetchServiceSla = useCallback(async () => {
    const { data, error } = await supabase
      .from('service_sla')
      .select('*, sla_template:sla_templates(*)')
      .eq('service_id', serviceId)
      .maybeSingle()

    if (error) {
      toast.error('Failed to load service SLA')
      setLoaded(true)
      return
    }

    if (data) {
      const sla = data as ServiceSla
      setServiceSla(sla)
      setSelectedTemplateId(sla.sla_template_id)
      setSelectedTemplate(sla.sla_template ?? null)

      const newOverrides = { ...overrides }
      for (const field of SLA_FIELDS) {
        newOverrides[field.overrideKey] =
          (sla[field.overrideKey] as string | null) ?? ''
      }
      setOverrides(newOverrides)
      setOverrideSupportChannels(
        sla.override_support_channels?.join(', ') ?? ''
      )
    }

    setLoaded(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId])

  useEffect(() => {
    fetchTemplates()
    fetchServiceSla()
  }, [fetchTemplates, fetchServiceSla])

  function handleTemplateChange(templateId: string | null) {
    const id = templateId ?? ''
    setSelectedTemplateId(id)
    const tpl = templates.find((t) => t.id === id) ?? null
    setSelectedTemplate(tpl)
  }

  function handleOverrideChange(field: OverrideKey, value: string) {
    setOverrides((prev) => ({ ...prev, [field]: value }))
  }

  function handleReset(field: OverrideKey) {
    setOverrides((prev) => ({ ...prev, [field]: '' }))
  }

  async function handleSave() {
    if (!selectedTemplateId) {
      toast.error('Please select an SLA template')
      return
    }

    setSaving(true)

    const channels = overrideSupportChannels
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const payload = {
      service_id: serviceId,
      sla_template_id: selectedTemplateId,
      override_response_critical: overrides.override_response_critical || null,
      override_response_high: overrides.override_response_high || null,
      override_response_medium: overrides.override_response_medium || null,
      override_response_low: overrides.override_response_low || null,
      override_resolution_critical: overrides.override_resolution_critical || null,
      override_resolution_high: overrides.override_resolution_high || null,
      override_resolution_medium: overrides.override_resolution_medium || null,
      override_resolution_low: overrides.override_resolution_low || null,
      override_uptime_guarantee: overrides.override_uptime_guarantee || null,
      override_support_hours: overrides.override_support_hours || null,
      override_support_channels: channels.length > 0 ? channels : null,
    }

    if (serviceSla) {
      const { error } = await supabase
        .from('service_sla')
        .update(payload)
        .eq('id', serviceSla.id)

      if (error) {
        toast.error('Failed to update service SLA')
        setSaving(false)
        return
      }

      toast.success('Service SLA updated successfully')
    } else {
      const { data, error } = await supabase
        .from('service_sla')
        .insert(payload)
        .select('*, sla_template:sla_templates(*)')
        .single()

      if (error) {
        toast.error('Failed to create service SLA')
        setSaving(false)
        return
      }

      setServiceSla(data as ServiceSla)
      toast.success('Service SLA created successfully')
    }

    setSaving(false)
  }

  if (!loaded) {
    return null
  }

  return (
    <div className="max-w-2xl space-y-6 pt-4">
      <div className="grid gap-2">
        <Label htmlFor="sla-template-select">SLA Template</Label>
        <Select
          value={selectedTemplateId}
          onValueChange={handleTemplateChange}
        >
          <SelectTrigger id="sla-template-select">
            <SelectValue placeholder="Select an SLA template" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((tpl) => (
              <SelectItem key={tpl.id} value={tpl.id}>
                {tpl.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedTemplate && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            SLA Fields (leave empty to inherit from template)
          </h3>

          {SLA_FIELDS.map((field) => {
            const templateValue =
              (selectedTemplate[field.key as TemplateKey] as string | null) ?? ''
            const overrideValue = overrides[field.overrideKey]
            const isOverridden = overrideValue.trim().length > 0

            return (
              <div key={field.key} className="grid gap-1">
                <Label htmlFor={`sla-${field.key}`}>
                  {field.label}
                  {isOverridden && (
                    <span className="ml-2 text-xs text-amber-600 font-normal">
                      (overridden)
                    </span>
                  )}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={`sla-${field.key}`}
                    value={overrideValue}
                    onChange={(e) =>
                      handleOverrideChange(field.overrideKey, e.target.value)
                    }
                    placeholder={templateValue || 'Not set in template'}
                  />
                  {isOverridden && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleReset(field.overrideKey)}
                      title="Reset to template value"
                    >
                      <Reset size={16} />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}

          <div className="grid gap-1">
            <Label htmlFor="sla-override-channels">
              Support Channels (comma-separated)
              {overrideSupportChannels.trim().length > 0 && (
                <span className="ml-2 text-xs text-amber-600 font-normal">
                  (overridden)
                </span>
              )}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="sla-override-channels"
                value={overrideSupportChannels}
                onChange={(e) => setOverrideSupportChannels(e.target.value)}
                placeholder={
                  selectedTemplate.support_channels?.join(', ') ||
                  'Not set in template'
                }
              />
              {overrideSupportChannels.trim().length > 0 && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setOverrideSupportChannels('')}
                  title="Reset to template value"
                >
                  <Reset size={16} />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="pt-2">
        <Button onClick={handleSave} disabled={saving || !selectedTemplateId}>
          <Save size={16} />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
