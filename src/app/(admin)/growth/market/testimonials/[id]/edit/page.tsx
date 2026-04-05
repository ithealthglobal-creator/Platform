'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Testimonial } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save } from '@carbon/icons-react'

export default function EditTestimonialPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [quote, setQuote] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchItem() {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        toast.error('Failed to load testimonial')
        router.push('/growth/market/testimonials')
        return
      }

      const item = data as Testimonial
      setName(item.name)
      setCompany(item.company ?? '')
      setRole(item.role ?? '')
      setQuote(item.quote)
      setAvatarUrl(item.avatar_url ?? '')
      setSortOrder(item.sort_order)
      setIsActive(item.is_active)
      setLoading(false)
    }
    fetchItem()
  }, [id, router])

  async function handleSave() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.error('Name is required')
      return
    }

    const trimmedQuote = quote.trim()
    if (!trimmedQuote) {
      toast.error('Quote is required')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('testimonials')
      .update({
        name: trimmedName,
        company: company.trim() || null,
        role: role.trim() || null,
        quote: trimmedQuote,
        avatar_url: avatarUrl.trim() || null,
        sort_order: sortOrder,
        is_active: isActive,
      })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update testimonial')
      setSaving(false)
      return
    }

    toast.success('Testimonial updated')
    router.push('/growth/market/testimonials')
  }

  if (loading) {
    return (
      <div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="grid gap-4 max-w-lg">
        <div className="grid gap-2">
          <Label htmlFor="test-name">Name</Label>
          <Input
            id="test-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Person's name"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="test-company">Company</Label>
          <Input
            id="test-company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company name"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="test-role">Role</Label>
          <Input
            id="test-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g., Managing Director"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="test-quote">Quote</Label>
          <textarea
            id="test-quote"
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            placeholder="Testimonial text"
            rows={4}
            className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="test-avatar">Avatar URL</Label>
          <Input
            id="test-avatar"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="test-sort">Sort Order</Label>
          <Input
            id="test-sort"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
            placeholder="0"
            className="w-24"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="test-active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <Label htmlFor="test-active">Active</Label>
        </div>

        <div>
          <Button onClick={handleSave} disabled={saving}>
            <Save size={16} className="mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}
