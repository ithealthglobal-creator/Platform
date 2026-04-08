'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Company, Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit } from '@carbon/icons-react'

interface CompanyDetail extends Company {
  profiles: Profile[]
  children: Company[]
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-600',
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-blue-100 text-blue-700',
    prospect: 'bg-purple-100 text-purple-700',
    churned: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

export default function CompanyDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [company, setCompany] = useState<CompanyDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const [companyRes, profilesRes, childrenRes] = await Promise.all([
        supabase.from('companies').select('*').eq('id', id).single(),
        supabase.from('profiles').select('*').eq('company_id', id).order('display_name'),
        supabase.from('companies').select('*').eq('parent_company_id', id).order('name'),
      ])

      if (companyRes.error || !companyRes.data) {
        setLoading(false)
        return
      }

      setCompany({
        ...companyRes.data,
        profiles: (profilesRes.data ?? []) as Profile[],
        children: (childrenRes.data ?? []) as Company[],
      })
      setLoading(false)
    }

    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="bg-white rounded-lg border p-6 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-5 w-64 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-gray-500">Company not found.</p>
        <Button variant="outline" onClick={() => router.push('/platform/companies')}>
          Back to companies
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/platform/companies')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={16} />
            Companies
          </button>
          <span className="text-gray-300">/</span>
          <h1 className="font-poppins text-2xl font-semibold text-gray-900">{company.name}</h1>
          <StatusBadge status={company.status} />
        </div>
        <Button onClick={() => router.push(`/platform/companies/${id}/edit`)}>
          <Edit size={16} />
          Edit
        </Button>
      </div>

      {/* Company info */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="font-poppins text-base font-semibold text-gray-900 mb-4">Company Details</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <div>
            <dt className="text-gray-500">Name</dt>
            <dd className="mt-0.5 font-medium text-gray-900">{company.name}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Domain</dt>
            <dd className="mt-0.5 font-medium text-gray-900">{company.domain ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Tagline</dt>
            <dd className="mt-0.5 font-medium text-gray-900">{company.tagline ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Status</dt>
            <dd className="mt-0.5"><StatusBadge status={company.status} /></dd>
          </div>
          <div>
            <dt className="text-gray-500">Support Email</dt>
            <dd className="mt-0.5 font-medium text-gray-900">{company.support_email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Contact Email</dt>
            <dd className="mt-0.5 font-medium text-gray-900">{company.contact_email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Created</dt>
            <dd className="mt-0.5 font-medium text-gray-900">
              {new Date(company.created_at).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Type</dt>
            <dd className="mt-0.5 font-medium text-gray-900 capitalize">{company.type}</dd>
          </div>
        </dl>
      </div>

      {/* Users */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="font-poppins text-base font-semibold text-gray-900">
            Users ({company.profiles.length})
          </h2>
        </div>
        {company.profiles.length === 0 ? (
          <p className="px-6 py-4 text-sm text-gray-400">No users in this company yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {company.profiles.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{p.display_name}</td>
                  <td className="px-6 py-3 text-gray-500">{p.email}</td>
                  <td className="px-6 py-3 capitalize text-gray-700">{p.role}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${p.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Customer companies */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="font-poppins text-base font-semibold text-gray-900">
            Customer Companies ({company.children.length})
          </h2>
        </div>
        {company.children.length === 0 ? (
          <p className="px-6 py-4 text-sm text-gray-400">No customer companies linked yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {company.children.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-6 py-3 text-gray-500">{c.domain ?? '—'}</td>
                  <td className="px-6 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-6 py-3 text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
