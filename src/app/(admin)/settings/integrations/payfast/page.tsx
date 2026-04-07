// src/app/(admin)/settings/integrations/payfast/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/auth-context'
import { PayfastIntegration } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft } from '@carbon/icons-react'

export default function PayFastSettingsPage() {
  const router = useRouter()
  const { profile } = useAuth()

  const [integration, setIntegration] = useState<PayfastIntegration | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form fields
  const [merchantId, setMerchantId] = useState('')
  const [merchantKey, setMerchantKey] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [isSandbox, setIsSandbox] = useState(true)
  const [isActive, setIsActive] = useState(true)

  // Track dirty state for password fields
  const [merchantKeyDirty, setMerchantKeyDirty] = useState(false)
  const [passphraseDirty, setPassphraseDirty] = useState(false)

  const fetchIntegration = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('payfast_integrations')
      .select('*')
      .limit(1)
      .single()

    if (data) {
      setIntegration(data)
      setMerchantId(data.merchant_id || '')
      setIsSandbox(data.is_sandbox)
      setIsActive(data.is_active)
      // Password fields are not pre-filled — show placeholder if value exists
      setMerchantKey('')
      setPassphrase('')
      setMerchantKeyDirty(false)
      setPassphraseDirty(false)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchIntegration()
  }, [fetchIntegration])

  const handleSave = async () => {
    if (!profile?.company_id) {
      toast.error('Unable to determine company. Please reload and try again.')
      return
    }

    setSaving(true)

    const payload: Record<string, unknown> = {
      company_id: profile.company_id,
      merchant_id: merchantId || null,
      is_sandbox: isSandbox,
      is_active: isActive,
    }

    // Only include key/passphrase if the user has changed them
    if (merchantKeyDirty) {
      payload.merchant_key_encrypted = merchantKey || null
    }
    if (passphraseDirty) {
      payload.passphrase_encrypted = passphrase || null
    }

    let error: { message: string } | null = null

    if (integration) {
      // Update existing record
      const result = await supabase
        .from('payfast_integrations')
        .update(payload)
        .eq('id', integration.id)
      error = result.error
    } else {
      // Insert new record
      const result = await supabase
        .from('payfast_integrations')
        .insert(payload)
      error = result.error
    }

    if (error) {
      toast.error(`Failed to save: ${error.message}`)
    } else {
      toast.success('PayFast settings saved')
      fetchIntegration()
    }

    setSaving(false)
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.push('/settings/integrations')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Back to Integrations
      </button>

      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">PayFast Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your PayFast payment gateway credentials for service purchases.
        </p>
      </div>

      {/* Status banner */}
      {integration?.merchant_id ? (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-green-200 bg-green-50">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-sm font-medium text-green-800">Connected</span>
          <span className="text-sm text-green-700">— Merchant ID: {integration.merchant_id}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="text-sm font-medium text-amber-800">Not configured</span>
          <span className="text-sm text-amber-700">— Enter your credentials below to enable payments</span>
        </div>
      )}

      {/* Credentials */}
      <div className="space-y-4 p-4 rounded-lg border bg-card">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Credentials</h3>

        <div className="space-y-2">
          <Label htmlFor="merchant-id">Merchant ID</Label>
          <Input
            id="merchant-id"
            type="text"
            placeholder="e.g. 10000100"
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="merchant-key">Merchant Key</Label>
          <Input
            id="merchant-key"
            type="password"
            placeholder={integration?.merchant_key_encrypted ? '••••••••' : 'Enter merchant key'}
            value={merchantKey}
            onChange={(e) => {
              setMerchantKey(e.target.value)
              setMerchantKeyDirty(true)
            }}
            autoComplete="new-password"
          />
          {integration?.merchant_key_encrypted && !merchantKeyDirty && (
            <p className="text-xs text-muted-foreground">Merchant key is saved. Enter a new value to update it.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="passphrase">Passphrase</Label>
          <Input
            id="passphrase"
            type="password"
            placeholder={integration?.passphrase_encrypted ? '••••••••' : 'Enter passphrase'}
            value={passphrase}
            onChange={(e) => {
              setPassphrase(e.target.value)
              setPassphraseDirty(true)
            }}
            autoComplete="new-password"
          />
          {integration?.passphrase_encrypted && !passphraseDirty && (
            <p className="text-xs text-muted-foreground">Passphrase is saved. Enter a new value to update it.</p>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="space-y-4 p-4 rounded-lg border bg-card">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Options</h3>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 accent-primary"
            checked={isSandbox}
            onChange={(e) => setIsSandbox(e.target.checked)}
          />
          <div>
            <div className="text-sm font-medium">Sandbox Mode</div>
            <div className="text-xs text-muted-foreground">Enable sandbox mode for testing. Disable for live payments.</div>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 accent-primary"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <div>
            <div className="text-sm font-medium">Active</div>
            <div className="text-xs text-muted-foreground">Enable PayFast payment processing</div>
          </div>
        </label>
      </div>

      {/* Test Connection note */}
      <div className="p-3 rounded-lg border bg-muted/40 text-sm text-muted-foreground">
        <strong>Test Connection:</strong> Save your credentials first, then test with a sandbox payment from the customer portal.
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
