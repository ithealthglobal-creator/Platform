'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/auth-context'
import type { SocialPost } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Add, Edit, TrashCan } from '@carbon/icons-react'

export default function SocialPostsPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [platformFilter, setPlatformFilter] = useState<string>('all')

  const fetchPosts = useCallback(async () => {
    if (!profile?.company_id) return
    setLoading(true)
    let query = supabase
      .from('social_posts')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    if (platformFilter !== 'all') query = query.eq('platform', platformFilter)

    const { data, error } = await query
    if (error) {
      toast.error('Failed to load social posts')
      setLoading(false)
      return
    }
    setPosts((data as SocialPost[]) ?? [])
    setLoading(false)
  }, [profile?.company_id, statusFilter, platformFilter])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  async function handleDelete(post: SocialPost) {
    if (!confirm(`Delete this ${post.platform} post? This cannot be undone.`)) return
    const { error } = await supabase.from('social_posts').delete().eq('id', post.id)
    if (error) {
      toast.error('Failed to delete social post')
      return
    }
    toast.success('Social post deleted')
    fetchPosts()
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Social Posts</h1>
          <p className="text-sm text-muted-foreground">
            Organic posts tracked as earned awareness in the funnel.
          </p>
        </div>
        <Button onClick={() => router.push('/growth/awareness/social/new')}>
          <Add size={16} />
          Add Post
        </Button>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="published">Published</SelectItem>
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v ?? 'all')}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Platform" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="x">X (Twitter)</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="w-[120px]">Platform</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[110px] text-right">Impressions</TableHead>
              <TableHead className="w-[100px] text-right">Clicks</TableHead>
              <TableHead className="w-[130px]">Published</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No social posts yet
                </TableCell>
              </TableRow>
            ) : (
              posts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title ?? '(untitled)'}</TableCell>
                  <TableCell><Badge variant="outline">{p.platform}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={p.status === 'published' ? 'default' : 'secondary'}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{p.impressions.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{p.clicks.toLocaleString()}</TableCell>
                  <TableCell className="text-sm">{formatDate(p.published_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => router.push(`/growth/awareness/social/${p.id}/edit`)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(p)}>
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
