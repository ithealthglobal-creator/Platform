'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Save, Send } from '@carbon/icons-react'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

const CATEGORIES = ['Security', 'Cloud', 'Operations', 'Strategy', 'Modernisation', 'Business']

export default function NewBlogPostPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [category, setCategory] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!slugManual) {
      setSlug(slugify(title))
    }
  }, [title, slugManual])

  async function handleSave(publish: boolean) {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      toast.error('Title is required')
      return
    }

    const trimmedSlug = slug.trim()
    if (!trimmedSlug) {
      toast.error('Slug is required')
      return
    }

    setSaving(true)

    const postData = {
      title: trimmedTitle,
      slug: trimmedSlug,
      excerpt: excerpt.trim() || null,
      content: content.trim() || null,
      cover_image_url: coverImageUrl.trim() || null,
      category: category || null,
      author_id: profile?.id ?? null,
      status: publish ? 'published' : 'draft',
      published_at: publish ? new Date().toISOString() : null,
      is_active: isActive,
    }

    const { error } = await supabase.from('blog_posts').insert(postData)

    if (error) {
      if (error.code === '23505') {
        toast.error('A post with this slug already exists')
      } else {
        toast.error('Failed to create blog post')
      }
      setSaving(false)
      return
    }

    toast.success(publish ? 'Blog post published' : 'Blog post saved as draft')
    router.push('/growth/awareness/blog')
  }

  return (
    <div>
      <div className="grid gap-4 max-w-2xl">
        <div className="grid gap-2">
          <Label htmlFor="post-title">Title</Label>
          <Input
            id="post-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="post-slug">Slug</Label>
          <Input
            id="post-slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value)
              setSlugManual(true)
            }}
            placeholder="url-friendly-slug"
          />
          <p className="text-xs text-muted-foreground">
            Auto-generated from title. Edit to customise.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="post-excerpt">Excerpt</Label>
          <textarea
            id="post-excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Short summary for listing cards"
            rows={2}
            className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="post-content">Content (HTML)</Label>
          <textarea
            id="post-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Full post body in HTML"
            rows={16}
            className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm font-mono transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="post-cover">Cover Image URL</Label>
          <Input
            id="post-cover"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="post-category">Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v ?? '')}>
            <SelectTrigger id="post-category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="post-active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <Label htmlFor="post-active">Active</Label>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => handleSave(false)} disabled={saving} variant="outline">
            <Save size={16} className="mr-2" />
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving}>
            <Send size={16} className="mr-2" />
            {saving ? 'Publishing...' : 'Publish'}
          </Button>
        </div>
      </div>
    </div>
  )
}
