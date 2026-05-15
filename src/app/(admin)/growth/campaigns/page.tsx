// src/app/(admin)/growth/campaigns/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { MetaCampaign } from '@/lib/types'
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
import { Time, Add, Pause, Play, Edit, TrashCan } from '@carbon/icons-react'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive'> = {
  ACTIVE: 'default',
  PAUSED: 'secondary',
  DELETED: 'destructive',
  ARCHIVED: 'secondary',
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

export default function CampaignsPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteTarget, setDeleteTarget] = useState<MetaCampaign | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('meta_campaigns')
      .select('*')
      .order('spend', { ascending: false })

    if (error) {
      toast.error('Failed to load campaigns')
      setLoading(false)
      return
    }
    setCampaigns(data ?? [])
    setLoading(false)
  }, [])

  const fetchSyncStatus = useCallback(async () => {
    const { data } = await supabase
      .from('meta_integrations')
      .select('last_synced_at')
      .limit(1)
      .single()
    if (data?.last_synced_at) setLastSynced(data.last_synced_at)
  }, [])

  useEffect(() => {
    fetchCampaigns()
    fetchSyncStatus()
  }, [fetchCampaigns, fetchSyncStatus])

  const getAuthHeaders = async () => {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  }

  const handleStatusChange = async (campaign: MetaCampaign, newStatus: string) => {
    setActionLoading(campaign.id)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/ads/meta/campaigns/${campaign.id}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        toast.error(error || 'Failed to update status')
        return
      }
      toast.success(`Campaign ${newStatus === 'ACTIVE' ? 'resumed' : 'paused'}`)
      fetchCampaigns()
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
      const res = await fetch(`/api/admin/ads/meta/campaigns/${deleteTarget.id}/delete`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) {
        const { error } = await res.json()
        toast.error(error || 'Failed to delete campaign')
        return
      }
      toast.success('Campaign deleted')
      setDeleteTarget(null)
      fetchCampaigns()
    } catch {
      toast.error('Failed to delete campaign')
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = statusFilter === 'all'
    ? campaigns
    : campaigns.filter(c => c.status === statusFilter)

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
    if (diff < 1) return 'just now'
    if (diff < 60) return `${diff}m ago`
    return `${Math.floor(diff / 60)}h ago`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <select
            className="border rounded-md px-3 py-1.5 text-sm bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          {lastSynced && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Time size={14} />
              Last synced {timeAgo(lastSynced)}
            </div>
          )}
          <Button onClick={() => router.push('/growth/campaigns/create')}>
            <Add size={16} />
            Create Campaign
          </Button>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead>Objective</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead className="text-right">Impressions</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">CPA</TableHead>
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
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {campaigns.length === 0
                    ? 'No campaigns synced. Connect your Meta account in Settings > Integrations.'
                    : 'No campaigns match the selected filter.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((campaign) => (
                <TableRow
                  key={campaign.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/growth/campaigns/${campaign.id}`)}
                >
                  <TableCell className="font-medium text-primary">{campaign.name}</TableCell>
                  <TableCell>
                    <Badge variant={statusColors[campaign.status || ''] || 'secondary'}>
                      {campaign.status || '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{campaign.objective || '—'}</TableCell>
                  <TableCell className="text-right">${campaign.spend.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{campaign.impressions.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <MetricBadge metric="ctr" value={campaign.ctr} format={(v) => `${v.toFixed(1)}%`} />
                  </TableCell>
                  <TableCell className="text-right">
                    <MetricBadge metric="cpa" value={campaign.cpa} format={(v) => `$${v.toFixed(2)}`} />
                  </TableCell>
                  <TableCell className="text-right">{campaign.conversions.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {campaign.status === 'ACTIVE' ? (
                        <button
                          title="Pause"
                          onClick={() => handleStatusChange(campaign, 'PAUSED')}
                          disabled={actionLoading === campaign.id}
                          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          <Pause size={16} />
                        </button>
                      ) : (
                        <button
                          title="Resume"
                          onClick={() => handleStatusChange(campaign, 'ACTIVE')}
                          disabled={actionLoading === campaign.id}
                          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          <Play size={16} />
                        </button>
                      )}
                      <button
                        title="Edit"
                        onClick={() => router.push(`/growth/campaigns/create?edit=${campaign.id}`)}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        title="Delete"
                        onClick={() => setDeleteTarget(campaign)}
                        disabled={actionLoading === campaign.id}
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
