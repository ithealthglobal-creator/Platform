'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/auth-context'
import { createTicketSchema } from '@/lib/validations/support'
import type { TicketCategory, TicketPriority, Service } from '@/lib/types'

interface FormState {
  category: TicketCategory | ''
  service_id: string
  priority: TicketPriority | ''
  subject: string
  description: string
}

const EMPTY_FORM: FormState = { category: '', service_id: '', priority: '', subject: '', description: '' }

export default function NewTicketPage() {
  const { session } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [services, setServices] = useState<Service[]>([])

  useEffect(() => {
    if (form.category === 'service')
      supabase.from('services').select('id, name').eq('is_active', true).order('name').then(({ data }) => setServices((data as Service[]) ?? []))
  }, [form.category])

  function set(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.access_token) {
      toast.error('Not authenticated')
      return
    }

    const payload = {
      category: form.category,
      service_id: form.service_id || null,
      priority: form.priority,
      subject: form.subject,
      description: form.description,
    }

    const parsed = createTicketSchema.safeParse(payload)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>
      const first = Object.values(fieldErrors)[0]?.[0]
      toast.error(first ?? 'Please fill in all required fields')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(parsed.data),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to create ticket')
      }

      toast.success('Ticket created successfully')
      router.push('/portal/support')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create ticket')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Support</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">New Support Ticket</h1>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8">
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Select value={form.category} onValueChange={(v) => { set('category', v ?? ''); set('service_id', '') }}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
                <SelectItem value="service">Service</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Service — only shown when category = service */}
          {form.category === 'service' && (
            <div className="space-y-1.5">
              <Label htmlFor="service_id">Service</Label>
              <Select value={form.service_id} onValueChange={(v) => set('service_id', v ?? '')}>
                <SelectTrigger id="service_id">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Priority */}
          <div className="space-y-1.5">
            <Label htmlFor="priority">Priority</Label>
            <Select value={form.priority} onValueChange={(v) => set('priority', v ?? '')}>
              <SelectTrigger id="priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={form.subject}
              onChange={(e) => set('subject', e.target.value)}
              placeholder="Brief summary of the issue"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Describe the issue in detail..."
              rows={6}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Ticket'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push('/portal/support')} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
