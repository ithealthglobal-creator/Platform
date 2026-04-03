'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Breadcrumb } from '@/components/breadcrumb'
import { Phase, Service, AssessmentScope } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowLeft, Save } from '@carbon/icons-react'

const SCOPE_OPTIONS: { value: AssessmentScope; label: string }[] = [
  { value: 'journey', label: 'Entire Journey' },
  { value: 'phase', label: 'Phase' },
  { value: 'service', label: 'Service' },
]

export default function NewAssessmentPage() {
  const router = useRouter()
  const [phases, setPhases] = useState<Phase[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [formScope, setFormScope] = useState<AssessmentScope>('journey')
  const [formPhaseId, setFormPhaseId] = useState<string>('')
  const [formServiceId, setFormServiceId] = useState<string>('')
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPassThreshold, setFormPassThreshold] = useState('80')
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchOptions = useCallback(async () => {
    const [pRes, sRes] = await Promise.all([
      supabase.from('phases').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('services').select('*, phase:phases(name)').eq('is_active', true).order('name'),
    ])

    if (pRes.data) setPhases(pRes.data as Phase[])
    if (sRes.data) setServices(sRes.data as Service[])
  }, [])

  useEffect(() => {
    fetchOptions()
  }, [fetchOptions])

  async function handleSave() {
    if (!formName.trim()) {
      toast.error('Assessment name is required')
      return
    }
    if (formScope === 'phase' && !formPhaseId) {
      toast.error('Please select a phase')
      return
    }
    if (formScope === 'service' && !formServiceId) {
      toast.error('Please select a service')
      return
    }

    setSaving(true)

    const { error } = await supabase.from('assessments').insert({
      name: formName.trim(),
      description: formDescription.trim() || null,
      pass_threshold: Number(formPassThreshold) || 80,
      is_active: formActive,
      scope: formScope,
      type: 'pre',
      phase_id: formScope === 'phase' ? formPhaseId : null,
      service_id: formScope === 'service' ? formServiceId : null,
      section_id: null,
    })

    if (error) {
      toast.error('Failed to create assessment')
      setSaving(false)
      return
    }

    toast.success('Assessment created')
    router.push('/academy/assessments')
  }

  return (
    <div>
      <Breadcrumb />
      <div className="mb-6">
        <button
          onClick={() => router.push('/academy/assessments')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} /> Back to Assessments
        </button>
      </div>
      <h1 className="text-2xl font-bold mb-6">New Assessment</h1>

      <div className="grid gap-4 max-w-lg">
        <div className="grid gap-2">
          <Label>Scope</Label>
          <Select value={formScope} onValueChange={(v) => setFormScope(v as AssessmentScope)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCOPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formScope === 'phase' && (
          <div className="grid gap-2">
            <Label>Phase</Label>
            <Select value={formPhaseId} onValueChange={(v) => setFormPhaseId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select phase" />
              </SelectTrigger>
              <SelectContent>
                {phases.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {formScope === 'service' && (
          <div className="grid gap-2">
            <Label>Service</Label>
            <Select value={formServiceId} onValueChange={(v) => setFormServiceId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}{s.phase ? ` (${s.phase.name})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="assessment-name">Name</Label>
          <Input
            id="assessment-name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Assessment name"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="assessment-description">Description</Label>
          <textarea
            id="assessment-description"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Assessment description"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="assessment-threshold">Pass Threshold (%)</Label>
          <Input
            id="assessment-threshold"
            type="number"
            value={formPassThreshold}
            onChange={(e) => setFormPassThreshold(e.target.value)}
            min={0}
            max={100}
            className="w-28"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="assessment-active"
            checked={formActive}
            onChange={(e) => setFormActive(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <Label htmlFor="assessment-active">Active</Label>
        </div>

        <div>
          <Button onClick={handleSave} disabled={saving}>
            <Save size={16} className="mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}
