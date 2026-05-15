'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import type { SocialPost } from '@/lib/types'
import { SocialPostForm } from '../../_components/social-post-form'
import { toast } from 'sonner'

export default function EditSocialPostPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string | undefined
  const [post, setPost] = useState<SocialPost | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    async function load() {
      const { data, error } = await supabase
        .from('social_posts')
        .select('*')
        .eq('id', id)
        .single()
      if (error || !data) {
        toast.error('Failed to load social post')
        router.push('/growth/awareness/social')
        return
      }
      setPost(data as SocialPost)
      setLoading(false)
    }
    load()
  }, [id, router])

  if (loading || !post) {
    return <div className="text-sm text-muted-foreground">Loading…</div>
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Edit Social Post</h1>
        <p className="text-sm text-muted-foreground">{post.platform} · {post.status}</p>
      </div>
      <SocialPostForm initial={post} />
    </div>
  )
}
