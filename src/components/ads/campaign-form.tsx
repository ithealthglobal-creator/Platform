// src/components/ads/campaign-form.tsx
'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight } from '@carbon/icons-react'

const OBJECTIVES = [
  { value: 'OUTCOME_SALES', label: 'Conversions' },
  { value: 'OUTCOME_TRAFFIC', label: 'Traffic' },
  { value: 'OUTCOME_AWARENESS', label: 'Brand Awareness' },
  { value: 'OUTCOME_LEADS', label: 'Lead Generation' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engagement' },
  { value: 'OUTCOME_APP_PROMOTION', label: 'App Promotion' },
]

const BID_STRATEGIES = [
  { value: 'LOWEST_COST_WITHOUT_CAP', label: 'Lowest Cost' },
  { value: 'LOWEST_COST_WITH_BID_CAP', label: 'Bid Cap' },
  { value: 'COST_CAP', label: 'Cost Cap' },
]

const SPECIAL_CATEGORIES = [
  { value: 'CREDIT', label: 'Credit' },
  { value: 'EMPLOYMENT', label: 'Employment' },
  { value: 'HOUSING', label: 'Housing' },
  { value: 'SOCIAL_ISSUES_ELECTIONS_POLITICS', label: 'Social Issues / Elections / Politics' },
]

export interface CampaignFormData {
  name: string
  objective: string
  daily_budget: number | ''
  status: string
  lifetime_budget: number | ''
  bid_strategy: string
  start_time: string
  stop_time: string
  special_ad_categories: string[]
}

interface CampaignFormProps {
  initialData?: Partial<CampaignFormData>
  onSubmit: (data: CampaignFormData) => void
  onCancel?: () => void
  showNav?: boolean
  nextLabel?: string
}

export default function CampaignForm({ initialData, onSubmit, onCancel, showNav = true, nextLabel = 'Next: Ad Set' }: CampaignFormProps) {
  const [data, setData] = useState<CampaignFormData>({
    name: initialData?.name || '',
    objective: initialData?.objective || 'OUTCOME_TRAFFIC',
    daily_budget: initialData?.daily_budget || '',
    status: initialData?.status || 'PAUSED',
    lifetime_budget: initialData?.lifetime_budget || '',
    bid_strategy: initialData?.bid_strategy || '',
    start_time: initialData?.start_time || '',
    stop_time: initialData?.stop_time || '',
    special_ad_categories: initialData?.special_ad_categories || [],
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!data.name.trim()) newErrors.name = 'Campaign name is required'
    if (!data.objective) newErrors.objective = 'Objective is required'
    if (!data.daily_budget && !data.lifetime_budget) newErrors.daily_budget = 'Budget is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validate()) onSubmit(data)
  }

  const update = (field: keyof CampaignFormData, value: unknown) => {
    setData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  return (
    <div className="space-y-6">
      {/* Campaign Name */}
      <div className="space-y-2">
        <Label htmlFor="campaign-name">Campaign Name *</Label>
        <Input
          id="campaign-name"
          value={data.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="e.g., Summer Sale 2026"
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
      </div>

      {/* Objective */}
      <div className="space-y-2">
        <Label>Objective *</Label>
        <div className="flex flex-wrap gap-2">
          {OBJECTIVES.map((obj) => (
            <button
              key={obj.value}
              type="button"
              onClick={() => update('objective', obj.value)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                data.objective === obj.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-white hover:bg-muted border-border'
              }`}
            >
              {obj.label}
            </button>
          ))}
        </div>
        {errors.objective && <p className="text-xs text-red-500">{errors.objective}</p>}
      </div>

      {/* Daily Budget */}
      <div className="space-y-2">
        <Label htmlFor="daily-budget">Daily Budget (USD) *</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
          <Input
            id="daily-budget"
            type="number"
            min="1"
            step="1"
            value={data.daily_budget}
            onChange={(e) => update('daily_budget', e.target.value ? Number(e.target.value) : '')}
            placeholder="50"
            className={`pl-7 ${errors.daily_budget ? 'border-red-500' : ''}`}
          />
        </div>
        {errors.daily_budget && <p className="text-xs text-red-500">{errors.daily_budget}</p>}
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label>Initial Status</Label>
        <div className="flex gap-2">
          {['PAUSED', 'ACTIVE'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => update('status', s)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                data.status === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-white hover:bg-muted border-border'
              }`}
            >
              {s === 'ACTIVE' ? 'Active' : 'Paused'}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Settings Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {showAdvanced ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        Advanced Settings
      </button>

      {showAdvanced && (
        <div className="space-y-4 pl-4 border-l-2 border-border">
          {/* Lifetime Budget */}
          <div className="space-y-2">
            <Label htmlFor="lifetime-budget">Lifetime Budget (USD) — alternative to daily</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                id="lifetime-budget"
                type="number"
                min="1"
                value={data.lifetime_budget}
                onChange={(e) => update('lifetime_budget', e.target.value ? Number(e.target.value) : '')}
                placeholder="1000"
                className="pl-7"
              />
            </div>
          </div>

          {/* Bid Strategy */}
          <div className="space-y-2">
            <Label>Bid Strategy</Label>
            <div className="flex flex-wrap gap-2">
              {BID_STRATEGIES.map((bs) => (
                <button
                  key={bs.value}
                  type="button"
                  onClick={() => update('bid_strategy', data.bid_strategy === bs.value ? '' : bs.value)}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    data.bid_strategy === bs.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-white hover:bg-muted border-border'
                  }`}
                >
                  {bs.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Date</Label>
              <Input
                id="start-time"
                type="datetime-local"
                value={data.start_time}
                onChange={(e) => update('start_time', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stop-time">End Date</Label>
              <Input
                id="stop-time"
                type="datetime-local"
                value={data.stop_time}
                onChange={(e) => update('stop_time', e.target.value)}
              />
            </div>
          </div>

          {/* Special Ad Categories */}
          <div className="space-y-2">
            <Label>Special Ad Categories</Label>
            <div className="space-y-1.5">
              {SPECIAL_CATEGORIES.map((cat) => (
                <label key={cat.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.special_ad_categories.includes(cat.value)}
                    onChange={(e) => {
                      const updated = e.target.checked
                        ? [...data.special_ad_categories, cat.value]
                        : data.special_ad_categories.filter((c) => c !== cat.value)
                      update('special_ad_categories', updated)
                    }}
                    className="accent-primary"
                  />
                  {cat.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      {showNav && (
        <div className="flex justify-between pt-4 border-t">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
          )}
          <div className="ml-auto">
            <Button onClick={handleSubmit}>{nextLabel} &rarr;</Button>
          </div>
        </div>
      )}
    </div>
  )
}
