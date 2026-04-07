// src/app/(admin)/growth/ads/[campaignId]/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { MetaAdSet, MetaCampaign } from '@/lib/types'
import { getBenchmarkColor } from '@/lib/ads-benchmarks'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { ChevronRight, Add, Pause, Play, Edit, TrashCan } from '@carbon/icons-react'

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

export default function AdSetsPage() {
  const router = useRouter()
  const params = useParams()
  const campaignId = params.campaignId as string
  const [adSets, setAdSets] = useState<MetaAdSet[]>([])
  const [campaign, setCampaign] = useState<MetaCampaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<MetaAdSet | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)

    const [campaignRes, adSetsRes] = await Promise.all([
      supabase.from('meta_campaigns').select('*').eq('id', campaignId).single(),
      supabase.from('meta_ad_sets').select('*').eq('campaign_id', campaignId).order('spend', { ascending: false }),
    ])

    if (campaignRes.error) {
      toast.error('Failed to load campaign')
      setLoading(false)
      return
    }

    setCampaign(campaignRes.data)
    setAdSets(adSetsRes.data ?? [])
    setLoading(false)
  }, [campaignId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const getAuthHeaders = async () => {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  }

  const handleStatusChange = async (adSet: MetaAdSet, newStatus: string) => {
    setActionLoading(adSet.id)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/ads/meta/ad-sets/${adSet.id}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        toast.error(error || 'Failed to update status')
        return
      }
      toast.success(`Ad set ${newStatus === 'ACTIVE' ? 'resumed' : 'paused'}`)
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
      const res = await fetch(`/api/admin/ads/meta/ad-sets/${deleteTarget.id}/delete`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) {
        const { error } = await res.json()
        toast.error(error || 'Failed to delete ad set')
        return
      }
      toast.success('Ad set deleted')
      setDeleteTarget(null)
      fetchData()
    } catch {
      toast.error('Failed to delete ad set')
    } finally {
      setActionLoading(null)
    }
  }

  const summarizeTargeting = (targeting: Record<string, unknown> | null): string => {
    if (!targeting) return '—'
    if (targeting.geo_locations) return 'Geo-targeted'
    if (targeting.custom_audiences) return 'Custom audience'
    return 'Configured'
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="cursor-pointer hover:text-foreground" onClick={() => router.push('/growth/ads')}>Ads</span>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">{campaign?.name || '...'}</span>
        </div>
        <Button onClick={() => router.push(`/growth/ads/${campaignId}/create-ad-set`)}>
          <Add size={16} />
          Add Ad Set
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad Set</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead>Targeting</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">CPA</TableHead>
              <TableHead className="text-right">CPM</TableHead>
              <TableHead className="text-right">Conversions</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : adSets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No ad sets found for this campaign.
                </TableCell>
              </TableRow>
            ) : (
              adSets.map((adSet) => (
                <TableRow
                  key={adSet.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/growth/ads/${campaignId}/${adSet.id}`)}
                >
                  <TableCell className="font-medium text-primary">{adSet.name}</TableCell>
                  <TableCell>
                    <Badge variant={adSet.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {adSet.status || '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {summarizeTargeting(adSet.targeting)}
                  </TableCell>
                  <TableCell className="text-right">${adSet.spend.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <MetricBadge metric="ctr" value={adSet.ctr} format={(v) => `${v.toFixed(1)}%`} />
                  </TableCell>
                  <TableCell className="text-right">
                    <MetricBadge metric="cpa" value={adSet.cpa} format={(v) => `$${v.toFixed(2)}`} />
                  </TableCell>
                  <TableCell className="text-right">
                    {adSet.cpm !== null ? `$${adSet.cpm.toFixed(2)}` : '—'}
                  </TableCell>
                  <TableCell className="text-right">{adSet.conversions.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {adSet.status === 'ACTIVE' ? (
                        <button
                          title="Pause"
                          onClick={() => handleStatusChange(adSet, 'PAUSED')}
                          disabled={actionLoading === adSet.id}
                          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          <Pause size={16} />
                        </button>
                      ) : (
                        <button
                          title="Resume"
                          onClick={() => handleStatusChange(adSet, 'ACTIVE')}
                          disabled={actionLoading === adSet.id}
                          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          <Play size={16} />
                        </button>
                      )}
                      <button
                        title="Edit"
                        onClick={() => router.push(`/growth/ads/${campaignId}/create-ad-set?edit=${adSet.id}`)}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        title="Delete"
                        onClick={() => setDeleteTarget(adSet)}
                        disabled={actionLoading === adSet.id}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-red-500 disabled:opacity-50"
                      >
                        <TrashCan size={16} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
