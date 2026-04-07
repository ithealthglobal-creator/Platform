// src/app/(admin)/settings/integrations/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { MetaIntegration } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { LogoFacebook } from '@carbon/icons-react'

export default function IntegrationsPage() {
  const router = useRouter()
  const [integration, setIntegration] = useState<MetaIntegration | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchIntegration = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('meta_integrations')
      .select('*')
      .limit(1)
      .single()
    setIntegration(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchIntegration()
  }, [fetchIntegration])

  return (
    <div>
      <div className="grid gap-4 max-w-2xl">
        {/* Meta card */}
        <div
          className="rounded-lg border bg-card p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50"
          onClick={() => router.push('/settings/integrations/meta')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <LogoFacebook size={24} className="text-white" />
            </div>
            <div>
              <div className="font-medium">Meta (Facebook) Ads</div>
              <div className="text-xs text-muted-foreground">Campaign performance tracking and ad management</div>
            </div>
          </div>
          {loading ? (
            <Badge variant="secondary">Loading...</Badge>
          ) : integration?.ad_account_id ? (
            <Badge variant="default">Connected</Badge>
          ) : (
            <Badge variant="secondary">Not Connected</Badge>
          )}
        </div>
      </div>
    </div>
  )
}
