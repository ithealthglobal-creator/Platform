'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/auth-context'
import { CertificateView } from '@/components/academy/certificate-view'
import { ArrowLeft } from '@carbon/icons-react'
import type { Certificate } from '@/lib/types'

type CertificateWithCourse = Certificate & {
  course?: {
    id: string
    name: string
    phase?: { name: string }
  }
}

export default function CertificatePage() {
  const { profile } = useAuth()
  const params = useParams()
  const id = params.id as string

  const [cert, setCert] = useState<CertificateWithCourse | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile || !id) return

    async function fetchCert() {
      setLoading(true)
      const { data } = await supabase
        .from('certificates')
        .select('*, course:courses(*, phase:phases(name))')
        .eq('id', id)
        .eq('user_id', profile!.id)
        .single()

      setCert((data as CertificateWithCourse) ?? null)
      setLoading(false)
    }

    fetchCert()
  }, [profile, id])

  if (loading) {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Academy</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Certificate</h1>
        <div className="mt-6 flex items-center justify-center rounded-xl border border-slate-200 bg-white p-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#1175E4]" />
        </div>
      </div>
    )
  }

  if (!cert) {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Academy</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Certificate</h1>
        <div
          className="mt-6 bg-white border border-slate-200 p-10 text-center"
          style={{ borderRadius: '16px 0 16px 16px' }}
        >
          <p className="text-sm text-slate-500 mb-3">Certificate not found.</p>
          <Link
            href="/portal/academy"
            className="inline-flex items-center gap-1 text-sm font-medium text-[#1175E4] hover:text-[#0d5fc4]"
          >
            <ArrowLeft size={14} />
            Back to My Courses
          </Link>
        </div>
      </div>
    )
  }

  if (cert.revoked_at) {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Academy</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Certificate</h1>
        <div
          className="mt-6 bg-white border border-slate-200 p-10 text-center"
          style={{ borderRadius: '16px 0 16px 16px' }}
        >
          <p className="text-sm text-slate-500 mb-3">This certificate has been revoked.</p>
          <Link
            href="/portal/academy"
            className="inline-flex items-center gap-1 text-sm font-medium text-[#1175E4] hover:text-[#0d5fc4]"
          >
            <ArrowLeft size={14} />
            Back to My Courses
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Academy</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">Certificate</h1>

      {/* Back link */}
      <div className="mt-4 mb-6">
        <Link
          href="/portal/academy"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to My Courses
        </Link>
      </div>

      <CertificateView
        certificate={cert}
        userName={profile?.display_name ?? ''}
        companyName={profile?.company?.name ?? ''}
      />
    </div>
  )
}
