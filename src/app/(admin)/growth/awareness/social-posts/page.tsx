'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import type { BlogPost, SocialPost, SocialPlatform, SocialPostStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Add, TrashCan, LogoLinkedin, LogoX, LogoFacebook, LogoInstagram } from '@carbon/icons-react'
import { SocialPostComposer } from '@/components/social-post-composer'

interface SocialPostWithBlog extends SocialPost {
  blog_posts: { title: string; slug: string } | null
}

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  linkedin: 'LinkedIn',
  x: 'X',
  facebook: 'Facebook',
  instagram: 'Instagram',
}

function platformIcon(p: SocialPlatform) {
  if (p === 'linkedin') return <LogoLinkedin size={14} />
  if (p === 'x') return <LogoX size={14} />
  if (p === 'facebook') return <LogoFacebook size={14} />
  return <LogoInstagram size={14} />
}

export default function SocialPostsPage() {
  const [posts, setPosts] = useState<SocialPostWithBlog[]>([])
  const [loading, setLoading] = useState(true)
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerBlogs, setPickerBlogs] = useState<BlogPost[]>([])
  const [pickerBlogId, setPickerBlogId] = useState<string>('')

  const [composerOpen, setComposerOpen] = useState(false)
  const [composerBlog, setComposerBlog] = useState<BlogPost | null>(null)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('social_posts')
      .select('*, blog_posts(title, slug)')
      .order('updated_at', { ascending: false })

    if (platformFilter !== 'all') query = query.eq('platform', platformFilter)
    if (statusFilter !== 'all') query = query.eq('status', statusFilter)

    const { data, error } = await query
    if (error) {
      toast.error('Failed to load social posts')
      setLoading(false)
      return
    }
    setPosts((data as SocialPostWithBlog[]) ?? [])
    setLoading(false)
  }, [platformFilter, statusFilter])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  async function openPicker() {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      toast.error('Failed to load blog posts')
      return
    }
    setPickerBlogs((data as BlogPost[]) ?? [])
    setPickerBlogId('')
    setPickerOpen(true)
  }

  function confirmPicker() {
    const blog = pickerBlogs.find((b) => b.id === pickerBlogId)
    if (!blog) {
      toast.error('Pick a blog post first')
      return
    }
    setPickerOpen(false)
    setComposerBlog(blog)
    setComposerOpen(true)
  }

  async function handleDelete(post: SocialPost) {
    if (!confirm(`Delete this ${PLATFORM_LABEL[post.platform]} draft? This cannot be undone.`))
      return
    const { error } = await supabase.from('social_posts').delete().eq('id', post.id)
    if (error) {
      toast.error('Failed to delete social post')
      return
    }
    toast.success('Social post deleted')
    fetchPosts()
  }

  async function updateStatus(post: SocialPost, status: SocialPostStatus) {
    const { error } = await supabase
      .from('social_posts')
      .update({ status })
      .eq('id', post.id)
    if (error) {
      toast.error('Failed to update status')
      return
    }
    fetchPosts()
  }

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Select
            value={platformFilter}
            onValueChange={(v) => setPlatformFilter(v ?? 'all')}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
              <SelectItem value="x">X</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v ?? 'all')}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={openPicker}>
          <Add size={16} />
          New from blog post
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Platform</TableHead>
              <TableHead>Blog post</TableHead>
              <TableHead>Content</TableHead>
              <TableHead className="w-[140px]">Status</TableHead>
              <TableHead className="w-[130px]">Updated</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No social posts yet — pick a blog post to draft from.
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      {platformIcon(post.platform)}
                      {PLATFORM_LABEL[post.platform]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {post.blog_posts?.title ?? '—'}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground line-clamp-2 max-w-[420px]">
                      {post.content}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={post.status}
                      onValueChange={(v) => updateStatus(post, v as SocialPostStatus)}
                    >
                      <SelectTrigger className="h-8 w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(post.updated_at)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(post)}
                    >
                      <TrashCan size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pick a blog post</DialogTitle>
            <DialogDescription>
              The composer will draft social posts from the article you select.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select value={pickerBlogId} onValueChange={(v) => setPickerBlogId(v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="Select a blog post" />
              </SelectTrigger>
              <SelectContent>
                {pickerBlogs.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmPicker} disabled={!pickerBlogId}>
              Open composer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SocialPostComposer
        blogPost={composerBlog}
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onSaved={fetchPosts}
      />
    </div>
  )
}
