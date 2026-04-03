'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save, Upload, Image as ImageIcon } from '@carbon/icons-react'

interface GrowthTabProps {
  serviceId: string
  description: string | null
}

export function GrowthTab({ serviceId, description }: GrowthTabProps) {
  const [longDescription, setLongDescription] = useState('')
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingHero, setUploadingHero] = useState(false)
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const fetchService = useCallback(async () => {
    const { data, error } = await supabase
      .from('services')
      .select('long_description, hero_image_url, thumbnail_url')
      .eq('id', serviceId)
      .single()

    if (error) {
      toast.error('Failed to load service data')
      return
    }

    setLongDescription(data.long_description ?? '')
    setHeroImageUrl(data.hero_image_url)
    setThumbnailUrl(data.thumbnail_url)
    setLoaded(true)
  }, [serviceId])

  useEffect(() => {
    fetchService()
  }, [fetchService])

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase
      .from('services')
      .update({ long_description: longDescription })
      .eq('id', serviceId)

    if (error) {
      toast.error('Failed to save long description')
    } else {
      toast.success('Long description saved')
    }
    setSaving(false)
  }

  async function handleImageUpload(file: File, type: 'hero' | 'thumbnail') {
    const setUploading = type === 'hero' ? setUploadingHero : setUploadingThumbnail
    setUploading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Not authenticated')
        setUploading(false)
        return
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('serviceId', serviceId)
      formData.append('type', type)

      const res = await fetch('/api/services/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      const result = await res.json()

      if (!res.ok) {
        toast.error(result.error || 'Upload failed')
        setUploading(false)
        return
      }

      if (type === 'hero') {
        setHeroImageUrl(result.url)
      } else {
        setThumbnailUrl(result.url)
      }
      toast.success(`${type === 'hero' ? 'Hero image' : 'Thumbnail'} uploaded`)
    } catch {
      toast.error('Upload failed')
    }
    setUploading(false)
  }

  if (!loaded) {
    return <p className="py-8 text-center text-muted-foreground">Loading...</p>
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Short Description (read-only) */}
      <div className="space-y-2">
        <Label>Short Description (from Description tab)</Label>
        <div className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground min-h-[60px] whitespace-pre-wrap">
          {description || 'No description set'}
        </div>
      </div>

      {/* Long Description */}
      <div className="space-y-2">
        <Label htmlFor="long-description">Long Description</Label>
        <textarea
          id="long-description"
          value={longDescription}
          onChange={(e) => setLongDescription(e.target.value)}
          rows={8}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="Enter a detailed description for the growth/marketing page..."
        />
        <Button onClick={handleSave} disabled={saving} size="sm">
          <Save size={16} className="mr-2" />
          {saving ? 'Saving...' : 'Save Long Description'}
        </Button>
      </div>

      {/* Hero Image */}
      <div className="space-y-2">
        <Label>Hero Image</Label>
        {heroImageUrl ? (
          <div className="space-y-3">
            <div className="relative rounded-md border overflow-hidden">
              <img
                src={heroImageUrl}
                alt="Hero"
                className="w-full h-48 object-cover"
              />
            </div>
            <label className="cursor-pointer inline-flex">
              <span className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
                <Upload size={16} className="mr-2" />
                {uploadingHero ? 'Uploading...' : 'Replace Hero Image'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingHero}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleImageUpload(f, 'hero')
                }}
              />
            </label>
          </div>
        ) : (
          <label className="cursor-pointer flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-muted-foreground hover:border-foreground/50 transition-colors">
            <ImageIcon size={32} className="mb-2" />
            <span className="text-sm">
              {uploadingHero ? 'Uploading...' : 'Click to upload hero image'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingHero}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleImageUpload(f, 'hero')
              }}
            />
          </label>
        )}
      </div>

      {/* Thumbnail */}
      <div className="space-y-2">
        <Label>Thumbnail</Label>
        {thumbnailUrl ? (
          <div className="space-y-3">
            <div className="relative rounded-md border overflow-hidden w-48">
              <img
                src={thumbnailUrl}
                alt="Thumbnail"
                className="w-48 h-32 object-cover"
              />
            </div>
            <label className="cursor-pointer inline-flex">
              <span className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
                <Upload size={16} className="mr-2" />
                {uploadingThumbnail ? 'Uploading...' : 'Replace Thumbnail'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingThumbnail}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleImageUpload(f, 'thumbnail')
                }}
              />
            </label>
          </div>
        ) : (
          <label className="cursor-pointer flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-muted-foreground hover:border-foreground/50 transition-colors w-48">
            <ImageIcon size={32} className="mb-2" />
            <span className="text-sm text-center">
              {uploadingThumbnail ? 'Uploading...' : 'Click to upload thumbnail'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingThumbnail}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleImageUpload(f, 'thumbnail')
              }}
            />
          </label>
        )}
      </div>
    </div>
  )
}
