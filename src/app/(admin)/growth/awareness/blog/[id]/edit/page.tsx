'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/auth-context'
import { BlogPost } from '@/lib/types'
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
import { Save, Send, DocumentBlank, Bullhorn } from '@carbon/icons-react'
import { SocialPostComposer } from '@/components/social-post-composer'

const CATEGORIES = ['Security', 'Cloud', 'Operations', 'Strategy', 'Modernisation', 'Business']

export default function EditBlogPostPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { profile } = useAuth()
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [publishedAt, setPublishedAt] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [composerOpen, setComposerOpen] = useState(false)

  useEffect(() => {
    async function fetchPost() {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        toast.error('Failed to load blog post')
        router.push('/growth/awareness/blog')
        return
      }

      const post = data as BlogPost
      setTitle(post.title)
      setSlug(post.slug)
      setExcerpt(post.excerpt ?? '')
      setContent(post.content ?? '')
      setCoverImageUrl(post.cover_image_url ?? '')
      setCategory(post.category ?? '')
      setStatus(post.status)
      setPublishedAt(post.published_at)
      setIsActive(post.is_active)
      setLoading(false)
    }
    fetchPost()
  }, [id, router])

  async function handleSave(newStatus?: 'draft' | 'published') {
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

    const targetStatus = newStatus ?? status
    const isPublishing = targetStatus === 'published' && status !== 'published'
    const isUnpublishing = targetStatus === 'draft' && status === 'published'

    const updateData: Record<string, unknown> = {
      title: trimmedTitle,
      slug: trimmedSlug,
      excerpt: excerpt.trim() || null,
      content: content.trim() || null,
      cover_image_url: coverImageUrl.trim() || null,
      category: category || null,
      status: targetStatus,
      is_active: isActive,
    }

    if (isPublishing) {
      updateData.published_at = new Date().toISOString()
    } else if (isUnpublishing) {
      updateData.published_at = null
    }

    const { error } = await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('id', id)

    if (error) {
      if (error.code === '23505') {
        toast.error('A post with this slug already exists')
      } else {
        toast.error('Failed to update blog post')
      }
      setSaving(false)
      return
    }

    if (isPublishing) {
      toast.success('Blog post published')
    } else if (isUnpublishing) {
      toast.success('Blog post reverted to draft')
    } else {
      toast.success('Blog post updated')
    }

    router.push('/growth/awareness/blog')
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
            onChange={(e) => setSlug(e.target.value)}
            placeholder="url-friendly-slug"
          />
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

        {publishedAt && (
          <p className="text-sm text-muted-foreground">
            Published on{' '}
            {new Date(publishedAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}

        <div className="flex gap-2">
          {status === 'published' ? (
            <>
              <Button onClick={() => handleSave()} disabled={saving}>
                <Save size={16} className="mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button onClick={() => handleSave('draft')} disabled={saving} variant="outline">
                <DocumentBlank size={16} className="mr-2" />
                Unpublish
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => handleSave()} disabled={saving} variant="outline">
                <Save size={16} className="mr-2" />
                {saving ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button onClick={() => handleSave('published')} disabled={saving}>
                <Send size={16} className="mr-2" />
                {saving ? 'Publishing...' : 'Publish'}
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => setComposerOpen(true)}
            disabled={saving}
            title="Generate social posts from this article"
          >
            <Bullhorn size={16} className="mr-2" />
            Generate social posts
          </Button>
        </div>
      </div>

      <SocialPostComposer
        blogPost={{
          id,
          title,
          slug,
          excerpt: excerpt || null,
          content: content || null,
          cover_image_url: coverImageUrl || null,
          category: category || null,
          author_id: profile?.id ?? null,
          status,
          published_at: publishedAt,
          is_active: isActive,
          created_at: '',
          updated_at: '',
        }}
        open={composerOpen}
        onOpenChange={setComposerOpen}
      />
    </div>
  )
}
