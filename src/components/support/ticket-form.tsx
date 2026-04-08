'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/auth-context'
import { createTicketSchema } from '@/lib/validations/support'
import type { TicketCategory, TicketPriority, Service, Company } from '@/lib/types'

interface TicketFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  isAdmin: boolean
}

interface FormState { category: TicketCategory | ''; service_id: string; priority: TicketPriority | ''; company_id: string; subject: string; description: string }

const EMPTY_FORM: FormState = { category: '', service_id: '', priority: '', company_id: '', subject: '', description: '' }

export function TicketForm({ open, onOpenChange, onSuccess, isAdmin }: TicketFormProps) {
  const { session } = useAuth()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [companies, setCompanies] = useState<Company[]>([])

  useEffect(() => {
    if (form.category === 'service')
      supabase.from('services').select('id, name').eq('is_active', true).order('name').then(({ data }) => setServices((data as Service[]) ?? []))
  }, [form.category])

  useEffect(() => {
    if (isAdmin && open)
      supabase.from('companies').select('id, name').order('name').then(({ data }) => setCompanies((data as Company[]) ?? []))
  }, [isAdmin, open])

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
      company_id: form.company_id || undefined,
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
      setForm(EMPTY_FORM)
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create ticket')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Support Ticket</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Company — only shown for admins */}
          {isAdmin && (
            <div className="space-y-1.5">
              <Label htmlFor="company_id">Company</Label>
              <Select value={form.company_id} onValueChange={(v) => set('company_id', v ?? '')}>
                <SelectTrigger id="company_id">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
            <textarea id="description" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Describe the issue in detail..." rows={4} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring resize-none" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create Ticket'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
