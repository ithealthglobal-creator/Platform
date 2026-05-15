'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Save, Send } from '@carbon/icons-react'
import type { SocialPost, SocialPlatform, SocialPostStatus } from '@/lib/types'

interface Props {
  initial?: SocialPost | null
}

export function SocialPostForm({ initial }: Props) {
  const router = useRouter()
  const { profile } = useAuth()

  const [platform, setPlatform] = useState<SocialPlatform>((initial?.platform as SocialPlatform) ?? 'linkedin')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [externalUrl, setExternalUrl] = useState(initial?.external_url ?? '')
  const [externalPostId, setExternalPostId] = useState(initial?.external_post_id ?? '')
  const [impressions, setImpressions] = useState(String(initial?.impressions ?? 0))
  const [clicks, setClicks] = useState(String(initial?.clicks ?? 0))
  const [reach, setReach] = useState(String(initial?.reach ?? 0))
  const [engagement, setEngagement] = useState(String(initial?.engagement ?? 0))
  const [saving, setSaving] = useState(false)

  async function handleSave(publish: boolean) {
    if (!profile?.company_id) {
      toast.error('No company context')
      return
    }
    setSaving(true)

    const status: SocialPostStatus = publish ? 'published' : (initial?.status ?? 'draft')
    const payload = {
      company_id: profile.company_id,
      platform,
      title: title.trim() || null,
      content: content.trim() || null,
      external_url: externalUrl.trim() || null,
      external_post_id: externalPostId.trim() || null,
      status,
      published_at: publish ? new Date().toISOString() : (initial?.published_at ?? null),
      impressions: Number(impressions) || 0,
      clicks: Number(clicks) || 0,
      reach: Number(reach) || 0,
      engagement: Number(engagement) || 0,
    }

    const { error } = initial
      ? await supabase.from('social_posts').update(payload).eq('id', initial.id)
      : await supabase.from('social_posts').insert(payload)

    if (error) {
      toast.error('Failed to save social post')
      setSaving(false)
      return
    }

    toast.success(publish ? 'Social post published' : 'Social post saved')
    router.push('/growth/awareness/social')
  }

  return (
    <div className="grid max-w-2xl gap-4">
      <div className="grid gap-2">
        <Label htmlFor="sp-platform">Platform</Label>
        <Select value={platform} onValueChange={(v) => setPlatform((v as SocialPlatform) ?? 'linkedin')}>
          <SelectTrigger id="sp-platform"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="x">X (Twitter)</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sp-title">Title</Label>
        <Input id="sp-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Internal label" />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sp-content">Content</Label>
        <textarea
          id="sp-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          placeholder="Post body"
          className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sp-url">External URL</Label>
        <Input id="sp-url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://www.linkedin.com/posts/..." />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sp-eid">External Post ID</Label>
        <Input
          id="sp-eid"
          value={externalPostId}
          onChange={(e) => setExternalPostId(e.target.value)}
          placeholder="Used to attribute incoming utm_content=… traffic"
        />
        <p className="text-xs text-muted-foreground">
          Use this in your link as <code>?utm_medium=social&utm_content=&lt;this id&gt;</code>.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="sp-impressions">Impressions</Label>
          <Input id="sp-impressions" type="number" min={0} value={impressions} onChange={(e) => setImpressions(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sp-clicks">Clicks</Label>
          <Input id="sp-clicks" type="number" min={0} value={clicks} onChange={(e) => setClicks(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sp-reach">Reach</Label>
          <Input id="sp-reach" type="number" min={0} value={reach} onChange={(e) => setReach(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sp-engagement">Engagement</Label>
          <Input id="sp-engagement" type="number" min={0} value={engagement} onChange={(e) => setEngagement(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => handleSave(false)} disabled={saving} variant="outline">
          <Save size={16} className="mr-2" />
          {saving ? 'Saving…' : 'Save Draft'}
        </Button>
        <Button onClick={() => handleSave(true)} disabled={saving}>
          <Send size={16} className="mr-2" />
          {saving ? 'Publishing…' : 'Publish'}
        </Button>
      </div>
    </div>
  )
}
