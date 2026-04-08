'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft } from '@carbon/icons-react'

export default function NewCompanyPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [tagline, setTagline] = useState('')
  const [initialAdminEmail, setInitialAdminEmail] = useState('')
  const [supportEmail, setSupportEmail] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Company name is required')
      return
    }

    setSaving(true)

    // 1. Insert the company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: name.trim(),
        domain: domain.trim() || null,
        tagline: tagline.trim() || null,
        support_email: supportEmail.trim() || null,
        contact_email: contactEmail.trim() || null,
        type: 'admin',
        status: 'pending',
      })
      .select()
      .single()

    if (companyError || !company) {
      toast.error(companyError?.message ?? 'Failed to create company')
      setSaving(false)
      return
    }

    // 2. Insert default company_branding
    const { error: brandingError } = await supabase
      .from('company_branding')
      .insert({
        company_id: company.id,
        primary_colour: '#1175E4',
        secondary_colour: '#0D1B2A',
        font_heading: 'Poppins',
        font_body: 'Poppins',
      })

    if (brandingError) {
      // Non-fatal — company created but branding failed
      toast.error('Company created but branding setup failed')
    } else {
      toast.success(`${company.name} created successfully`)
    }

    setSaving(false)
    router.push('/platform/companies')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/platform/companies')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={16} />
          Companies
        </button>
        <span className="text-gray-300">/</span>
        <h1 className="font-poppins text-2xl font-semibold text-gray-900">New Company</h1>
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
                placeholder="Acme IT Solutions"
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
              placeholder="Your IT Modernisation Partner"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="initialAdminEmail">Initial Admin Email</Label>
            <Input
              id="initialAdminEmail"
              type="email"
              value={initialAdminEmail}
              onChange={e => setInitialAdminEmail(e.target.value)}
              placeholder="admin@acme.co.za"
            />
            <p className="text-xs text-gray-400">Future: will send an invitation to this email.</p>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input
                id="supportEmail"
                type="email"
                value={supportEmail}
                onChange={e => setSupportEmail(e.target.value)}
                placeholder="support@acme.co.za"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                placeholder="hello@acme.co.za"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/platform/companies')}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create Company'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
