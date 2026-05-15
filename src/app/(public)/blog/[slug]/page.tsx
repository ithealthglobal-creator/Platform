import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import { BlogPost } from '@/lib/types'
import { CTABanner } from '@/components/cta-banner'
import { ScrollReveal } from '@/components/scroll-reveal'
import { FunnelPageTracker } from '@/components/funnel-page-tracker'

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
    return { title: 'Post Not Found' }
  }

  return {
    title: `${post.title} | Blog`,
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
      <FunnelPageTracker eventType="content_view" blogPostId={post.id} blogSlug={post.slug} />
      {/* Cover image */}
      {post.cover_image_url ? (
        <div className="relative h-80 md:h-[480px] w-full">
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="h-80 md:h-[480px] bg-[var(--brand-primary)]/15" />
      )}

      <ScrollReveal>
      <article className="max-w-3xl mx-auto px-8 py-24">
        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold mb-8">{post.title}</h1>

        {/* Meta row */}
        <div className="flex items-center gap-8 mb-16">
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
      </ScrollReveal>

      {/* CTA */}
      <CTABanner />
    </>
  )
}
