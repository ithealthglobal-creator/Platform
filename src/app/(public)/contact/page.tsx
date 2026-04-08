'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import Link from 'next/link'
import { Email, Phone, Location } from '@carbon/icons-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollReveal } from '@/components/scroll-reveal'

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
      {/* Hero with embedded form */}
      <section className="bg-[var(--brand-primary)] text-white pb-24 pt-16">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
            {/* Left — heading + contact info */}
            <div className="pt-8">
              <motion.h1
                className="text-4xl md:text-5xl font-extralight"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
                Contact Us
              </motion.h1>
              <motion.p
                className="text-white/70 text-lg font-light mt-4 mb-12"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              >
                Get in touch with our team
              </motion.p>

              <motion.div
                className="space-y-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <div className="flex items-start gap-3">
                  <Email size={20} className="text-white/60 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white/90">Email</p>
                    <a href="mailto:hello@ithealth.ai" className="text-sm text-white/60 hover:text-white">
                      hello@ithealth.ai
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone size={20} className="text-white/60 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white/90">Phone</p>
                    <a href="tel:+27111234567" className="text-sm text-white/60 hover:text-white">
                      +27 (0) 11 123 4567
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Location size={20} className="text-white/60 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white/90">Location</p>
                    <p className="text-sm text-white/60">Johannesburg, South Africa</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right — form card */}
            <motion.div
              className="bg-white rounded-2xl p-8 shadow-xl"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Send us a message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-xs font-medium text-slate-500 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <Input id="name" name="name" value={formData.name} onChange={handleChange} required placeholder="Your name" />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-xs font-medium text-slate-500 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required placeholder="you@example.com" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block text-xs font-medium text-slate-500 mb-1">Phone</label>
                    <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="+27 (0) 11 000 0000" />
                  </div>
                  <div>
                    <label htmlFor="company" className="block text-xs font-medium text-slate-500 mb-1">Company</label>
                    <Input id="company" name="company" value={formData.company} onChange={handleChange} placeholder="Your company" />
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="block text-xs font-medium text-slate-500 mb-1">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={4}
                    placeholder="How can we help?"
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring resize-none"
                  />
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA below */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 text-center">
          <ScrollReveal>
            <p className="text-lg font-light text-slate-500 mb-6">
              Ready to start your IT modernisation journey?
            </p>
            <Link href="/login">
              <Button
                size="lg"
                className="bg-[var(--brand-secondary)] hover:bg-[var(--brand-secondary)]/90 text-white px-10"
              >
                Start Now
              </Button>
            </Link>
          </ScrollReveal>
        </div>
      </section>
    </>
  )
}
