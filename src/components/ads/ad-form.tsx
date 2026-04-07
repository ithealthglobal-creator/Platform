// src/components/ads/ad-form.tsx
'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight } from '@carbon/icons-react'
import ImageUpload from './image-upload'
import AdPreview from './ad-preview'

const CTA_OPTIONS = [
  { value: 'SHOP_NOW', label: 'Shop Now' },
  { value: 'LEARN_MORE', label: 'Learn More' },
  { value: 'SIGN_UP', label: 'Sign Up' },
  { value: 'GET_OFFER', label: 'Get Offer' },
  { value: 'BOOK_TRAVEL', label: 'Book Travel' },
  { value: 'CONTACT_US', label: 'Contact Us' },
  { value: 'DOWNLOAD', label: 'Download' },
  { value: 'GET_QUOTE', label: 'Get Quote' },
]

export interface AdFormData {
  name: string
  image_hash: string
  image_url: string
  primary_text: string
  headline: string
  link_url: string
  call_to_action: string
  status: string
  description: string
  display_link: string
  url_tags: string
}

interface AdFormProps {
  initialData?: Partial<AdFormData>
  onSubmit: (data: AdFormData) => void
  onBack?: () => void
  onCancel?: () => void
  submitLabel?: string
}

export default function AdForm({ initialData, onSubmit, onBack, onCancel, submitLabel = 'Create' }: AdFormProps) {
  const [data, setData] = useState<AdFormData>({
    name: initialData?.name || '',
    image_hash: initialData?.image_hash || '',
    image_url: initialData?.image_url || '',
    primary_text: initialData?.primary_text || '',
    headline: initialData?.headline || '',
    link_url: initialData?.link_url || '',
    call_to_action: initialData?.call_to_action || 'LEARN_MORE',
    status: initialData?.status || 'PAUSED',
    description: initialData?.description || '',
    display_link: initialData?.display_link || '',
    url_tags: initialData?.url_tags || '',
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!data.name.trim()) newErrors.name = 'Ad name is required'
    if (!data.image_hash) newErrors.image = 'Image is required'
    if (!data.primary_text.trim()) newErrors.primary_text = 'Primary text is required'
    if (!data.headline.trim()) newErrors.headline = 'Headline is required'
    if (!data.link_url.trim()) newErrors.link_url = 'Destination URL is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validate()) onSubmit(data)
  }

  const update = (field: keyof AdFormData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  return (
    <div className="flex gap-8">
      {/* Form fields */}
      <div className="flex-1 space-y-6">
        {/* Ad Name */}
        <div className="space-y-2">
          <Label htmlFor="ad-name">Ad Name *</Label>
          <Input
            id="ad-name"
            value={data.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="e.g., Summer Sale - Image A"
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>

        {/* Image Upload */}
        <div className="space-y-2">
          <Label>Image *</Label>
          <ImageUpload
            imageUrl={data.image_url || null}
            imageHash={data.image_hash || null}
            onUploaded={(hash, url) => {
              setData(prev => ({ ...prev, image_hash: hash, image_url: url }))
              if (errors.image) setErrors(prev => { const n = { ...prev }; delete n.image; return n })
            }}
            onRemoved={() => setData(prev => ({ ...prev, image_hash: '', image_url: '' }))}
          />
          {errors.image && <p className="text-xs text-red-500">{errors.image}</p>}
        </div>

        {/* Primary Text */}
        <div className="space-y-2">
          <Label htmlFor="primary-text">Primary Text *</Label>
          <textarea
            id="primary-text"
            value={data.primary_text}
            onChange={(e) => update('primary_text', e.target.value)}
            placeholder="The main body text of your ad..."
            rows={3}
            className={`w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring ${errors.primary_text ? 'border-red-500' : 'border-input'}`}
          />
          {errors.primary_text && <p className="text-xs text-red-500">{errors.primary_text}</p>}
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <Label htmlFor="headline">Headline *</Label>
          <Input
            id="headline"
            value={data.headline}
            onChange={(e) => update('headline', e.target.value)}
            placeholder="e.g., Save 50% This Weekend"
            className={errors.headline ? 'border-red-500' : ''}
          />
          {errors.headline && <p className="text-xs text-red-500">{errors.headline}</p>}
        </div>

        {/* Destination URL */}
        <div className="space-y-2">
          <Label htmlFor="link-url">Destination URL *</Label>
          <Input
            id="link-url"
            type="url"
            value={data.link_url}
            onChange={(e) => update('link_url', e.target.value)}
            placeholder="https://example.com/landing-page"
            className={errors.link_url ? 'border-red-500' : ''}
          />
          {errors.link_url && <p className="text-xs text-red-500">{errors.link_url}</p>}
        </div>

        {/* Call to Action */}
        <div className="space-y-2">
          <Label>Call to Action</Label>
          <div className="flex flex-wrap gap-2">
            {CTA_OPTIONS.slice(0, 4).map((cta) => (
              <button
                key={cta.value}
                type="button"
                onClick={() => update('call_to_action', cta.value)}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  data.call_to_action === cta.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-white hover:bg-muted border-border'
                }`}
              >
                {cta.label}
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
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={data.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Link description text"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display-link">Display Link</Label>
              <Input
                id="display-link"
                value={data.display_link}
                onChange={(e) => update('display_link', e.target.value)}
                placeholder="example.com/sale"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url-tags">URL Parameters (UTM)</Label>
              <Input
                id="url-tags"
                value={data.url_tags}
                onChange={(e) => update('url_tags', e.target.value)}
                placeholder="utm_source=facebook&utm_medium=cpc"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <div className="flex gap-2">
            {onCancel && <Button variant="outline" onClick={onCancel}>Cancel</Button>}
            {onBack && <Button variant="outline" onClick={onBack}>&larr; Back</Button>}
          </div>
          <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
            {submitLabel}
          </Button>
        </div>
      </div>

      {/* Ad Preview - right side */}
      <div className="hidden lg:block w-[420px] flex-shrink-0">
        <div className="sticky top-8">
          <div className="text-sm font-medium text-muted-foreground mb-3">Ad Preview</div>
          <AdPreview
            primaryText={data.primary_text}
            headline={data.headline}
            imageUrl={data.image_url || null}
            linkUrl={data.link_url}
            callToAction={data.call_to_action}
          />
        </div>
      </div>
    </div>
  )
}
