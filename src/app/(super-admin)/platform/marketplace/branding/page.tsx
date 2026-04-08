'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { CompanyBranding } from '@/lib/types'
import { LogoUpload } from '@/components/logo-upload'
import { ColourPicker } from '@/components/colour-picker'
import { FontSelector } from '@/components/font-selector'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Save } from '@carbon/icons-react'

// Servolu platform company ID
const SERVOLU_COMPANY_ID = '00000000-0000-0000-0000-000000000000'

const DEFAULT_BRANDING: Omit<CompanyBranding, 'id' | 'company_id' | 'created_at' | 'updated_at'> = {
  logo_url: null,
  logo_light_url: null,
  icon_url: null,
  primary_colour: '#1175E4',
  secondary_colour: '#0D1B2A',
  accent_colour: null,
  font_heading: 'Poppins',
  font_body: 'Poppins',
}

export default function MarketplaceBrandingPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoLightUrl, setLogoLightUrl] = useState<string | null>(null)
  const [iconUrl, setIconUrl] = useState<string | null>(null)
  const [primaryColour, setPrimaryColour] = useState(DEFAULT_BRANDING.primary_colour)
  const [secondaryColour, setSecondaryColour] = useState(DEFAULT_BRANDING.secondary_colour)
  const [accentColour, setAccentColour] = useState(DEFAULT_BRANDING.accent_colour ?? '')
  const [fontHeading, setFontHeading] = useState(DEFAULT_BRANDING.font_heading)
  const [fontBody, setFontBody] = useState(DEFAULT_BRANDING.font_body)

  const fetchBranding = useCallback(async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('company_branding')
      .select('*')
      .eq('company_id', SERVOLU_COMPANY_ID)
      .maybeSingle()

    if (error) {
      toast.error('Failed to load branding settings')
      setLoading(false)
      return
    }

    if (data) {
      setLogoUrl(data.logo_url)
      setLogoLightUrl(data.logo_light_url)
      setIconUrl(data.icon_url)
      setPrimaryColour(data.primary_colour ?? DEFAULT_BRANDING.primary_colour)
      setSecondaryColour(data.secondary_colour ?? DEFAULT_BRANDING.secondary_colour)
      setAccentColour(data.accent_colour ?? '')
      setFontHeading(data.font_heading ?? DEFAULT_BRANDING.font_heading)
      setFontBody(data.font_body ?? DEFAULT_BRANDING.font_body)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchBranding()
  }, [fetchBranding])

  async function handleSave() {
    setSaving(true)

    const payload = {
      company_id: SERVOLU_COMPANY_ID,
      logo_url: logoUrl,
      logo_light_url: logoLightUrl,
      icon_url: iconUrl,
      primary_colour: primaryColour,
      secondary_colour: secondaryColour,
      accent_colour: accentColour || null,
      font_heading: fontHeading,
      font_body: fontBody,
    }

    const { error } = await supabase
      .from('company_branding')
      .upsert(payload, { onConflict: 'company_id' })

    if (error) {
      toast.error('Failed to save branding settings')
      setSaving(false)
      return
    }

    toast.success('Marketplace branding saved')
    setSaving(false)
    fetchBranding()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="bg-white rounded-lg border p-6">
          <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <div className="h-5 w-20 bg-gray-200 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-poppins text-2xl font-semibold text-gray-900">Marketplace Branding</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure the Servolu platform branding used across the marketplace.
        </p>
      </div>

      {/* Logos */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="font-poppins text-base font-semibold text-gray-900 mb-1">Logos</h2>
        <p className="font-poppins text-sm text-gray-500 mb-6">
          Upload platform logos. SVG, PNG or JPG — max 2 MB each.
        </p>
        <div className="grid grid-cols-3 gap-6">
          <LogoUpload
            label="Main Logo"
            value={logoUrl}
            companyId={SERVOLU_COMPANY_ID}
            storagePath="logo.svg"
            onUploaded={setLogoUrl}
          />
          <LogoUpload
            label="Light Logo (for dark backgrounds)"
            value={logoLightUrl}
            companyId={SERVOLU_COMPANY_ID}
            storagePath="logo-light.svg"
            onUploaded={setLogoLightUrl}
          />
          <LogoUpload
            label="Icon / Favicon"
            value={iconUrl}
            companyId={SERVOLU_COMPANY_ID}
            storagePath="icon.svg"
            onUploaded={setIconUrl}
          />
        </div>
      </div>

      {/* Colours */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="font-poppins text-base font-semibold text-gray-900 mb-6">Colours</h2>
        <div className="grid grid-cols-3 gap-6">
          <ColourPicker label="Primary Colour" value={primaryColour} onChange={setPrimaryColour} />
          <ColourPicker label="Secondary Colour" value={secondaryColour} onChange={setSecondaryColour} />
          <ColourPicker label="Accent Colour" value={accentColour} onChange={setAccentColour} optional />
        </div>
      </div>

      {/* Typography */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="font-poppins text-base font-semibold text-gray-900 mb-6">Typography</h2>
        <div className="grid grid-cols-2 gap-6">
          <FontSelector label="Heading Font" value={fontHeading} onChange={setFontHeading} />
          <FontSelector label="Body Font" value={fontBody} onChange={setFontBody} />
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save size={16} />
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
