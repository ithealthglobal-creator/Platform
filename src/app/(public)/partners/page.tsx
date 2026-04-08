'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Growth, Partnership, Education } from '@carbon/icons-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { Partner } from '@/lib/types'
import { PageHero } from '@/components/page-hero'
import { ScrollReveal } from '@/components/scroll-reveal'

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
      <PageHero title="Our Partners" subtitle="Trusted technology partnerships" />

      {/* Partner Logo Grid */}
      <section className="py-96 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        {partners.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            {partners.map((partner, index) => {
              const card = (
                <div
                  className="bg-white rounded-xl p-10 shadow-sm border border-gray-100 flex flex-col items-center"
                >
                  <div className="h-16 w-16 rounded-full bg-[var(--brand-primary)] mx-auto mb-6" />
                  <p className="font-semibold text-center">{partner.name}</p>
                  {partner.description && (
                    <p className="text-sm text-muted-foreground text-center mt-2">
                      {partner.description}
                    </p>
                  )}
                </div>
              )

              if (partner.website) {
                return (
                  <ScrollReveal key={partner.id} delay={index * 0.1}>
                    <a href={partner.website} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                      {card}
                    </a>
                  </ScrollReveal>
                )
              }

              return (
                <ScrollReveal key={partner.id} delay={index * 0.1}>
                  {card}
                </ScrollReveal>
              )
            })}
          </div>
        )}
        </div>
      </section>

      {/* Become a Partner */}
      <section className="py-96 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
          <h2 className="text-3xl font-light text-left text-[var(--brand-dark)] mb-20">
            Become a Partner
          </h2>

          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-24">
            {benefits.map((benefit, index) => (
              <ScrollReveal key={benefit.title} delay={index * 0.15}>
                <div className="bg-white rounded-xl p-10 shadow-sm border border-gray-100 text-center">
                  <benefit.icon size={32} className={`${benefit.color} mx-auto mb-6`} />
                  <h3 className="font-semibold text-lg mb-4">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Application Form */}
          <ScrollReveal>
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-8">
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
          </ScrollReveal>
        </div>
      </section>
    </>
  )
}
