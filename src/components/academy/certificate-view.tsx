'use client'

import { supabase } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { getPhaseColor } from '@/lib/phase-colors'
import { Certificate, Download, Share } from '@carbon/icons-react'

interface CertificateViewProps {
  certificate: {
    id: string
    certificate_number: string
    issued_at: string
    score: number
    course?: { name: string; phase?: { name: string } }
  }
  userName: string
  companyName: string
}

export function CertificateView({ certificate, userName, companyName }: CertificateViewProps) {
  const phaseName = certificate.course?.phase?.name ?? ''
  const phaseColor = getPhaseColor(phaseName)
  const courseName = certificate.course?.name ?? 'Unknown Course'

  const issuedDate = new Date(certificate.issued_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  async function handleDownload() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      toast.error('Please sign in to download')
      return
    }
    try {
      const res = await fetch(`/api/certificates/download?id=${certificate.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        toast.error('Failed to download certificate')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `certificate-${certificate.certificate_number}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to download certificate')
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Link copied to clipboard')
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Certificate card */}
      <div
        className="bg-white overflow-hidden shadow-lg"
        style={{ borderRadius: '20px 0 20px 20px' }}
      >
        {/* Header band */}
        <div
          className="relative px-8 pt-8 pb-7 overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${phaseColor} 0%, ${phaseColor}dd 100%)` }}
        >
          {/* Decorative circles */}
          <div
            className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20"
            style={{ background: 'white' }}
          />
          <div
            className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-10"
            style={{ background: 'white' }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div
              className="w-14 h-14 flex items-center justify-center bg-white/20 mb-4"
              style={{ borderRadius: '14px 0 14px 14px' }}
            >
              <Certificate size={28} className="text-white" />
            </div>
            <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-1">
              Certificate of Completion
            </p>
            <h2 className="text-white text-xl font-bold">{courseName}</h2>
            {phaseName && (
              <span className="mt-2 inline-block text-white/70 text-xs font-medium">
                {phaseName} Phase
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6">
          {/* Awarded to */}
          <div className="text-center mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
              Awarded To
            </p>
            <p className="text-3xl font-bold text-slate-900">{userName}</p>
            {companyName && (
              <p className="text-sm text-slate-500 mt-1">{companyName}</p>
            )}
          </div>

          {/* Decorative divider */}
          <div
            className="h-px mb-6"
            style={{
              background: `linear-gradient(to right, transparent, ${phaseColor}60, transparent)`,
            }}
          />

          {/* Details grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <p className="text-xs text-slate-400 mb-1">Phase</p>
              <div className="flex items-center justify-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: phaseColor }}
                />
                <p className="text-sm font-semibold text-slate-800">
                  {phaseName || '—'}
                </p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400 mb-1">Score</p>
              <p className="text-sm font-semibold text-slate-800">{certificate.score}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400 mb-1">Date Issued</p>
              <p className="text-sm font-semibold text-slate-800">{issuedDate}</p>
            </div>
          </div>

          {/* Certificate number */}
          <div
            className="bg-slate-50 border border-slate-200 px-4 py-2.5 text-center mb-6"
            style={{ borderRadius: '10px 0 10px 10px' }}
          >
            <span className="text-xs text-slate-400 mr-2">Certificate No.</span>
            <span className="text-xs font-mono text-slate-700">
              {certificate.certificate_number}
            </span>
          </div>

          {/* IThealth branding */}
          <div className="flex items-center justify-center gap-1.5 mb-6">
            <div
              className="w-5 h-5 flex items-center justify-center"
              style={{ background: phaseColor, borderRadius: '5px 0 5px 5px' }}
            >
              <span className="text-white text-[9px] font-bold">IT</span>
            </div>
            <span className="text-sm font-semibold text-slate-700">IThealth.ai</span>
            <span className="text-xs text-slate-400">· Your IT Modernisation Champion</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: phaseColor, borderRadius: '12px 0 12px 12px' }}
            >
              <Download size={16} />
              Download PDF
            </button>
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
              style={{ borderRadius: '12px 0 12px 12px' }}
            >
              <Share size={16} />
              Share Link
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
