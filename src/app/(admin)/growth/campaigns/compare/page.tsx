// src/app/(admin)/growth/campaigns/compare/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { MetaAd } from '@/lib/types'
import { getBenchmarkColor } from '@/lib/ads-benchmarks'
import { toast } from 'sonner'
import { ChevronRight } from '@carbon/icons-react'

function MetricRow({ label, metric, ads, format }: {
  label: string
  metric: string
  ads: MetaAd[]
  format: (v: number) => string
}) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `120px repeat(${ads.length}, 1fr)` }}>
      <div className="text-xs text-muted-foreground py-1">{label}</div>
      {ads.map((ad) => {
        const value = (ad as unknown as Record<string, unknown>)[metric] as number | null
        if (value === null || value === undefined) {
          return <div key={ad.id} className="text-xs text-muted-foreground py-1">—</div>
        }
        const color = getBenchmarkColor(metric, value)
        const colorClasses: Record<string, string> = {
          green: 'bg-green-100 text-green-800',
          amber: 'bg-yellow-100 text-yellow-800',
          red: 'bg-red-100 text-red-800',
        }
        return (
          <div key={ad.id} className="py-1">
            {color ? (
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colorClasses[color]}`}>
                {format(value)}
              </span>
            ) : (
              <span className="text-xs">{format(value)}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function ComparePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ids = searchParams.get('ids')?.split(',') || []
  const from = searchParams.get('from') || ''
  const [ads, setAds] = useState<MetaAd[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAds = useCallback(async () => {
    if (ids.length < 2) {
      toast.error('Select at least 2 ads to compare')
      return
    }
    setLoading(true)

    // Fetch live data from Meta API via Route Handler
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    const res = await fetch(`/api/admin/ads/meta/ads/compare?ids=${ids.join(',')}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      toast.error('Failed to load live ad data')
      setLoading(false)
      return
    }

    const { ads: liveAds } = await res.json()
    // Use synced data as base, then overlay live metrics from Meta API
    const { data: syncedAds } = await supabase
      .from('meta_ads')
      .select('*')
      .in('id', ids)

    if (syncedAds && liveAds) {
      // Merge live insights over synced base data
      const merged = syncedAds.map((synced) => {
        const live = liveAds.find((l: Record<string, unknown>) => l.internalId === synced.id)
        if (!live?.insights?.data?.[0]) return synced
        const insights = live.insights.data[0] as Record<string, unknown>
        return {
          ...synced,
          ctr: insights.ctr ? parseFloat(insights.ctr as string) : synced.ctr,
          cpm: insights.cpm ? parseFloat(insights.cpm as string) : synced.cpm,
          spend: insights.spend ? parseFloat(insights.spend as string) : synced.spend,
          impressions: insights.impressions ? parseInt(insights.impressions as string, 10) : synced.impressions,
          clicks: insights.clicks ? parseInt(insights.clicks as string, 10) : synced.clicks,
        }
      })
      setAds(merged)
    } else {
      setAds(syncedAds ?? [])
    }
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAds()
  }, [fetchAds])

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <span className="cursor-pointer hover:text-foreground" onClick={() => router.push('/growth/campaigns')}>Campaigns</span>
        <ChevronRight size={14} />
        <span className="text-foreground font-medium">Compare ({ads.length} ads)</span>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading comparison...</div>
      ) : (
        <>
          {/* Ad creatives row */}
          <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: `120px repeat(${ads.length}, 1fr)` }}>
            <div /> {/* spacer */}
            {ads.map((ad) => (
              <div key={ad.id} className="rounded-lg border bg-card overflow-hidden">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  {ad.creative_thumbnail_url ? (
                    <img src={ad.creative_thumbnail_url} alt={ad.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-muted-foreground">No preview</span>
                  )}
                </div>
                <div className="p-3">
                  <div className="font-medium text-sm">{ad.name}</div>
                  {ad.creative_title && <div className="text-xs text-muted-foreground mt-0.5">{ad.creative_title}</div>}
                  {ad.creative_body && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ad.creative_body}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Metrics comparison */}
          <div className="rounded-lg border bg-card p-4 space-y-2">
            <MetricRow label="Hook Rate" metric="hook_rate" ads={ads} format={(v) => `${v.toFixed(1)}%`} />
            <MetricRow label="CTR (Link)" metric="ctr" ads={ads} format={(v) => `${v.toFixed(2)}%`} />
            <MetricRow label="CPA" metric="cpa" ads={ads} format={(v) => `$${v.toFixed(2)}`} />
            <MetricRow label="CPM" metric="cpm" ads={ads} format={(v) => `$${v.toFixed(2)}`} />
            <MetricRow label="EMQ Score" metric="emq_score" ads={ads} format={(v) => v.toFixed(1)} />
            <div className="border-t pt-2 mt-2" />
            <MetricRow label="Spend" metric="spend" ads={ads} format={(v) => `$${v.toLocaleString()}`} />
            <MetricRow label="Impressions" metric="impressions" ads={ads} format={(v) => v.toLocaleString()} />
            <MetricRow label="Clicks" metric="clicks" ads={ads} format={(v) => v.toLocaleString()} />
            <MetricRow label="Conversions" metric="conversions" ads={ads} format={(v) => v.toLocaleString()} />
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" /> Above benchmark</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1" /> Borderline</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" /> Below benchmark</span>
          </div>
        </>
      )}
    </div>
  )
}
