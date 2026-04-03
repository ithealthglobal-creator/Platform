'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Growth, Partnership, Education } from '@carbon/icons-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { Partner } from '@/lib/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const benefits = [
  {
    icon: Growth,
    color: 'text-[var(--brand-primary)]',
    title: 'Grow Revenue',
    description: 'Access new markets and customers through our platform and client network.',
  },
  {
    icon: Partnership,
    color: 'text-[var(--brand-secondary)]',
    title: 'Co-Sell Opportunities',
    description: 'Collaborate on deals and deliver joint solutions to shared customers.',
  },
  {
    icon: Education,
    color: 'text-[var(--phase-accelerate)]',
    title: 'Enable & Train',
    description: 'Get certified on our platform and access partner enablement resources.',
  },
]

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    website: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchPartners() {
      const { data } = await supabase
        .from('partners')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (data) setPartners(data)
    }
    fetchPartners()
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit')
      }

      toast.success('Application submitted! We\'ll review it and get back to you.')
      setFormData({ company_name: '', contact_name: '', email: '', website: '', message: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Page Header */}
      <section className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-dark)] py-16 px-6 text-center text-white">
        <h1 className="text-4xl font-bold">Our Partners</h1>
        <p className="text-white/80 mt-2">Trusted technology partnerships</p>
      </section>

      {/* Partner Logo Grid */}
      <section className="py-16 px-6 bg-white">
        {partners.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {partners.map((partner) => {
              const card = (
                <div
                  key={partner.id}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col items-center"
                >
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] mx-auto mb-3" />
                  <p className="font-semibold text-center">{partner.name}</p>
                  {partner.description && (
                    <p className="text-sm text-muted-foreground text-center mt-1">
                      {partner.description}
                    </p>
                  )}
                </div>
              )

              if (partner.website) {
                return (
                  <a
                    key={partner.id}
                    href={partner.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-80 transition-opacity"
                  >
                    {card}
                  </a>
                )
              }

              return card
            })}
          </div>
        )}
      </section>

      {/* Become a Partner */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-[var(--brand-dark)] mb-10">
            Become a Partner
          </h2>

          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center"
              >
                <benefit.icon size={32} className={`${benefit.color} mx-auto mb-3`} />
                <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>

          {/* Application Form */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-5">
            <div>
              <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">
                Company Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="company_name"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                required
                placeholder="Your company name"
              />
            </div>

            <div>
              <label htmlFor="contact_name" className="block text-sm font-medium text-gray-700 mb-1">
                Contact Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="contact_name"
                name="contact_name"
                value={formData.contact_name}
                onChange={handleChange}
                required
                placeholder="Your full name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <Input
                id="website"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://yourcompany.com"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={5}
                placeholder="Tell us about your company and partnership interest"
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
              />
            </div>

            <Button type="submit" variant="default" size="lg" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Application'}
            </Button>
          </form>
        </div>
      </section>
    </>
  )
}
