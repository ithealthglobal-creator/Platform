// src/components/ads/ad-set-form.tsx
'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight } from '@carbon/icons-react'
import TargetingSearch from './targeting-search'

interface TargetingOption {
  id?: string
  key?: string
  name: string
  type?: string
  country_code?: string
}

const OPTIMIZATION_GOALS = [
  { value: 'OFFSITE_CONVERSIONS', label: 'Conversions' },
  { value: 'LINK_CLICKS', label: 'Link Clicks' },
  { value: 'IMPRESSIONS', label: 'Impressions' },
  { value: 'REACH', label: 'Reach' },
  { value: 'LANDING_PAGE_VIEWS', label: 'Landing Page Views' },
]

const PLATFORMS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'audience_network', label: 'Audience Network' },
  { value: 'messenger', label: 'Messenger' },
]

export interface AdSetFormData {
  name: string
  daily_budget: number | ''
  lifetime_budget: number | ''
  locations: TargetingOption[]
  age_min: number
  age_max: number
  interests: TargetingOption[]
  genders: number[]
  publisher_platforms: string[]
  optimization_goal: string
  start_time: string
  end_time: string
  bid_amount: number | ''
}

interface AdSetFormProps {
  initialData?: Partial<AdSetFormData>
  onSubmit: (data: AdSetFormData) => void
  onBack?: () => void
  onCancel?: () => void
  showNav?: boolean
  nextLabel?: string
}

export default function AdSetForm({ initialData, onSubmit, onBack, onCancel, showNav = true, nextLabel = 'Next: Ad' }: AdSetFormProps) {
  const [data, setData] = useState<AdSetFormData>({
    name: initialData?.name || '',
    daily_budget: initialData?.daily_budget || '',
    lifetime_budget: initialData?.lifetime_budget || '',
    locations: initialData?.locations || [],
    age_min: initialData?.age_min || 18,
    age_max: initialData?.age_max || 65,
    interests: initialData?.interests || [],
    genders: initialData?.genders || [],
    publisher_platforms: initialData?.publisher_platforms || [],
    optimization_goal: initialData?.optimization_goal || '',
    start_time: initialData?.start_time || '',
    end_time: initialData?.end_time || '',
    bid_amount: initialData?.bid_amount || '',
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!data.name.trim()) newErrors.name = 'Ad set name is required'
    if (data.locations.length === 0) newErrors.locations = 'At least one location is required'
    if (!data.daily_budget && !data.lifetime_budget) newErrors.daily_budget = 'Budget is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validate()) onSubmit(data)
  }

  const update = (field: keyof AdSetFormData, value: unknown) => {
    setData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  return (
    <div className="space-y-6">
      {/* Ad Set Name */}
      <div className="space-y-2">
        <Label htmlFor="adset-name">Ad Set Name *</Label>
        <Input
          id="adset-name"
          value={data.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="e.g., AU 25-45 Tech Interest"
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
      </div>

      {/* Locations */}
      <div className="space-y-2">
        <Label>Locations *</Label>
        <TargetingSearch
          type="locations"
          selected={data.locations}
          onChange={(locations) => update('locations', locations)}
          placeholder="Search countries, regions, cities..."
        />
        {errors.locations && <p className="text-xs text-red-500">{errors.locations}</p>}
      </div>

      {/* Age Range */}
      <div className="space-y-2">
        <Label>Age Range</Label>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            min={13}
            max={65}
            value={data.age_min}
            onChange={(e) => update('age_min', Number(e.target.value))}
            className="w-20"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="number"
            min={13}
            max={65}
            value={data.age_max}
            onChange={(e) => update('age_max', Number(e.target.value))}
            className="w-20"
          />
        </div>
      </div>

      {/* Interests */}
      <div className="space-y-2">
        <Label>Interests</Label>
        <TargetingSearch
          type="interests"
          selected={data.interests}
          onChange={(interests) => update('interests', interests)}
          placeholder="Search interests..."
        />
      </div>

      {/* Daily Budget */}
      <div className="space-y-2">
        <Label htmlFor="adset-daily-budget">Daily Budget (USD) *</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
          <Input
            id="adset-daily-budget"
            type="number"
            min="1"
            value={data.daily_budget}
            onChange={(e) => update('daily_budget', e.target.value ? Number(e.target.value) : '')}
            placeholder="25"
            className={`pl-7 ${errors.daily_budget ? 'border-red-500' : ''}`}
          />
        </div>
        {errors.daily_budget && <p className="text-xs text-red-500">{errors.daily_budget}</p>}
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
          {/* Gender */}
          <div className="space-y-2">
            <Label>Gender</Label>
            <div className="flex gap-2">
              {[
                { value: [] as number[], label: 'All' },
                { value: [1], label: 'Male' },
                { value: [2], label: 'Female' },
              ].map((g) => (
                <button
                  key={g.label}
                  type="button"
                  onClick={() => update('genders', g.value)}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    JSON.stringify(data.genders) === JSON.stringify(g.value)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-white hover:bg-muted border-border'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Placements */}
          <div className="space-y-2">
            <Label>Placements</Label>
            <div className="space-y-1.5">
              {PLATFORMS.map((p) => (
                <label key={p.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.publisher_platforms.includes(p.value)}
                    onChange={(e) => {
                      const updated = e.target.checked
                        ? [...data.publisher_platforms, p.value]
                        : data.publisher_platforms.filter(v => v !== p.value)
                      update('publisher_platforms', updated)
                    }}
                    className="accent-primary"
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          {/* Optimization Goal */}
          <div className="space-y-2">
            <Label>Optimization Goal</Label>
            <select
              className="border rounded-md px-3 py-1.5 text-sm bg-white w-full"
              value={data.optimization_goal}
              onChange={(e) => update('optimization_goal', e.target.value)}
            >
              <option value="">Default</option>
              {OPTIMIZATION_GOALS.map((og) => (
                <option key={og.value} value={og.value}>{og.label}</option>
              ))}
            </select>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="datetime-local"
                value={data.start_time}
                onChange={(e) => update('start_time', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="datetime-local"
                value={data.end_time}
                onChange={(e) => update('end_time', e.target.value)}
              />
            </div>
          </div>

          {/* Lifetime Budget */}
          <div className="space-y-2">
            <Label>Lifetime Budget (USD)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                min="1"
                value={data.lifetime_budget}
                onChange={(e) => update('lifetime_budget', e.target.value ? Number(e.target.value) : '')}
                className="pl-7"
              />
            </div>
          </div>

          {/* Bid Amount */}
          <div className="space-y-2">
            <Label>Bid Amount (cents)</Label>
            <Input
              type="number"
              min="1"
              value={data.bid_amount}
              onChange={(e) => update('bid_amount', e.target.value ? Number(e.target.value) : '')}
              placeholder="e.g., 500 for $5.00"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      {showNav && (
        <div className="flex justify-between pt-4 border-t">
          <div className="flex gap-2">
            {onCancel && <Button variant="outline" onClick={onCancel}>Cancel</Button>}
            {onBack && <Button variant="outline" onClick={onBack}>&larr; Back</Button>}
          </div>
          <Button onClick={handleSubmit}>{nextLabel} &rarr;</Button>
        </div>
      )}
    </div>
  )
}
