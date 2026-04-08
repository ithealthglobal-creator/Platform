'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Company, CompanyStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, Save } from '@carbon/icons-react'

const STATUS_OPTIONS: CompanyStatus[] = ['prospect', 'pending', 'approved', 'active', 'inactive', 'churned']

export default function EditCompanyPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [tagline, setTagline] = useState('')
  const [supportEmail, setSupportEmail] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [status, setStatus] = useState<CompanyStatus>('pending')

  useEffect(() => {
    async function fetchCompany() {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        toast.error('Failed to load company')
        setLoading(false)
        return
      }

      const c = data as Company
      setName(c.name)
      setDomain(c.domain ?? '')
      setTagline(c.tagline ?? '')
      setSupportEmail(c.support_email ?? '')
      setContactEmail(c.contact_email ?? '')
      setStatus(c.status)
      setLoading(false)
    }

    fetchCompany()
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Company name is required')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('companies')
      .update({
        name: name.trim(),
        domain: domain.trim() || null,
        tagline: tagline.trim() || null,
        support_email: supportEmail.trim() || null,
        contact_email: contactEmail.trim() || null,
        status,
      })
      .eq('id', id)

    if (error) {
      toast.error(error.message ?? 'Failed to update company')
      setSaving(false)
      return
    }

    toast.success('Company updated')
    setSaving(false)
    router.push(`/platform/companies/${id}`)
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="bg-white rounded-lg border p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/platform/companies/${id}`)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <span className="text-gray-300">/</span>
        <h1 className="font-poppins text-2xl font-semibold text-gray-900">Edit Company</h1>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="name">Company Name <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="acme.co.za"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={tagline}
              onChange={e => setTagline(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input
                id="supportEmail"
                type="email"
                value={supportEmail}
                onChange={e => setSupportEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={status}
              onChange={e => setStatus(e.target.value as CompanyStatus)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/platform/companies/${id}`)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Save size={16} />
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
