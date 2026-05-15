'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { BlogPost } from '@/lib/types'
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
import { toast } from 'sonner'
import {
  Add,
  Edit,
  TrashCan,
  View,
  LogoX,
  LogoLinkedin,
  LogoFacebook,
} from '@carbon/icons-react'

interface BlogPostWithAuthor extends BlogPost {
  profiles: { display_name: string } | null
}

export default function BlogPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<BlogPostWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [categories, setCategories] = useState<string[]>([])

  const fetchPosts = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('blog_posts')
      .select('*, profiles(display_name)')
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }
    if (categoryFilter !== 'all') {
      query = query.eq('category', categoryFilter)
    }

    const { data, error } = await query

    if (error) {
      toast.error('Failed to load blog posts')
      setLoading(false)
      return
    }

    setPosts((data as BlogPostWithAuthor[]) ?? [])
    setLoading(false)
  }, [statusFilter, categoryFilter])

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase
      .from('blog_posts')
      .select('category')
      .not('category', 'is', null)

    if (data) {
      const unique = [...new Set(data.map((d) => d.category as string))]
      setCategories(unique.sort())
    }
  }, [])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  async function handleDelete(post: BlogPost) {
    if (!confirm(`Delete blog post "${post.title}"? This cannot be undone.`)) return

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', post.id)

    if (error) {
      toast.error('Failed to delete blog post')
      return
    }

    toast.success('Blog post deleted')
    fetchPosts()
    fetchCategories()
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? 'all')}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => router.push('/growth/content/blog/new')}>
          <Add size={16} />
          Add Post
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="w-[130px]">Category</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[150px]">Author</TableHead>
              <TableHead className="w-[130px]">Published</TableHead>
              <TableHead className="w-[230px]">Actions</TableHead>
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
                  No blog posts found
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{post.title}</div>
                      {post.excerpt && (
                        <div className="text-sm text-muted-foreground truncate max-w-[400px]">
                          {post.excerpt}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {post.category ? (
                      <Badge variant="outline">{post.category}</Badge>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                      {post.status === 'published' ? 'Published' : 'Draft'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {post.profiles?.display_name ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(post.published_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {post.status === 'published' && post.slug && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => window.open(`/blog/${post.slug}`, '_blank')}
                            title="View on site"
                          >
                            <View size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              const url = `${window.location.origin}/blog/${post.slug}`
                              window.open(
                                `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(url)}`,
                                '_blank',
                              )
                            }}
                            title="Share on X"
                          >
                            <LogoX size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              const url = `${window.location.origin}/blog/${post.slug}`
                              window.open(
                                `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
                                '_blank',
                              )
                            }}
                            title="Share on LinkedIn"
                          >
                            <LogoLinkedin size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              const url = `${window.location.origin}/blog/${post.slug}`
                              window.open(
                                `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
                                '_blank',
                              )
                            }}
                            title="Share on Facebook"
                          >
                            <LogoFacebook size={16} />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => router.push(`/growth/content/blog/${post.id}/edit`)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(post)}
                      >
                        <TrashCan size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
