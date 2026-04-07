'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { SlaTemplate } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Add, Edit, TrashCan, Save, Close } from '@carbon/icons-react'

const emptySla: Omit<SlaTemplate, 'id' | 'created_at' | 'updated_at'> = {
  name: '',
  description: null,
  response_critical: null,
  response_high: null,
  response_medium: null,
  response_low: null,
  resolution_critical: null,
  resolution_high: null,
  resolution_medium: null,
  resolution_low: null,
  uptime_guarantee: null,
  support_hours: null,
  support_channels: null,
  is_active: true,
}

export default function SlaTemplatesPage() {
  const [templates, setTemplates] = useState<SlaTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<SlaTemplate | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [form, setForm] = useState(emptySla)
  const [supportChannelsText, setSupportChannelsText] = useState('')

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sla_templates')
      .select('*')
      .order('name')

    if (error) {
      toast.error('Failed to load SLA templates')
      setLoading(false)
      return
    }

    setTemplates((data ?? []) as SlaTemplate[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  function openAdd() {
    setForm(emptySla)
    setSupportChannelsText('')
    setIsNew(true)
    setEditing({} as SlaTemplate)
  }

  function openEdit(template: SlaTemplate) {
    setForm({
      name: template.name,
      description: template.description,
      response_critical: template.response_critical,
      response_high: template.response_high,
      response_medium: template.response_medium,
      response_low: template.response_low,
      resolution_critical: template.resolution_critical,
      resolution_high: template.resolution_high,
      resolution_medium: template.resolution_medium,
      resolution_low: template.resolution_low,
      uptime_guarantee: template.uptime_guarantee,
      support_hours: template.support_hours,
      support_channels: template.support_channels,
      is_active: template.is_active,
    })
    setSupportChannelsText(template.support_channels?.join(', ') ?? '')
    setIsNew(false)
    setEditing(template)
  }

  function closeForm() {
    setEditing(null)
    setIsNew(false)
  }

  async function handleSave() {
    const trimmedName = form.name.trim()
    if (!trimmedName) {
      toast.error('Template name is required')
      return
    }

    setSaving(true)

    const channels = supportChannelsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const payload = {
      name: trimmedName,
      description: form.description?.trim() || null,
      response_critical: form.response_critical?.trim() || null,
      response_high: form.response_high?.trim() || null,
      response_medium: form.response_medium?.trim() || null,
      response_low: form.response_low?.trim() || null,
      resolution_critical: form.resolution_critical?.trim() || null,
      resolution_high: form.resolution_high?.trim() || null,
      resolution_medium: form.resolution_medium?.trim() || null,
      resolution_low: form.resolution_low?.trim() || null,
      uptime_guarantee: form.uptime_guarantee?.trim() || null,
      support_hours: form.support_hours?.trim() || null,
      support_channels: channels.length > 0 ? channels : null,
      is_active: form.is_active,
    }

    if (isNew) {
      const { error } = await supabase.from('sla_templates').insert(payload)

      if (error) {
        toast.error('Failed to create template')
        setSaving(false)
        return
      }

      toast.success('Template created successfully')
    } else {
      const { error } = await supabase
        .from('sla_templates')
        .update(payload)
        .eq('id', editing!.id)

      if (error) {
        toast.error('Failed to update template')
        setSaving(false)
        return
      }

      toast.success('Template updated successfully')
    }

    setSaving(false)
    closeForm()
    fetchTemplates()
  }

  const handleDelete = useCallback(
    async (id: string, name: string) => {
      if (!confirm(`Are you sure you want to delete "${name}"?`)) return

      const { error } = await supabase
        .from('sla_templates')
        .delete()
        .eq('id', id)

      if (error) {
        toast.error('Failed to delete template')
        return
      }

      toast.success('Template deleted successfully')
      fetchTemplates()
    },
    [fetchTemplates]
  )

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div>
      <div className="flex justify-end mb-6">
        <Button onClick={openAdd}>
          <Add size={16} />
          Add Template
        </Button>
      </div>

      {editing && (
        <div className="rounded-lg border p-6 mb-6 space-y-6">
          <h2 className="text-lg font-semibold">
            {isNew ? 'Add Template' : 'Edit Template'}
          </h2>

          <div className="grid gap-4 max-w-2xl">
            <div className="grid gap-2">
              <Label htmlFor="sla-name">Name *</Label>
              <Input
                id="sla-name"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Template name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sla-description">Description</Label>
              <Input
                id="sla-description"
                value={form.description ?? ''}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Template description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Response Times</h3>
                <div className="grid gap-2">
                  <Label htmlFor="sla-resp-critical">Critical</Label>
                  <Input
                    id="sla-resp-critical"
                    value={form.response_critical ?? ''}
                    onChange={(e) =>
                      updateField('response_critical', e.target.value)
                    }
                    placeholder="e.g. 15 minutes"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sla-resp-high">High</Label>
                  <Input
                    id="sla-resp-high"
                    value={form.response_high ?? ''}
                    onChange={(e) =>
                      updateField('response_high', e.target.value)
                    }
                    placeholder="e.g. 1 hour"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sla-resp-medium">Medium</Label>
                  <Input
                    id="sla-resp-medium"
                    value={form.response_medium ?? ''}
                    onChange={(e) =>
                      updateField('response_medium', e.target.value)
                    }
                    placeholder="e.g. 4 hours"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sla-resp-low">Low</Label>
                  <Input
                    id="sla-resp-low"
                    value={form.response_low ?? ''}
                    onChange={(e) =>
                      updateField('response_low', e.target.value)
                    }
                    placeholder="e.g. 8 hours"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium">Resolution Times</h3>
                <div className="grid gap-2">
                  <Label htmlFor="sla-res-critical">Critical</Label>
                  <Input
                    id="sla-res-critical"
                    value={form.resolution_critical ?? ''}
                    onChange={(e) =>
                      updateField('resolution_critical', e.target.value)
                    }
                    placeholder="e.g. 4 hours"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sla-res-high">High</Label>
                  <Input
                    id="sla-res-high"
                    value={form.resolution_high ?? ''}
                    onChange={(e) =>
                      updateField('resolution_high', e.target.value)
                    }
                    placeholder="e.g. 8 hours"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sla-res-medium">Medium</Label>
                  <Input
                    id="sla-res-medium"
                    value={form.resolution_medium ?? ''}
                    onChange={(e) =>
                      updateField('resolution_medium', e.target.value)
                    }
                    placeholder="e.g. 24 hours"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sla-res-low">Low</Label>
                  <Input
                    id="sla-res-low"
                    value={form.resolution_low ?? ''}
                    onChange={(e) =>
                      updateField('resolution_low', e.target.value)
                    }
                    placeholder="e.g. 48 hours"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sla-uptime">Uptime Guarantee</Label>
              <Input
                id="sla-uptime"
                value={form.uptime_guarantee ?? ''}
                onChange={(e) =>
                  updateField('uptime_guarantee', e.target.value)
                }
                placeholder="e.g. 99.9%"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sla-support-hours">Support Hours</Label>
              <Input
                id="sla-support-hours"
                value={form.support_hours ?? ''}
                onChange={(e) =>
                  updateField('support_hours', e.target.value)
                }
                placeholder="e.g. 24/7 or 8am-6pm SAST"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sla-channels">
                Support Channels (comma-separated)
              </Label>
              <Input
                id="sla-channels"
                value={supportChannelsText}
                onChange={(e) => setSupportChannelsText(e.target.value)}
                placeholder="e.g. email, phone, chat"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="sla-active"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => updateField('is_active', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="sla-active">Active</Label>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save size={16} />
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="outline" onClick={closeForm}>
              <Close size={16} />
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[140px]">Support Hours</TableHead>
              <TableHead className="w-[100px]">Active</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : templates.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  No SLA templates found
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">
                    {template.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {template.description ?? '—'}
                  </TableCell>
                  <TableCell>{template.support_hours ?? '—'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={template.is_active ? 'default' : 'secondary'}
                    >
                      {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(template)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          handleDelete(template.id, template.name)
                        }
                      >
                        <TrashCan size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
