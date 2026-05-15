// src/app/(admin)/growth/campaigns/[campaignId]/[id]/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { MetaAd, MetaCampaign } from '@/lib/types'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ChevronRight, Launch } from '@carbon/icons-react'
import {
  FacebookFeedPreview,
  InstagramFeedPreview,
  InstagramStoryPreview,
  FacebookRightColumnPreview,
  AudienceNetworkPreview,
} from '@/components/ads/placement-previews'

type AdWithCampaign = MetaAd & {
  meta_ad_sets: {
    id: string
    name: string
    campaign_id: string
    meta_campaigns: Pick<MetaCampaign, 'id' | 'name'> | null
  } | null
}

export default function AdCreativePreviewPage() {
  const router = useRouter()
  const params = useParams()
  const campaignId = params.campaignId as string
  const adId = params.id as string

  const [ad, setAd] = useState<AdWithCampaign | null>(null)
  const [campaignName, setCampaignName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [iframeFailed, setIframeFailed] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [adRes, campaignRes] = await Promise.all([
      supabase
        .from('meta_ads')
        .select('*, meta_ad_sets!inner(id, name, campaign_id, meta_campaigns(id, name))')
        .eq('id', adId)
        .single(),
      supabase.from('meta_campaigns').select('name').eq('id', campaignId).single(),
    ])

    if (adRes.error) {
      toast.error('Failed to load ad')
      setLoading(false)
      return
    }

    setAd(adRes.data as AdWithCampaign)
    setCampaignName(campaignRes.data?.name ?? '')
    setLoading(false)
  }, [adId, campaignId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // X-Frame-Options blocked iframes don't fire onError — detect via load-timeout fallback.
  useEffect(() => {
    if (!ad?.creative_link_url) return
    setIframeFailed(false)
    const timer = window.setTimeout(() => setIframeFailed(true), 4000)
    return () => window.clearTimeout(timer)
  }, [ad?.creative_link_url])

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>
  }

  if (!ad) {
    return <div className="text-muted-foreground">Ad not found.</div>
  }

  const landingUrl = ad.creative_link_url

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <span className="cursor-pointer hover:text-foreground" onClick={() => router.push('/growth/campaigns')}>
          Campaigns
        </span>
        <ChevronRight size={14} />
        <span
          className="cursor-pointer hover:text-foreground"
          onClick={() => router.push(`/growth/campaigns/${campaignId}`)}
        >
          {campaignName || '...'}
        </span>
        <ChevronRight size={14} />
        <span className="text-foreground font-medium">{ad.name}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{ad.name}</h1>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={ad.status === 'ACTIVE' ? 'default' : 'secondary'}>{ad.status || '—'}</Badge>
            <span>·</span>
            <span>{ad.impressions.toLocaleString()} views</span>
            <span>·</span>
            <span>{ad.conversions.toLocaleString()} conversions</span>
            <span>·</span>
            <span>${ad.spend.toLocaleString()} spent</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6">
        {/* Left: Placement previews */}
        <div className="rounded-lg border bg-white p-4">
          <div className="mb-3 text-sm font-medium text-foreground">Creative preview</div>
          <Tabs defaultValue="fb-feed">
            <TabsList className="flex flex-wrap gap-1">
              <TabsTrigger value="fb-feed">Facebook Feed</TabsTrigger>
              <TabsTrigger value="ig-feed">Instagram Feed</TabsTrigger>
              <TabsTrigger value="ig-story">Instagram Story</TabsTrigger>
              <TabsTrigger value="fb-right">FB Right Column</TabsTrigger>
              <TabsTrigger value="audience-net">Audience Network</TabsTrigger>
            </TabsList>

            <div className="mt-6 flex justify-center bg-gray-50 rounded-md p-4 min-h-[520px]">
              <TabsContent value="fb-feed" className="w-full">
                <FacebookFeedPreview ad={ad} />
              </TabsContent>
              <TabsContent value="ig-feed" className="w-full">
                <InstagramFeedPreview ad={ad} />
              </TabsContent>
              <TabsContent value="ig-story" className="w-full">
                <InstagramStoryPreview ad={ad} />
              </TabsContent>
              <TabsContent value="fb-right" className="w-full">
                <FacebookRightColumnPreview ad={ad} />
              </TabsContent>
              <TabsContent value="audience-net" className="w-full">
                <AudienceNetworkPreview ad={ad} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Right: Landing page */}
        <div className="rounded-lg border bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-sm font-medium text-foreground">Conversion page</div>
            {landingUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(landingUrl, '_blank', 'noopener,noreferrer')}
              >
                <Launch size={14} />
                Open
              </Button>
            )}
          </div>

          {!landingUrl ? (
            <div className="flex items-center justify-center h-[560px] bg-gray-50 rounded-md text-sm text-muted-foreground">
              No landing-page link configured for this ad.
            </div>
          ) : iframeFailed ? (
            <div className="flex flex-col items-center justify-center h-[560px] bg-gray-50 rounded-md text-center p-6">
              <div className="text-sm font-medium text-foreground mb-2">Preview unavailable</div>
              <div className="text-xs text-muted-foreground mb-4 break-all max-w-md">
                {landingUrl}
              </div>
              <div className="text-xs text-muted-foreground max-w-md">
                This page can&apos;t be embedded (likely blocked by its security headers). Use the
                Open button above to view it in a new tab.
              </div>
            </div>
          ) : (
            <div className="relative w-full h-[560px] rounded-md overflow-hidden border">
              <iframe
                src={landingUrl}
                title="Landing page preview"
                className="w-full h-full"
                sandbox="allow-scripts allow-same-origin allow-popups"
                onLoad={() => setIframeFailed(false)}
                onError={() => setIframeFailed(true)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
