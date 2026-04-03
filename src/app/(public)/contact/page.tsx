'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Email, Phone, Location } from '@carbon/icons-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit')
      }

      toast.success('Message sent! We\'ll be in touch soon.')
      setFormData({ name: '', email: '', phone: '', company: '', message: '' })
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
        <h1 className="text-4xl font-bold">Contact Us</h1>
        <p className="text-white/80 mt-2">Get in touch with our team</p>
      </section>

      {/* Contact Content */}
      <section className="py-16 px-6 md:px-12 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Left Column — Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Your name"
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
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+27 (0) 11 000 0000"
              />
            </div>

            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                Company
              </label>
              <Input
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="Your company name"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={5}
                placeholder="How can we help?"
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
              />
            </div>

            <Button type="submit" variant="default" size="lg" disabled={loading}>
              {loading ? 'Sending...' : 'Send Message'}
            </Button>
          </form>

          {/* Right Column — Contact Info */}
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 h-fit">
            <h2 className="text-xl font-semibold text-[var(--brand-dark)] mb-6">Get In Touch</h2>

            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <Email size={20} className="text-[var(--brand-primary)] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Email</p>
                  <a
                    href="mailto:hello@ithealth.ai"
                    className="text-sm text-[var(--brand-primary)] hover:underline"
                  >
                    hello@ithealth.ai
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone size={20} className="text-[var(--brand-primary)] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Phone</p>
                  <a
                    href="tel:+27111234567"
                    className="text-sm text-gray-600 hover:text-[var(--brand-primary)]"
                  >
                    +27 (0) 11 123 4567
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Location size={20} className="text-[var(--brand-primary)] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Location</p>
                  <p className="text-sm text-gray-600">Johannesburg, South Africa</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-600 mb-4">
                Ready to start your IT modernisation journey?
              </p>
              <Link href="/login">
                <Button
                  variant="default"
                  size="lg"
                  className="bg-[var(--brand-secondary)] hover:bg-[var(--brand-secondary)]/90 text-white w-full"
                >
                  Start Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
