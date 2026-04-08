'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase-client'
import type { Company, CompanyBranding } from '@/lib/types'

interface CompanyContextType {
  company: Company | null
  branding: CompanyBranding | null
  loading: boolean
}

const CompanyContext = createContext<CompanyContextType>({ company: null, branding: null, loading: true })

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { profile, loading: authLoading } = useAuth()
  const [company, setCompany] = useState<Company | null>(null)
  const [branding, setBranding] = useState<CompanyBranding | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (authLoading || !profile) return

    async function fetch() {
      const [companyRes, brandingRes] = await Promise.all([
        supabase.from('companies').select('*').eq('id', profile!.company_id).single(),
        supabase.from('company_branding').select('*').eq('company_id', profile!.company_id).maybeSingle()
      ])
      setCompany(companyRes.data)
      setBranding(brandingRes.data)
      setLoading(false)
    }
    fetch()
  }, [authLoading, profile])

  return <CompanyContext.Provider value={{ company, branding, loading }}>{children}</CompanyContext.Provider>
}

export const useCompany = () => useContext(CompanyContext)
