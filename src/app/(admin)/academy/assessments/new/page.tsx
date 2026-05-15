'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Phase, Service, AssessmentScope } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Save } from '@carbon/icons-react'

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
  const [formJourneyThreshold, setFormJourneyThreshold] = useState('80')
  const [formActive, setFormActive] = useState(true)
  const [formOnboarding, setFormOnboarding] = useState(false)
  const [formWelcomeHeading, setFormWelcomeHeading] = useState('')
  const [formWelcomeDescription, setFormWelcomeDescription] = useState('')
  const [formCompletionHeading, setFormCompletionHeading] = useState('')
  const [formCompletionDescription, setFormCompletionDescription] = useState('')
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
      journey_threshold: Number(formJourneyThreshold),
      is_active: formActive,
      scope: formScope,
      type: 'pre',
      phase_id: formScope === 'phase' ? formPhaseId : null,
      service_id: formScope === 'service' ? formServiceId : null,
      section_id: null,
      is_onboarding: formOnboarding,
      welcome_heading: formOnboarding ? formWelcomeHeading.trim() || null : null,
      welcome_description: formOnboarding ? formWelcomeDescription.trim() || null : null,
      completion_heading: formOnboarding ? formCompletionHeading.trim() || null : null,
      completion_description: formOnboarding ? formCompletionDescription.trim() || null : null,
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
            <Select value={formPhaseId} onValueChange={(v) => setFormPhaseId(v ?? '')}>
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
            <Select value={formServiceId} onValueChange={(v) => setFormServiceId(v ?? '')}>
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

        <div>
          <Label htmlFor="journeyThreshold">Journey Threshold (%)</Label>
          <Input
            id="journeyThreshold"
            type="number"
            min={0}
            max={100}
            value={formJourneyThreshold}
            onChange={(e) => setFormJourneyThreshold(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Services scoring below this % appear in the customer journey
          </p>
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

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="onboarding"
            checked={formOnboarding}
            onChange={(e) => setFormOnboarding(e.target.checked)}
            className="rounded"
          />
          <Label htmlFor="onboarding">Use as Onboarding Assessment</Label>
        </div>

        {formOnboarding && (
          <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-medium text-blue-700">Onboarding Screen Text</p>
            <div>
              <Label>Welcome Heading</Label>
              <Input value={formWelcomeHeading} onChange={e => setFormWelcomeHeading(e.target.value)} placeholder="e.g., Discover Your IT Maturity" />
            </div>
            <div>
              <Label>Welcome Description</Label>
              <Input value={formWelcomeDescription} onChange={e => setFormWelcomeDescription(e.target.value)} placeholder="e.g., Answer a few questions..." />
            </div>
            <div>
              <Label>Completion Heading</Label>
              <Input value={formCompletionHeading} onChange={e => setFormCompletionHeading(e.target.value)} placeholder="e.g., Your Assessment is Complete!" />
            </div>
            <div>
              <Label>Completion Description</Label>
              <Input value={formCompletionDescription} onChange={e => setFormCompletionDescription(e.target.value)} placeholder="e.g., Enter your details to see your score" />
            </div>
          </div>
        )}

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
