import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import { BlogPost } from '@/lib/types'
import { CTABanner } from '@/components/cta-banner'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function getPost(slug: string): Promise<BlogPost | null> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .eq('is_active', true)
    .single()

  return data as BlogPost | null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)

  if (!post) {
    return { title: 'Post Not Found | IThealth' }
  }

  return {
    title: `${post.title} | IThealth Blog`,
    description: post.excerpt ?? undefined,
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getPost(slug)

  if (!post) {
    notFound()
  }

  return (
    <>
      {/* Cover image */}
      {post.cover_image_url ? (
        <div className="relative h-64 md:h-80 w-full">
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="h-64 md:h-80 bg-gradient-to-br from-[var(--brand-primary)]/30 to-[var(--brand-secondary)]/30" />
      )}

      <article className="max-w-3xl mx-auto px-6 py-12">
        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold mb-4">{post.title}</h1>

        {/* Meta row */}
        <div className="flex items-center gap-4 mb-8">
          {post.category && (
            <span className="inline-block text-xs bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] px-2 py-1 rounded-full">
              {post.category}
            </span>
          )}
          {post.published_at && (
            <span className="text-sm text-muted-foreground">
              {new Date(post.published_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          )}
        </div>

        {/* Content */}
        <div
          className="prose prose-lg max-w-3xl mx-auto"
          dangerouslySetInnerHTML={{ __html: post.content ?? '' }}
        />
      </article>

      {/* CTA */}
      <CTABanner />
    </>
  )
}
