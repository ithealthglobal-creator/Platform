'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/auth-context'
import { CompanyBranding } from '@/lib/types'

const DEFAULTS = {
  primaryColour: '#1175E4',
  secondaryColour: '#FF246B',
  fontHeading: 'Poppins',
  fontBody: 'Poppins',
}

interface BrandingContextType {
  branding: CompanyBranding | null
  loading: boolean
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined)

function buildGoogleFontsUrl(fonts: string[]): string {
  const unique = Array.from(new Set(fonts.filter(Boolean)))
  if (unique.length === 0) return ''
  const families = unique.map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700`).join('&')
  return `https://fonts.googleapis.com/css2?${families}&display=swap`
}

function injectFontLink(href: string) {
  if (!href) return
  const existing = document.querySelector(`link[data-branding-font]`)
  if (existing) existing.remove()
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.setAttribute('data-branding-font', 'true')
  document.head.appendChild(link)
}

function applyCssVars(branding: CompanyBranding | null) {
  const root = document.documentElement
  const primary = branding?.primary_colour ?? DEFAULTS.primaryColour
  const secondary = branding?.secondary_colour ?? DEFAULTS.secondaryColour
  const accent = branding?.accent_colour ?? null

  root.style.setProperty('--brand-primary', primary)
  root.style.setProperty('--brand-secondary', secondary)
  if (accent) {
    root.style.setProperty('--brand-accent', accent)
  }
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { profile, loading: authLoading } = useAuth()
  const [branding, setBranding] = useState<CompanyBranding | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    if (!profile?.company_id) {
      // No company — apply defaults and stop loading
      applyCssVars(null)
      const url = buildGoogleFontsUrl([DEFAULTS.fontHeading, DEFAULTS.fontBody])
      injectFontLink(url)
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetchBranding() {
      const { data, error } = await supabase
        .from('company_branding')
        .select('*')
        .eq('company_id', profile!.company_id)
        .maybeSingle()

      if (cancelled) return

      if (error || !data) {
        applyCssVars(null)
        const url = buildGoogleFontsUrl([DEFAULTS.fontHeading, DEFAULTS.fontBody])
        injectFontLink(url)
        setBranding(null)
      } else {
        applyCssVars(data)
        const heading = data.font_heading ?? DEFAULTS.fontHeading
        const body = data.font_body ?? DEFAULTS.fontBody
        const url = buildGoogleFontsUrl([heading, body])
        injectFontLink(url)
        setBranding(data)
      }

      setLoading(false)
    }

    fetchBranding()

    return () => {
      cancelled = true
    }
  }, [profile?.company_id, authLoading])

  return (
    <BrandingContext.Provider value={{ branding, loading }}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding() {
  const context = useContext(BrandingContext)
  if (!context) throw new Error('useBranding must be used within BrandingProvider')
  return context
}
