// src/app/(admin)/settings/integrations/meta/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { MetaIntegration, SyncFrequency } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Connect, Renew, TrashCan } from '@carbon/icons-react'

const SYNC_OPTIONS: { value: SyncFrequency; label: string }[] = [
  { value: '15min', label: '15 min' },
  { value: '30min', label: '30 min' },
  { value: '1hour', label: '1 hour' },
  { value: '6hour', label: '6 hours' },
  { value: '24hour', label: '24 hours' },
]

export default function MetaSettingsPage() {
  const searchParams = useSearchParams()
  const [integration, setIntegration] = useState<MetaIntegration | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncFrequency, setSyncFrequency] = useState<SyncFrequency>('1hour')
  const [filterMode, setFilterMode] = useState<'all' | 'selected'>('all')
  const [adAccounts, setAdAccounts] = useState<Array<{ id: string; name: string }>>([])

  const fetchIntegration = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('meta_integrations')
      .select('*')
      .limit(1)
      .single()

    if (data) {
      setIntegration(data)
      setSyncFrequency(data.sync_frequency)
      setFilterMode(data.campaign_filter ? 'selected' : 'all')
    }
    setLoading(false)
  }, [])

  const fetchAdAccounts = useCallback(async () => {
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    const res = await fetch('/api/admin/ads/meta/ad-accounts', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const { data } = await res.json()
      setAdAccounts(data || [])
    }
  }, [])

  useEffect(() => {
    fetchIntegration()
  }, [fetchIntegration])

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    if (success === 'connected') toast.success('Meta account connected successfully')
    if (error) toast.error(`Connection failed: ${error}`)
  }, [searchParams])

  useEffect(() => {
    if (integration?.ad_account_id !== undefined) {
      fetchAdAccounts()
    }
  }, [integration, fetchAdAccounts])

  const handleConnect = () => {
    window.location.href = '/api/admin/ads/auth/meta'
  }

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Meta? This will delete all synced campaign data.')) return

    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    const res = await fetch('/api/admin/ads/integration', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      toast.success('Meta disconnected')
      setIntegration(null)
    } else {
      toast.error('Failed to disconnect')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    const res = await fetch('/api/admin/ads/integration', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ad_account_id: integration?.ad_account_id,
        ad_account_name: integration?.ad_account_name,
        sync_frequency: syncFrequency,
        campaign_filter: filterMode === 'all' ? null : integration?.campaign_filter,
      }),
    })
    if (res.ok) {
      toast.success('Settings saved')
      fetchIntegration()
    } else {
      toast.error('Failed to save settings')
    }
    setSaving(false)
  }

  const handleSyncNow = async () => {
    setSyncing(true)
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    const res = await fetch('/api/admin/ads/sync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      toast.success('Sync started')
      // Poll for completion
      setTimeout(() => {
        fetchIntegration()
        setSyncing(false)
      }, 5000)
    } else {
      toast.error('Failed to trigger sync')
      setSyncing(false)
    }
  }

  const handleAccountChange = (accountId: string) => {
    const account = adAccounts.find(a => a.id === accountId)
    if (account && integration) {
      setIntegration({ ...integration, ad_account_id: account.id, ad_account_name: account.name })
    }
  }

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
    if (diff < 1) return 'just now'
    if (diff < 60) return `${diff} minutes ago`
    return `${Math.floor(diff / 60)} hours ago`
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>
  }

  // Not connected state
  if (!integration?.ad_account_id) {
    return (
      <div className="max-w-lg">
        <div className="rounded-lg border bg-card p-8 text-center">
          <Connect size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Connect to Meta</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Connect your Meta (Facebook) Ads account to sync campaign data, view ad performance, and compare creatives.
          </p>
          <Button onClick={handleConnect}>
            Connect Meta Account
          </Button>
        </div>
      </div>
    )
  }

  // Connected state
  return (
    <div className="max-w-2xl space-y-6">
      {/* Connection status */}
      <div className="flex items-center justify-between p-4 rounded-lg border border-green-200 bg-green-50">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="font-medium text-green-800">Connected</span>
          <span className="text-sm text-green-700">— {integration.ad_account_name} ({integration.ad_account_id})</span>
        </div>
        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={handleDisconnect}>
          <TrashCan size={16} />
          Disconnect
        </Button>
      </div>

      {/* Ad Account selector */}
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Ad Account</label>
        <select
          className="mt-2 w-full border rounded-md px-3 py-2 text-sm bg-white"
          value={integration.ad_account_id || ''}
          onChange={(e) => handleAccountChange(e.target.value)}
        >
          <option value="">Select an ad account...</option>
          {adAccounts.map((acc) => (
            <option key={acc.id} value={acc.id}>{acc.name} ({acc.id})</option>
          ))}
        </select>
      </div>

      {/* Sync frequency */}
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Sync Frequency</label>
        <div className="flex gap-2 mt-2">
          {SYNC_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`px-3 py-1.5 rounded-md text-sm border ${
                syncFrequency === opt.value
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
              onClick={() => setSyncFrequency(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign filter */}
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Campaign Filter</label>
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              checked={filterMode === 'all'}
              onChange={() => setFilterMode('all')}
              className="accent-primary"
            />
            Sync all campaigns
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              checked={filterMode === 'selected'}
              onChange={() => setFilterMode('selected')}
              className="accent-primary"
            />
            Only sync selected campaigns
          </label>
        </div>
      </div>

      {/* Sync status */}
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Sync Status</label>
        <div className="flex items-center justify-between mt-2 p-3 rounded-lg border bg-card">
          <div className="text-sm">
            {integration.sync_status === 'error' ? (
              <span className="text-red-600">Error: {integration.sync_error}</span>
            ) : integration.last_synced_at ? (
              <span>Last synced {timeAgo(integration.last_synced_at)}</span>
            ) : (
              <span className="text-muted-foreground">Never synced</span>
            )}
          </div>
          <Button size="sm" onClick={handleSyncNow} disabled={syncing}>
            <Renew size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
