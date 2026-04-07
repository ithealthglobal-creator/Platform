'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { toast } from 'sonner'

interface Invitation {
  id: string
  invitee_email: string
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  created_at: string
  expires_at: string
}

interface InvitationsTabProps {
  companyId: string
}

function getEffectiveStatus(inv: Invitation): 'pending' | 'accepted' | 'expired' | 'revoked' {
  if (inv.status === 'pending' && inv.expires_at && new Date(inv.expires_at) < new Date()) {
    return 'expired'
  }
  return inv.status
}

const STATUS_CONFIG = {
  pending: { label: 'Invite Sent', className: 'bg-indigo-100 text-indigo-700' },
  accepted: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  expired: { label: 'Expired', className: 'bg-red-100 text-red-700' },
  revoked: { label: 'Revoked', className: 'bg-slate-100 text-slate-500' },
}

export function InvitationsTab({ companyId }: InvitationsTabProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchInvitations = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load invitations')
    } else {
      setInvitations((data ?? []) as Invitation[])
    }
    setLoading(false)
  }, [companyId])

  useEffect(() => {
    fetchInvitations()
  }, [fetchInvitations])

  async function handleRevoke(inv: Invitation) {
    setActionLoading(inv.id)
    const { error } = await supabase
      .from('team_invitations')
      .update({ status: 'revoked' })
      .eq('id', inv.id)

    if (error) {
      toast.error('Failed to revoke invitation')
    } else {
      toast.success(`Invitation to ${inv.invitee_email} revoked`)
      await fetchInvitations()
    }
    setActionLoading(null)
  }

  async function handleResend(inv: Invitation) {
    setActionLoading(inv.id)

    // Revoke old invitation first if still pending
    if (inv.status === 'pending') {
      const { error: revokeError } = await supabase
        .from('team_invitations')
        .update({ status: 'revoked' })
        .eq('id', inv.id)

      if (revokeError) {
        toast.error('Failed to revoke old invitation')
        setActionLoading(null)
        return
      }
    }

    // Send new invitation
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/team/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ invitees: [{ email: inv.invitee_email }] }),
    })

    const result = await res.json()
    if (!res.ok || result.sent === 0) {
      const reason = result.errors?.[0]?.reason ?? 'Unknown error'
      toast.error(`Failed to resend: ${reason}`)
    } else {
      toast.success(`Invitation resent to ${inv.invitee_email}`)
      await fetchInvitations()
    }
    setActionLoading(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
      </div>
    )
  }

  if (invitations.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">No invitations sent yet.</div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="py-3 pr-4 text-left font-medium text-slate-500">Email</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500">Invited Date</th>
            <th className="px-4 py-3 text-left font-medium text-slate-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invitations.map(inv => {
            const effectiveStatus = getEffectiveStatus(inv)
            const config = STATUS_CONFIG[effectiveStatus]
            const isLoading = actionLoading === inv.id

            return (
              <tr key={inv.id} className="border-b border-slate-100 last:border-0">
                <td className="py-3 pr-4 font-medium text-slate-700">{inv.invitee_email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
                    {config.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(inv.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3">
                  {effectiveStatus === 'accepted' || effectiveStatus === 'revoked' ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleResend(inv)}
                        disabled={isLoading}
                        className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      >
                        {isLoading ? 'Sending...' : 'Resend'}
                      </button>
                      {effectiveStatus === 'pending' && (
                        <button
                          onClick={() => handleRevoke(inv)}
                          disabled={isLoading}
                          className="text-slate-500 hover:text-red-600 disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
