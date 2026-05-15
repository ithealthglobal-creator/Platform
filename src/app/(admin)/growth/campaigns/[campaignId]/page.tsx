// src/app/(admin)/growth/campaigns/[campaignId]/page.tsx
'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { MetaAd, MetaCampaign } from '@/lib/types'
import { getBenchmarkColor } from '@/lib/ads-benchmarks'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ChevronRight, Trophy } from '@carbon/icons-react'

type AdRow = MetaAd & {
  meta_ad_sets: { id: string; name: string; campaign_id: string } | null
}

function MetricBadge({ metric, value, format }: { metric: string; value: number | null; format: (v: number) => string }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>
  const color = getBenchmarkColor(metric, value)
  if (!color) return <span>{format(value)}</span>
  const colorClasses: Record<string, string> = {
    green: 'bg-green-100 text-green-800',
    amber: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
  }
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colorClasses[color]}`}>{format(value)}</span>
}

const formatPeriod = (start: string | null, stop: string | null): string => {
  if (!start) return 'Ongoing'
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (!stop) return `${fmt(start)} — Ongoing`
  return `${fmt(start)} — ${fmt(stop)}`
}

export default function CampaignAdsPerformancePage() {
  const router = useRouter()
  const params = useParams()
  const campaignId = params.campaignId as string

  const [campaign, setCampaign] = useState<MetaCampaign | null>(null)
  const [ads, setAds] = useState<AdRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)

    const [campaignRes, adsRes] = await Promise.all([
      supabase.from('meta_campaigns').select('*').eq('id', campaignId).single(),
      supabase
        .from('meta_ads')
        .select('*, meta_ad_sets!inner(id, name, campaign_id)')
        .eq('meta_ad_sets.campaign_id', campaignId),
    ])

    if (campaignRes.error) {
      toast.error('Failed to load campaign')
      setLoading(false)
      return
    }

    setCampaign(campaignRes.data)
    setAds((adsRes.data as AdRow[]) ?? [])
    setLoading(false)
  }, [campaignId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const enriched = useMemo(() => {
    return ads.map((ad) => {
      const cpc = ad.clicks > 0 ? ad.spend / ad.clicks : null
      const performancePct = ad.impressions > 0 ? (ad.conversions / ad.impressions) * 100 : null
      return { ...ad, cpc, performancePct }
    })
  }, [ads])

  const topAdId = useMemo(() => {
    const eligible = enriched.filter(
      (a) => a.impressions >= 100 && a.performancePct !== null,
    )
    if (eligible.length === 0) return null
    return eligible.reduce((best, cur) =>
      (cur.performancePct ?? 0) > (best.performancePct ?? 0) ? cur : best,
    ).id
  }, [enriched])

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; ads: typeof enriched }>()
    for (const ad of enriched) {
      const adSetId = ad.meta_ad_sets?.id ?? 'unknown'
      const adSetName = ad.meta_ad_sets?.name ?? 'Unknown Ad Set'
      if (!map.has(adSetId)) map.set(adSetId, { name: adSetName, ads: [] })
      map.get(adSetId)!.ads.push(ad)
    }
    for (const group of map.values()) {
      group.ads.sort((a, b) => (b.performancePct ?? 0) - (a.performancePct ?? 0))
    }
    return Array.from(map.entries()).map(([id, g]) => ({ id, ...g }))
  }, [enriched])

  const period = campaign ? formatPeriod(campaign.start_time, campaign.stop_time) : '—'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="cursor-pointer hover:text-foreground" onClick={() => router.push('/growth/campaigns')}>
            Campaigns
          </span>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">{campaign?.name || '...'}</span>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad</TableHead>
              <TableHead className="text-right">CPC</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Costs</TableHead>
              <TableHead className="text-right">Conversions</TableHead>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Performance %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : grouped.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No ads found for this campaign.
                </TableCell>
              </TableRow>
            ) : (
              grouped.flatMap((group) => [
                <TableRow key={`group-${group.id}`} className="bg-muted/30 hover:bg-muted/30">
                  <TableCell
                    colSpan={8}
                    className="text-xs font-medium uppercase tracking-wide text-muted-foreground py-2"
                  >
                    {group.name}
                  </TableCell>
                </TableRow>,
                ...group.ads.map((ad) => {
                  const isTop = ad.id === topAdId
                  return (
                    <TableRow
                      key={ad.id}
                      className={`cursor-pointer hover:bg-muted/50 ${
                        isTop ? 'bg-green-50 border-l-2 border-l-green-500' : ''
                      }`}
                      onClick={() => router.push(`/growth/campaigns/${campaignId}/${ad.id}`)}
                    >
                      <TableCell className="font-medium text-primary">
                        <div className="flex items-center gap-2">
                          {isTop && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-800">
                              <Trophy size={10} />
                              TOP
                            </span>
                          )}
                          <span>{ad.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {ad.cpc !== null ? (
                          <MetricBadge metric="cpc" value={ad.cpc} format={(v) => `$${v.toFixed(2)}`} />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <MetricBadge metric="ctr" value={ad.ctr} format={(v) => `${v.toFixed(1)}%`} />
                      </TableCell>
                      <TableCell className="text-right">{ad.impressions.toLocaleString()}</TableCell>
                      <TableCell className="text-right">${ad.spend.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{ad.conversions.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{period}</TableCell>
                      <TableCell className="text-right">
                        {ad.performancePct !== null ? (
                          <span className="font-medium">{ad.performancePct.toFixed(2)}%</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                }),
              ])
            )}
          </TableBody>
        </Table>
      </div>

      {campaign && (
        <div className="mt-3 text-xs text-muted-foreground">
          <Badge variant="secondary" className="mr-2">{campaign.status || '—'}</Badge>
          {campaign.objective || 'No objective set'} · Total spend ${campaign.spend.toLocaleString()} · {campaign.conversions.toLocaleString()} conversions
        </div>
      )}
    </div>
  )
}
