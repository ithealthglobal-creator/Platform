// src/app/(admin)/growth/ads/[campaignId]/[adSetId]/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { MetaAd, MetaAdSet, MetaCampaign } from '@/lib/types'
import { getBenchmarkColor } from '@/lib/ads-benchmarks'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { ChevronRight, Compare, Add, Pause, Play, Edit, TrashCan } from '@carbon/icons-react'

function MetricBadge({ metric, value, format }: { metric: string; value: number | null; format: (v: number) => string }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground text-xs">—</span>
  const color = getBenchmarkColor(metric, value)
  if (!color) return <span className="text-xs">{format(value)}</span>
  const colorClasses: Record<string, string> = {
    green: 'bg-green-100 text-green-800',
    amber: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
  }
  return <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${colorClasses[color]}`}>{format(value)}</span>
}

export default function AdsPage() {
  const router = useRouter()
  const params = useParams()
  const campaignId = params.campaignId as string
  const adSetId = params.adSetId as string
  const [ads, setAds] = useState<MetaAd[]>([])
  const [adSet, setAdSet] = useState<MetaAdSet | null>(null)
  const [campaign, setCampaign] = useState<MetaCampaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<MetaAd | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [campaignRes, adSetRes, adsRes] = await Promise.all([
      supabase.from('meta_campaigns').select('*').eq('id', campaignId).single(),
      supabase.from('meta_ad_sets').select('*').eq('id', adSetId).single(),
      supabase.from('meta_ads').select('*').eq('ad_set_id', adSetId).order('spend', { ascending: false }),
    ])

    if (adSetRes.error) {
      toast.error('Failed to load ad set')
      setLoading(false)
      return
    }

    setCampaign(campaignRes.data)
    setAdSet(adSetRes.data)
    setAds(adsRes.data ?? [])
    setLoading(false)
  }, [campaignId, adSetId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const getAuthHeaders = async () => {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  }

  const handleStatusChange = async (ad: MetaAd, newStatus: string) => {
    setActionLoading(ad.id)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/ads/meta/ads/${ad.id}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        toast.error(error || 'Failed to update status')
        return
      }
      toast.success(`Ad ${newStatus === 'ACTIVE' ? 'resumed' : 'paused'}`)
      fetchData()
    } catch {
      toast.error('Failed to update status')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setActionLoading(deleteTarget.id)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/ads/meta/ads/${deleteTarget.id}/delete`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) {
        const { error } = await res.json()
        toast.error(error || 'Failed to delete ad')
        return
      }
      toast.success('Ad deleted')
      setDeleteTarget(null)
      fetchData()
    } catch {
      toast.error('Failed to delete ad')
    } finally {
      setActionLoading(null)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 4) {
        next.add(id)
      } else {
        toast.error('Maximum 4 ads can be compared')
      }
      return next
    })
  }

  const handleCompare = () => {
    const ids = Array.from(selectedIds).join(',')
    router.push(`/growth/ads/compare?ids=${ids}&from=${campaignId}/${adSetId}`)
  }

  return (
    <div>
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="cursor-pointer hover:text-foreground" onClick={() => router.push('/growth/ads')}>Ads</span>
          <ChevronRight size={14} />
          <span className="cursor-pointer hover:text-foreground" onClick={() => router.push(`/growth/ads/${campaignId}`)}>
            {campaign?.name || '...'}
          </span>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">{adSet?.name || '...'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleCompare}
            disabled={selectedIds.size < 2}
          >
            <Compare size={16} />
            Compare Selected ({selectedIds.size}/4)
          </Button>
          <Button onClick={() => router.push(`/growth/ads/${campaignId}/${adSetId}/create-ad`)}>
            <Add size={16} />
            Add Ad
          </Button>
        </div>
      </div>

      {/* Card grid */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : ads.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No ads found for this ad set.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ads.map((ad) => (
            <div
              key={ad.id}
              className={`rounded-lg border bg-card p-4 flex flex-col gap-3 ${
                selectedIds.has(ad.id) ? 'ring-2 ring-primary' : ''
              }`}
            >
              {/* Creative thumbnail */}
              <div className="aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center">
                {ad.creative_thumbnail_url ? (
                  <img src={ad.creative_thumbnail_url} alt={ad.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground">No preview</span>
                )}
              </div>

              {/* Ad info */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{ad.name}</div>
                  <Badge variant={ad.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-[10px]">
                    {ad.status || '—'}
                  </Badge>
                </div>
                {ad.creative_title && (
                  <div className="text-xs text-muted-foreground mt-0.5">{ad.creative_title}</div>
                )}
                {ad.creative_body && (
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ad.creative_body}</div>
                )}
              </div>

              {/* Metrics */}
              <div className="flex flex-wrap gap-1.5">
                <MetricBadge metric="hook_rate" value={ad.hook_rate} format={(v) => `Hook ${v.toFixed(0)}%`} />
                <MetricBadge metric="ctr" value={ad.ctr} format={(v) => `CTR ${v.toFixed(1)}%`} />
                <MetricBadge metric="cpa" value={ad.cpa} format={(v) => `CPA $${v.toFixed(2)}`} />
                <span className="text-xs text-muted-foreground">{ad.cpm !== null ? `CPM $${ad.cpm.toFixed(2)}` : ''}</span>
                <MetricBadge metric="emq_score" value={ad.emq_score} format={(v) => `EMQ ${v.toFixed(1)}`} />
              </div>

              {/* Stats + actions */}
              <div className="flex items-center justify-between mt-auto pt-2 border-t">
                <div className="text-xs text-muted-foreground">
                  ${ad.spend.toLocaleString()} · {ad.conversions} conv.
                </div>
                <div className="flex items-center gap-0.5">
                  {ad.status === 'ACTIVE' ? (
                    <button
                      title="Pause"
                      onClick={() => handleStatusChange(ad, 'PAUSED')}
                      disabled={actionLoading === ad.id}
                      className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      <Pause size={14} />
                    </button>
                  ) : (
                    <button
                      title="Resume"
                      onClick={() => handleStatusChange(ad, 'ACTIVE')}
                      disabled={actionLoading === ad.id}
                      className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      <Play size={14} />
                    </button>
                  )}
                  <button
                    title="Edit"
                    onClick={() => router.push(`/growth/ads/${campaignId}/${adSetId}/create-ad?edit=${ad.id}`)}
                    className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    title="Delete"
                    onClick={() => setDeleteTarget(ad)}
                    disabled={actionLoading === ad.id}
                    className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-red-500 disabled:opacity-50"
                  >
                    <TrashCan size={14} />
                  </button>
                  <label className="flex items-center gap-1 text-xs cursor-pointer ml-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(ad.id)}
                      onChange={() => toggleSelect(ad.id)}
                      className="accent-primary"
                    />
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>
              This will permanently remove it from Meta and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={!!actionLoading}>
              {actionLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
