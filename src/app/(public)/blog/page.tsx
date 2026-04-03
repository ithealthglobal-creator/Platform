import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { BlogPost } from '@/lib/types'
import { BlogCard } from '@/components/blog-card'

export const metadata = {
  title: 'Blog | IThealth',
  description: 'Expert insights on IT modernisation',
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  let query = supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .eq('is_active', true)
    .order('published_at', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }

  const { data } = await query
  const posts = (data ?? []) as BlogPost[]

  // Extract unique categories from all published posts for filter pills
  const { data: allPosts } = await supabase
    .from('blog_posts')
    .select('category')
    .eq('status', 'published')
    .eq('is_active', true)

  const categories = Array.from(
    new Set(
      (allPosts ?? [])
        .map((p: { category: string | null }) => p.category)
        .filter(Boolean) as string[]
    )
  ).sort()

  const featured = posts[0]
  const remaining = posts.slice(1)

  return (
    <>
      {/* Page header */}
      <section className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-dark)] py-16 px-6 text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Blog</h1>
        <p className="text-white/80 text-lg">
          Expert insights on IT modernisation
        </p>
      </section>

      {/* Category filter pills */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-wrap gap-2 mb-10">
          <Link
            href="/blog"
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              !category
                ? 'bg-[var(--brand-primary)] text-white'
                : 'border border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10'
            }`}
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat}
              href={`/blog?category=${encodeURIComponent(cat)}`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                category === cat
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'border border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10'
              }`}
            >
              {cat}
            </Link>
          ))}
        </div>

        {/* Featured post */}
        {featured && (
          <Link href={`/blog/${featured.slug}`} className="block mb-12">
            <article className="rounded-lg overflow-hidden border shadow-sm hover:shadow-md transition bg-white md:flex">
              {featured.cover_image_url ? (
                <div className="relative md:w-1/2 h-64 md:h-auto bg-gray-100">
                  <img
                    src={featured.cover_image_url}
                    alt={featured.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="md:w-1/2 h-64 bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-secondary)]/20" />
              )}
              <div className="p-6 md:w-1/2 flex flex-col justify-center">
                {featured.category && (
                  <span className="inline-block text-xs bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] px-2 py-1 rounded-full mb-3 w-fit">
                    {featured.category}
                  </span>
                )}
                <h2 className="text-2xl md:text-3xl font-bold mb-3">
                  {featured.title}
                </h2>
                {featured.excerpt && (
                  <p className="text-muted-foreground mb-4 line-clamp-3">
                    {featured.excerpt}
                  </p>
                )}
                {featured.published_at && (
                  <p className="text-sm text-muted-foreground">
                    {new Date(featured.published_at).toLocaleDateString(
                      'en-GB',
                      { day: 'numeric', month: 'long', year: 'numeric' }
                    )}
                  </p>
                )}
              </div>
            </article>
          </Link>
        )}

        {/* Post grid */}
        {remaining.length > 0 && (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {remaining.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {posts.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            No blog posts found.
          </p>
        )}
      </div>
    </>
  )
}
